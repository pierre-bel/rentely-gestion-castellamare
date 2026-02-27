-- Create function for host to search and filter their bookings
CREATE OR REPLACE FUNCTION public.host_search_bookings(
  host_id uuid,
  search_query text DEFAULT NULL,
  status_filter booking_status DEFAULT NULL,
  min_price numeric DEFAULT NULL,
  max_price numeric DEFAULT NULL,
  checkin_start date DEFAULT NULL,
  checkin_end date DEFAULT NULL,
  checkout_start date DEFAULT NULL,
  checkout_end date DEFAULT NULL,
  sort_by text DEFAULT 'created_at',
  sort_order text DEFAULT 'desc'
)
RETURNS TABLE(
  id uuid,
  listing_id uuid,
  listing_title text,
  guest_user_id uuid,
  guest_name text,
  guest_email text,
  guest_avatar text,
  checkin_date date,
  checkout_date date,
  nights integer,
  guests integer,
  total_price numeric,
  status booking_status,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify the caller is a host
  IF NOT has_role(host_id, 'host'::app_role) AND NOT has_role(host_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only hosts can search their bookings';
  END IF;

  RETURN QUERY
  SELECT 
    b.id,
    b.listing_id,
    l.title as listing_title,
    b.guest_user_id,
    (p.first_name || ' ' || p.last_name) as guest_name,
    p.email as guest_email,
    p.avatar_url as guest_avatar,
    b.checkin_date,
    b.checkout_date,
    b.nights,
    b.guests,
    b.total_price,
    b.status,
    b.created_at
  FROM bookings b
  INNER JOIN listings l ON l.id = b.listing_id
  INNER JOIN profiles p ON p.id = b.guest_user_id
  WHERE 
    l.host_user_id = host_id
    AND (search_query IS NULL OR 
         l.title ILIKE '%' || search_query || '%' OR
         p.first_name ILIKE '%' || search_query || '%' OR
         p.last_name ILIKE '%' || search_query || '%' OR
         p.email ILIKE '%' || search_query || '%')
    AND (status_filter IS NULL OR b.status = status_filter)
    AND (min_price IS NULL OR b.total_price >= min_price)
    AND (max_price IS NULL OR b.total_price <= max_price)
    AND (checkin_start IS NULL OR b.checkin_date >= checkin_start)
    AND (checkin_end IS NULL OR b.checkin_date <= checkin_end)
    AND (checkout_start IS NULL OR b.checkout_date >= checkout_start)
    AND (checkout_end IS NULL OR b.checkout_date <= checkout_end)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN b.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN b.created_at END ASC,
    CASE WHEN sort_by = 'total_price' AND sort_order = 'desc' THEN b.total_price END DESC,
    CASE WHEN sort_by = 'total_price' AND sort_order = 'asc' THEN b.total_price END ASC,
    CASE WHEN sort_by = 'checkin_date' AND sort_order = 'desc' THEN b.checkin_date END DESC,
    CASE WHEN sort_by = 'checkin_date' AND sort_order = 'asc' THEN b.checkin_date END ASC,
    b.created_at DESC;
END;
$$;