-- Restore public_booking_dates as a non-security_invoker view so anonymous calendar visitors can see booked dates
DROP VIEW IF EXISTS public.public_booking_dates;
CREATE VIEW public.public_booking_dates AS
SELECT listing_id, checkin_date, checkout_date
FROM public.bookings
WHERE status = ANY (ARRAY['confirmed'::booking_status, 'completed'::booking_status, 'pending_payment'::booking_status]);

GRANT SELECT ON public.public_booking_dates TO anon, authenticated;