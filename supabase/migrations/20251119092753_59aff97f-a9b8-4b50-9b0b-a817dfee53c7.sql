-- Drop the existing view first
DROP VIEW IF EXISTS public.public_profiles;

-- Create a SECURITY DEFINER function that returns public profile data
-- This function runs with the creator's permissions, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  about text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT 
    id,
    first_name,
    last_name,
    avatar_url,
    about,
    created_at
  FROM profiles;
$$;

-- Create the view based on the security definer function
CREATE VIEW public.public_profiles AS
SELECT * FROM public.get_public_profiles();

-- Grant SELECT permission to anonymous and authenticated users
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.get_public_profiles() IS 
'Security definer function that returns only public profile fields, allowing safe access to profile data without exposing sensitive information.';

COMMENT ON VIEW public.public_profiles IS 
'Public-facing view of profiles that exposes only non-sensitive fields (first_name, last_name, avatar_url, about). Backed by a SECURITY DEFINER function to allow anonymous access while keeping the profiles table fully protected by RLS.';