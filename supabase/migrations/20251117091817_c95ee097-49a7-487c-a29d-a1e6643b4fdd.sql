-- Function to suspend user
CREATE OR REPLACE FUNCTION admin_suspend_user(
  p_user_id uuid,
  p_admin_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_affected_listings_count INTEGER;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(p_admin_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Check user exists and get current status
  SELECT * INTO v_user FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF v_user.status = 'suspended' THEN
    RAISE EXCEPTION 'User is already suspended';
  END IF;
  
  -- Update user status
  UPDATE profiles 
  SET status = 'suspended', updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Deactivate all user's listings (if they're a host)
  UPDATE listings 
  SET status = 'inactive', updated_at = NOW()
  WHERE host_user_id = p_user_id 
    AND status IN ('approved', 'pending');
  
  GET DIAGNOSTICS v_affected_listings_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'previous_status', v_user.status,
    'new_status', 'suspended',
    'affected_listings', v_affected_listings_count
  );
END;
$$;

-- Function to soft delete user
CREATE OR REPLACE FUNCTION admin_delete_user_soft(
  p_user_id uuid,
  p_admin_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_affected_listings_count INTEGER;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(p_admin_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Check user exists
  SELECT * INTO v_user FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Anonymize profile (soft delete)
  UPDATE profiles 
  SET 
    status = 'inactive',
    first_name = 'Deleted',
    last_name = 'User',
    email = 'deleted_' || id::text || '@deleted.local',
    avatar_url = NULL,
    about = NULL,
    phone = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Deactivate all user's listings
  UPDATE listings 
  SET status = 'inactive', updated_at = NOW()
  WHERE host_user_id = p_user_id;
  
  GET DIAGNOSTICS v_affected_listings_count = ROW_COUNT;
  
  -- Delete from auth.users (logs them out permanently)
  DELETE FROM auth.users WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'anonymized', true,
    'affected_listings', v_affected_listings_count
  );
END;
$$;

-- Function to unsuspend user
CREATE OR REPLACE FUNCTION admin_unsuspend_user(
  p_user_id uuid,
  p_admin_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(p_admin_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Check user exists and current status
  SELECT * INTO v_user FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF v_user.status != 'suspended' THEN
    RAISE EXCEPTION 'User is not suspended';
  END IF;
  
  -- Update user status to active
  UPDATE profiles 
  SET status = 'active', updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Note: Listings stay inactive, admin must manually re-approve them
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'previous_status', v_user.status,
    'new_status', 'active'
  );
END;
$$;