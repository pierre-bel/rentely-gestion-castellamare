-- Fix the ambiguous column reference in get_inbox_conversations function
CREATE OR REPLACE FUNCTION public.get_inbox_conversations(p_user_id UUID)
RETURNS TABLE(
  thread_id UUID,
  other_user_id UUID,
  other_user_name TEXT,
  listing_title TEXT,
  listing_address TEXT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  unread_count BIGINT,
  booking_id UUID
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
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
  FROM public.message_threads t
  LEFT JOIN public.profiles p1 ON p1.id = t.participant_1_id
  LEFT JOIN public.profiles p2 ON p2.id = t.participant_2_id
  LEFT JOIN public.listings l ON l.id = t.listing_id
  WHERE t.participant_1_id = p_user_id OR t.participant_2_id = p_user_id
  ORDER BY t.last_message_at DESC;
END;
$$;