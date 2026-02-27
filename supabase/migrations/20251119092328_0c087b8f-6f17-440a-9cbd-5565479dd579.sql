-- Fix the security definer issue by explicitly setting SECURITY INVOKER
-- This makes the view use the querying user's permissions instead of the creator's
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
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