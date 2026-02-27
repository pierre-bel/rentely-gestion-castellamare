-- Drop the overly permissive policy that allows everyone to view all profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create policy allowing users to view their own profile (full access to all columns)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Create policy allowing admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy allowing authenticated users to view basic profile info of users they interact with
-- This allows viewing profiles of hosts/guests in the context of bookings
CREATE POLICY "Users can view profiles of hosts they book with"
ON public.profiles
FOR SELECT
USING (
  auth.role() = 'authenticated' AND (
    -- Can view profile of host whose listing they have a booking for
    EXISTS (
      SELECT 1 FROM public.bookings b
      INNER JOIN public.listings l ON l.id = b.listing_id
      WHERE b.guest_user_id = auth.uid()
      AND l.host_user_id = profiles.id
    )
    OR
    -- Can view profile of guest who has a booking on their listing
    EXISTS (
      SELECT 1 FROM public.bookings b
      INNER JOIN public.listings l ON l.id = b.listing_id
      WHERE l.host_user_id = auth.uid()
      AND b.guest_user_id = profiles.id
    )
    OR
    -- Can view profile of host whose listing is approved (for browsing)
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.host_user_id = profiles.id
      AND l.status = 'approved'::listing_status
    )
  )
);