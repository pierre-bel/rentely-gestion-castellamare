-- Add a new RLS policy to allow viewing booking-listing relationships for approved listings
-- This allows reviews to be displayed for any listing, even if you're not the guest or host

CREATE POLICY "Anyone can view booking-listing connections for approved listings"
ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM listings
    WHERE listings.id = bookings.listing_id
    AND listings.status = 'approved'
  )
);