-- Create admin_search_disputes function
CREATE OR REPLACE FUNCTION admin_search_disputes(
  search_query TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  min_amount NUMERIC DEFAULT NULL,
  max_amount NUMERIC DEFAULT NULL,
  created_start DATE DEFAULT NULL,
  created_end DATE DEFAULT NULL,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  id UUID,
  dispute_display_id TEXT,
  booking_id UUID,
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
  category TEXT,
  status TEXT,
  subject TEXT,
  description TEXT,
  requested_refund_amount NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Security check: only admins can search disputes
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    d.id,
    CONCAT('D-', SUBSTRING(d.id::TEXT, 1, 8)) AS dispute_display_id,
    d.booking_id,
    CONCAT('B-', SUBSTRING(b.id::TEXT, 1, 8)) AS booking_display_id,
    d.listing_id,
    l.title AS listing_title,
    l.city AS listing_city,
    l.country AS listing_country,
    l.host_user_id,
    CONCAT(host_p.first_name, ' ', host_p.last_name) AS host_name,
    host_p.email AS host_email,
    host_p.avatar_url AS host_avatar,
    b.guest_user_id,
    CONCAT(guest_p.first_name, ' ', guest_p.last_name) AS guest_name,
    guest_p.email AS guest_email,
    guest_p.avatar_url AS guest_avatar,
    d.category::TEXT,
    d.status::TEXT,
    d.subject,
    d.description,
    d.requested_refund_amount,
    d.created_at,
    d.updated_at
  FROM disputes d
  INNER JOIN bookings b ON b.id = d.booking_id
  INNER JOIN listings l ON l.id = d.listing_id
  INNER JOIN profiles host_p ON host_p.id = l.host_user_id
  INNER JOIN profiles guest_p ON guest_p.id = b.guest_user_id
  WHERE
    -- Search filter
    (search_query IS NULL OR 
     d.subject ILIKE '%' || search_query || '%' OR
     d.description ILIKE '%' || search_query || '%' OR
     l.title ILIKE '%' || search_query || '%' OR
     host_p.email ILIKE '%' || search_query || '%' OR
     guest_p.email ILIKE '%' || search_query || '%' OR
     CONCAT(host_p.first_name, ' ', host_p.last_name) ILIKE '%' || search_query || '%' OR
     CONCAT(guest_p.first_name, ' ', guest_p.last_name) ILIKE '%' || search_query || '%')
    -- Status filter
    AND (status_filter IS NULL OR d.status::TEXT = status_filter)
    -- Category filter
    AND (category_filter IS NULL OR d.category::TEXT = category_filter)
    -- Amount filter
    AND (min_amount IS NULL OR d.requested_refund_amount >= min_amount)
    AND (max_amount IS NULL OR d.requested_refund_amount <= max_amount)
    -- Created date filter
    AND (created_start IS NULL OR d.created_at::DATE >= created_start)
    AND (created_end IS NULL OR d.created_at::DATE <= created_end)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN d.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN d.created_at END ASC,
    CASE WHEN sort_by = 'updated_at' AND sort_order = 'desc' THEN d.updated_at END DESC,
    CASE WHEN sort_by = 'updated_at' AND sort_order = 'asc' THEN d.updated_at END ASC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'desc' THEN d.requested_refund_amount END DESC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'asc' THEN d.requested_refund_amount END ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;