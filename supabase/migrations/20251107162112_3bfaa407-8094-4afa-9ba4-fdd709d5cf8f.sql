-- Fix get_or_create_thread to properly separate threads by both booking_id AND listing_id context
CREATE OR REPLACE FUNCTION public.get_or_create_thread(
  p_participant_1_id uuid,
  p_participant_2_id uuid,
  p_booking_id uuid DEFAULT NULL::uuid,
  p_listing_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_thread_id UUID;
  v_min_id UUID;
  v_max_id UUID;
BEGIN
  v_min_id := LEAST(p_participant_1_id, p_participant_2_id);
  v_max_id := GREATEST(p_participant_1_id, p_participant_2_id);
  
  -- Try to find existing thread with BOTH booking_id AND listing_id context
  SELECT id INTO v_thread_id
  FROM public.message_threads
  WHERE participant_1_id = v_min_id 
    AND participant_2_id = v_max_id
    AND (booking_id = p_booking_id OR (booking_id IS NULL AND p_booking_id IS NULL))
    AND (listing_id = p_listing_id OR (listing_id IS NULL AND p_listing_id IS NULL))
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
$function$;