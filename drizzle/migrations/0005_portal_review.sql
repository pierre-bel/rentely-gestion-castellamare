ALTER TABLE public.portal_settings ADD COLUMN IF NOT EXISTS show_payment_qr boolean NOT NULL DEFAULT true;

CREATE OR REPLACE VIEW public.public_portal_settings AS
SELECT host_user_id, welcome_message, show_price, show_address, show_house_rules, show_access_code,
  show_payment_schedule, show_amenities, show_map_link, custom_footer_text, section_order,
  require_full_payment_for_access_code, contact_email, contact_phone, contact_whatsapp,
  contact_facebook_url, show_contact, qr_size, qr_show_details, show_payment_qr
FROM public.portal_settings;

DROP FUNCTION IF EXISTS public.get_booking_portal(text);
CREATE FUNCTION public.get_booking_portal(p_access_token text)
RETURNS TABLE(access_token text, booking_id uuid, status booking_status, checkin_date date, checkout_date date, nights integer, guests integer, total_price numeric, subtotal numeric, cleaning_fee numeric, service_fee numeric, taxes numeric, pricing_breakdown jsonb, igloohome_code text, notes text, currency text, listing_title text, cover_image text, listing_images text[], address text, city text, state text, country text, postal_code text, latitude numeric, longitude numeric, checkin_from text, checkout_until text, house_rules text, property_type property_type, bedrooms integer, beds integer, bathrooms integer, amenities text[], guest_first_name text, guest_last_name text, is_fully_paid boolean, has_access_code boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT b.*, l.host_user_id AS l_host, l.title, l.cover_image AS l_cover, l.images, l.address AS l_address,
      l.city AS l_city, l.state AS l_state, l.country AS l_country, l.postal_code AS l_pc, l.latitude AS l_lat,
      l.longitude AS l_lng, l.checkin_from AS l_in, l.checkout_until AS l_out, l.house_rules AS l_rules,
      l.type AS l_type, l.bedrooms AS l_bedrooms, l.beds AS l_beds, l.bathrooms AS l_baths, l.amenities AS l_amen
    FROM bookings b JOIN listings l ON l.id = b.listing_id
    WHERE b.access_token = p_access_token LIMIT 1
  ), paid AS (
    SELECT NOT EXISTS (SELECT 1 FROM booking_payment_items i, base WHERE i.booking_id = base.id AND NOT i.is_paid) AS ok
  ), req AS (
    SELECT COALESCE((SELECT ps.require_full_payment_for_access_code FROM portal_settings ps, base WHERE ps.host_user_id = base.l_host LIMIT 1), true) AS r
  )
  SELECT b.access_token, b.id, b.status, b.checkin_date, b.checkout_date, b.nights, b.guests, b.total_price,
    b.subtotal, b.cleaning_fee, b.service_fee, b.taxes, b.pricing_breakdown,
    CASE WHEN (SELECT r FROM req) AND NOT (SELECT ok FROM paid) THEN NULL ELSE NULLIF(b.igloohome_code, '') END,
    b.notes, b.currency, b.title, b.l_cover, b.images, b.l_address, b.l_city, b.l_state, b.l_country, b.l_pc,
    b.l_lat, b.l_lng,
    COALESCE(NULLIF(b.checkin_time, ''), y.checkin_time, to_char(b.l_in, 'HH24:MI')),
    COALESCE(NULLIF(b.checkout_time, ''), y.checkout_time, to_char(b.l_out, 'HH24:MI')),
    b.l_rules, b.l_type, b.l_bedrooms, b.l_beds, b.l_baths, b.l_amen,
    COALESCE(t.first_name, CASE WHEN b.guest_user_id <> b.l_host THEN p.first_name END),
    COALESCE(t.last_name, CASE WHEN b.guest_user_id <> b.l_host THEN p.last_name END),
    (SELECT ok FROM paid),
    NULLIF(b.igloohome_code, '') IS NOT NULL
  FROM base b
  LEFT JOIN listing_yearly_stay_times y ON y.listing_id = b.listing_id AND y.year = EXTRACT(YEAR FROM b.checkin_date)::int
  LEFT JOIN tenants t ON t.id::text = b.pricing_breakdown->>'tenant_id'
  LEFT JOIN profiles p ON p.id = b.guest_user_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_booking_portal(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_portal_payment_items(_access_token text)
RETURNS TABLE(id uuid, label text, amount numeric, due_date date, is_paid boolean, paid_at timestamptz, sort_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT i.id, i.label, i.amount, i.due_date, i.is_paid, i.paid_at, i.sort_order
  FROM booking_payment_items i JOIN bookings b ON b.id = i.booking_id
  WHERE b.access_token = _access_token AND _access_token IS NOT NULL
  ORDER BY i.sort_order;
$$;
GRANT EXECUTE ON FUNCTION public.get_portal_payment_items(text) TO anon, authenticated;