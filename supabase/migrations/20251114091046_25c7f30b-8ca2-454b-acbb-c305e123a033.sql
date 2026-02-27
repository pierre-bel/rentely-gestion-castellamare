-- Drop and recreate get_host_earnings_report with calendar months and available_days
DROP FUNCTION IF EXISTS public.get_host_earnings_report(uuid, date, date, text, uuid[], numeric, numeric, numeric, numeric, text, text);

CREATE OR REPLACE FUNCTION public.get_host_earnings_report(
  p_host_user_id uuid,
  p_start_month date DEFAULT NULL,
  p_end_month date DEFAULT NULL,
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
  actual_net_earnings numeric,
  available_days integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', COALESCE(p_start_month, CURRENT_DATE - INTERVAL '12 months'))::date,
      date_trunc('month', COALESCE(p_end_month, CURRENT_DATE))::date,
      interval '1 month'
    )::date AS booking_month
  ),
  listing_months AS (
    SELECT
      l.id AS listing_id,
      l.title AS listing_title,
      m.booking_month,
      l.created_at,
      l.reviewed_at,
      l.status
    FROM listings l
    CROSS JOIN months m
    WHERE l.host_user_id = p_host_user_id
      AND (p_search_query IS NULL OR l.title ILIKE '%' || p_search_query || '%')
      AND (p_listing_ids IS NULL OR l.id = ANY(p_listing_ids))
      AND l.status = 'approved'
  ),
  listing_available_days AS (
    SELECT 
      lm.listing_id,
      lm.booking_month,
      GREATEST(
        lm.booking_month,
        COALESCE(lm.reviewed_at::date, lm.created_at::date)
      ) AS avail_start,
      (lm.booking_month + INTERVAL '1 month' - INTERVAL '1 day')::date AS avail_end
    FROM listing_months lm
  ),
  available_days_calc AS (
    SELECT
      lad.listing_id,
      lad.booking_month,
      CASE 
        WHEN lad.avail_start > lad.avail_end THEN 0
        ELSE (lad.avail_end - lad.avail_start + 1)
      END::int AS available_days
    FROM listing_available_days lad
  ),
  booking_stats AS (
    SELECT
      lm.listing_id,
      lm.listing_title,
      lm.booking_month,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('confirmed', 'completed')) as completed_count,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('cancelled_host', 'cancelled_guest')) as cancelled_count,
      COALESCE(SUM(b.nights) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) as total_nights,
      COALESCE(SUM(b.subtotal) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) as total_subtotal,
      COALESCE(SUM(b.cleaning_fee) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) as total_cleaning_fee,
      COALESCE(SUM(b.host_payout_gross) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) as gross_earnings,
      COALESCE(SUM(b.host_commission_amount) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) as platform_fees,
      COALESCE(SUM(b.host_payout_net) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) as net_earnings
    FROM listing_months lm
    LEFT JOIN bookings b
      ON b.listing_id = lm.listing_id
      AND date_trunc('month', b.checkin_date)::date = lm.booking_month
    GROUP BY lm.listing_id, lm.listing_title, lm.booking_month
  ),
  payout_info AS (
    SELECT
      bs.listing_id,
      bs.booking_month,
      MAX(p.payout_date) as last_payout_date
    FROM booking_stats bs
    LEFT JOIN bookings b ON b.listing_id = bs.listing_id 
      AND date_trunc('month', b.checkin_date)::date = bs.booking_month
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
      AND date_trunc('month', b.checkin_date)::date = bs.booking_month
    LEFT JOIN transactions t ON t.booking_id = b.id
    GROUP BY bs.listing_id, bs.booking_month
  )
  SELECT
    bs.listing_id,
    bs.listing_title,
    TO_CHAR(bs.booking_month, 'Mon YYYY') as month_year,
    bs.booking_month::text as month_date,
    bs.total_nights::integer as nights_booked,
    bs.completed_count::integer,
    CASE 
      WHEN (bs.completed_count + bs.cancelled_count) > 0 
      THEN ROUND((bs.cancelled_count::numeric / (bs.completed_count + bs.cancelled_count)) * 100, 1)
      ELSE 0 
    END as cancel_percentage,
    CASE 
      WHEN ad.available_days > 0
      THEN ROUND((bs.total_nights::numeric / ad.available_days::numeric) * 100, 2)
      ELSE 0 
    END as occupancy_percentage,
    CASE 
      WHEN bs.total_nights > 0 
      THEN ROUND((bs.total_subtotal + bs.total_cleaning_fee) / bs.total_nights, 2)
      ELSE 0 
    END as average_nightly_rate,
    bs.gross_earnings,
    bs.platform_fees,
    bs.net_earnings,
    pi.last_payout_date,
    COALESCE(fa.cancellation_income, 0) as cancellation_income,
    COALESCE(fa.dispute_refunds, 0) as dispute_refunds,
    COALESCE(fa.dispute_income, 0) as dispute_income,
    (bs.net_earnings + COALESCE(fa.cancellation_income, 0) - COALESCE(fa.dispute_refunds, 0) + COALESCE(fa.dispute_income, 0)) as actual_net_earnings,
    ad.available_days
  FROM booking_stats bs
  LEFT JOIN available_days_calc ad
    ON ad.listing_id = bs.listing_id AND ad.booking_month = bs.booking_month
  LEFT JOIN payout_info pi
    ON pi.listing_id = bs.listing_id AND pi.booking_month = bs.booking_month
  LEFT JOIN financial_adjustments fa
    ON fa.listing_id = bs.listing_id AND fa.booking_month = bs.booking_month
  WHERE (p_min_gross IS NULL OR bs.gross_earnings >= p_min_gross)
    AND (p_max_gross IS NULL OR bs.gross_earnings <= p_max_gross)
    AND (p_min_net IS NULL OR bs.net_earnings >= p_min_net)
    AND (p_max_net IS NULL OR bs.net_earnings <= p_max_net)
  ORDER BY
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'desc' THEN bs.booking_month END DESC,
    CASE WHEN p_sort_by = 'month_date' AND p_sort_order = 'asc' THEN bs.booking_month END ASC,
    bs.listing_title;
END;
$function$;