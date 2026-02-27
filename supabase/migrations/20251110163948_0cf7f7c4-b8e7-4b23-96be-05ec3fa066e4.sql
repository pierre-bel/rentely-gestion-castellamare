-- =====================================================
-- PART 1: Chat Locking - Add columns to message_threads
-- =====================================================
ALTER TABLE public.message_threads
ADD COLUMN is_locked BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN locked_at TIMESTAMPTZ,
ADD COLUMN locked_reason TEXT;

CREATE INDEX idx_threads_locked ON public.message_threads(is_locked) WHERE is_locked = true;

-- =====================================================
-- PART 1: Chat Locking - Update RLS policy for messages
-- =====================================================
-- Drop existing policy
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- Recreate with lock check
CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = from_user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.message_threads
    WHERE id = messages.thread_id AND is_locked = true
  )
);

-- Allow admins to send messages even to locked support threads
CREATE POLICY "Admins can send to locked support threads" ON public.messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.message_threads
    WHERE id = messages.thread_id 
      AND thread_type = 'user_to_support'
      AND is_locked = true
  )
);

-- =====================================================
-- PART 2: Automated Resolution Message Function
-- =====================================================
CREATE OR REPLACE FUNCTION public.send_dispute_resolution_message(
  p_thread_id UUID,
  p_admin_decision TEXT,
  p_approved_refund_amount NUMERIC,
  p_resolution_notes TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_support_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_user_id UUID;
  v_message_body TEXT;
BEGIN
  -- Get the user (non-support participant) from the thread
  SELECT 
    CASE 
      WHEN participant_1_id = v_support_user_id THEN participant_2_id
      ELSE participant_1_id
    END
  INTO v_user_id
  FROM public.message_threads
  WHERE id = p_thread_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Thread not found or invalid';
  END IF;
  
  -- Format the resolution message
  v_message_body := format(
    E'🔒 DISPUTE RESOLVED\n\n' ||
    E'Decision: %s\n' ||
    E'Refund Amount: $%s\n\n' ||
    E'Resolution Notes:\n%s\n\n' ||
    E'This dispute has been closed. If you have additional concerns about this booking, you may open a new dispute.',
    CASE 
      WHEN p_admin_decision = 'approved' THEN '✅ Approved'
      WHEN p_admin_decision = 'declined' THEN '❌ Declined'
      ELSE UPPER(p_admin_decision)
    END,
    COALESCE(p_approved_refund_amount::TEXT, '0.00'),
    COALESCE(p_resolution_notes, 'No additional notes provided.')
  );
  
  -- Insert the resolution message
  INSERT INTO public.messages (
    thread_id,
    from_user_id,
    to_user_id,
    body,
    read
  ) VALUES (
    p_thread_id,
    v_support_user_id,
    v_user_id,
    v_message_body,
    false
  );
  
  -- Lock the thread
  UPDATE public.message_threads
  SET 
    is_locked = true,
    locked_at = NOW(),
    locked_reason = 'Dispute resolved: ' || p_admin_decision,
    updated_at = NOW()
  WHERE id = p_thread_id;
  
  RETURN true;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to send resolution message: %', SQLERRM;
END;
$$;

-- =====================================================
-- PART 3: Subsequent Disputes - Update Unique Constraint
-- =====================================================
-- Drop old constraint
DROP INDEX IF EXISTS public.unique_active_dispute_per_booking_user;

-- Create new constraint with all active statuses
CREATE UNIQUE INDEX unique_active_dispute_per_booking_user 
ON public.disputes (booking_id, initiated_by_user_id)
WHERE status IN ('open', 'pending', 'in_progress', 'on_hold', 'escalated');

-- =====================================================
-- PART 3: Subsequent Disputes - Eligible Amount Helper
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_eligible_refund_amount(p_booking_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_booking_total NUMERIC;
  v_total_refunded NUMERIC;
  v_eligible_amount NUMERIC;
BEGIN
  -- Get the booking total price
  SELECT total_price INTO v_booking_total
  FROM public.bookings
  WHERE id = p_booking_id;
  
  IF v_booking_total IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Calculate total already refunded from resolved_approved disputes
  SELECT COALESCE(SUM(approved_refund_amount), 0)
  INTO v_total_refunded
  FROM public.disputes
  WHERE booking_id = p_booking_id
    AND status = 'resolved_approved'
    AND approved_refund_amount IS NOT NULL;
  
  -- Calculate remaining eligible amount
  v_eligible_amount := v_booking_total - v_total_refunded;
  
  -- Ensure it doesn't go negative
  IF v_eligible_amount < 0 THEN
    v_eligible_amount := 0;
  END IF;
  
  RETURN v_eligible_amount;
END;
$$;

-- =====================================================
-- PART 2 & 3: Update admin_resolve_dispute Function
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_dispute_id UUID,
  p_admin_decision TEXT,
  p_approved_refund_amount NUMERIC,
  p_resolution_notes TEXT,
  p_is_submit BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_dispute RECORD;
  v_booking RECORD;
  v_currency TEXT;
  v_refund_transaction_id UUID;
  v_original_payout RECORD;
  v_host_debt_payout_id UUID;
  v_eligible_amount NUMERIC;
BEGIN
  -- Verify admin access
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can resolve disputes';
  END IF;
  
  -- Lock and fetch dispute
  SELECT * INTO v_dispute
  FROM public.disputes
  WHERE id = p_dispute_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;
  
  -- Fetch booking details
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = v_dispute.booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated booking not found';
  END IF;
  
  v_currency := COALESCE(v_booking.currency, 'USD');
  
  -- PART 3: Validate eligible amount for subsequent disputes
  IF p_is_submit AND p_admin_decision = 'approved' AND p_approved_refund_amount > 0 THEN
    v_eligible_amount := public.get_eligible_refund_amount(v_dispute.booking_id);
    
    IF p_approved_refund_amount > v_eligible_amount THEN
      RAISE EXCEPTION 'Approved refund amount ($%) exceeds eligible amount ($%). Previous refunds have already been issued for this booking.',
        p_approved_refund_amount, v_eligible_amount;
    END IF;
  END IF;
  
  -- If just saving (not submitting), update and return
  IF NOT p_is_submit THEN
    UPDATE public.disputes
    SET
      admin_decision = p_admin_decision,
      approved_refund_amount = p_approved_refund_amount,
      resolution_notes = p_resolution_notes,
      updated_at = NOW()
    WHERE id = p_dispute_id;
    
    RETURN json_build_object(
      'success', true,
      'dispute_id', p_dispute_id,
      'action', 'saved'
    );
  END IF;
  
  -- Submitting final resolution
  IF p_admin_decision NOT IN ('approved', 'declined', 'hold') THEN
    RAISE EXCEPTION 'Invalid admin decision. Must be approved, declined, or hold';
  END IF;
  
  -- Handle approved disputes with refund
  IF p_admin_decision = 'approved' AND p_approved_refund_amount > 0 THEN
    -- Create refund transaction
    INSERT INTO public.transactions (
      booking_id,
      type,
      amount,
      currency,
      provider,
      status
    ) VALUES (
      v_dispute.booking_id,
      'refund',
      p_approved_refund_amount,
      v_currency,
      'admin_adjustment',
      'succeeded'
    )
    RETURNING id INTO v_refund_transaction_id;
    
    -- Find the original host payout for this booking
    SELECT * INTO v_original_payout
    FROM public.payouts
    WHERE booking_id = v_dispute.booking_id
      AND host_user_id = (SELECT host_user_id FROM listings WHERE id = v_dispute.listing_id)
      AND amount > 0
      AND status IN ('pending', 'completed')
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Create debt record for host
    INSERT INTO public.payouts (
      host_user_id,
      booking_id,
      dispute_id,
      amount,
      currency,
      status,
      notes
    ) VALUES (
      (SELECT host_user_id FROM listings WHERE id = v_dispute.listing_id),
      v_dispute.booking_id,
      p_dispute_id,
      -p_approved_refund_amount,
      v_currency,
      'debit',
      format(
        'Refund debt from approved dispute %s. Original payout: $%s. Refund issued: $%s',
        'D-' || SUBSTRING(p_dispute_id::TEXT, 1, 8),
        COALESCE(v_original_payout.amount::TEXT, 'N/A'),
        p_approved_refund_amount
      )
    )
    RETURNING id INTO v_host_debt_payout_id;
  END IF;
  
  -- Update dispute to resolved status
  UPDATE public.disputes
  SET
    status = CASE 
      WHEN p_admin_decision = 'approved' THEN 'resolved_approved'::dispute_status
      WHEN p_admin_decision = 'declined' THEN 'resolved_declined'::dispute_status
      ELSE 'on_hold'::dispute_status
    END,
    admin_decision = p_admin_decision,
    approved_refund_amount = p_approved_refund_amount,
    resolution_notes = p_resolution_notes,
    resolved_by_admin_id = auth.uid(),
    resolved_at = NOW(),
    refund_transaction_id = v_refund_transaction_id,
    updated_at = NOW()
  WHERE id = p_dispute_id;
  
  -- PART 2: Send automated resolution message and lock thread
  IF v_dispute.support_thread_id IS NOT NULL AND p_admin_decision IN ('approved', 'declined') THEN
    PERFORM public.send_dispute_resolution_message(
      v_dispute.support_thread_id,
      p_admin_decision,
      p_approved_refund_amount,
      p_resolution_notes
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'dispute_id', p_dispute_id,
    'status', CASE 
      WHEN p_admin_decision = 'approved' THEN 'resolved_approved'
      WHEN p_admin_decision = 'declined' THEN 'resolved_declined'
      ELSE 'on_hold'
    END,
    'refund_transaction_id', v_refund_transaction_id,
    'host_debt_payout_id', v_host_debt_payout_id,
    'thread_locked', v_dispute.support_thread_id IS NOT NULL
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;