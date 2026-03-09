
DROP FUNCTION IF EXISTS public.get_booking_portal(TEXT);

CREATE FUNCTION public.get_booking_portal(p_access_token TEXT)
RETURNS TABLE(
  access_token TEXT,
  booking_id UUID,
  status booking_status,
  checkin_date DATE,
  checkout_date DATE,
  nights INTEGER,
  guests INTEGER,
  total_price NUMERIC,
  subtotal NUMERIC,
  cleaning_fee NUMERIC,
  service_fee NUMERIC,
  taxes NUMERIC,
  pricing_breakdown JSONB,
  igloohome_code TEXT,
  notes TEXT,
  currency TEXT,
  listing_title TEXT,
  cover_image TEXT,
  listing_images TEXT[],
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  checkin_from TIME,
  checkout_until TIME,
  house_rules TEXT,
  property_type property_type,
  bedrooms INTEGER,
  beds INTEGER,
  bathrooms INTEGER,
  amenities TEXT[],
  guest_first_name TEXT,
  guest_last_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.access_token,
    b.id AS booking_id,
    b.status,
    b.checkin_date,
    b.checkout_date,
    b.nights,
    b.guests,
    b.total_price,
    b.subtotal,
    b.cleaning_fee,
    b.service_fee,
    b.taxes,
    b.pricing_breakdown,
    b.igloohome_code,
    b.notes,
    b.currency,
    l.title AS listing_title,
    l.cover_image,
    l.images AS listing_images,
    l.address,
    l.city,
    l.state,
    l.country,
    l.postal_code,
    l.latitude,
    l.longitude,
    l.checkin_from,
    l.checkout_until,
    l.house_rules,
    l.type AS property_type,
    l.bedrooms,
    l.beds,
    l.bathrooms,
    l.amenities,
    p.first_name AS guest_first_name,
    p.last_name AS guest_last_name
  FROM bookings b
  JOIN listings l ON l.id = b.listing_id
  LEFT JOIN profiles p ON p.id = b.guest_user_id
  WHERE b.access_token = p_access_token
  LIMIT 1;
$$;
