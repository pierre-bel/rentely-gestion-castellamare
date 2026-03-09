
DROP VIEW IF EXISTS public.public_booking_dates;
DROP VIEW IF EXISTS public.public_listing_availability;

CREATE VIEW public.public_booking_dates
WITH (security_invoker=on) AS
SELECT 
  listing_id,
  checkin_date,
  checkout_date
FROM public.bookings
WHERE status IN ('confirmed', 'completed', 'pending_payment');

CREATE VIEW public.public_listing_availability
WITH (security_invoker=on) AS
SELECT 
  listing_id,
  start_date,
  end_date
FROM public.listing_availability;

GRANT SELECT ON public.public_booking_dates TO anon, authenticated;
GRANT SELECT ON public.public_listing_availability TO anon, authenticated;
