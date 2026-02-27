-- Add foreign key constraint from payouts to bookings
ALTER TABLE public.payouts
ADD CONSTRAINT payouts_booking_id_fkey
FOREIGN KEY (booking_id)
REFERENCES public.bookings(id)
ON DELETE CASCADE;