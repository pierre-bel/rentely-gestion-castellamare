-- Fix public_listings view to use security_invoker
DROP VIEW IF EXISTS public.public_listings;

CREATE VIEW public.public_listings
WITH (security_invoker = true)
AS
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
FROM public.listings
WHERE status = 'approved'::listing_status;

-- Grant access to all users
GRANT SELECT ON public.public_listings TO anon, authenticated;