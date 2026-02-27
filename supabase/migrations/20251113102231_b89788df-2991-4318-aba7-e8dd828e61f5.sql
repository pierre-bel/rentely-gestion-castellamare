-- Drop the overloaded function with extended parameters
DROP FUNCTION IF EXISTS public.get_host_earnings_report(
  UUID, DATE, DATE, TEXT, UUID[], NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT
);

-- Recreate the overloaded function with corrected logic and filters
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
RETURNS TABLE (
  listing_id UUID,
  listing_title TEXT,
  month_year TEXT,
  month_date TEXT,
  nights_booked INTEGER,
  completed_count INTEGER,
  cancel_percentage NUMERIC,
  occupancy_percentage NUMERIC,
  average_nightly_rate NUMERIC,
  gross_earnings NUMERIC,
  platform_fees NUMERIC,
  net_earnings NUMERIC,
  last_payout_date TEXT,
  cancellation_income NUMERIC,
  dispute_refunds NUMERIC,
  dispute_income NUMERIC,
  actual_net_earnings NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        THEN ROUND((COALESCE(bs.cancelled_count, 0)::NUMERIC / (COALESCE(bs.completed_count, 0) + COALESCE(bs.cancelled_count, 0))) * 100, 1)
        ELSE 0 
      END as cancel_percentage,
      CASE 
        WHEN DATE_PART('day', DATE_TRUNC('month', lm.booking_month) + INTERVAL '1 month' - INTERVAL '1 day') > 0
        THEN ROUND((COALESCE(bs.total_nights, 0)::NUMERIC / DATE_PART('day', DATE_TRUNC('month', lm.booking_month) + INTERVAL '1 month' - INTERVAL '1 day')) * 100, 1)
        ELSE 0 
      END as occupancy_percentage,
      ROUND(COALESCE(bs.avg_nightly_rate, 0), 2) as average_nightly_rate,
      ROUND(COALESCE(ps.total_gross, 0), 2) as gross_earnings,
      ROUND(COALESCE(ps.total_commission, 0), 2) as platform_fees,
      ROUND(COALESCE(ps.total_net, 0), 2) as net_earnings,
      COALESCE(ps.last_payout::TEXT, NULL) as last_payout_date,
      ROUND(COALESCE(ci.cancellation_income, 0), 2) as cancellation_income,
      ROUND(COALESCE(dr.refund_amount, 0), 2) as dispute_refunds,
      ROUND(COALESCE(di.income_amount, 0), 2) as dispute_income,
      ROUND(
        COALESCE(ps.total_net, 0) + 
        COALESCE(ci.cancellation_income, 0) + 
        COALESCE(di.income_amount, 0) - 
        COALESCE(dr.refund_amount, 0), 
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
$$;