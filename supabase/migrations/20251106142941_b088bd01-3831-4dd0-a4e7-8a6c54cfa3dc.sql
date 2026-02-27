-- Create enum for user status
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

-- Add status column to profiles table with default 'active'
ALTER TABLE profiles 
ADD COLUMN status user_status DEFAULT 'active' NOT NULL;

-- Create view for admin user management
CREATE OR REPLACE VIEW user_admin_view AS
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

-- Create RPC function for search/filter/sort
CREATE OR REPLACE FUNCTION admin_search_users(
  search_query text DEFAULT NULL,
  status_filter user_status DEFAULT NULL,
  role_filter app_role DEFAULT NULL,
  sort_by text DEFAULT 'created_at',
  sort_order text DEFAULT 'desc'
)
RETURNS TABLE (
  id uuid,
  user_display_id text,
  first_name text,
  last_name text,
  full_name text,
  email text,
  avatar_url text,
  status user_status,
  created_at timestamptz,
  primary_role text,
  listings_count int,
  bookings_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can search users';
  END IF;

  RETURN QUERY
  SELECT 
    v.id,
    v.user_display_id,
    v.first_name,
    v.last_name,
    v.full_name,
    v.email,
    v.avatar_url,
    v.status,
    v.created_at,
    v.primary_role::text,
    v.listings_count,
    v.bookings_count
  FROM user_admin_view v
  WHERE 
    (search_query IS NULL OR 
     v.full_name ILIKE '%' || search_query || '%' OR 
     v.email ILIKE '%' || search_query || '%')
    AND
    (status_filter IS NULL OR v.status = status_filter)
    AND
    (role_filter IS NULL OR v.primary_role::app_role = role_filter)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN v.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN v.created_at END ASC,
    CASE WHEN sort_by = 'full_name' AND sort_order = 'asc' THEN v.full_name END ASC,
    CASE WHEN sort_by = 'full_name' AND sort_order = 'desc' THEN v.full_name END DESC,
    v.created_at DESC;
END;
$$;