-- Create a view that only exposes safe, public profile fields
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  first_name,
  last_name,
  avatar_url,
  about,
  created_at
FROM profiles;

-- Grant SELECT permission to anonymous and authenticated users
GRANT SELECT ON public.public_profiles TO anon, authenticated;