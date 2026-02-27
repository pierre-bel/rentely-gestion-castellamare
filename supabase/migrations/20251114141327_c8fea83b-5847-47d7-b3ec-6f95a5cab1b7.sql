-- Create function to get weekly revenue for admin analytics
CREATE OR REPLACE FUNCTION admin_get_weekly_revenue(
  weeks_back INTEGER DEFAULT 12
)
RETURNS TABLE (
  week_start DATE,
  week_label TEXT,
  revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH week_series AS (
    SELECT 
      generate_series(
        date_trunc('week', CURRENT_DATE - (weeks_back || ' weeks')::INTERVAL),
        date_trunc('week', CURRENT_DATE),
        '1 week'::INTERVAL
      )::DATE as week_start
  ),
  weekly_revenue AS (
    SELECT 
      date_trunc('week', b.created_at)::DATE as week_start,
      COALESCE(SUM(b.total_price), 0) as total_revenue
    FROM bookings b
    WHERE 
      b.status IN ('completed', 'cancelled_guest', 'cancelled_host')
      AND b.created_at >= CURRENT_DATE - (weeks_back || ' weeks')::INTERVAL
    GROUP BY date_trunc('week', b.created_at)::DATE
  )
  SELECT 
    ws.week_start,
    'Week ' || EXTRACT(WEEK FROM ws.week_start)::TEXT as week_label,
    COALESCE(wr.total_revenue, 0) as revenue
  FROM week_series ws
  LEFT JOIN weekly_revenue wr ON ws.week_start = wr.week_start
  ORDER BY ws.week_start;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_weekly_revenue TO authenticated;

-- Create function to get weekly booking counts for admin analytics
CREATE OR REPLACE FUNCTION admin_get_weekly_bookings(
  weeks_back INTEGER DEFAULT 12
)
RETURNS TABLE (
  week_start DATE,
  week_label TEXT,
  booking_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH week_series AS (
    SELECT 
      generate_series(
        date_trunc('week', CURRENT_DATE - (weeks_back || ' weeks')::INTERVAL),
        date_trunc('week', CURRENT_DATE),
        '1 week'::INTERVAL
      )::DATE as week_start
  ),
  weekly_bookings AS (
    SELECT 
      date_trunc('week', b.created_at)::DATE as week_start,
      COUNT(*)::INTEGER as booking_count
    FROM bookings b
    WHERE 
      b.status IN ('completed', 'cancelled_guest', 'cancelled_host')
      AND b.created_at >= CURRENT_DATE - (weeks_back || ' weeks')::INTERVAL
    GROUP BY date_trunc('week', b.created_at)::DATE
  )
  SELECT 
    ws.week_start,
    'Week ' || EXTRACT(WEEK FROM ws.week_start)::TEXT as week_label,
    COALESCE(wb.booking_count, 0) as booking_count
  FROM week_series ws
  LEFT JOIN weekly_bookings wb ON ws.week_start = wb.week_start
  ORDER BY ws.week_start;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_weekly_bookings TO authenticated;