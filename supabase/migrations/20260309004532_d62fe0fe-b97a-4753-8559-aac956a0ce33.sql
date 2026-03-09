CREATE OR REPLACE VIEW public.embed_host_listings AS
SELECT 
  id,
  host_user_id,
  title,
  city,
  base_price,
  cover_image,
  bedrooms
FROM public.listings
WHERE status = 'approved';

GRANT SELECT ON public.embed_host_listings TO anon, authenticated;