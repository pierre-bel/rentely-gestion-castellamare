-- Create function to get weekly revenue report
CREATE OR REPLACE FUNCTION admin_get_weekly_revenue_report(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  week_start DATE,
  week_end DATE,
  week_label TEXT,
  bookings_count INTEGER,
  gross_revenue NUMERIC,
  refunds_amount NUMERIC,
  host_payouts_amount NUMERIC,
  net_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  WITH week_series AS (
    SELECT 
      date_trunc('week', generate_series)::DATE as week_start,
      (date_trunc('week', generate_series) + INTERVAL '6 days')::DATE as week_end
    FROM generate_series(
      date_trunc('week', p_start_date::TIMESTAMP),
      date_trunc('week', p_end_date::TIMESTAMP),
      '1 week'::INTERVAL
    )
  ),
  weekly_bookings AS (
    SELECT 
      date_trunc('week', b.created_at)::DATE as week_start,
      COUNT(b.id)::INTEGER as bookings_count,
      COALESCE(SUM(b.total_price), 0) as gross_revenue,
      COALESCE(SUM((
        SELECT ABS(SUM(t.amount))
        FROM transactions t
        WHERE t.booking_id = b.id
          AND t.type = 'refund'
          AND t.status = 'succeeded'
      )), 0) as refunds_amount,
      COALESCE(SUM((
        SELECT SUM(p.amount)
        FROM payouts p
        WHERE p.booking_id = b.id
          AND p.transaction_type IN ('booking_payout', 'cancelled')
      )), 0) as payouts_amount
    FROM bookings b
    WHERE b.status IN ('completed', 'cancelled_guest', 'cancelled_host')
      AND b.created_at >= p_start_date
      AND b.created_at <= p_end_date
    GROUP BY date_trunc('week', b.created_at)::DATE
  )
  SELECT 
    ws.week_start,
    ws.week_end,
    TO_CHAR(ws.week_start, 'Mon DD') || ' - ' || 
      TO_CHAR(ws.week_end, 'Mon DD, YYYY') as week_label,
    COALESCE(wb.bookings_count, 0),
    COALESCE(wb.gross_revenue, 0),
    -COALESCE(wb.refunds_amount, 0),
    -COALESCE(wb.payouts_amount, 0),
    COALESCE(wb.gross_revenue, 0) - 
      COALESCE(wb.refunds_amount, 0) - 
      COALESCE(wb.payouts_amount, 0) as net_revenue
  FROM week_series ws
  LEFT JOIN weekly_bookings wb ON ws.week_start = wb.week_start
  ORDER BY ws.week_start DESC;
END;
$$;

-- Create function for detailed revenue report (for future CSV export)
CREATE OR REPLACE FUNCTION admin_get_detailed_revenue_report(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  booking_id UUID,
  booking_display_id TEXT,
  listing_title TEXT,
  checkin_date DATE,
  checkout_date DATE,
  total_price NUMERIC,
  status TEXT,
  refunds_amount NUMERIC,
  host_payouts_amount NUMERIC,
  net_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    b.id as booking_id,
    CONCAT('B-', SUBSTRING(b.id::TEXT, 1, 8)) as booking_display_id,
    l.title as listing_title,
    b.checkin_date,
    b.checkout_date,
    b.total_price,
    b.status::TEXT,
    -COALESCE((
      SELECT ABS(SUM(t.amount))
      FROM transactions t
      WHERE t.booking_id = b.id
        AND t.type = 'refund'
        AND t.status = 'succeeded'
    ), 0) as refunds_amount,
    -COALESCE((
      SELECT SUM(p.amount)
      FROM payouts p
      WHERE p.booking_id = b.id
        AND p.transaction_type IN ('booking_payout', 'cancelled')
    ), 0) as host_payouts_amount,
    b.total_price - 
      COALESCE((
        SELECT ABS(SUM(t.amount))
        FROM transactions t
        WHERE t.booking_id = b.id
          AND t.type = 'refund'
          AND t.status = 'succeeded'
      ), 0) -
      COALESCE((
        SELECT SUM(p.amount)
        FROM payouts p
        WHERE p.booking_id = b.id
          AND p.transaction_type IN ('booking_payout', 'cancelled')
      ), 0) as net_revenue
  FROM bookings b
  INNER JOIN listings l ON l.id = b.listing_id
  WHERE b.status IN ('completed', 'cancelled_guest', 'cancelled_host')
    AND b.created_at >= p_start_date
    AND b.created_at <= p_end_date
  ORDER BY b.created_at DESC;
END;
$$;