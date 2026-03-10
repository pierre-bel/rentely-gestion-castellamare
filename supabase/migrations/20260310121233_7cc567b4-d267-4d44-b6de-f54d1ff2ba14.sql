
-- Allow hosts to delete their own listings
CREATE POLICY "Hosts can delete their own listings"
ON public.listings
FOR DELETE
TO authenticated
USING (auth.uid() = host_user_id);

-- Change default status to approved so new listings are always approved
ALTER TABLE public.listings ALTER COLUMN status SET DEFAULT 'approved'::listing_status;
