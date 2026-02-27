-- Fix search_path for demo credentials function
DROP FUNCTION IF EXISTS public.get_demo_credentials();

CREATE OR REPLACE FUNCTION public.get_demo_credentials()
RETURNS TABLE(role text, email text, password text) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'admin'::text, 'demo.admin@example.com'::text, 'demo123'::text
  UNION ALL
  SELECT 'host'::text, 'demo.host@example.com'::text, 'demo123'::text
  UNION ALL
  SELECT 'guest'::text, 'demo.guest@example.com'::text, 'demo123'::text
$$;