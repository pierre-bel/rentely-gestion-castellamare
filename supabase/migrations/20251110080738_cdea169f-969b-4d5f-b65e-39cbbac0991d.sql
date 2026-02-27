-- Part 1: Create admin_mark_payout_completed function for manual payout status updates
CREATE OR REPLACE FUNCTION public.admin_mark_payout_completed(p_payout_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_payout RECORD;
BEGIN
  -- Verify caller is an admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can mark payouts as completed';
  END IF;
  
  -- Lock and fetch payout
  SELECT * INTO v_payout
  FROM public.payouts
  WHERE id = p_payout_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout not found';
  END IF;
  
  -- Verify payout is in pending status
  IF v_payout.status != 'pending' THEN
    RAISE EXCEPTION 'Payout is not in pending status (current status: %)', v_payout.status;
  END IF;
  
  -- Update payout to completed
  UPDATE public.payouts
  SET 
    status = 'completed',
    payout_date = NOW(),
    updated_at = NOW()
  WHERE id = p_payout_id;
  
  RETURN json_build_object(
    'success', true,
    'payout_id', p_payout_id,
    'status', 'completed',
    'payout_date', NOW()
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Part 2: Create get_host_earnings_report function for monthly earnings aggregation
CREATE OR REPLACE FUNCTION public.get_host_earnings_report(
  p_host_user_id UUID,
  p_start_month DATE,
  p_end_month DATE,
  p_search_query TEXT DEFAULT NULL,
  p_listing_ids UUID[] DEFAULT NULL,
  p_min_gross NUMERIC DEFAULT NULL,
  p_max_gross NUMERIC DEFAULT NULL,
  p_min_net NUMERIC DEFAULT NULL,
  p_max_net NUMERIC DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'month_date',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE(
  listing_id UUID,
  listing_title TEXT,
  month_year TEXT,
  month_date DATE,
  nights_booked INTEGER,
  completed_count INTEGER,
  cancel_percentage NUMERIC,
  occupancy_percentage NUMERIC,
  average_nightly_rate NUMERIC,
  gross_earnings NUMERIC,
  platform_fees NUMERIC,
  net_earnings NUMERIC,
  last_payout_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
      
      -- Count cancelled bookings (after payment = confirmed or completed that were then cancelled)
      CASE WHEN b.status IN ('cancelled_guest'::booking_status, 'cancelled_host'::booking_status) THEN 1 ELSE 0 END as cancelled_after_payment,
      
      -- Total bookings for cancel percentage (completed + cancelled after payment)
      CASE WHEN b.status IN ('completed'::booking_status, 'cancelled_guest'::booking_status, 'cancelled_host'::booking_status) THEN 1 ELSE 0 END as total_bookings,
      
      -- Financial data (only for completed bookings)
      CASE WHEN b.status = 'completed'::booking_status THEN b.subtotal ELSE 0 END as subtotal_amount,
      CASE WHEN b.status = 'completed'::booking_status THEN COALESCE(b.host_commission_amount, 0) ELSE 0 END as commission_amount,
      CASE WHEN b.status = 'completed'::booking_status THEN COALESCE(b.host_payout_net, 0) ELSE 0 END as payout_net_amount,
      
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
      
      -- Days in month
      EXTRACT(DAY FROM (DATE_TRUNC('month', mb.month_start) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER as days_in_month,
      
      -- Occupancy percentage
      CASE 
        WHEN EXTRACT(DAY FROM (DATE_TRUNC('month', mb.month_start) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER > 0
        THEN ROUND((SUM(mb.nights)::NUMERIC / EXTRACT(DAY FROM (DATE_TRUNC('month', mb.month_start) + INTERVAL '1 month' - INTERVAL '1 day'))::NUMERIC) * 100, 1)
        ELSE 0
      END as occupancy_percentage,
      
      -- Average nightly rate (subtotal / nights)
      CASE 
        WHEN SUM(mb.nights) > 0 
        THEN ROUND(SUM(mb.subtotal_amount) / SUM(mb.nights), 2)
        ELSE 0
      END as average_nightly_rate,
      
      -- Gross earnings (subtotal for completed bookings)
      ROUND(SUM(mb.subtotal_amount), 2) as gross_earnings,
      
      -- Platform fees (commission)
      ROUND(SUM(mb.commission_amount), 2) as platform_fees,
      
      -- Net earnings
      ROUND(SUM(mb.payout_net_amount), 2) as net_earnings,
      
      -- Last payout date (MAX payout_date from completed payouts for bookings in this month)
      (
        SELECT MAX(p.payout_date)
        FROM public.payouts p
        INNER JOIN public.bookings b2 ON b2.id = p.booking_id
        WHERE b2.listing_id = mb.listing_id
          AND DATE_TRUNC('month', b2.checkin_date) = mb.month_start
          AND p.status = 'completed'
      ) as last_payout_date
      
    FROM monthly_bookings mb
    GROUP BY mb.listing_id, mb.listing_title, mb.month_display, mb.month_start
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
    ar.last_payout_date
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
$function$;