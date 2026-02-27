-- Drop existing function
DROP FUNCTION IF EXISTS get_host_earnings_report(UUID, TEXT, DATE, DATE, NUMERIC, NUMERIC);

-- Recreate with corrected occupancy calculation
CREATE OR REPLACE FUNCTION get_host_earnings_report(
  p_host_user_id UUID,
  p_search TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_min_gross NUMERIC DEFAULT NULL,
  p_max_gross NUMERIC DEFAULT NULL
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
  last_payout_date TIMESTAMP WITH TIME ZONE,
  cancellation_income NUMERIC,
  dispute_refunds NUMERIC,
  dispute_income NUMERIC,
  actual_net_earnings NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH listing_months AS (
    SELECT DISTINCT
      l.id as listing_id,
      l.title as listing_title,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      l.created_at,
      l.reviewed_at,
      l.status
    FROM listings l
    LEFT JOIN bookings b ON b.listing_id = l.id
    WHERE l.host_user_id = p_host_user_id
      AND (p_search IS NULL OR l.title ILIKE '%' || p_search || '%')
      AND b.checkin_date IS NOT NULL
      AND (p_start_date IS NULL OR DATE_TRUNC('month', b.checkin_date)::DATE >= p_start_date)
      AND (p_end_date IS NULL OR DATE_TRUNC('month', b.checkin_date)::DATE <= p_end_date)
  ),
  listing_available_days AS (
    SELECT 
      lm.listing_id,
      lm.booking_month,
      CASE 
        -- If listing was created in this month, count days from creation
        WHEN DATE_TRUNC('month', lm.created_at) = lm.booking_month 
          THEN EXTRACT(DAY FROM (DATE_TRUNC('month', lm.booking_month) + INTERVAL '1 month') - lm.created_at)
        -- If listing was approved in this month and status is approved, count from approval date
        WHEN DATE_TRUNC('month', lm.reviewed_at) = lm.booking_month AND lm.status = 'approved'
          THEN EXTRACT(DAY FROM (DATE_TRUNC('month', lm.booking_month) + INTERVAL '1 month') - lm.reviewed_at)
        -- Otherwise count all days in month
        ELSE EXTRACT(DAY FROM DATE_TRUNC('month', lm.booking_month) + INTERVAL '1 month' - INTERVAL '1 day')
      END as available_days
    FROM listing_months lm
    WHERE lm.status = 'approved'
  ),
  booking_stats AS (
    SELECT
      lm.listing_id,
      lm.listing_title,
      lm.booking_month,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('confirmed', 'completed')) as completed_count,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('cancelled_host', 'cancelled_guest')) as cancelled_count,
      SUM(b.nights) FILTER (WHERE b.status IN ('confirmed', 'completed')) as total_nights,
      SUM(b.subtotal) FILTER (WHERE b.status IN ('confirmed', 'completed')) as total_subtotal,
      SUM(b.cleaning_fee) FILTER (WHERE b.status IN ('confirmed', 'completed')) as total_cleaning_fee,
      SUM(b.host_payout_gross) FILTER (WHERE b.status IN ('confirmed', 'completed')) as gross_earnings,
      SUM(b.host_commission_amount) FILTER (WHERE b.status IN ('confirmed', 'completed')) as platform_fees,
      SUM(b.host_payout_net) FILTER (WHERE b.status IN ('confirmed', 'completed')) as net_earnings
    FROM listing_months lm
    LEFT JOIN bookings b ON b.listing_id = lm.listing_id 
      AND DATE_TRUNC('month', b.checkin_date)::DATE = lm.booking_month
    GROUP BY lm.listing_id, lm.listing_title, lm.booking_month
  ),
  payout_info AS (
    SELECT
      bs.listing_id,
      bs.booking_month,
      MAX(p.payout_date) as last_payout_date
    FROM booking_stats bs
    LEFT JOIN bookings b ON b.listing_id = bs.listing_id 
      AND DATE_TRUNC('month', b.checkin_date)::DATE = bs.booking_month
    LEFT JOIN payouts p ON p.booking_id = b.id AND p.status = 'completed'
    GROUP BY bs.listing_id, bs.booking_month
  ),
  financial_adjustments AS (
    SELECT
      bs.listing_id,
      bs.booking_month,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'cancellation_income'), 0) as cancellation_income,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'dispute_refund'), 0) as dispute_refunds,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'dispute_income'), 0) as dispute_income
    FROM booking_stats bs
    LEFT JOIN bookings b ON b.listing_id = bs.listing_id 
      AND DATE_TRUNC('month', b.checkin_date)::DATE = bs.booking_month
    LEFT JOIN transactions t ON t.booking_id = b.id
    GROUP BY bs.listing_id, bs.booking_month
  )
  SELECT
    bs.listing_id,
    bs.listing_title,
    TO_CHAR(bs.booking_month, 'Mon YYYY') as month_year,
    bs.booking_month::TEXT as month_date,
    COALESCE(bs.total_nights, 0)::INTEGER as nights_booked,
    bs.completed_count::INTEGER,
    CASE 
      WHEN (bs.completed_count + bs.cancelled_count) > 0 
      THEN ROUND((bs.cancelled_count::NUMERIC / (bs.completed_count + bs.cancelled_count)) * 100, 1)
      ELSE 0 
    END as cancel_percentage,
    CASE 
      WHEN lad.available_days > 0
      THEN ROUND((COALESCE(bs.total_nights, 0)::NUMERIC / lad.available_days) * 100, 1)
      ELSE 0 
    END as occupancy_percentage,
    CASE 
      WHEN COALESCE(bs.total_nights, 0) > 0 
      THEN ROUND((bs.total_subtotal + bs.total_cleaning_fee) / bs.total_nights, 2)
      ELSE 0 
    END as average_nightly_rate,
    COALESCE(bs.gross_earnings, 0) as gross_earnings,
    COALESCE(bs.platform_fees, 0) as platform_fees,
    COALESCE(bs.net_earnings, 0) as net_earnings,
    pi.last_payout_date,
    COALESCE(fa.cancellation_income, 0) as cancellation_income,
    COALESCE(fa.dispute_refunds, 0) as dispute_refunds,
    COALESCE(fa.dispute_income, 0) as dispute_income,
    (COALESCE(bs.net_earnings, 0) + COALESCE(fa.cancellation_income, 0) - COALESCE(fa.dispute_refunds, 0) + COALESCE(fa.dispute_income, 0)) as actual_net_earnings
  FROM booking_stats bs
  LEFT JOIN listing_available_days lad ON lad.listing_id = bs.listing_id AND lad.booking_month = bs.booking_month
  LEFT JOIN payout_info pi ON pi.listing_id = bs.listing_id AND pi.booking_month = bs.booking_month
  LEFT JOIN financial_adjustments fa ON fa.listing_id = bs.listing_id AND fa.booking_month = bs.booking_month
  WHERE (p_min_gross IS NULL OR COALESCE(bs.gross_earnings, 0) >= p_min_gross)
    AND (p_max_gross IS NULL OR COALESCE(bs.gross_earnings, 0) <= p_max_gross)
  ORDER BY bs.booking_month DESC, bs.listing_title;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;