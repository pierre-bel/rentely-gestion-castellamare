-- Drop both function signatures to avoid conflicts
DROP FUNCTION IF EXISTS public.get_host_earnings_report(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_host_earnings_report(uuid, date, date, text, uuid[], numeric, numeric, numeric, numeric, text, text);

-- Recreate extended version with proper NUMERIC casts
CREATE OR REPLACE FUNCTION public.get_host_earnings_report(
  p_host_user_id uuid,
  p_start_month date,
  p_end_month date,
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
    SELECT id, title
    FROM listings
    WHERE host_user_id = p_host_user_id
      AND (p_listing_ids IS NULL OR id = ANY(p_listing_ids))
      AND (p_search_query IS NULL OR title ILIKE '%' || p_search_query || '%')
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
      SUM(p.commission_amount) as total_commission,
      SUM(p.amount) FILTER (WHERE p.transaction_type = 'booking_payout') as total_net,
      MAX(p.payout_date) FILTER (WHERE p.status = 'completed') as last_payout
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
      SUM(p.amount) as cancellation_income
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type = 'cancelled'
      AND p.amount > 0
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  dispute_refunds_by_month AS (
    SELECT 
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(ABS(p.amount)) as refund_amount
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type = 'refund_debt'
      AND p.amount < 0
      AND p.status IN ('debit', 'settled')
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  dispute_income_by_month AS (
    SELECT 
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(p.amount) as income_amount
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type = 'debt_collection'
      AND p.status = 'settled'
      AND p.amount > 0
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  final_rows AS (
    SELECT 
      lm.listing_id,
      lm.listing_title,
      TO_CHAR(lm.booking_month, 'Mon YYYY') as month_year,
      lm.booking_month::TEXT as month_date,
      COALESCE(bs.total_nights, 0)::INTEGER as nights_booked,
      COALESCE(bs.completed_count, 0)::INTEGER as completed_count,
      CASE 
        WHEN (COALESCE(bs.completed_count, 0) + COALESCE(bs.cancelled_count, 0)) > 0 
        THEN ROUND((COALESCE(bs.cancelled_count, 0)::NUMERIC / (COALESCE(bs.completed_count, 0) + COALESCE(bs.cancelled_count, 0))) * 100::NUMERIC, 1)
        ELSE 0 
      END as cancel_percentage,
      CASE 
        WHEN DATE_PART('day', DATE_TRUNC('month', lm.booking_month) + INTERVAL '1 month' - INTERVAL '1 day') > 0
        THEN ROUND(
          (COALESCE(bs.total_nights, 0)::NUMERIC / NULLIF(DATE_PART('day', DATE_TRUNC('month', lm.booking_month) + INTERVAL '1 month' - INTERVAL '1 day')::NUMERIC, 0)) * 100::NUMERIC,
          1
        )
        ELSE 0 
      END as occupancy_percentage,
      ROUND(COALESCE(bs.avg_nightly_rate, 0)::NUMERIC, 2) as average_nightly_rate,
      ROUND(COALESCE(ps.total_gross, 0)::NUMERIC, 2) as gross_earnings,
      ROUND(COALESCE(ps.total_commission, 0)::NUMERIC, 2) as platform_fees,
      ROUND(COALESCE(ps.total_net, 0)::NUMERIC, 2) as net_earnings,
      COALESCE(ps.last_payout::TEXT, NULL) as last_payout_date,
      ROUND(COALESCE(ci.cancellation_income, 0)::NUMERIC, 2) as cancellation_income,
      ROUND(COALESCE(dr.refund_amount, 0)::NUMERIC, 2) as dispute_refunds,
      ROUND(COALESCE(di.income_amount, 0)::NUMERIC, 2) as dispute_income,
      ROUND(
        (COALESCE(ps.total_net, 0) + 
         COALESCE(ci.cancellation_income, 0) + 
         COALESCE(di.income_amount, 0) - 
         COALESCE(dr.refund_amount, 0))::NUMERIC, 
        2
      ) as actual_net_earnings
    FROM listing_months lm
    LEFT JOIN booking_stats bs ON bs.listing_id = lm.listing_id AND bs.booking_month = lm.booking_month
    LEFT JOIN payout_stats ps ON ps.listing_id = lm.listing_id AND ps.booking_month = lm.booking_month
    LEFT JOIN cancellation_income_by_month ci ON ci.listing_id = lm.listing_id AND ci.booking_month = lm.booking_month
    LEFT JOIN dispute_refunds_by_month dr ON dr.listing_id = lm.listing_id AND dr.booking_month = lm.booking_month
    LEFT JOIN dispute_income_by_month di ON di.listing_id = lm.listing_id AND di.booking_month = lm.booking_month
    WHERE lm.booking_month IS NOT NULL
  )
  SELECT *
  FROM final_rows fr
  WHERE (p_min_gross IS NULL OR fr.gross_earnings >= p_min_gross)
    AND (p_max_gross IS NULL OR fr.gross_earnings <= p_max_gross)
    AND (p_min_net IS NULL OR fr.actual_net_earnings >= p_min_net)
    AND (p_max_net IS NULL OR fr.actual_net_earnings <= p_max_net)
  ORDER BY 
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'asc' THEN fr.month_date END ASC,
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'desc' THEN fr.month_date END DESC,
    CASE WHEN p_sort_by = 'gross_earnings' AND p_sort_order = 'asc' THEN fr.gross_earnings END ASC,
    CASE WHEN p_sort_by = 'gross_earnings' AND p_sort_order = 'desc' THEN fr.gross_earnings END DESC,
    CASE WHEN p_sort_by = 'actual_net_earnings' AND p_sort_order = 'asc' THEN fr.actual_net_earnings END ASC,
    CASE WHEN p_sort_by = 'actual_net_earnings' AND p_sort_order = 'desc' THEN fr.actual_net_earnings END DESC,
    CASE WHEN p_sort_by = 'average_nightly_rate' AND p_sort_order = 'asc' THEN fr.average_nightly_rate END ASC,
    CASE WHEN p_sort_by = 'average_nightly_rate' AND p_sort_order = 'desc' THEN fr.average_nightly_rate END DESC,
    fr.month_date DESC, fr.listing_title ASC;
END;
$function$;

-- Recreate simple 3-arg version with same fix
CREATE OR REPLACE FUNCTION public.get_host_earnings_report(
  p_host_user_id uuid,
  p_start_month date,
  p_end_month date
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
  WITH listing_months AS (
    SELECT 
      l.id as listing_id,
      l.title as listing_title,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month
    FROM listings l
    LEFT JOIN bookings b ON b.listing_id = l.id
    WHERE l.host_user_id = p_host_user_id
      AND b.checkin_date >= p_start_month
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
    WHERE b.listing_id IN (SELECT l.id FROM listings l WHERE l.host_user_id = p_host_user_id)
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  payout_stats AS (
    SELECT 
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(p.gross_revenue) as total_gross,
      SUM(p.commission_amount) as total_commission,
      SUM(p.amount) FILTER (WHERE p.transaction_type = 'booking_payout') as total_net,
      MAX(p.payout_date) FILTER (WHERE p.status = 'completed') as last_payout
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
      SUM(p.amount) as cancellation_income
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type = 'cancelled'
      AND p.amount > 0
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  dispute_refunds_by_month AS (
    SELECT 
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(ABS(p.amount)) as refund_amount
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type = 'refund_debt'
      AND p.amount < 0
      AND p.status IN ('debit', 'settled')
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  dispute_income_by_month AS (
    SELECT 
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(p.amount) as income_amount
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type = 'debt_collection'
      AND p.status = 'settled'
      AND p.amount > 0
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  )
  SELECT 
    lm.listing_id,
    lm.listing_title,
    TO_CHAR(lm.booking_month, 'Mon YYYY') as month_year,
    lm.booking_month::TEXT as month_date,
    COALESCE(bs.total_nights, 0)::INTEGER as nights_booked,
    COALESCE(bs.completed_count, 0)::INTEGER as completed_count,
    CASE 
      WHEN (COALESCE(bs.completed_count, 0) + COALESCE(bs.cancelled_count, 0)) > 0 
      THEN ROUND((COALESCE(bs.cancelled_count, 0)::NUMERIC / (COALESCE(bs.completed_count, 0) + COALESCE(bs.cancelled_count, 0))) * 100::NUMERIC, 1)
      ELSE 0 
    END as cancel_percentage,
    CASE 
      WHEN DATE_PART('day', DATE_TRUNC('month', lm.booking_month) + INTERVAL '1 month' - INTERVAL '1 day') > 0
      THEN ROUND(
        (COALESCE(bs.total_nights, 0)::NUMERIC / NULLIF(DATE_PART('day', DATE_TRUNC('month', lm.booking_month) + INTERVAL '1 month' - INTERVAL '1 day')::NUMERIC, 0)) * 100::NUMERIC,
        1
      )
      ELSE 0 
    END as occupancy_percentage,
    ROUND(COALESCE(bs.avg_nightly_rate, 0)::NUMERIC, 2) as average_nightly_rate,
    ROUND(COALESCE(ps.total_gross, 0)::NUMERIC, 2) as gross_earnings,
    ROUND(COALESCE(ps.total_commission, 0)::NUMERIC, 2) as platform_fees,
    ROUND(COALESCE(ps.total_net, 0)::NUMERIC, 2) as net_earnings,
    ps.last_payout::TEXT as last_payout_date,
    ROUND(COALESCE(ci.cancellation_income, 0)::NUMERIC, 2) as cancellation_income,
    ROUND(COALESCE(dr.refund_amount, 0)::NUMERIC, 2) as dispute_refunds,
    ROUND(COALESCE(di.income_amount, 0)::NUMERIC, 2) as dispute_income,
    ROUND(
      (COALESCE(ps.total_net, 0) + 
       COALESCE(ci.cancellation_income, 0) + 
       COALESCE(di.income_amount, 0) - 
       COALESCE(dr.refund_amount, 0))::NUMERIC, 
      2
    ) as actual_net_earnings
  FROM listing_months lm
  LEFT JOIN booking_stats bs ON bs.listing_id = lm.listing_id AND bs.booking_month = lm.booking_month
  LEFT JOIN payout_stats ps ON ps.listing_id = lm.listing_id AND ps.booking_month = lm.booking_month
  LEFT JOIN cancellation_income_by_month ci ON ci.listing_id = lm.listing_id AND ci.booking_month = lm.booking_month
  LEFT JOIN dispute_refunds_by_month dr ON dr.listing_id = lm.listing_id AND dr.booking_month = lm.booking_month
  LEFT JOIN dispute_income_by_month di ON di.listing_id = lm.listing_id AND di.booking_month = lm.booking_month
  WHERE lm.booking_month IS NOT NULL
  ORDER BY lm.booking_month DESC, lm.listing_title ASC;
END;
$function$;