-- Fix typo in send_dispute_resolution_message function
CREATE OR REPLACE FUNCTION public.send_dispute_resolution_message(
  p_dispute_id UUID,
  p_decision TEXT,
  p_refund_amount NUMERIC DEFAULT NULL,
  p_resolution_notes TEXT DEFAULT NULL,
  p_is_guest_dispute BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute RECORD;
  v_support_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_message_body TEXT;
  v_user_id UUID;
BEGIN
  -- Get dispute details
  SELECT * INTO v_dispute
  FROM public.disputes
  WHERE id = p_dispute_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;
  
  -- Determine recipient (the user who initiated the dispute)
  v_user_id := v_dispute.initiated_by_user_id;
  
  -- Build message based on decision and dispute type
  IF p_decision = 'approved' THEN
    IF p_is_guest_dispute THEN
      v_message_body := format(
        E'Your dispute has been resolved in your favor.\n\n' ||
        E'Decision: Approved\n' ||
        E'Refund Amount: $%s\n\n' ||
        CASE WHEN p_resolution_notes IS NOT NULL 
          THEN format(E'Resolution Notes:\n%s\n\n', p_resolution_notes)
          ELSE ''
        END ||
        E'The refund will be processed to your original payment method within 5-7 business days.\n\n' ||
        E'This thread is now closed. Thank you for your patience.',
        p_refund_amount::TEXT
      );
    ELSE
      -- Host dispute approved
      v_message_body := format(
        E'Your dispute has been resolved in your favor.\n\n' ||
        E'Decision: Approved\n' ||
        E'Claim Amount: $%s\n\n' ||
        CASE WHEN p_resolution_notes IS NOT NULL 
          THEN format(E'Resolution Notes:\n%s\n\n', p_resolution_notes)
          ELSE ''
        END ||
        E'A debt record has been created for the guest. You will receive payment once the guest settles their debt.\n\n' ||
        E'This thread is now closed. Thank you for your patience.',
        p_refund_amount::TEXT
      );
    END IF;
  ELSIF p_decision = 'declined' THEN
    v_message_body := format(
      E'Your dispute has been reviewed and declined.\n\n' ||
      E'Decision: Declined\n\n' ||
      CASE WHEN p_resolution_notes IS NOT NULL 
        THEN format(E'Reason:\n%s\n\n', p_resolution_notes)
        ELSE ''
      END ||
      E'This thread is now closed. If you have additional questions, please contact support.'
    );
  ELSE
    -- On hold
    v_message_body := format(
      E'Your dispute is currently on hold.\n\n' ||
      E'Status: On Hold\n\n' ||
      CASE WHEN p_resolution_notes IS NOT NULL 
        THEN format(E'Notes:\n%s\n\n', p_resolution_notes)
        ELSE ''
      END ||
      E'We will update you as soon as we have more information.'
    );
  END IF;
  
  -- Insert message if thread exists
  IF v_dispute.support_thread_id IS NOT NULL THEN
    INSERT INTO public.messages (
      thread_id,
      from_user_id,
      to_user_id,
      body,
      read
    ) VALUES (
      v_dispute.support_thread_id,
      v_support_user_id,
      v_user_id,
      v_message_body,
      false
    );
    
    -- Lock thread if decision is final (approved or declined)
    IF p_decision IN ('approved', 'declined') THEN
      UPDATE public.message_threads
      SET 
        is_locked = true,
        locked_at = NOW(),
        locked_reason = format('Dispute %s - Resolution: %s', p_dispute_id::TEXT, p_decision),
        updated_at = NOW()
      WHERE id = v_dispute.support_thread_id;
    END IF;
  END IF;
END;
$$;