-- Create function for searching and sorting inbox conversations
CREATE OR REPLACE FUNCTION public.search_inbox_conversations(
  p_user_id uuid,
  p_search_query text DEFAULT NULL,
  p_sort_by text DEFAULT 'recent'
)
RETURNS TABLE(
  thread_id uuid,
  other_user_id uuid,
  other_user_name text,
  listing_title text,
  listing_address text,
  last_message text,
  last_message_time timestamp with time zone,
  unread_count bigint,
  booking_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH user_threads AS (
    SELECT t.id as thread_id
    FROM public.message_threads t
    WHERE t.participant_1_id = p_user_id OR t.participant_2_id = p_user_id
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
      WHEN t.participant_1_id = p_user_id 
      THEN COALESCE(p2.first_name || ' ' || p2.last_name, p2.email)
      ELSE COALESCE(p1.first_name || ' ' || p1.last_name, p1.email)
    END as other_user_name,
    l.title as listing_title,
    l.address as listing_address,
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