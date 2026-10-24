ALTER TABLE public.portal_settings ADD COLUMN IF NOT EXISTS hide_decimals boolean NOT NULL DEFAULT false;

-- Display preference for the host (or any team member of the host)
CREATE OR REPLACE FUNCTION public.get_host_hide_decimals(_host_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT ps.hide_decimals FROM public.portal_settings ps WHERE ps.host_user_id = _host_id LIMIT 1), false);
$$;
REVOKE ALL ON FUNCTION public.get_host_hide_decimals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_host_hide_decimals(uuid) TO authenticated, service_role;

-- Display preference for the guest portal (token-based)
CREATE OR REPLACE FUNCTION public.get_portal_hide_decimals(_access_token text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT ps.hide_decimals
    FROM public.bookings b
    JOIN public.listings l ON l.id = b.listing_id
    JOIN public.portal_settings ps ON ps.host_user_id = l.host_user_id
    WHERE b.access_token = _access_token
    LIMIT 1
  ), false);
$$;
GRANT EXECUTE ON FUNCTION public.get_portal_hide_decimals(text) TO anon, authenticated, service_role;