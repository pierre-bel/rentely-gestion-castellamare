-- Drop and recreate admin_search_disputes to include resolution_notes
DROP FUNCTION IF EXISTS public.admin_search_disputes(text, text, text, numeric, numeric, date, date, text, text);

CREATE OR REPLACE FUNCTION public.admin_search_disputes(search_query text DEFAULT NULL::text, status_filter text DEFAULT NULL::text, category_filter text DEFAULT NULL::text, min_amount numeric DEFAULT NULL::numeric, max_amount numeric DEFAULT NULL::numeric, created_start date DEFAULT NULL::date, created_end date DEFAULT NULL::date, sort_by text DEFAULT 'created_at'::text, sort_order text DEFAULT 'desc'::text)
 RETURNS TABLE(id uuid, dispute_display_id text, booking_id uuid, booking_display_id text, listing_id uuid, listing_title text, listing_city text, listing_country text, host_user_id uuid, host_name text, host_email text, host_avatar text, guest_user_id uuid, guest_name text, guest_email text, guest_avatar text, category text, status text, subject text, description text, requested_refund_amount numeric, support_thread_id uuid, resolution_notes text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    d.support_thread_id,
    d.resolution_notes,
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
$function$;