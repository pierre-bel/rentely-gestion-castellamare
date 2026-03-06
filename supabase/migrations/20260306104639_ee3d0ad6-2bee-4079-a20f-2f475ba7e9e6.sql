
-- Drop and recreate views to include all listing statuses (not just approved)
DROP VIEW IF EXISTS public.public_booking_dates;
DROP VIEW IF EXISTS public.public_listing_availability;

-- Embed listing info view (title + city only, no sensitive data)
CREATE VIEW public.embed_listing_info
WITH (security_invoker = off) AS
SELECT
  l.id,
  l.title,
  l.city,
  l.base_price
FROM public.listings l;

-- Public booking dates: no status filter on listings
CREATE VIEW public.public_booking_dates
WITH (security_invoker = off) AS
SELECT
  b.listing_id,
  b.checkin_date,
  b.checkout_date
FROM public.bookings b
WHERE b.status IN ('confirmed', 'pending_payment');

-- Public listing availability: no status filter on listings
CREATE VIEW public.public_listing_availability
WITH (security_invoker = off) AS
SELECT
  la.listing_id,
  la.start_date,
  la.end_date
FROM public.listing_availability la;
