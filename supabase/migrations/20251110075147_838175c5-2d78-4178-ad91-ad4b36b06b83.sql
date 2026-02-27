-- Fix Security Definer View by recreating user_admin_view with security_invoker
-- This ensures the view respects the RLS policies of underlying tables

DROP VIEW IF EXISTS public.user_admin_view CASCADE;

CREATE VIEW public.user_admin_view
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  ('USR-' || SUBSTRING(p.id::text, 1, 8)) as user_display_id,
  p.first_name,
  p.last_name,
  (COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as full_name,
  p.email,
  p.avatar_url,
  p.status,
  p.created_at,
  (
    SELECT ur.role 
    FROM public.user_roles ur 
    WHERE ur.user_id = p.id 
    ORDER BY 
      CASE ur.role
        WHEN 'admin'::app_role THEN 1
        WHEN 'host'::app_role THEN 2
        WHEN 'guest'::app_role THEN 3
      END
    LIMIT 1
  ) as primary_role,
  (SELECT COUNT(*)::integer FROM public.listings WHERE host_user_id = p.id) as listings_count,
  (SELECT COUNT(*)::integer FROM public.bookings WHERE guest_user_id = p.id) as bookings_count
FROM public.profiles p;

-- Enable RLS on the view
ALTER VIEW public.user_admin_view SET (security_invoker = true);

-- Grant access to authenticated users (policies on underlying tables will control actual access)
GRANT SELECT ON public.user_admin_view TO authenticated;