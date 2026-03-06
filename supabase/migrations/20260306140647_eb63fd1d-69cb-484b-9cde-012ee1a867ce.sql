
-- Add access_token column to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS access_token text UNIQUE;

-- Generate tokens for existing bookings
UPDATE public.bookings SET access_token = encode(gen_random_bytes(16), 'hex') WHERE access_token IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.bookings ALTER COLUMN access_token SET NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN access_token SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- Create public view for the portal (no auth needed)
CREATE OR REPLACE VIEW public.public_booking_portal AS
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
  l.amenities
FROM public.bookings b
JOIN public.listings l ON l.id = b.listing_id;
