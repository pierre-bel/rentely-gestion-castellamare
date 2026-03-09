
-- Allow anon to see booking dates for approved listings (only dates, no sensitive data exposed via the view)
CREATE POLICY "Anon can view bookings for approved listings"
ON public.bookings
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = bookings.listing_id
    AND listings.status = 'approved'
  )
);

-- Allow anon to see listing availability for approved listings
CREATE POLICY "Anon can view availability for approved listings"
ON public.listing_availability
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_availability.listing_id
    AND listings.status = 'approved'
  )
);
