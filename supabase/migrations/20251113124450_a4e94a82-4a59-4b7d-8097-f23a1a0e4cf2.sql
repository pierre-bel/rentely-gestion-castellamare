-- Drop and recreate function with properly qualified column references
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
  nights_booked bigint,
  completed_count bigint,
  cancel_percentage numeric,
  occupancy_percentage numeric,
  average_nightly_rate numeric,
  gross_earnings numeric,
  platform_fees numeric,
  net_earnings numeric,
  last_payout_date timestamp with time zone,
  cancellation_income numeric,
  dispute_refunds numeric,
  dispute_income numeric,
  actual_net_earnings numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH listing_months AS (
    SELECT DISTINCT
      l.id as listing_id,
      l.title as listing_title,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      EXTRACT(DAY FROM (DATE_TRUNC('month', b.checkin_date) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER as days_in_month
    FROM listings l
    INNER JOIN bookings b ON b.listing_id = l.id
    WHERE l.host_user_id = p_host_user_id
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
      AND (p_search_query IS NULL OR l.title ILIKE '%' || p_search_query || '%')
      AND (p_listing_ids IS NULL OR l.id = ANY(p_listing_ids))
  ),
  nights_stats AS (
    SELECT 
      b.listing_id as listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(b.nights) as total_nights
    FROM bookings b
    WHERE b.listing_id IN (SELECT lm.listing_id FROM listing_months lm)
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
      AND b.status IN ('confirmed'::booking_status, 'completed'::booking_status)
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  completed_stats AS (
    SELECT 
      b.listing_id as listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      COUNT(*) as completed_count
    FROM bookings b
    WHERE b.listing_id IN (SELECT lm.listing_id FROM listing_months lm)
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
      AND b.status = 'completed'::booking_status
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  cancel_stats AS (
    SELECT 
      b.listing_id as listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      COUNT(*) FILTER (WHERE b.status IN ('cancelled_guest'::booking_status, 'cancelled_host'::booking_status)) as cancelled_count,
      COUNT(*) as total_bookings
    FROM bookings b
    WHERE b.listing_id IN (SELECT lm.listing_id FROM listing_months lm)
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  financial_stats AS (
    SELECT 
      b.listing_id as listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(b.host_payout_gross) as total_gross,
      SUM(b.host_commission_amount) as total_commission,
      SUM(b.host_payout_net) as total_net,
      SUM(b.subtotal) as total_subtotal,
      MAX(p.payout_date) as last_payout_date
    FROM bookings b
    LEFT JOIN payouts p ON p.booking_id = b.id AND p.status = 'completed'
    WHERE b.listing_id IN (SELECT lm.listing_id FROM listing_months lm)
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
      AND b.status IN ('confirmed'::booking_status, 'completed'::booking_status)
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  cancellation_income_by_month AS (
    SELECT 
      b.listing_id as listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(p.amount) as cancellation_income
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type = 'cancelled'
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  dispute_refunds_by_month AS (
    SELECT 
      b.listing_id as listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(COALESCE(p.total_dispute_refunds, 0)) as refund_amount
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type = 'booking_payout'
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  dispute_income_by_month AS (
    SELECT 
      b.listing_id as listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(p.amount) as income_amount
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type = 'debt_collection'
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  actual_net_by_month AS (
    SELECT 
      b.listing_id as listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(p.amount) as actual_net
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type IN ('booking_payout', 'debt_collection', 'cancelled')
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  final_rows AS (
    SELECT 
      lm.listing_id,
      lm.listing_title,
      TO_CHAR(lm.booking_month, 'Mon YYYY') as month_year,
      lm.booking_month as month_date,
      COALESCE(ns.total_nights, 0) as nights_booked,
      COALESCE(cs.completed_count, 0) as completed_count,
      ROUND(
        CASE 
          WHEN COALESCE(cst.total_bookings, 0) > 0 
          THEN (COALESCE(cst.cancelled_count, 0)::NUMERIC / cst.total_bookings::NUMERIC) * 100
          ELSE 0
        END, 2
      ) as cancel_percentage,
      ROUND(
        CASE 
          WHEN lm.days_in_month > 0 
          THEN (COALESCE(ns.total_nights, 0)::NUMERIC / lm.days_in_month::NUMERIC) * 100
          ELSE 0
        END, 2
      ) as occupancy_percentage,
      ROUND(
        CASE 
          WHEN COALESCE(ns.total_nights, 0) > 0 
          THEN COALESCE(fs.total_subtotal, 0)::NUMERIC / ns.total_nights::NUMERIC
          ELSE 0
        END, 2
      ) as average_nightly_rate,
      ROUND(COALESCE(fs.total_gross, 0)::NUMERIC, 2) as gross_earnings,
      ROUND(COALESCE(fs.total_commission, 0)::NUMERIC, 2) as platform_fees,
      ROUND(COALESCE(fs.total_net, 0)::NUMERIC, 2) as net_earnings,
      fs.last_payout_date,
      ROUND(COALESCE(ci.cancellation_income, 0)::NUMERIC, 2) as cancellation_income,
      ROUND(COALESCE(dr.refund_amount, 0)::NUMERIC, 2) as dispute_refunds,
      ROUND(COALESCE(di.income_amount, 0)::NUMERIC, 2) as dispute_income,
      ROUND(COALESCE(an.actual_net, 0)::NUMERIC, 2) as actual_net_earnings
    FROM listing_months lm
    LEFT JOIN nights_stats ns ON ns.listing_id = lm.listing_id AND ns.booking_month = lm.booking_month
    LEFT JOIN completed_stats cs ON cs.listing_id = lm.listing_id AND cs.booking_month = lm.booking_month
    LEFT JOIN cancel_stats cst ON cst.listing_id = lm.listing_id AND cst.booking_month = lm.booking_month
    LEFT JOIN financial_stats fs ON fs.listing_id = lm.listing_id AND fs.booking_month = lm.booking_month
    LEFT JOIN cancellation_income_by_month ci ON ci.listing_id = lm.listing_id AND ci.booking_month = lm.booking_month
    LEFT JOIN dispute_refunds_by_month dr ON dr.listing_id = lm.listing_id AND dr.booking_month = lm.booking_month
    LEFT JOIN dispute_income_by_month di ON di.listing_id = lm.listing_id AND di.booking_month = lm.booking_month
    LEFT JOIN actual_net_by_month an ON an.listing_id = lm.listing_id AND an.booking_month = lm.booking_month
  )
  SELECT * FROM final_rows
  WHERE 
    (p_min_gross IS NULL OR gross_earnings >= p_min_gross)
    AND (p_max_gross IS NULL OR gross_earnings <= p_max_gross)
    AND (p_min_net IS NULL OR actual_net_earnings >= p_min_net)
    AND (p_max_net IS NULL OR actual_net_earnings <= p_max_net)
  ORDER BY
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'desc' THEN month_date END DESC,
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'asc' THEN month_date END ASC,
    CASE WHEN p_sort_by = 'listing_title' AND p_sort_order = 'asc' THEN listing_title END ASC,
    CASE WHEN p_sort_by = 'listing_title' AND p_sort_order = 'desc' THEN listing_title END DESC,
    CASE WHEN p_sort_by = 'gross_earnings' AND p_sort_order = 'desc' THEN gross_earnings END DESC,
    CASE WHEN p_sort_by = 'gross_earnings' AND p_sort_order = 'asc' THEN gross_earnings END ASC,
    CASE WHEN p_sort_by = 'net_earnings' AND p_sort_order = 'desc' THEN actual_net_earnings END DESC,
    CASE WHEN p_sort_by = 'net_earnings' AND p_sort_order = 'asc' THEN actual_net_earnings END ASC,
    month_date DESC;
END;
$function$;