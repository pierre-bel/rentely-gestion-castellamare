-- Fix type mismatch in admin_export_reviews_custom_report function
-- Cast varchar columns to text to match return type

CREATE OR REPLACE FUNCTION admin_export_reviews_custom_report(
  p_start_date date,
  p_end_date date,
  p_city_ids uuid[] DEFAULT NULL,
  p_min_ratings integer[] DEFAULT NULL
)
RETURNS TABLE (
  listing_id uuid,
  listing_name text,
  city_name text,
  country_name text,
  user_full_name text,
  review_text text,
  rating integer,
  review_created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    l.id as listing_id,
    l.title::text as listing_name,
    c.name::text as city_name,
    co.name::text as country_name,
    CONCAT(p.first_name, ' ', p.last_name)::text as user_full_name,
    COALESCE(r.text, '')::text as review_text,
    r.rating,
    r.created_at as review_created_at
  FROM reviews r
  INNER JOIN bookings b ON r.booking_id = b.id
  INNER JOIN listings l ON b.listing_id = l.id
  INNER JOIN cities c ON l.city_id = c.id
  INNER JOIN countries co ON c.country_id = co.id
  INNER JOIN profiles p ON r.author_user_id = p.id
  WHERE 
    r.status = 'approved'
    AND l.status = 'approved'
    AND r.created_at::date >= p_start_date
    AND r.created_at::date <= p_end_date
    AND (p_city_ids IS NULL OR c.id = ANY(p_city_ids))
    AND (p_min_ratings IS NULL OR r.rating = ANY(p_min_ratings))
  ORDER BY r.created_at DESC;
END;
$$;