
-- Public view: only exposes date ranges for confirmed/pending bookings on approved listings
CREATE VIEW public.public_booking_dates
WITH (security_invoker = off) AS
SELECT
  b.listing_id,
  b.checkin_date,
  b.checkout_date
FROM public.bookings b
JOIN public.listings l ON l.id = b.listing_id
WHERE b.status IN ('confirmed', 'pending_payment')
  AND l.status = 'approved';

-- Public view: only exposes blocked date ranges for approved listings
CREATE VIEW public.public_listing_availability
WITH (security_invoker = off) AS
SELECT
  la.listing_id,
  la.start_date,
  la.end_date
FROM public.listing_availability la
JOIN public.listings l ON l.id = la.listing_id
WHERE l.status = 'approved';
