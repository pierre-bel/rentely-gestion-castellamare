-- Drop existing function
DROP FUNCTION IF EXISTS public.get_host_earnings_report(uuid, date, date, text, uuid[], numeric, numeric, numeric, numeric, text, text);

-- Recreate function with corrected dispute_refunds logic
CREATE OR REPLACE FUNCTION public.get_host_earnings_report(
  p_host_user_id uuid,
  p_start_month date DEFAULT NULL::date,
  p_end_month date DEFAULT NULL::date,
  p_search_query text DEFAULT NULL::text,
  p_listing_ids uuid[] DEFAULT NULL::uuid[],
  p_min_gross numeric DEFAULT NULL::numeric,
  p_max_gross numeric DEFAULT NULL::numeric,
  p_min_net numeric DEFAULT NULL::numeric,
  p_max_net numeric DEFAULT NULL::numeric,
  p_sort_by text DEFAULT 'month_date'::text,
  p_sort_order text DEFAULT 'desc'::text
)
RETURNS TABLE(
  listing_id uuid,
  listing_title text,
  month_year text,
  month_date text,
  nights_booked integer,
  completed_count integer,
  cancel_percentage numeric,
  occupancy_percentage numeric,
  average_nightly_rate numeric,
  gross_earnings numeric,
  platform_fees numeric,
  net_earnings numeric,
  last_payout_date text,
  cancellation_income numeric,
  dispute_refunds numeric,
  dispute_income numeric,
  actual_net_earnings numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH base_listings AS (
    SELECT l.id, l.title
    FROM listings l
    WHERE l.host_user_id = p_host_user_id
      AND (p_listing_ids IS NULL OR l.id = ANY(p_listing_ids))
      AND (p_search_query IS NULL OR l.title ILIKE '%' || p_search_query || '%')
  ),
  listing_months AS (
    SELECT 
      l.id as listing_id,
      l.title as listing_title,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month
    FROM base_listings l
    LEFT JOIN bookings b ON b.listing_id = l.id
    WHERE b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY l.id, l.title, DATE_TRUNC('month', b.checkin_date)
  ),
  booking_stats AS (
    SELECT 
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      COUNT(*) FILTER (WHERE b.status = 'completed') as completed_count,
      COUNT(*) FILTER (WHERE b.status IN ('cancelled_guest', 'cancelled_host')) as cancelled_count,
      SUM(b.nights) FILTER (WHERE b.status = 'completed') as total_nights,
      AVG(b.subtotal / NULLIF(b.nights, 0)) FILTER (WHERE b.status = 'completed') as avg_nightly_rate
    FROM bookings b
    WHERE b.listing_id IN (SELECT id FROM base_listings)
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  payout_stats AS (
    SELECT 
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(p.gross_revenue) as total_gross,
      SUM(p.commission_amount) as total_fees,
      SUM(p.amount) as total_net,
      MAX(p.payout_date) as last_payout
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type = 'booking_payout'
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  cancellation_income_by_month AS (
    SELECT
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(p.amount) as cancel_income
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
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(p.total_dispute_refunds) as refund_amount
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type = 'booking_payout'
      AND COALESCE(p.total_dispute_refunds, 0) > 0
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  dispute_income_by_month AS (
    SELECT
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(p.amount) as dispute_income_amount
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type = 'refund_debt'
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  )
  SELECT 
    lm.listing_id,
    lm.listing_title,
    TO_CHAR(lm.booking_month, 'Month YYYY') as month_year,
    lm.booking_month::text as month_date,
    COALESCE(bs.total_nights, 0)::integer as nights_booked,
    COALESCE(bs.completed_count, 0)::integer as completed_count,
    CASE 
      WHEN (bs.completed_count + bs.cancelled_count) > 0 
      THEN ROUND((bs.cancelled_count::numeric / (bs.completed_count + bs.cancelled_count)::numeric) * 100, 2)
      ELSE 0
    END as cancel_percentage,
    CASE 
      WHEN DATE_PART('days', DATE_TRUNC('month', lm.booking_month) + INTERVAL '1 month' - DATE_TRUNC('month', lm.booking_month)) > 0
      THEN ROUND((COALESCE(bs.total_nights, 0)::numeric / DATE_PART('days', DATE_TRUNC('month', lm.booking_month) + INTERVAL '1 month' - DATE_TRUNC('month', lm.booking_month))) * 100, 2)
      ELSE 0
    END as occupancy_percentage,
    COALESCE(bs.avg_nightly_rate, 0) as average_nightly_rate,
    COALESCE(ps.total_gross, 0) as gross_earnings,
    COALESCE(ps.total_fees, 0) as platform_fees,
    COALESCE(ps.total_net, 0) as net_earnings,
    TO_CHAR(ps.last_payout, 'YYYY-MM-DD') as last_payout_date,
    COALESCE(ci.cancel_income, 0) as cancellation_income,
    -COALESCE(dr.refund_amount, 0) as dispute_refunds,
    COALESCE(di.dispute_income_amount, 0) as dispute_income,
    COALESCE(ps.total_net, 0) + COALESCE(ci.cancel_income, 0) + COALESCE(di.dispute_income_amount, 0) as actual_net_earnings
  FROM listing_months lm
  LEFT JOIN booking_stats bs ON bs.listing_id = lm.listing_id AND bs.booking_month = lm.booking_month
  LEFT JOIN payout_stats ps ON ps.listing_id = lm.listing_id AND ps.booking_month = lm.booking_month
  LEFT JOIN cancellation_income_by_month ci ON ci.listing_id = lm.listing_id AND ci.booking_month = lm.booking_month
  LEFT JOIN dispute_refunds_by_month dr ON dr.listing_id = lm.listing_id AND dr.booking_month = lm.booking_month
  LEFT JOIN dispute_income_by_month di ON di.listing_id = lm.listing_id AND di.booking_month = lm.booking_month
  WHERE 
    (p_min_gross IS NULL OR COALESCE(ps.total_gross, 0) >= p_min_gross)
    AND (p_max_gross IS NULL OR COALESCE(ps.total_gross, 0) <= p_max_gross)
    AND (p_min_net IS NULL OR COALESCE(ps.total_net, 0) >= p_min_net)
    AND (p_max_net IS NULL OR COALESCE(ps.total_net, 0) <= p_max_net)
  ORDER BY
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'desc' THEN lm.booking_month END DESC,
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'asc' THEN lm.booking_month END ASC,
    CASE WHEN p_sort_by = 'gross_earnings' AND p_sort_order = 'desc' THEN COALESCE(ps.total_gross, 0) END DESC,
    CASE WHEN p_sort_by = 'gross_earnings' AND p_sort_order = 'asc' THEN COALESCE(ps.total_gross, 0) END ASC,
    CASE WHEN p_sort_by = 'net_earnings' AND p_sort_order = 'desc' THEN COALESCE(ps.total_net, 0) END DESC,
    CASE WHEN p_sort_by = 'net_earnings' AND p_sort_order = 'asc' THEN COALESCE(ps.total_net, 0) END ASC,
    lm.booking_month DESC;
END;
$function$;