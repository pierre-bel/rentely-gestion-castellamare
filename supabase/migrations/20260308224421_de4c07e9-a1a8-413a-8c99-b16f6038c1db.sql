
DROP FUNCTION IF EXISTS public.get_host_reviews(uuid);

CREATE FUNCTION public.get_host_reviews(_host_user_id uuid)
RETURNS TABLE(
  id uuid,
  rating numeric,
  text text,
  status text,
  created_at timestamptz,
  host_response text,
  host_response_at timestamptz,
  listing_id uuid,
  listing_title text,
  booking_id uuid,
  author_user_id uuid,
  guest_first_name text,
  guest_last_name text,
  guest_avatar_url text,
  rating_cleanliness smallint,
  rating_location smallint,
  rating_communication smallint,
  rating_value smallint,
  rating_maintenance smallint
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.rating,
    r.text,
    r.status::text,
    r.created_at,
    r.host_response,
    r.host_response_at,
    r.listing_id,
    l.title AS listing_title,
    r.booking_id,
    r.author_user_id,
    p.first_name AS guest_first_name,
    p.last_name AS guest_last_name,
    p.avatar_url AS guest_avatar_url,
    r.rating_cleanliness,
    r.rating_location,
    r.rating_communication,
    r.rating_value,
    r.rating_maintenance
  FROM reviews r
  JOIN listings l ON l.id = r.listing_id
  LEFT JOIN profiles p ON p.id = r.author_user_id
  WHERE l.host_user_id = _host_user_id
  ORDER BY r.created_at DESC;
$$;
