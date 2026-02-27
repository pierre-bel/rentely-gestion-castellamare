-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_host_earnings_report(uuid, date, date);

-- Recreate with all filter, search, and sorting parameters
CREATE OR REPLACE FUNCTION public.get_host_earnings_report(
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
RETURNS TABLE (
  listing_id uuid,
  listing_title text,
  month_year text,
  month_date date,
  nights_booked bigint,
  completed_count bigint,
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
  WITH monthly_data AS (
    SELECT
      l.id AS listing_id,
      l.title AS listing_title,
      TO_CHAR(b.checkin_date, 'Mon YYYY') AS month_year,
      DATE_TRUNC('month', b.checkin_date)::date AS month_date,
      COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'completed', 'cancelled')) AS nights_booked,
      COUNT(*) FILTER (WHERE b.status = 'completed') AS completed_count,
      ROUND(
        (COUNT(*) FILTER (WHERE b.status = 'cancelled')::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100,
        2
      ) AS cancel_percentage,
      ROUND(AVG(b.subtotal / NULLIF(b.nights, 0)), 2) AS average_nightly_rate,
      COALESCE(SUM(b.host_payout_gross) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS gross_earnings,
      COALESCE(SUM(b.host_commission_amount) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS platform_fees,
      COALESCE(SUM(b.host_payout_net) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS net_earnings,
      COALESCE(
        SUM(
          CASE 
            WHEN b.status = 'cancelled' THEN
              CASE b.cancellation_policy_snapshot->>'refund_percentage'
                WHEN '100' THEN 0
                WHEN '50' THEN b.host_payout_gross * 0.5
                ELSE b.host_payout_gross
              END
            ELSE 0
          END
        ),
        0
      ) AS cancellation_income,
      COALESCE(
        SUM(
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM disputes d 
              WHERE d.booking_id = b.id 
              AND d.user_role = 'guest' 
              AND d.status = 'resolved'
              AND d.approved_refund_amount > 0
            ) THEN (
              SELECT COALESCE(SUM(d.approved_refund_amount), 0)
              FROM disputes d
              WHERE d.booking_id = b.id 
              AND d.user_role = 'guest' 
              AND d.status = 'resolved'
            )
            ELSE 0
          END
        ),
        0
      ) AS dispute_refunds,
      COALESCE(
        SUM(
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM disputes d 
              WHERE d.booking_id = b.id 
              AND d.user_role = 'host' 
              AND d.status = 'resolved'
              AND d.approved_refund_amount > 0
            ) THEN (
              SELECT COALESCE(SUM(d.approved_refund_amount), 0)
              FROM disputes d
              WHERE d.booking_id = b.id 
              AND d.user_role = 'host' 
              AND d.status = 'resolved'
            )
            ELSE 0
          END
        ),
        0
      ) AS dispute_income
    FROM listings l
    LEFT JOIN bookings b ON l.id = b.listing_id
    WHERE l.host_user_id = p_host_user_id
      AND b.checkin_date >= p_start_month
      AND b.checkin_date < p_end_month
      AND (p_listing_ids IS NULL OR l.id = ANY(p_listing_ids))
      AND (p_search_query IS NULL OR l.title ILIKE '%' || p_search_query || '%')
    GROUP BY l.id, l.title, month_date, month_year
  ),
  with_occupancy AS (
    SELECT 
      md.*,
      ROUND(
        (md.nights_booked::numeric / 
          NULLIF(EXTRACT(DAY FROM (DATE_TRUNC('month', md.month_date) + INTERVAL '1 month' - INTERVAL '1 day'))::numeric, 0)
        ) * 100,
        2
      ) AS occupancy_percentage,
      (md.net_earnings + md.cancellation_income + md.dispute_income - md.dispute_refunds) AS actual_net_earnings
    FROM monthly_data md
  ),
  with_payout AS (
    SELECT 
      wo.*,
      (
        SELECT MAX(p.payout_date)
        FROM payouts p
        JOIN bookings b ON p.booking_id = b.id
        WHERE b.listing_id = wo.listing_id
          AND DATE_TRUNC('month', b.checkin_date) = DATE_TRUNC('month', wo.month_date)
          AND p.status = 'completed'
      ) AS last_payout_date
    FROM with_occupancy wo
  )
  SELECT 
    wp.listing_id,
    wp.listing_title,
    wp.month_year,
    wp.month_date,
    wp.nights_booked,
    wp.completed_count,
    wp.cancel_percentage,
    wp.occupancy_percentage,
    wp.average_nightly_rate,
    wp.gross_earnings,
    wp.platform_fees,
    wp.net_earnings,
    wp.last_payout_date,
    wp.cancellation_income,
    wp.dispute_refunds,
    wp.dispute_income,
    wp.actual_net_earnings
  FROM with_payout wp
  WHERE (p_min_gross IS NULL OR wp.gross_earnings >= p_min_gross)
    AND (p_max_gross IS NULL OR wp.gross_earnings <= p_max_gross)
    AND (p_min_net IS NULL OR wp.actual_net_earnings >= p_min_net)
    AND (p_max_net IS NULL OR wp.actual_net_earnings <= p_max_net)
  ORDER BY
    CASE WHEN p_sort_order = 'asc' THEN
      CASE p_sort_by
        WHEN 'month_date' THEN wp.month_date::text
        WHEN 'listing_title' THEN wp.listing_title
        WHEN 'gross_earnings' THEN wp.gross_earnings::text
        WHEN 'net_earnings' THEN wp.actual_net_earnings::text
        ELSE wp.month_date::text
      END
    END ASC,
    CASE WHEN p_sort_order = 'desc' THEN
      CASE p_sort_by
        WHEN 'month_date' THEN wp.month_date::text
        WHEN 'listing_title' THEN wp.listing_title
        WHEN 'gross_earnings' THEN wp.gross_earnings::text
        WHEN 'net_earnings' THEN wp.actual_net_earnings::text
        ELSE wp.month_date::text
      END
    END DESC;
END;
$$;