ALTER TABLE public.bookings ADD COLUMN checkin_time text DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN checkout_time text DEFAULT NULL;