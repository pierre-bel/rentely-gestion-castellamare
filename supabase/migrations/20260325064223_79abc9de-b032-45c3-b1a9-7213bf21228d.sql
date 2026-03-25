
-- Recreate public_booking_dates WITHOUT security_invoker so anonymous users can read it
-- This view only exposes listing_id and dates — no sensitive data
DROP VIEW IF EXISTS public.public_booking_dates;
CREATE VIEW public.public_booking_dates AS
  SELECT listing_id, checkin_date, checkout_date
  FROM bookings
  WHERE status = ANY (ARRAY['confirmed'::booking_status, 'completed'::booking_status, 'pending_payment'::booking_status]);
