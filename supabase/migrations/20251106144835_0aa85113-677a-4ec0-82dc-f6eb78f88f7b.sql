-- Create admin function to search and filter reviews
CREATE OR REPLACE FUNCTION public.admin_search_reviews(
  search_query text DEFAULT NULL,
  status_filter review_status DEFAULT NULL,
  sort_by text DEFAULT 'created_at',
  sort_order text DEFAULT 'desc'
)
RETURNS TABLE(
  id uuid,
  booking_id uuid,
  author_user_id uuid,
  rating integer,
  text text,
  status review_status,
  is_public boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  guest_name text,
  guest_email text,
  guest_avatar text,
  host_name text,
  host_email text,
  listing_id uuid,
  listing_title text,
  listing_city text,
  listing_country text,
  booking_checkin date,
  booking_checkout date,
  booking_status booking_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can search reviews';
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.booking_id,
    r.author_user_id,
    r.rating,
    r.text,
    r.status,
    r.is_public,
    r.created_at,
    r.updated_at,
    (guest_prof.first_name || ' ' || guest_prof.last_name) as guest_name,
    guest_prof.email as guest_email,
    guest_prof.avatar_url as guest_avatar,
    (host_prof.first_name || ' ' || host_prof.last_name) as host_name,
    host_prof.email as host_email,
    l.id as listing_id,
    l.title as listing_title,
    l.city as listing_city,
    l.country as listing_country,
    b.checkin_date as booking_checkin,
    b.checkout_date as booking_checkout,
    b.status as booking_status
  FROM reviews r
  INNER JOIN bookings b ON b.id = r.booking_id
  INNER JOIN listings l ON l.id = b.listing_id
  INNER JOIN profiles guest_prof ON guest_prof.id = r.author_user_id
  INNER JOIN profiles host_prof ON host_prof.id = l.host_user_id
  WHERE 
    (search_query IS NULL OR 
     guest_prof.first_name ILIKE '%' || search_query || '%' OR
     guest_prof.last_name ILIKE '%' || search_query || '%' OR
     guest_prof.email ILIKE '%' || search_query || '%' OR
     host_prof.first_name ILIKE '%' || search_query || '%' OR
     host_prof.last_name ILIKE '%' || search_query || '%' OR
     l.title ILIKE '%' || search_query || '%' OR
     r.text ILIKE '%' || search_query || '%')
    AND
    (status_filter IS NULL OR r.status = status_filter)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN r.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN r.created_at END ASC,
    CASE WHEN sort_by = 'rating' AND sort_order = 'desc' THEN r.rating END DESC,
    CASE WHEN sort_by = 'rating' AND sort_order = 'asc' THEN r.rating END ASC,
    r.created_at DESC;
END;
$$;