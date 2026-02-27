-- Drop and recreate with qualified column references
DROP FUNCTION IF EXISTS get_unread_inbox_conversations(uuid);

CREATE OR REPLACE FUNCTION get_unread_inbox_conversations(p_user_id uuid)
RETURNS TABLE (
  thread_id uuid,
  other_user_id uuid,
  other_user_name text,
  listing_title text,
  listing_address text,
  last_message text,
  last_message_time timestamp with time zone,
  unread_count bigint,
  booking_id uuid,
  is_locked boolean,
  locked_at timestamp with time zone,
  locked_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mt.id AS thread_id,
    CASE 
      WHEN mt.participant_1_id = p_user_id THEN mt.participant_2_id
      ELSE mt.participant_1_id
    END AS other_user_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) AS other_user_name,
    COALESCE(l.title, 'No listing') AS listing_title,
    COALESCE(l.address, '') AS listing_address,
    COALESCE(last_msg.body, 'No messages yet') AS last_message,
    mt.last_message_at AS last_message_time,
    COALESCE(unread.count, 0) AS unread_count,
    mt.booking_id,
    mt.is_locked,
    mt.locked_at,
    mt.locked_reason
  FROM message_threads mt
  LEFT JOIN profiles p ON p.id = CASE 
    WHEN mt.participant_1_id = p_user_id THEN mt.participant_2_id
    ELSE mt.participant_1_id
  END
  LEFT JOIN listings l ON l.id = mt.listing_id
  LEFT JOIN LATERAL (
    SELECT m.body 
    FROM messages m
    WHERE m.thread_id = mt.id 
    ORDER BY m.created_at DESC 
    LIMIT 1
  ) last_msg ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS count
    FROM messages m2
    WHERE m2.thread_id = mt.id
      AND m2.to_user_id = p_user_id
      AND m2.read = false
  ) unread ON true
  WHERE (mt.participant_1_id = p_user_id OR mt.participant_2_id = p_user_id)
    AND mt.thread_type = 'user_to_user'
    AND COALESCE(unread.count, 0) > 0
  ORDER BY mt.last_message_at DESC;
END;
$$;