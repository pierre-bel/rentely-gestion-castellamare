
-- RPC to compute host statistics by month and listing
-- Returns: month, listing_id, listing_title, booked_nights, available_nights, occupancy_rate, revenue, adr, revpar
CREATE OR REPLACE FUNCTION public.get_host_statistics(
  _host_user_id uuid,
  _year integer
)
RETURNS TABLE (
  month integer,
  listing_id uuid,
  listing_title text,
  booked_nights bigint,
  available_nights bigint,
  occupancy_rate numeric,
  revenue numeric,
  adr numeric,
  revpar numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH host_listings AS (
    SELECT id, title FROM public.listings WHERE host_user_id = _host_user_id
  ),
  months AS (
    SELECT generate_series(1, 12) AS m
  ),
  booking_stats AS (
    SELECT
      EXTRACT(MONTH FROM b.checkin_date)::integer AS m,
      b.listing_id,
      SUM(
        -- Count only nights that fall within the target month
        GREATEST(0,
          LEAST(b.checkout_date, (make_date(_year, EXTRACT(MONTH FROM b.checkin_date)::integer, 1) + interval '1 month')::date)::date
          - GREATEST(b.checkin_date, make_date(_year, EXTRACT(MONTH FROM b.checkin_date)::integer, 1))::date
        )
      ) AS booked,
      SUM(b.subtotal) AS rev
    FROM public.bookings b
    JOIN host_listings hl ON hl.id = b.listing_id
    WHERE b.status IN ('confirmed', 'completed')
      AND EXTRACT(YEAR FROM b.checkin_date) = _year
    GROUP BY EXTRACT(MONTH FROM b.checkin_date)::integer, b.listing_id
  ),
  avail_stats AS (
    SELECT
      m.m,
      hl.id AS listing_id,
      -- Days in that month
      (make_date(_year, m.m, 1) + interval '1 month')::date - make_date(_year, m.m, 1) AS days_in_month
    FROM months m
    CROSS JOIN host_listings hl
  )
  SELECT
    a.m AS month,
    a.listing_id,
    hl.title AS listing_title,
    COALESCE(bs.booked, 0) AS booked_nights,
    a.days_in_month::bigint AS available_nights,
    CASE WHEN a.days_in_month > 0
      THEN ROUND(COALESCE(bs.booked, 0)::numeric / a.days_in_month * 100, 1)
      ELSE 0
    END AS occupancy_rate,
    COALESCE(bs.rev, 0) AS revenue,
    CASE WHEN COALESCE(bs.booked, 0) > 0
      THEN ROUND(COALESCE(bs.rev, 0) / bs.booked, 2)
      ELSE 0
    END AS adr,
    CASE WHEN a.days_in_month > 0
      THEN ROUND(COALESCE(bs.rev, 0) / a.days_in_month, 2)
      ELSE 0
    END AS revpar
  FROM avail_stats a
  JOIN host_listings hl ON hl.id = a.listing_id
  LEFT JOIN booking_stats bs ON bs.m = a.m AND bs.listing_id = a.listing_id
  ORDER BY a.m, hl.title;
$$;
