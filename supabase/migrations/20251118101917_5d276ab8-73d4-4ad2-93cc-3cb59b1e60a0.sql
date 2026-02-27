-- Drop old weekly revenue functions that won't be used
DROP FUNCTION IF EXISTS public.admin_get_weekly_revenue(integer);
DROP FUNCTION IF EXISTS public.admin_get_weekly_bookings(integer);

-- Update admin_get_weekly_revenue_report to use checkout_date
CREATE OR REPLACE FUNCTION public.admin_get_weekly_revenue_report(p_start_date date, p_end_date date)
RETURNS TABLE(
  week_start date,
  week_end date,
  week_label text,
  bookings_count integer,
  gross_revenue numeric,
  refunds_amount numeric,
  host_payouts_amount numeric,
  net_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      date_trunc('week', b.checkout_date)::DATE as week_start,
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
      AND b.checkout_date >= p_start_date
      AND b.checkout_date < (p_end_date::DATE + INTERVAL '1 day')
    GROUP BY date_trunc('week', b.checkout_date)::DATE
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
$function$;

-- Update admin_get_detailed_revenue_report to use checkout_date
CREATE OR REPLACE FUNCTION public.admin_get_detailed_revenue_report(p_start_date date, p_end_date date)
RETURNS TABLE(
  booking_id uuid,
  booking_display_id text,
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
SET search_path TO 'public'
AS $function$
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
    AND b.checkout_date >= p_start_date
    AND b.checkout_date < (p_end_date::DATE + INTERVAL '1 day')
  ORDER BY b.checkout_date DESC;
END;
$function$;