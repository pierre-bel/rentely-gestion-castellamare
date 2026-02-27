-- Create function to get aggregated reviews report per listing
CREATE OR REPLACE FUNCTION public.admin_get_listings_reviews_report(
  p_start_date date DEFAULT '2020-01-01'::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  listing_id uuid,
  listing_title text,
  listing_city text,
  total_reviews bigint,
  average_rating numeric,
  last_review_date timestamp with time zone
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
    l.id AS listing_id,
    l.title AS listing_title,
    l.city AS listing_city,
    COUNT(r.id)::bigint AS total_reviews,
    ROUND(AVG(r.rating), 1) AS average_rating,
    MAX(r.created_at) AS last_review_date
  FROM listings l
  INNER JOIN bookings b ON b.listing_id = l.id
  INNER JOIN reviews r ON r.booking_id = b.id
  WHERE r.status = 'approved'
    AND r.created_at >= p_start_date
    AND r.created_at <= (p_end_date::DATE + INTERVAL '1 day')
    AND l.status = 'approved'
  GROUP BY l.id, l.title, l.city
  HAVING COUNT(r.id) > 0
  ORDER BY total_reviews DESC, average_rating DESC;
END;
$function$;