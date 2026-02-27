-- Drop ALL versions of the function
DROP FUNCTION IF EXISTS get_host_earnings_report(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_host_earnings_report(uuid, date, date);
DROP FUNCTION IF EXISTS get_host_earnings_report;
DROP FUNCTION IF EXISTS public.get_host_earnings_report;

-- Recreate function with corrected calculations
CREATE OR REPLACE FUNCTION public.get_host_earnings_report(
  p_host_user_id uuid,
  p_start_month date,
  p_end_month date
)
RETURNS TABLE (
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
  cancellation_income numeric,
  dispute_refunds numeric,
  dispute_income numeric,
  actual_net_earnings numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH listing_months AS (
    SELECT DISTINCT
      l.id as listing_id,
      l.title as listing_title,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month
    FROM listings l
    INNER JOIN bookings b ON b.listing_id = l.id
    WHERE l.host_user_id = p_host_user_id
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
      AND b.status IN ('confirmed', 'completed', 'cancelled_guest', 'cancelled_host')
  ),
  booking_stats AS (
    SELECT 
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(b.nights) as total_nights,
      COUNT(*) FILTER (WHERE b.status = 'completed') as completed_count,
      COUNT(*) FILTER (WHERE b.status IN ('cancelled_guest', 'cancelled_host')) as cancelled_count,
      COUNT(*) as total_bookings,
      SUM(b.subtotal + COALESCE(b.cleaning_fee, 0)) as gross_revenue,
      SUM(b.host_commission_amount) as total_commission,
      SUM(b.host_payout_net) as total_net
    FROM bookings b
    WHERE b.listing_id IN (SELECT listing_id FROM listing_months)
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
      AND b.status IN ('confirmed', 'completed', 'cancelled_guest', 'cancelled_host')
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  payout_summary AS (
    SELECT 
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      MAX(p.payout_date) as last_payout_date,
      SUM(p.amount) FILTER (WHERE p.transaction_type = 'booking_payout') as total_net
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
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
      b.listing_id,
      DATE_TRUNC('month', b.checkin_date)::DATE as booking_month,
      SUM(p.amount) as income_amount
    FROM payouts p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.host_user_id = p_host_user_id
      AND p.transaction_type = 'debt_collection'
      AND p.status IN ('completed', 'pending')
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
    GROUP BY b.listing_id, DATE_TRUNC('month', b.checkin_date)
  ),
  actual_net_by_month AS (
    SELECT 
      b.listing_id,
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
      TO_CHAR(lm.booking_month, 'Month YYYY') as month_year,
      lm.booking_month as month_date,
      COALESCE(bs.total_nights, 0) as nights_booked,
      COALESCE(bs.completed_count, 0) as completed_count,
      ROUND(
        CASE 
          WHEN COALESCE(bs.total_bookings, 0) > 0 
          THEN (COALESCE(bs.cancelled_count, 0)::NUMERIC / bs.total_bookings::NUMERIC) * 100
          ELSE 0 
        END, 
        2
      ) as cancel_percentage,
      ROUND(
        CASE 
          WHEN DATE_PART('day', (lm.booking_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE - lm.booking_month + 1) > 0
          THEN (COALESCE(bs.total_nights, 0)::NUMERIC / DATE_PART('day', (lm.booking_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE - lm.booking_month + 1)) * 100
          ELSE 0
        END,
        2
      ) as occupancy_percentage,
      ROUND(
        CASE 
          WHEN COALESCE(bs.total_nights, 0) > 0 
          THEN COALESCE(bs.gross_revenue, 0) / bs.total_nights
          ELSE 0 
        END::NUMERIC, 
        2
      ) as average_nightly_rate,
      ROUND(COALESCE(bs.gross_revenue, 0)::NUMERIC, 2) as gross_earnings,
      ROUND(COALESCE(bs.total_commission, 0)::NUMERIC, 2) as platform_fees,
      ROUND(COALESCE(bs.total_net, 0)::NUMERIC, 2) as net_earnings,
      ps.last_payout_date,
      ROUND(COALESCE(ci.cancellation_income, 0)::NUMERIC, 2) as cancellation_income,
      ROUND(COALESCE(dr.refund_amount, 0)::NUMERIC, 2) as dispute_refunds,
      ROUND(COALESCE(di.income_amount, 0)::NUMERIC, 2) as dispute_income,
      ROUND(COALESCE(an.actual_net, 0)::NUMERIC, 2) as actual_net_earnings
    FROM listing_months lm
    LEFT JOIN booking_stats bs ON bs.listing_id = lm.listing_id AND bs.booking_month = lm.booking_month
    LEFT JOIN payout_summary ps ON ps.listing_id = lm.listing_id AND ps.booking_month = lm.booking_month
    LEFT JOIN cancellation_income_by_month ci ON ci.listing_id = lm.listing_id AND ci.booking_month = lm.booking_month
    LEFT JOIN dispute_refunds_by_month dr ON dr.listing_id = lm.listing_id AND dr.booking_month = lm.booking_month
    LEFT JOIN dispute_income_by_month di ON di.listing_id = lm.listing_id AND di.booking_month = lm.booking_month
    LEFT JOIN actual_net_by_month an ON an.listing_id = lm.listing_id AND an.booking_month = lm.booking_month
  )
  SELECT * FROM final_rows
  ORDER BY month_date DESC, listing_title ASC;
END;
$$;