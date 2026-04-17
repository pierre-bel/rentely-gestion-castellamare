CREATE OR REPLACE FUNCTION public.host_search_bookings(host_id uuid, search_query text DEFAULT NULL::text, status_filter text DEFAULT NULL::text, min_price numeric DEFAULT NULL::numeric, max_price numeric DEFAULT NULL::numeric, checkin_start date DEFAULT NULL::date, checkin_end date DEFAULT NULL::date, checkout_start date DEFAULT NULL::date, checkout_end date DEFAULT NULL::date, sort_by text DEFAULT 'created_at'::text, sort_order text DEFAULT 'desc'::text)
 RETURNS TABLE(id uuid, listing_id uuid, listing_title text, guest_user_id uuid, guest_name text, guest_email text, guest_avatar text, checkin_date date, checkout_date date, nights integer, guests integer, host_payout_gross numeric, status text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(host_id, 'host'::app_role) AND NOT has_role(host_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only hosts can search their bookings';
  END IF;

  RETURN QUERY
  SELECT 
    b.id,
    b.listing_id,
    l.title as listing_title,
    b.guest_user_id,
    CASE 
      WHEN b.guest_user_id = l.host_user_id AND b.pricing_breakdown IS NOT NULL AND (b.pricing_breakdown->>'tenant_id') IS NOT NULL THEN
        COALESCE(
          (SELECT (t2.first_name || ' ' || COALESCE(t2.last_name, '')) FROM tenants t2 WHERE t2.id = (b.pricing_breakdown->>'tenant_id')::uuid),
          p.first_name || ' ' || p.last_name
        )
      WHEN b.guest_user_id = l.host_user_id AND b.notes IS NOT NULL AND b.notes LIKE 'Locataire:%' THEN
        TRIM(split_part(split_part(b.notes, 'Locataire: ', 2), ' |', 1))
      ELSE
        p.first_name || ' ' || p.last_name
    END as guest_name,
    p.email as guest_email,
    p.avatar_url as guest_avatar,
    b.checkin_date,
    b.checkout_date,
    b.nights,
    b.guests,
    b.host_payout_gross,
    b.status::text,
    b.created_at
  FROM bookings b
  INNER JOIN listings l ON l.id = b.listing_id
  INNER JOIN profiles p ON p.id = b.guest_user_id
  LEFT JOIN tenants t ON (b.pricing_breakdown->>'tenant_id') IS NOT NULL 
    AND t.id = (b.pricing_breakdown->>'tenant_id')::uuid
  WHERE 
    l.host_user_id = host_id
    AND (search_query IS NULL OR 
         l.title ILIKE '%' || search_query || '%' OR
         p.first_name ILIKE '%' || search_query || '%' OR
         p.last_name ILIKE '%' || search_query || '%' OR
         p.email ILIKE '%' || search_query || '%' OR
         t.first_name ILIKE '%' || search_query || '%' OR
         t.last_name ILIKE '%' || search_query || '%' OR
         t.email ILIKE '%' || search_query || '%')
    AND (status_filter IS NULL OR b.status::text = status_filter)
    AND (min_price IS NULL OR b.host_payout_gross >= min_price)
    AND (max_price IS NULL OR b.host_payout_gross <= max_price)
    AND (checkin_start IS NULL OR b.checkin_date >= checkin_start)
    AND (checkin_end IS NULL OR b.checkin_date <= checkin_end)
    AND (checkout_start IS NULL OR b.checkout_date >= checkout_start)
    AND (checkout_end IS NULL OR b.checkout_date <= checkout_end)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN b.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN b.created_at END ASC,
    CASE WHEN sort_by = 'host_payout_gross' AND sort_order = 'desc' THEN b.host_payout_gross END DESC,
    CASE WHEN sort_by = 'host_payout_gross' AND sort_order = 'asc' THEN b.host_payout_gross END ASC,
    CASE WHEN sort_by = 'checkin_date' AND sort_order = 'desc' THEN b.checkin_date END DESC,
    CASE WHEN sort_by = 'checkin_date' AND sort_order = 'asc' THEN b.checkin_date END ASC,
    b.created_at DESC;
END;
$function$;