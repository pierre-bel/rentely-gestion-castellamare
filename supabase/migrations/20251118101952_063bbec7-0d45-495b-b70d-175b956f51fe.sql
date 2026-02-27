-- Recreate the simple weekly summary functions for dashboard overview
-- These use created_at for "what happened this week" metrics

CREATE OR REPLACE FUNCTION public.admin_get_weekly_revenue(weeks_back integer DEFAULT 12)
RETURNS TABLE(
  week_start date,
  week_label text,
  revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_weekly_bookings(weeks_back integer DEFAULT 12)
RETURNS TABLE(
  week_start date,
  week_label text,
  booking_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      b.status IN ('confirmed', 'completed', 'cancelled_guest', 'cancelled_host')
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
$function$;