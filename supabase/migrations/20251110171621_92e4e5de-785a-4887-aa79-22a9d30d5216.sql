-- Also fix admin_get_support_conversations to show actual listing titles
CREATE OR REPLACE FUNCTION public.admin_get_support_conversations(p_admin_user_id uuid, p_search_query text DEFAULT NULL::text, p_sort_by text DEFAULT 'recent'::text)
 RETURNS TABLE(thread_id uuid, user_id uuid, user_name text, user_email text, user_avatar text, last_message text, last_message_time timestamp with time zone, unread_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;