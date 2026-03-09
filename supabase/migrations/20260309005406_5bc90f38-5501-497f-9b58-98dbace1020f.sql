
CREATE OR REPLACE VIEW public.public_booking_dates AS
SELECT 
  listing_id,
  checkin_date,
  checkout_date
FROM public.bookings
WHERE status IN ('confirmed', 'completed', 'pending_payment');

GRANT SELECT ON public.public_booking_dates TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_listing_availability AS
SELECT 
  listing_id,
  start_date,
  end_date
FROM public.listing_availability;

GRANT SELECT ON public.public_listing_availability TO anon, authenticated;
