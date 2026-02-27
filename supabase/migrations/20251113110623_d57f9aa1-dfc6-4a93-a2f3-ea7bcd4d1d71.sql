-- Fix dispute_refunds calculation to only count deductions from booking_payout transactions
-- This prevents double-counting and correctly attributes dispute refunds to the listing whose payout was reduced

DROP FUNCTION IF EXISTS get_host_earnings_report(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_host_earnings_report(UUID);

CREATE OR REPLACE FUNCTION get_host_earnings_report(
  p_host_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  listing_id UUID,
  listing_title TEXT,
  month_year TEXT,
  month_date DATE,
  nights_booked BIGINT,
  completed_count BIGINT,
  cancel_percentage NUMERIC,
  occupancy_percentage NUMERIC,
  average_nightly_rate NUMERIC,
  gross_earnings NUMERIC,
  platform_fees NUMERIC,
  net_earnings NUMERIC,
  last_payout_date TIMESTAMP WITH TIME ZONE,
  cancellation_income NUMERIC,
  dispute_refunds NUMERIC,
  dispute_income NUMERIC,
  actual_net_earnings NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH monthly_bookings AS (
    SELECT
      b.listing_id,
      l.title AS listing_title,
      TO_CHAR(b.checkin_date, 'YYYY-MM') AS month_year,
      DATE_TRUNC('month', b.checkin_date)::DATE AS month_date,
      COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'completed')) AS nights_booked,
      COUNT(*) FILTER (WHERE b.status = 'completed') AS completed_count,
      ROUND(
        (COUNT(*) FILTER (WHERE b.status = 'cancelled')::NUMERIC / 
         NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
        2
      ) AS cancel_percentage,
      ROUND(AVG(b.price_per_night), 2) AS average_nightly_rate
    FROM bookings b
    INNER JOIN listings l ON b.listing_id = l.id
    WHERE b.host_user_id = p_host_user_id
      AND (p_start_date IS NULL OR b.checkin_date >= p_start_date)
      AND (p_end_date IS NULL OR b.checkin_date <= p_end_date)
    GROUP BY b.listing_id, l.title, month_year, month_date
  ),
  payout_data AS (
    SELECT
      b.listing_id,
      TO_CHAR(b.checkin_date, 'YYYY-MM') AS month_year,
      SUM(p.booking_host_payout_gross) AS gross_earnings,
      SUM(p.booking_host_commission_amount) AS platform_fees,
      SUM(p.booking_host_payout_net) AS net_earnings,
      MAX(p.payout_date) AS last_payout_date,
      SUM(
        CASE 
          WHEN p.transaction_type = 'cancelled' AND p.status = 'completed' 
            THEN p.amount
          ELSE 0
        END
      ) AS cancellation_income,
      SUM(
        CASE 
          WHEN p.transaction_type = 'booking_payout' 
            AND COALESCE(p.total_dispute_refunds, 0) > 0 
          THEN p.total_dispute_refunds
          ELSE 0
        END
      ) AS dispute_refunds,
      SUM(
        CASE 
          WHEN p.transaction_type = 'debt_collection' AND p.status = 'completed' 
            THEN p.amount
          ELSE 0
        END
      ) AS dispute_income
    FROM payouts p
    INNER JOIN bookings b ON p.booking_id = b.id
    WHERE p.host_user_id = p_host_user_id
      AND (p_start_date IS NULL OR b.checkin_date >= p_start_date)
      AND (p_end_date IS NULL OR b.checkin_date <= p_end_date)
    GROUP BY b.listing_id, month_year
  )
  SELECT
    mb.listing_id,
    mb.listing_title,
    mb.month_year,
    mb.month_date,
    mb.nights_booked,
    mb.completed_count,
    mb.cancel_percentage,
    ROUND(
      (mb.nights_booked::NUMERIC / NULLIF(30::NUMERIC, 0)) * 100,
      2
    ) AS occupancy_percentage,
    mb.average_nightly_rate,
    COALESCE(pd.gross_earnings, 0) AS gross_earnings,
    COALESCE(pd.platform_fees, 0) AS platform_fees,
    COALESCE(pd.net_earnings, 0) AS net_earnings,
    pd.last_payout_date,
    COALESCE(pd.cancellation_income, 0) AS cancellation_income,
    COALESCE(pd.dispute_refunds, 0) AS dispute_refunds,
    COALESCE(pd.dispute_income, 0) AS dispute_income,
    COALESCE(pd.net_earnings, 0) + COALESCE(pd.cancellation_income, 0) + COALESCE(pd.dispute_income, 0) AS actual_net_earnings
  FROM monthly_bookings mb
  LEFT JOIN payout_data pd ON mb.listing_id = pd.listing_id AND mb.month_year = pd.month_year
  ORDER BY mb.month_date DESC, mb.listing_title;
END;
$$;