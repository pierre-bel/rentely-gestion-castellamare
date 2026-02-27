-- Create function to get detailed reviews for a specific listing
CREATE OR REPLACE FUNCTION public.admin_get_listing_reviews_detail(
  p_listing_id uuid
)
RETURNS TABLE (
  listing_id uuid,
  listing_title text,
  listing_city text,
  user_name text,
  review_text text,
  rating integer,
  review_created_at timestamp with time zone
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
    TRIM(CONCAT(p.first_name, ' ', COALESCE(p.last_name, ''))) AS user_name,
    COALESCE(r.text, '') AS review_text,
    r.rating,
    r.created_at AS review_created_at
  FROM reviews r
  INNER JOIN bookings b ON b.id = r.booking_id
  INNER JOIN listings l ON l.id = b.listing_id
  INNER JOIN profiles p ON p.id = r.author_user_id
  WHERE r.status = 'approved'
    AND l.id = p_listing_id
  ORDER BY r.created_at DESC;
END;
$function$;