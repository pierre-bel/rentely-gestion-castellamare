-- Restore original get_host_earnings_report function before occupancy rate changes

DROP FUNCTION IF EXISTS get_host_earnings_report(uuid, date, date, text, uuid[], numeric, numeric, numeric, numeric, text, text);

CREATE OR REPLACE FUNCTION get_host_earnings_report(
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
  month_date text,
  nights_booked int,
  completed_count int,
  cancel_percentage numeric,
  occupancy_percentage numeric,
  average_nightly_rate numeric,
  gross_earnings numeric,
  platform_fees numeric,
  net_earnings numeric,
  last_payout_date timestamptz,
  cancellation_income numeric,
  dispute_refunds numeric,
  dispute_income numeric,
  actual_net_earnings numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH listing_months AS (
    SELECT DISTINCT
      l.id AS listing_id,
      l.title AS listing_title,
      date_trunc('month', b.checkin_date)::date AS booking_month
    FROM listings l
    LEFT JOIN bookings b ON b.listing_id = l.id
      AND date_trunc('month', b.checkin_date)::date >= date_trunc('month', p_start_month)::date
      AND date_trunc('month', b.checkin_date)::date <= date_trunc('month', p_end_month)::date
    WHERE l.host_user_id = p_host_user_id
      AND (p_search_query IS NULL OR l.title ILIKE '%' || p_search_query || '%')
      AND (p_listing_ids IS NULL OR l.id = ANY(p_listing_ids))
  ),
  booking_stats AS (
    SELECT
      lm.listing_id,
      lm.listing_title,
      lm.booking_month,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('confirmed', 'completed')) AS completed_count,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('cancelled_host', 'cancelled_guest')) AS cancelled_count,
      COALESCE(SUM(b.nights) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS total_nights,
      COALESCE(SUM(b.subtotal) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS total_subtotal,
      COALESCE(SUM(b.cleaning_fee) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS total_cleaning_fee,
      COALESCE(SUM(b.host_payout_gross) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS gross_earnings,
      COALESCE(SUM(b.host_commission_amount) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS platform_fees,
      COALESCE(SUM(b.host_payout_net) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS net_earnings
    FROM listing_months lm
    LEFT JOIN bookings b ON b.listing_id = lm.listing_id
      AND date_trunc('month', b.checkin_date)::date = lm.booking_month
    GROUP BY lm.listing_id, lm.listing_title, lm.booking_month
  ),
  payout_info AS (
    SELECT
      bs.listing_id,
      bs.booking_month,
      MAX(p.paid_at) AS last_payout_date
    FROM booking_stats bs
    LEFT JOIN bookings b ON b.listing_id = bs.listing_id
      AND date_trunc('month', b.checkin_date)::date = bs.booking_month
      AND b.status IN ('confirmed', 'completed')
    LEFT JOIN payouts p ON p.booking_id = b.id AND p.status = 'paid'
    GROUP BY bs.listing_id, bs.booking_month
  ),
  financial_adjustments AS (
    SELECT
      bs.listing_id,
      bs.booking_month,
      COALESCE(SUM(
        CASE 
          WHEN b.status IN ('cancelled_host', 'cancelled_guest') 
          AND b.cancellation_refund_guest > 0 
          AND b.cancellation_payout_host > 0
          THEN b.cancellation_payout_host
          ELSE 0
        END
      ), 0) AS cancellation_income,
      COALESCE(SUM(
        CASE 
          WHEN d.resolution_amount_host < 0 
          THEN ABS(d.resolution_amount_host)
          ELSE 0
        END
      ), 0) AS dispute_refunds,
      COALESCE(SUM(
        CASE 
          WHEN d.resolution_amount_host > 0 
          THEN d.resolution_amount_host
          ELSE 0
        END
      ), 0) AS dispute_income
    FROM booking_stats bs
    LEFT JOIN bookings b ON b.listing_id = bs.listing_id
      AND date_trunc('month', b.checkin_date)::date = bs.booking_month
    LEFT JOIN disputes d ON d.booking_id = b.id 
      AND d.status = 'resolved'
    GROUP BY bs.listing_id, bs.booking_month
  )
  SELECT
    bs.listing_id,
    bs.listing_title,
    TO_CHAR(bs.booking_month, 'Mon YYYY') AS month_year,
    bs.booking_month::text AS month_date,
    bs.total_nights::int AS nights_booked,
    bs.completed_count::int,
    CASE 
      WHEN (bs.completed_count + bs.cancelled_count) > 0 
      THEN ROUND((bs.cancelled_count::numeric / (bs.completed_count + bs.cancelled_count)) * 100, 1)
      ELSE 0 
    END AS cancel_percentage,
    CASE 
      WHEN bs.total_nights > 0 
      THEN ROUND((bs.total_nights::numeric / EXTRACT(DAY FROM (bs.booking_month + INTERVAL '1 month' - bs.booking_month))) * 100, 2)
      ELSE 0 
    END AS occupancy_percentage,
    CASE 
      WHEN bs.total_nights > 0 
      THEN ROUND((bs.total_subtotal + bs.total_cleaning_fee) / bs.total_nights, 2)
      ELSE 0 
    END AS average_nightly_rate,
    bs.gross_earnings,
    bs.platform_fees,
    bs.net_earnings,
    pi.last_payout_date,
    fa.cancellation_income,
    fa.dispute_refunds,
    fa.dispute_income,
    (bs.net_earnings + fa.cancellation_income - fa.dispute_refunds + fa.dispute_income) AS actual_net_earnings
  FROM booking_stats bs
  LEFT JOIN payout_info pi ON pi.listing_id = bs.listing_id AND pi.booking_month = bs.booking_month
  LEFT JOIN financial_adjustments fa ON fa.listing_id = bs.listing_id AND fa.booking_month = bs.booking_month
  WHERE (p_min_gross IS NULL OR bs.gross_earnings >= p_min_gross)
    AND (p_max_gross IS NULL OR bs.gross_earnings <= p_max_gross)
    AND (p_min_net IS NULL OR bs.net_earnings >= p_min_net)
    AND (p_max_net IS NULL OR bs.net_earnings <= p_max_net)
  ORDER BY
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'desc' THEN bs.booking_month END DESC,
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'asc' THEN bs.booking_month END ASC,
    CASE WHEN p_sort_by = 'listing_title' AND p_sort_order = 'asc' THEN bs.listing_title END ASC,
    CASE WHEN p_sort_by = 'listing_title' AND p_sort_order = 'desc' THEN bs.listing_title END DESC,
    CASE WHEN p_sort_by = 'gross_earnings' AND p_sort_order = 'desc' THEN bs.gross_earnings END DESC,
    CASE WHEN p_sort_by = 'gross_earnings' AND p_sort_order = 'asc' THEN bs.gross_earnings END ASC,
    CASE WHEN p_sort_by = 'net_earnings' AND p_sort_order = 'desc' THEN bs.net_earnings END DESC,
    CASE WHEN p_sort_by = 'net_earnings' AND p_sort_order = 'asc' THEN bs.net_earnings END ASC;
END;
$$ LANGUAGE plpgsql;