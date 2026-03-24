DROP VIEW IF EXISTS public.public_listings;
CREATE VIEW public.public_listings WITH (security_invoker=on) AS
SELECT 
  id,
  host_user_id,
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
FROM listings
WHERE status = 'approved'::listing_status;