-- Drop the existing view
DROP VIEW IF EXISTS user_admin_view;

-- Recreate view with security_invoker=on to respect RLS policies
CREATE OR REPLACE VIEW user_admin_view
  WITH (security_invoker=on)
AS
SELECT 
  p.id,
  CONCAT('#', SUBSTRING(p.id::text, 1, 4), '-', SUBSTRING(p.id::text, 5, 2)) as user_display_id,
  p.first_name,
  p.last_name,
  CONCAT(p.first_name, ' ', p.last_name) as full_name,
  p.email,
  p.avatar_url,
  p.status,
  p.created_at,
  COALESCE(
    (SELECT role FROM user_roles 
     WHERE user_id = p.id 
     ORDER BY CASE 
       WHEN role = 'admin' THEN 1
       WHEN role = 'host' THEN 2
       WHEN role = 'guest' THEN 3
       ELSE 4
     END
     LIMIT 1),
    'guest'
  ) as primary_role,
  (SELECT COUNT(*) FROM listings WHERE host_user_id = p.id)::int as listings_count,
  (SELECT COUNT(*) FROM bookings WHERE guest_user_id = p.id)::int as bookings_count
FROM profiles p
ORDER BY p.created_at DESC;

GRANT SELECT ON user_admin_view TO authenticated;