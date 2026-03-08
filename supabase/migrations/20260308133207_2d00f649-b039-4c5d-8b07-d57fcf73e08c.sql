-- Fix 1: admin_suspend_user - use auth.uid() instead of p_admin_user_id
CREATE OR REPLACE FUNCTION public.admin_suspend_user(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_affected_listings_count INTEGER;
BEGIN
  -- Verify caller is admin using auth.uid()
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  SELECT * INTO v_user FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF v_user.status = 'suspended' THEN
    RAISE EXCEPTION 'User is already suspended';
  END IF;
  
  UPDATE profiles 
  SET status = 'suspended', updated_at = NOW()
  WHERE id = p_user_id;
  
  UPDATE listings 
  SET status = 'blocked', updated_at = NOW()
  WHERE host_user_id = p_user_id 
    AND status IN ('approved', 'pending', 'draft');
  
  GET DIAGNOSTICS v_affected_listings_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'new_status', 'suspended',
    'affected_listings', v_affected_listings_count
  );
END;
$$;

-- Fix 2: admin_unsuspend_user
CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  SELECT * INTO v_user FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF v_user.status != 'suspended' THEN
    RAISE EXCEPTION 'User is not suspended';
  END IF;
  
  UPDATE profiles 
  SET status = 'active', updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'new_status', 'active'
  );
END;
$$;

-- Fix 3: admin_delete_user_soft
CREATE OR REPLACE FUNCTION public.admin_delete_user_soft(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_affected_listings_count INTEGER;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  SELECT * INTO v_user FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
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
  
  UPDATE listings 
  SET status = 'blocked', updated_at = NOW()
  WHERE host_user_id = p_user_id;
  
  GET DIAGNOSTICS v_affected_listings_count = ROW_COUNT;
  
  DELETE FROM auth.users WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'anonymized', true,
    'affected_listings', v_affected_listings_count
  );
END;
$$;

-- Fix 4: admin_get_support_conversations - remove p_admin_user_id
CREATE OR REPLACE FUNCTION public.admin_get_support_conversations(
  p_search_query TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'recent'
)
RETURNS TABLE(
  thread_id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_avatar TEXT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_support_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can access support conversations';
  END IF;

  RETURN QUERY
  WITH support_threads AS (
    SELECT t.id as tid
    FROM public.message_threads t
    WHERE t.thread_type = 'user_to_support'
  ),
  matching_threads AS (
    SELECT DISTINCT st.tid
    FROM support_threads st
    LEFT JOIN public.messages m ON m.thread_id = st.tid
    LEFT JOIN public.message_threads t ON t.id = st.tid
    LEFT JOIN public.profiles p1 ON p1.id = t.participant_1_id
    LEFT JOIN public.profiles p2 ON p2.id = t.participant_2_id
    WHERE 
      p_search_query IS NULL
      OR m.body ILIKE '%' || p_search_query || '%'
      OR COALESCE(
        CASE WHEN p1.id != v_support_id THEN p1.first_name || ' ' || p1.last_name ELSE p2.first_name || ' ' || p2.last_name END,
        CASE WHEN p1.id != v_support_id THEN p1.email ELSE p2.email END
      ) ILIKE '%' || p_search_query || '%'
  )
  SELECT 
    t.id,
    CASE WHEN t.participant_1_id = v_support_id THEN t.participant_2_id ELSE t.participant_1_id END,
    CASE WHEN t.participant_1_id = v_support_id 
      THEN COALESCE(p2.first_name || ' ' || p2.last_name, p2.email)
      ELSE COALESCE(p1.first_name || ' ' || p1.last_name, p1.email)
    END,
    CASE WHEN t.participant_1_id = v_support_id THEN p2.email ELSE p1.email END,
    CASE WHEN t.participant_1_id = v_support_id THEN p2.avatar_url ELSE p1.avatar_url END,
    (SELECT m2.body FROM public.messages m2 WHERE m2.thread_id = t.id ORDER BY m2.created_at DESC LIMIT 1),
    t.last_message_at,
    (SELECT COUNT(*) FROM public.messages m3 WHERE m3.thread_id = t.id AND m3.to_user_id = v_support_id AND m3.read = false)
  FROM matching_threads mt
  INNER JOIN public.message_threads t ON t.id = mt.tid
  LEFT JOIN public.profiles p1 ON p1.id = t.participant_1_id
  LEFT JOIN public.profiles p2 ON p2.id = t.participant_2_id
  ORDER BY
    CASE WHEN p_sort_by = 'recent' THEN t.last_message_at END DESC,
    CASE WHEN p_sort_by = 'oldest' THEN t.last_message_at END ASC;
END;
$$;

-- Fix 5: Replace public_booking_portal view with a secure function
DROP VIEW IF EXISTS public_booking_portal;

CREATE OR REPLACE FUNCTION public.get_booking_portal(p_access_token TEXT)
RETURNS TABLE(
  access_token TEXT,
  booking_id UUID,
  status booking_status,
  checkin_date DATE,
  checkout_date DATE,
  nights INTEGER,
  guests INTEGER,
  total_price NUMERIC,
  subtotal NUMERIC,
  cleaning_fee NUMERIC,
  service_fee NUMERIC,
  taxes NUMERIC,
  pricing_breakdown JSONB,
  igloohome_code TEXT,
  notes TEXT,
  currency TEXT,
  listing_title TEXT,
  cover_image TEXT,
  listing_images TEXT[],
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  checkin_from TIME,
  checkout_until TIME,
  house_rules TEXT,
  property_type property_type,
  bedrooms INTEGER,
  beds INTEGER,
  bathrooms INTEGER,
  amenities TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.access_token,
    b.id AS booking_id,
    b.status,
    b.checkin_date,
    b.checkout_date,
    b.nights,
    b.guests,
    b.total_price,
    b.subtotal,
    b.cleaning_fee,
    b.service_fee,
    b.taxes,
    b.pricing_breakdown,
    b.igloohome_code,
    b.notes,
    b.currency,
    l.title AS listing_title,
    l.cover_image,
    l.images AS listing_images,
    l.address,
    l.city,
    l.state,
    l.country,
    l.postal_code,
    l.latitude,
    l.longitude,
    l.checkin_from,
    l.checkout_until,
    l.house_rules,
    l.type AS property_type,
    l.bedrooms,
    l.beds,
    l.bathrooms,
    l.amenities
  FROM bookings b
  JOIN listings l ON l.id = b.listing_id
  WHERE b.access_token = p_access_token
  LIMIT 1;
$$;

-- Fix 6: Replace user_admin_view with a secure function
DROP VIEW IF EXISTS user_admin_view;

CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
  id UUID,
  user_display_id TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  status user_status,
  created_at TIMESTAMPTZ,
  primary_role app_role,
  listings_count INTEGER,
  bookings_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    ('USR-' || substring(p.id::text, 1, 8))::TEXT AS user_display_id,
    p.first_name,
    p.last_name,
    (COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))::TEXT AS full_name,
    p.email,
    p.avatar_url,
    p.status,
    p.created_at,
    (SELECT ur.role FROM user_roles ur WHERE ur.user_id = p.id ORDER BY
      CASE ur.role WHEN 'admin' THEN 1 WHEN 'host' THEN 2 WHEN 'guest' THEN 3 END
      LIMIT 1
    ) AS primary_role,
    (SELECT count(*)::integer FROM listings WHERE listings.host_user_id = p.id) AS listings_count,
    (SELECT count(*)::integer FROM bookings WHERE bookings.guest_user_id = p.id) AS bookings_count
  FROM profiles p;
END;
$$;
