-- ============================================================================
-- SECURITY FIX: Role-Based Access Control for Critical Tables
-- ============================================================================

-- 1. FIX BOOKINGS TABLE - Remove public access policy
-- ============================================================================
-- The existing role-based policies are already good, we just need to remove
-- the dangerous public policy

DROP POLICY IF EXISTS "Anyone can view booking-listing connections for approved listin" ON public.bookings;


-- 2. CREATE PUBLIC LISTINGS VIEW - Exclude sensitive host_user_id
-- ============================================================================

CREATE OR REPLACE VIEW public.public_listings AS
SELECT 
  id,
  title,
  description,
  type,
  address,
  city,
  state,
  country,
  latitude,
  longitude,
  base_price,
  currency,
  cleaning_fee,
  guests_max,
  bedrooms,
  bathrooms,
  beds,
  min_nights,
  max_nights,
  amenities,
  images,
  cover_image,
  rating_avg,
  rating_count,
  cancellation_policy_id,
  created_at,
  updated_at
  -- EXCLUDED: host_user_id (prevents tracking property owners)
  -- EXCLUDED: status (internal use only)
FROM public.listings
WHERE status = 'approved'::listing_status;

-- Grant read access to everyone
GRANT SELECT ON public.public_listings TO anon, authenticated;


-- 3. ENHANCE REVIEWS POLICIES
-- ============================================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "Approved reviews and own reviews are viewable" ON public.reviews;

-- Create more granular policies
CREATE POLICY "Approved reviews are publicly viewable"
ON public.reviews
FOR SELECT
USING (status = 'approved'::review_status);

CREATE POLICY "Users can view their own reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (auth.uid() = author_user_id);

CREATE POLICY "Hosts can view reviews for their listings"
ON public.reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    INNER JOIN public.listings l ON l.id = b.listing_id
    WHERE b.id = booking_id AND l.host_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));