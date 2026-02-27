-- Drop and recreate get_host_earnings_report with corrected logic
DROP FUNCTION IF EXISTS public.get_host_earnings_report(uuid, date, date, text, uuid[], numeric, numeric, numeric, numeric, text, text);

CREATE OR REPLACE FUNCTION public.get_host_earnings_report(
  p_host_user_id uuid,
  p_start_month date,
  p_end_month date,
  p_search_query text DEFAULT NULL,
  p_listing_ids uuid[] DEFAULT NULL,
  p_min_gross numeric DEFAULT NULL,
  p_max_gross numeric DEFAULT NULL,
  p_min_net numeric DEFAULT NULL,
  p_max_net numeric DEFAULT NULL,
  p_sort_by text DEFAULT 'month_date',
  p_sort_order text DEFAULT 'desc'
)
RETURNS TABLE(
  listing_id uuid,
  listing_title text,
  month_year text,
  month_date date,
  nights_booked integer,
  completed_count integer,
  cancel_percentage numeric,
  occupancy_percentage numeric,
  average_nightly_rate numeric,
  gross_earnings numeric,
  platform_fees numeric,
  net_earnings numeric,
  last_payout_date timestamp with time zone,
  debt_adjustments numeric,
  cancellation_refunds numeric,
  dispute_refunds numeric,
  actual_net_earnings numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a host
  IF NOT has_role(p_host_user_id, 'host'::app_role) AND NOT has_role(p_host_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only hosts can view their earnings reports';
  END IF;
  
  -- Verify caller is requesting their own data or is an admin
  IF auth.uid() != p_host_user_id AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: You can only view your own earnings reports';
  END IF;

  RETURN QUERY
  WITH monthly_bookings AS (
    SELECT
      l.id as listing_id,
      l.title as listing_title,
      DATE_TRUNC('month', b.checkin_date)::DATE as month_start,
      TO_CHAR(b.checkin_date, 'Mon, YYYY') as month_display,
      
      -- Nights booked (only for completed bookings)
      CASE WHEN b.status = 'completed'::booking_status THEN b.nights ELSE 0 END as nights,
      
      -- Count completed bookings
      CASE WHEN b.status = 'completed'::booking_status THEN 1 ELSE 0 END as completed,
      
      -- Count cancelled bookings (after payment)
      CASE WHEN b.status IN ('cancelled_guest'::booking_status, 'cancelled_host'::booking_status) THEN 1 ELSE 0 END as cancelled_after_payment,
      
      -- Total bookings for cancel percentage
      CASE WHEN b.status IN ('completed'::booking_status, 'cancelled_guest'::booking_status, 'cancelled_host'::booking_status) THEN 1 ELSE 0 END as total_bookings,
      
      -- FIXED: Gross includes subtotal + cleaning fee for completed AND cancelled bookings
      CASE WHEN b.status IN ('completed'::booking_status, 'cancelled_guest'::booking_status, 'cancelled_host'::booking_status) 
        THEN b.subtotal + COALESCE(b.cleaning_fee, 0) 
        ELSE 0 
      END as gross_amount,
      
      -- Commission (only for completed bookings)
      CASE WHEN b.status = 'completed'::booking_status THEN COALESCE(b.host_commission_amount, 0) ELSE 0 END as commission_amount,
      
      b.id as booking_id,
      b.checkin_date
    FROM public.bookings b
    INNER JOIN public.listings l ON l.id = b.listing_id
    WHERE 
      l.host_user_id = p_host_user_id
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
      AND b.status IN ('completed'::booking_status, 'cancelled_guest'::booking_status, 'cancelled_host'::booking_status)
      AND (p_listing_ids IS NULL OR l.id = ANY(p_listing_ids))
      AND (p_search_query IS NULL OR l.title ILIKE '%' || p_search_query || '%')
  ),
  -- FIXED: Track actual guest refunds from transactions table
  cancellation_refunds_by_month AS (
    SELECT
      l.id as listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(ABS(t.amount)) as refund_amount
    FROM public.transactions t
    INNER JOIN public.bookings b ON b.id = t.booking_id
    INNER JOIN public.listings l ON l.id = b.listing_id
    WHERE 
      l.host_user_id = p_host_user_id
      AND t.type = 'refund'
      AND b.status IN ('cancelled_guest'::booking_status, 'cancelled_host'::booking_status)
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY l.id, DATE_TRUNC('month', b.checkin_date)
  ),
  -- FIXED: Track dispute refunds with proper status checks
  dispute_refunds_by_month AS (
    SELECT
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(
        CASE 
          -- Reduced/cancelled pending payouts (status pending or cancelled)
          WHEN p.status IN ('pending', 'cancelled') 
            AND p.debt_applied_amount > 0 
            AND p.dispute_id IS NOT NULL 
            THEN p.debt_applied_amount
          -- Negative debit payouts (status = 'debit', amount negative)
          WHEN p.status = 'debit'
            AND p.amount < 0 
            AND p.dispute_id IS NOT NULL 
            THEN ABS(p.amount)
          ELSE 0
        END
      ) as refund_amount
    FROM public.payouts p
    INNER JOIN public.bookings b ON b.id = p.booking_id
    WHERE 
      p.host_user_id = p_host_user_id
      AND p.dispute_id IS NOT NULL
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  -- FIXED: Track only debt_settlement negative payouts
  debt_deductions_by_month AS (
    SELECT
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(ABS(p.amount)) as debt_amount
    FROM public.payouts p
    INNER JOIN public.bookings b ON b.id = p.booking_id
    WHERE 
      p.host_user_id = p_host_user_id
      AND p.transaction_type = 'debt_settlement'
      AND p.amount < 0
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  aggregated_report AS (
    SELECT
      mb.listing_id,
      mb.listing_title,
      mb.month_display as month_year,
      mb.month_start as month_date,
      
      -- Sum of nights booked
      SUM(mb.nights)::INTEGER as nights_booked,
      
      -- Count of completed bookings
      SUM(mb.completed)::INTEGER as completed_count,
      
      -- Cancellation percentage
      CASE 
        WHEN SUM(mb.total_bookings) > 0 
        THEN ROUND((SUM(mb.cancelled_after_payment)::NUMERIC / SUM(mb.total_bookings)::NUMERIC) * 100, 1)
        ELSE 0
      END as cancel_percentage,
      
      -- Occupancy percentage
      CASE 
        WHEN EXTRACT(DAY FROM (DATE_TRUNC('month', mb.month_start) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER > 0
        THEN ROUND((SUM(mb.nights)::NUMERIC / EXTRACT(DAY FROM (DATE_TRUNC('month', mb.month_start) + INTERVAL '1 month' - INTERVAL '1 day'))::NUMERIC) * 100, 1)
        ELSE 0
      END as occupancy_percentage,
      
      -- Average nightly rate
      CASE 
        WHEN SUM(mb.nights) > 0 
        THEN ROUND(SUM(mb.gross_amount) / SUM(mb.nights), 2)
        ELSE 0
      END as average_nightly_rate,
      
      -- Gross earnings (includes cleaning fee)
      ROUND(SUM(mb.gross_amount), 2) as gross_earnings,
      
      -- Platform fees
      ROUND(SUM(mb.commission_amount), 2) as platform_fees,
      
      -- Net earnings (gross - fees, before adjustments)
      ROUND(SUM(mb.gross_amount) - SUM(mb.commission_amount), 2) as net_earnings,
      
      -- Last payout date
      (
        SELECT MAX(p.payout_date)
        FROM public.payouts p
        INNER JOIN public.bookings b2 ON b2.id = p.booking_id
        WHERE b2.listing_id = mb.listing_id
          AND DATE_TRUNC('month', b2.checkin_date) = mb.month_start
          AND p.status = 'completed'
      ) as last_payout_date,
      
      -- Debt adjustments
      COALESCE(ddbm.debt_amount, 0) as debt_adjustments,
      
      -- Cancellation refunds
      COALESCE(crbm.refund_amount, 0) as cancellation_refunds,
      
      -- Dispute refunds
      COALESCE(drbm.refund_amount, 0) as dispute_refunds
      
    FROM monthly_bookings mb
    LEFT JOIN cancellation_refunds_by_month crbm 
      ON crbm.listing_id = mb.listing_id AND crbm.booking_month = mb.month_start
    LEFT JOIN dispute_refunds_by_month drbm 
      ON drbm.listing_id = mb.listing_id AND drbm.booking_month = mb.month_start
    LEFT JOIN debt_deductions_by_month ddbm 
      ON ddbm.listing_id = mb.listing_id AND ddbm.booking_month = mb.month_start
    GROUP BY mb.listing_id, mb.listing_title, mb.month_display, mb.month_start, 
             crbm.refund_amount, drbm.refund_amount, ddbm.debt_amount
  )
  SELECT
    ar.listing_id,
    ar.listing_title,
    ar.month_year,
    ar.month_date,
    ar.nights_booked,
    ar.completed_count,
    ar.cancel_percentage,
    ar.occupancy_percentage,
    ar.average_nightly_rate,
    ar.gross_earnings,
    ar.platform_fees,
    ar.net_earnings,
    ar.last_payout_date,
    ar.debt_adjustments,
    ar.cancellation_refunds,
    ar.dispute_refunds,
    -- Actual net earnings = net - all deductions
    ROUND(ar.net_earnings - ar.cancellation_refunds - ar.dispute_refunds - ar.debt_adjustments, 2) as actual_net_earnings
  FROM aggregated_report ar
  WHERE
    (p_min_gross IS NULL OR ar.gross_earnings >= p_min_gross)
    AND (p_max_gross IS NULL OR ar.gross_earnings <= p_max_gross)
    AND (p_min_net IS NULL OR ar.net_earnings >= p_min_net)
    AND (p_max_net IS NULL OR ar.net_earnings <= p_max_net)
  ORDER BY
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'desc' THEN ar.month_date END DESC,
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'asc' THEN ar.month_date END ASC,
    CASE WHEN p_sort_by = 'listing_title' AND p_sort_order = 'asc' THEN ar.listing_title END ASC,
    CASE WHEN p_sort_by = 'listing_title' AND p_sort_order = 'desc' THEN ar.listing_title END DESC,
    CASE WHEN p_sort_by = 'nights_booked' AND p_sort_order = 'desc' THEN ar.nights_booked END DESC,
    CASE WHEN p_sort_by = 'nights_booked' AND p_sort_order = 'asc' THEN ar.nights_booked END ASC,
    CASE WHEN p_sort_by = 'gross_earnings' AND p_sort_order = 'desc' THEN ar.gross_earnings END DESC,
    CASE WHEN p_sort_by = 'gross_earnings' AND p_sort_order = 'asc' THEN ar.gross_earnings END ASC,
    CASE WHEN p_sort_by = 'net_earnings' AND p_sort_order = 'desc' THEN ar.net_earnings END DESC,
    CASE WHEN p_sort_by = 'net_earnings' AND p_sort_order = 'asc' THEN ar.net_earnings END ASC,
    CASE WHEN p_sort_by = 'occupancy_percentage' AND p_sort_order = 'desc' THEN ar.occupancy_percentage END DESC,
    CASE WHEN p_sort_by = 'occupancy_percentage' AND p_sort_order = 'asc' THEN ar.occupancy_percentage END ASC,
    ar.month_date DESC;
END;
$$;