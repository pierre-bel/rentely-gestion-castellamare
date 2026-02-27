-- Create efficient function to get only unread inbox conversations for dashboard
CREATE OR REPLACE FUNCTION get_unread_inbox_conversations(p_user_id UUID)
RETURNS TABLE (
  thread_id TEXT,
  other_user_id UUID,
  other_user_name TEXT,
  listing_title TEXT,
  listing_address TEXT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  unread_count BIGINT,
  booking_id UUID,
  is_locked BOOLEAN,
  locked_at TIMESTAMPTZ,
  locked_reason TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH thread_summary AS (
    SELECT 
      m.thread_id,
      CASE 
        WHEN m.from_user_id = p_user_id THEN m.to_user_id 
        ELSE m.from_user_id 
      END AS other_user_id,
      m.listing_id,
      m.booking_id,
      MAX(m.created_at) AS last_message_time,
      (
        SELECT body 
        FROM messages m2 
        WHERE m2.thread_id = m.thread_id 
        ORDER BY m2.created_at DESC 
        LIMIT 1
      ) AS last_message,
      COUNT(CASE WHEN m.to_user_id = p_user_id AND NOT m.read THEN 1 END) AS unread_count
    FROM messages m
    WHERE m.from_user_id = p_user_id OR m.to_user_id = p_user_id
    GROUP BY m.thread_id, other_user_id, m.listing_id, m.booking_id
    HAVING COUNT(CASE WHEN m.to_user_id = p_user_id AND NOT m.read THEN 1 END) > 0
  )
  SELECT 
    ts.thread_id::TEXT,
    ts.other_user_id,
    COALESCE(p.full_name, 'Unknown User') AS other_user_name,
    COALESCE(l.title, 'No listing') AS listing_title,
    COALESCE(l.address, '') AS listing_address,
    ts.last_message,
    ts.last_message_time,
    ts.unread_count,
    ts.booking_id,
    COALESCE(ml.is_locked, false) AS is_locked,
    ml.locked_at,
    ml.locked_reason
  FROM thread_summary ts
  LEFT JOIN profiles p ON p.user_id = ts.other_user_id
  LEFT JOIN listings l ON l.id = ts.listing_id
  LEFT JOIN message_locks ml ON ml.thread_id = ts.thread_id
  ORDER BY ts.last_message_time DESC;
END;
$$;