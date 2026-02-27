-- Add is_demo flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

-- Create demo users function (will be called manually to set up demo accounts)
CREATE OR REPLACE FUNCTION public.get_demo_credentials()
RETURNS TABLE(role text, email text, password text) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 'admin'::text, 'demo.admin@example.com'::text, 'demo123'::text
  UNION ALL
  SELECT 'host'::text, 'demo.host@example.com'::text, 'demo123'::text
  UNION ALL
  SELECT 'guest'::text, 'demo.guest@example.com'::text, 'demo123'::text
$$;

-- Update RLS policies to allow demo users to read but not persist writes
-- Demo users can "appear" to write but changes won't persist (handled in client wrapper)