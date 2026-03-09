-- Allow hosts to delete bookings for their own listings
CREATE POLICY "Hosts can delete bookings for their listings"
ON public.bookings
FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT listings.host_user_id
    FROM listings
    WHERE listings.id = bookings.listing_id
  )
);