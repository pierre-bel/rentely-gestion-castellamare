-- Create admin_search_bookings function
CREATE OR REPLACE FUNCTION public.admin_search_bookings(
  search_query TEXT DEFAULT NULL,
  status_filter booking_status DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  checkin_start DATE DEFAULT NULL,
  checkin_end DATE DEFAULT NULL,
  checkout_start DATE DEFAULT NULL,
  checkout_end DATE DEFAULT NULL,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE(
  id UUID,
  booking_display_id TEXT,
  listing_id UUID,
  listing_title TEXT,
  listing_city TEXT,
  listing_country TEXT,
  host_user_id UUID,
  host_name TEXT,
  host_email TEXT,
  host_avatar TEXT,
  guest_user_id UUID,
  guest_name TEXT,
  guest_email TEXT,
  guest_avatar TEXT,
  checkin_date DATE,
  checkout_date DATE,
  nights INTEGER,
  guests INTEGER,
  total_price NUMERIC,
  status booking_status,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is an admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can search all bookings';
  END IF;

  RETURN QUERY
  SELECT 
    b.id,
    SUBSTRING(b.id::TEXT, 1, 8) as booking_display_id,
    b.listing_id,
    l.title as listing_title,
    l.city as listing_city,
    l.country as listing_country,
    l.host_user_id,
    (host_prof.first_name || ' ' || host_prof.last_name) as host_name,
    host_prof.email as host_email,
    host_prof.avatar_url as host_avatar,
    b.guest_user_id,
    (guest_prof.first_name || ' ' || guest_prof.last_name) as guest_name,
    guest_prof.email as guest_email,
    guest_prof.avatar_url as guest_avatar,
    b.checkin_date,
    b.checkout_date,
    b.nights,
    b.guests,
    b.total_price,
    b.status,
    b.created_at,
    b.updated_at
  FROM bookings b
  INNER JOIN listings l ON l.id = b.listing_id
  INNER JOIN profiles host_prof ON host_prof.id = l.host_user_id
  INNER JOIN profiles guest_prof ON guest_prof.id = b.guest_user_id
  WHERE 
    (search_query IS NULL OR 
     l.title ILIKE '%' || search_query || '%' OR
     host_prof.first_name ILIKE '%' || search_query || '%' OR
     host_prof.last_name ILIKE '%' || search_query || '%' OR
     host_prof.email ILIKE '%' || search_query || '%' OR
     guest_prof.first_name ILIKE '%' || search_query || '%' OR
     guest_prof.last_name ILIKE '%' || search_query || '%' OR
     guest_prof.email ILIKE '%' || search_query || '%')
    AND
    (status_filter IS NULL OR b.status = status_filter)
    AND
    (min_price IS NULL OR b.total_price >= min_price)
    AND
    (max_price IS NULL OR b.total_price <= max_price)
    AND
    (checkin_start IS NULL OR b.checkin_date >= checkin_start)
    AND
    (checkin_end IS NULL OR b.checkin_date <= checkin_end)
    AND
    (checkout_start IS NULL OR b.checkout_date >= checkout_start)
    AND
    (checkout_end IS NULL OR b.checkout_date <= checkout_end)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN b.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN b.created_at END ASC,
    CASE WHEN sort_by = 'checkin_date' AND sort_order = 'desc' THEN b.checkin_date END DESC,
    CASE WHEN sort_by = 'checkin_date' AND sort_order = 'asc' THEN b.checkin_date END ASC,
    CASE WHEN sort_by = 'total_price' AND sort_order = 'desc' THEN b.total_price END DESC,
    CASE WHEN sort_by = 'total_price' AND sort_order = 'asc' THEN b.total_price END ASC,
    b.created_at DESC;
END;
$$;