-- Fix booking_status enum usage in get_host_earnings_report

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
  WITH monthly_bookings AS (
    SELECT
      b.listing_id,
      l.title AS listing_title,
      TO_CHAR(b.checkin_date, 'Mon YYYY') AS month_year,
      DATE_TRUNC('month', b.checkin_date)::DATE AS month_date,
      COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'completed')) AS nights_booked,
      COUNT(*) FILTER (WHERE b.status = 'completed') AS completed_count,
      ROUND(
        (COUNT(*) FILTER (WHERE b.status IN ('cancelled_guest', 'cancelled_host'))::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
        2
      ) AS cancel_percentage,
      ROUND(AVG(b.subtotal / NULLIF(b.nights,0)), 2) AS average_nightly_rate
    FROM bookings b
    JOIN listings l ON l.id = b.listing_id
    WHERE l.host_user_id = p_host_user_id
      AND b.checkin_date >= p_start_month
      AND b.checkin_date <= p_end_month
      AND (p_search_query IS NULL OR l.title ILIKE '%' || p_search_query || '%')
      AND (p_listing_ids IS NULL OR b.listing_id = ANY(p_listing_ids))
    GROUP BY b.listing_id, l.title, month_year, month_date
  ),
  payout_data AS (
    SELECT
      b.listing_id,
      TO_CHAR(b.checkin_date, 'Mon YYYY') AS month_year,
      SUM(p.booking_host_payout_gross) AS gross_earnings,
      SUM(p.booking_host_commission_amount) AS platform_fees,
      SUM(p.booking_host_payout_net) AS net_earnings,
      MAX(p.payout_date) AS last_payout_date,
      SUM(CASE WHEN p.transaction_type = 'cancelled' AND p.status = 'completed' THEN p.amount ELSE 0 END) AS cancellation_income,
      SUM(CASE WHEN p.transaction_type = 'booking_payout' AND COALESCE(p.total_dispute_refunds,0) > 0 THEN p.total_dispute_refunds ELSE 0 END) AS dispute_refunds,
      SUM(CASE WHEN p.transaction_type = 'debt_collection' AND p.status = 'completed' THEN p.amount ELSE 0 END) AS dispute_income
    FROM payouts p
    JOIN bookings b ON b.id = p.booking_id
    JOIN listings l ON l.id = b.listing_id
    WHERE l.host_user_id = p_host_user_id
      AND b.checkin_date >= p_start_month
      AND b.checkin_date <= p_end_month
      AND (p_listing_ids IS NULL OR b.listing_id = ANY(p_listing_ids))
    GROUP BY b.listing_id, month_year
  )
  SELECT * FROM (
    SELECT
      mb.listing_id,
      mb.listing_title,
      mb.month_year,
      mb.month_date::TEXT AS month_date,
      mb.nights_booked::INTEGER,
      mb.completed_count::INTEGER,
      mb.cancel_percentage,
      ROUND((mb.nights_booked::NUMERIC / NULLIF(30::NUMERIC, 0)) * 100, 2) AS occupancy_percentage,
      mb.average_nightly_rate,
      COALESCE(pd.gross_earnings, 0) AS gross_earnings,
      COALESCE(pd.platform_fees, 0) AS platform_fees,
      COALESCE(pd.net_earnings, 0) AS net_earnings,
      COALESCE(pd.last_payout_date::TEXT, NULL) AS last_payout_date,
      COALESCE(pd.cancellation_income, 0) AS cancellation_income,
      COALESCE(pd.dispute_refunds, 0) AS dispute_refunds,
      COALESCE(pd.dispute_income, 0) AS dispute_income,
      COALESCE(pd.net_earnings, 0) + COALESCE(pd.cancellation_income, 0) + COALESCE(pd.dispute_income, 0) AS actual_net_earnings
    FROM monthly_bookings mb
    LEFT JOIN payout_data pd ON pd.listing_id = mb.listing_id AND pd.month_year = mb.month_year
  ) t
  WHERE (p_min_gross IS NULL OR t.gross_earnings >= p_min_gross)
    AND (p_max_gross IS NULL OR t.gross_earnings <= p_max_gross)
    AND (p_min_net IS NULL OR t.net_earnings >= p_min_net)
    AND (p_max_net IS NULL OR t.net_earnings <= p_max_net)
  ORDER BY 
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'asc' THEN t.month_date END ASC,
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'desc' THEN t.month_date END DESC,
    CASE WHEN p_sort_by = 'listing_title' AND p_sort_order = 'asc' THEN t.listing_title END ASC,
    CASE WHEN p_sort_by = 'listing_title' AND p_sort_order = 'desc' THEN t.listing_title END DESC,
    CASE WHEN p_sort_by = 'gross_earnings' AND p_sort_order = 'asc' THEN t.gross_earnings END ASC,
    CASE WHEN p_sort_by = 'gross_earnings' AND p_sort_order = 'desc' THEN t.gross_earnings END DESC,
    CASE WHEN p_sort_by = 'net_earnings' AND p_sort_order = 'asc' THEN t.net_earnings END ASC,
    CASE WHEN p_sort_by = 'net_earnings' AND p_sort_order = 'desc' THEN t.net_earnings END DESC,
    t.month_date DESC,
    t.listing_title;
END;
$$;