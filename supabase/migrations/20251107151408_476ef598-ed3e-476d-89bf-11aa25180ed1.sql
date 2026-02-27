-- Part 1: Enhance messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS thread_id UUID,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_users ON public.messages(from_user_id, to_user_id);

-- Part 2: Create message_threads table
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  participant_1_id UUID NOT NULL,
  participant_2_id UUID NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate threads
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_thread_participants 
ON public.message_threads(LEAST(participant_1_id, participant_2_id), GREATEST(participant_1_id, participant_2_id), COALESCE(booking_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_threads_participants ON public.message_threads(participant_1_id, participant_2_id);
CREATE INDEX IF NOT EXISTS idx_threads_last_message ON public.message_threads(last_message_at DESC);

-- Part 3: Enable RLS on message_threads
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_threads
CREATE POLICY "Users can view their own threads"
ON public.message_threads FOR SELECT
USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

CREATE POLICY "Users can create threads"
ON public.message_threads FOR INSERT
WITH CHECK (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

CREATE POLICY "Users can update their own threads"
ON public.message_threads FOR UPDATE
USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

-- Part 4: Create function to get or create thread
CREATE OR REPLACE FUNCTION public.get_or_create_thread(
  p_participant_1_id UUID,
  p_participant_2_id UUID,
  p_booking_id UUID DEFAULT NULL,
  p_listing_id UUID DEFAULT NULL
) RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id UUID;
  v_min_id UUID;
  v_max_id UUID;
BEGIN
  v_min_id := LEAST(p_participant_1_id, p_participant_2_id);
  v_max_id := GREATEST(p_participant_1_id, p_participant_2_id);
  
  -- Try to find existing thread
  SELECT id INTO v_thread_id
  FROM public.message_threads
  WHERE participant_1_id = v_min_id 
    AND participant_2_id = v_max_id
    AND (booking_id = p_booking_id OR (booking_id IS NULL AND p_booking_id IS NULL))
  LIMIT 1;
  
  -- Create if doesn't exist
  IF v_thread_id IS NULL THEN
    INSERT INTO public.message_threads (
      participant_1_id,
      participant_2_id,
      booking_id,
      listing_id
    ) VALUES (
      v_min_id,
      v_max_id,
      p_booking_id,
      p_listing_id
    )
    RETURNING id INTO v_thread_id;
  END IF;
  
  RETURN v_thread_id;
END;
$$;

-- Part 5: Create function to get inbox conversations
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
      SELECT body 
      FROM public.messages 
      WHERE thread_id = t.id 
      ORDER BY created_at DESC 
      LIMIT 1
    ) as last_message,
    t.last_message_at,
    (
      SELECT COUNT(*)
      FROM public.messages
      WHERE thread_id = t.id
        AND to_user_id = p_user_id
        AND read = false
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

-- Part 6: Create trigger to update thread timestamp
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.message_threads
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_thread_timestamp ON public.messages;
CREATE TRIGGER trigger_update_thread_timestamp
AFTER INSERT ON public.messages
FOR EACH ROW
WHEN (NEW.thread_id IS NOT NULL)
EXECUTE FUNCTION update_thread_timestamp();

-- Part 7: Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Part 8: RLS for storage bucket
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view attachments in their threads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments' AND
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.attachment_url LIKE '%' || name
      AND (m.from_user_id = auth.uid() OR m.to_user_id = auth.uid())
  )
);

-- Part 9: Enable realtime for messages and threads
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;