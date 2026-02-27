-- Fix create_dispute_with_support_thread to reuse locked threads instead of creating duplicates
CREATE OR REPLACE FUNCTION public.create_dispute_with_support_thread(
  p_booking_id uuid,
  p_category dispute_category,
  p_subject text,
  p_description text,
  p_requested_refund_amount numeric DEFAULT NULL,
  p_attachment_urls text[] DEFAULT '{}'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_listing_id UUID;
  v_user_role TEXT;
  v_support_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_thread_id UUID;
  v_thread_is_locked BOOLEAN;
  v_dispute_id UUID;
  v_message_id UUID;
  v_listing_title TEXT;
  v_formatted_message TEXT;
  v_attachment_url TEXT;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Get listing_id and validate access
  SELECT listing_id INTO v_listing_id
  FROM public.bookings
  WHERE id = p_booking_id;
  
  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Determine user role (guest or host)
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = p_booking_id AND guest_user_id = v_user_id
  ) THEN
    v_user_role := 'guest';
  ELSIF EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = v_listing_id AND host_user_id = v_user_id
  ) THEN
    v_user_role := 'host';
  ELSE
    RAISE EXCEPTION 'Unauthorized: You are not associated with this booking';
  END IF;
  
  -- Check for existing active dispute BY THIS USER for this booking
  IF EXISTS (
    SELECT 1 FROM public.disputes
    WHERE booking_id = p_booking_id
    AND initiated_by_user_id = v_user_id
    AND status IN ('open', 'in_progress', 'escalated')
  ) THEN
    RAISE EXCEPTION 'You already have an active dispute for this booking';
  END IF;
  
  -- Get listing title for thread context
  SELECT title INTO v_listing_title
  FROM public.listings
  WHERE id = v_listing_id;
  
  -- Find ANY existing support thread for THIS USER and this booking (locked or not)
  SELECT id, is_locked INTO v_thread_id, v_thread_is_locked
  FROM public.message_threads
  WHERE booking_id = p_booking_id
    AND thread_type = 'user_to_support'
    AND (
      (participant_1_id = v_user_id AND participant_2_id = v_support_user_id)
      OR (participant_1_id = v_support_user_id AND participant_2_id = v_user_id)
    )
  LIMIT 1;
  
  -- If thread exists and is locked, unlock it for reuse
  IF v_thread_id IS NOT NULL AND v_thread_is_locked THEN
    UPDATE public.message_threads
    SET 
      is_locked = false,
      locked_at = NULL,
      locked_reason = NULL,
      updated_at = NOW()
    WHERE id = v_thread_id;
  END IF;
  
  -- Create new thread only if none exists at all
  IF v_thread_id IS NULL THEN
    INSERT INTO public.message_threads (
      participant_1_id,
      participant_2_id,
      booking_id,
      listing_id,
      thread_type
    ) VALUES (
      v_user_id,
      v_support_user_id,
      p_booking_id,
      v_listing_id,
      'user_to_support'
    )
    RETURNING id INTO v_thread_id;
  END IF;
  
  -- Create dispute record
  INSERT INTO public.disputes (
    booking_id,
    listing_id,
    support_thread_id,
    category,
    subject,
    description,
    requested_refund_amount,
    attachment_urls,
    initiated_by_user_id,
    user_role,
    status
  ) VALUES (
    p_booking_id,
    v_listing_id,
    v_thread_id,
    p_category,
    p_subject,
    p_description,
    p_requested_refund_amount,
    p_attachment_urls,
    v_user_id,
    v_user_role,
    'open'
  )
  RETURNING id INTO v_dispute_id;
  
  -- Format initial message WITHOUT markdown, subject, dispute ID, and booking ID
  v_formatted_message := format(
    E'Category: %s\n\n' ||
    E'%s' ||
    CASE WHEN p_requested_refund_amount IS NOT NULL 
      THEN format(E'\n\nRequested Refund: $%s', p_requested_refund_amount::TEXT)
      ELSE ''
    END ||
    format(E'\n\nProperty: %s', v_listing_title),
    REPLACE(p_category::TEXT, '_', ' '),
    p_description,
    v_listing_title
  );
  
  -- Insert initial text message into support thread
  INSERT INTO public.messages (
    thread_id,
    from_user_id,
    to_user_id,
    body,
    read
  ) VALUES (
    v_thread_id,
    v_user_id,
    v_support_user_id,
    v_formatted_message,
    false
  )
  RETURNING id INTO v_message_id;
  
  -- Insert image attachment messages (one per image)
  IF array_length(p_attachment_urls, 1) > 0 THEN
    FOREACH v_attachment_url IN ARRAY p_attachment_urls
    LOOP
      INSERT INTO public.messages (
        thread_id,
        from_user_id,
        to_user_id,
        body,
        attachment_url,
        attachment_type,
        read
      ) VALUES (
        v_thread_id,
        v_user_id,
        v_support_user_id,
        '',
        v_attachment_url,
        'image/jpeg',
        false
      );
    END LOOP;
  END IF;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'dispute_id', v_dispute_id,
    'thread_id', v_thread_id,
    'message_id', v_message_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;