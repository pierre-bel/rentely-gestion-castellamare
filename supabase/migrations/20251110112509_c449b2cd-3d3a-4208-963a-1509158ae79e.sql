-- 1. Add is_system flag to profiles table
ALTER TABLE public.profiles ADD COLUMN is_system BOOLEAN DEFAULT false;

-- 2. Create thread_type enum
CREATE TYPE thread_type AS ENUM ('user_to_user', 'user_to_support');

-- 3. Add thread_type column to message_threads (default to user_to_user for existing threads)
ALTER TABLE public.message_threads ADD COLUMN thread_type thread_type DEFAULT 'user_to_user';

-- 4. Create index for efficient admin support thread queries
CREATE INDEX idx_threads_support ON public.message_threads(thread_type, last_message_at DESC) 
WHERE thread_type = 'user_to_support';

-- 5. Create function to get or create a support thread for a user
CREATE OR REPLACE FUNCTION public.get_or_create_support_thread(
  p_user_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_support_id UUID := '00000000-0000-0000-0000-000000000001';
  v_thread_id UUID;
  v_min_id UUID;
  v_max_id UUID;
BEGIN
  -- Ensure consistent participant ordering
  v_min_id := LEAST(p_user_id, v_support_id);
  v_max_id := GREATEST(p_user_id, v_support_id);
  
  -- Try to find existing support thread
  SELECT id INTO v_thread_id
  FROM public.message_threads
  WHERE participant_1_id = v_min_id 
    AND participant_2_id = v_max_id
    AND thread_type = 'user_to_support'
  LIMIT 1;
  
  -- Create if doesn't exist
  IF v_thread_id IS NULL THEN
    INSERT INTO public.message_threads (
      participant_1_id,
      participant_2_id,
      thread_type
    ) VALUES (
      v_min_id,
      v_max_id,
      'user_to_support'
    )
    RETURNING id INTO v_thread_id;
  END IF;
  
  RETURN v_thread_id;
END;
$$;

-- 6. Create function for admins to fetch support conversations
CREATE OR REPLACE FUNCTION public.admin_get_support_conversations(
  p_admin_user_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'recent'
) RETURNS TABLE (
  thread_id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_avatar TEXT,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_support_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Verify caller is admin
  IF NOT has_role(p_admin_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can access support conversations';
  END IF;

  RETURN QUERY
  WITH support_threads AS (
    SELECT t.id as thread_id
    FROM public.message_threads t
    WHERE t.thread_type = 'user_to_support'
  ),
  matching_threads AS (
    SELECT DISTINCT st.thread_id
    FROM support_threads st
    LEFT JOIN public.messages m ON m.thread_id = st.thread_id
    LEFT JOIN public.message_threads t ON t.id = st.thread_id
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
    (SELECT m.body FROM public.messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1),
    t.last_message_at,
    (SELECT COUNT(*) FROM public.messages m2 WHERE m2.thread_id = t.id AND m2.to_user_id = v_support_id AND m2.read = false)
  FROM matching_threads mt
  INNER JOIN public.message_threads t ON t.id = mt.thread_id
  LEFT JOIN public.profiles p1 ON p1.id = t.participant_1_id
  LEFT JOIN public.profiles p2 ON p2.id = t.participant_2_id
  ORDER BY
    CASE WHEN p_sort_by = 'recent' THEN t.last_message_at END DESC,
    CASE WHEN p_sort_by = 'oldest' THEN t.last_message_at END ASC;
END;
$$;

-- 7. Update search_inbox_conversations to include support threads
CREATE OR REPLACE FUNCTION public.search_inbox_conversations(p_user_id uuid, p_search_query text DEFAULT NULL::text, p_sort_by text DEFAULT 'recent'::text)
 RETURNS TABLE(thread_id uuid, other_user_id uuid, other_user_name text, listing_title text, listing_address text, last_message text, last_message_time timestamp with time zone, unread_count bigint, booking_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_support_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  RETURN QUERY
  WITH user_threads AS (
    SELECT t.id as thread_id
    FROM public.message_threads t
    WHERE (t.participant_1_id = p_user_id OR t.participant_2_id = p_user_id)
      AND (t.thread_type = 'user_to_user' OR t.thread_type = 'user_to_support')
  ),
  matching_threads AS (
    SELECT DISTINCT ut.thread_id
    FROM user_threads ut
    LEFT JOIN public.messages m ON m.thread_id = ut.thread_id
    LEFT JOIN public.message_threads t ON t.id = ut.thread_id
    LEFT JOIN public.profiles p1 ON p1.id = t.participant_1_id
    LEFT JOIN public.profiles p2 ON p2.id = t.participant_2_id
    LEFT JOIN public.listings l ON l.id = t.listing_id
    WHERE 
      p_search_query IS NULL
      OR m.body ILIKE '%' || p_search_query || '%'
      OR COALESCE(
        CASE 
          WHEN t.participant_1_id = p_user_id THEN p2.first_name || ' ' || p2.last_name
          ELSE p1.first_name || ' ' || p1.last_name
        END, 
        CASE 
          WHEN t.participant_1_id = p_user_id THEN p2.email
          ELSE p1.email
        END
      ) ILIKE '%' || p_search_query || '%'
      OR l.title ILIKE '%' || p_search_query || '%'
      OR l.address ILIKE '%' || p_search_query || '%'
  )
  SELECT 
    t.id as thread_id,
    CASE 
      WHEN t.participant_1_id = p_user_id THEN t.participant_2_id
      ELSE t.participant_1_id
    END as other_user_id,
    CASE 
      WHEN t.thread_type = 'user_to_support' THEN 'Support Team'
      WHEN t.participant_1_id = p_user_id 
      THEN COALESCE(p2.first_name || ' ' || p2.last_name, p2.email)
      ELSE COALESCE(p1.first_name || ' ' || p1.last_name, p1.email)
    END as other_user_name,
    CASE 
      WHEN t.thread_type = 'user_to_support' THEN 'Support Conversation'
      ELSE l.title
    END as listing_title,
    COALESCE(l.address, '') as listing_address,
    (
      SELECT m.body 
      FROM public.messages m
      WHERE m.thread_id = t.id 
      ORDER BY m.created_at DESC 
      LIMIT 1
    ) as last_message,
    t.last_message_at,
    (
      SELECT COUNT(*)
      FROM public.messages m2
      WHERE m2.thread_id = t.id
        AND m2.to_user_id = p_user_id
        AND m2.read = false
    ) as unread_count,
    t.booking_id
  FROM matching_threads mt
  INNER JOIN public.message_threads t ON t.id = mt.thread_id
  LEFT JOIN public.profiles p1 ON p1.id = t.participant_1_id
  LEFT JOIN public.profiles p2 ON p2.id = t.participant_2_id
  LEFT JOIN public.listings l ON l.id = t.listing_id
  ORDER BY
    CASE WHEN p_sort_by = 'recent' THEN t.last_message_at END DESC,
    CASE WHEN p_sort_by = 'oldest' THEN t.last_message_at END ASC;
END;
$function$;

-- 8. RLS Policies for support threads

-- Allow admins to view all support threads
CREATE POLICY "Admins can view support threads"
ON public.message_threads FOR SELECT
TO authenticated
USING (
  thread_type = 'user_to_support' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users to view their own support thread
CREATE POLICY "Users can view their support thread"
ON public.message_threads FOR SELECT
TO authenticated
USING (
  thread_type = 'user_to_support'
  AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
);

-- Allow users to create support threads
CREATE POLICY "Users can create support threads"
ON public.message_threads FOR INSERT
TO authenticated
WITH CHECK (
  thread_type = 'user_to_support'
  AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
);

-- Allow admins to send messages in support threads
CREATE POLICY "Admins can send messages in support threads"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.message_threads 
    WHERE id = thread_id 
    AND thread_type = 'user_to_support'
  )
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to read all support messages
CREATE POLICY "Admins can read support messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.message_threads 
    WHERE id = thread_id 
    AND thread_type = 'user_to_support'
  )
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update support messages (mark as read)
CREATE POLICY "Admins can update support messages"
ON public.messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.message_threads 
    WHERE id = thread_id 
    AND thread_type = 'user_to_support'
  )
  AND has_role(auth.uid(), 'admin'::app_role)
);