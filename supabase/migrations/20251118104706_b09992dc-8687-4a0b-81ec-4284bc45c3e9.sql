-- Update admin_get_detailed_revenue_report to include guest information
DROP FUNCTION IF EXISTS admin_get_detailed_revenue_report(DATE, DATE);

CREATE OR REPLACE FUNCTION admin_get_detailed_revenue_report(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  booking_id uuid,
  booking_display_id text,
  guest_user_id uuid,
  guest_first_name text,
  guest_last_name text,
  created_at timestamptz,
  listing_title text,
  checkin_date date,
  checkout_date date,
  total_price numeric,
  status text,
  refunds_amount numeric,
  host_payouts_amount numeric,
  net_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS booking_id,
    CONCAT('B-', SUBSTRING(b.id::text, 1, 8)) AS booking_display_id,
    b.guest_user_id,
    p.first_name AS guest_first_name,
    p.last_name AS guest_last_name,
    b.created_at,
    l.title AS listing_title,
    b.checkin_date,
    b.checkout_date,
    b.total_price,
    b.status::text,
    COALESCE(refunds.total_refund, 0) AS refunds_amount,
    COALESCE(payouts.total_payout, 0) AS host_payouts_amount,
    (b.total_price + COALESCE(refunds.total_refund, 0) + COALESCE(payouts.total_payout, 0)) AS net_revenue
  FROM bookings b
  INNER JOIN listings l ON l.id = b.listing_id
  LEFT JOIN profiles p ON p.id = b.guest_user_id
  LEFT JOIN (
    SELECT
      t.booking_id,
      SUM(t.amount) AS total_refund
    FROM transactions t
    WHERE t.type = 'refund'
    AND t.status = 'completed'
    GROUP BY t.booking_id
  ) refunds ON refunds.booking_id = b.id
  LEFT JOIN (
    SELECT
      py.booking_id,
      SUM(py.amount) AS total_payout
    FROM payouts py
    WHERE py.status = 'completed'
    GROUP BY py.booking_id
  ) payouts ON payouts.booking_id = b.id
  WHERE b.checkout_date >= p_start_date
    AND b.checkout_date < (p_end_date::DATE + INTERVAL '1 day')
    AND b.status IN ('completed', 'cancelled_guest', 'cancelled_host')
  ORDER BY b.checkout_date DESC, b.created_at DESC;
END;
$$;