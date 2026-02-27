-- Drop all conflicting versions of send_dispute_resolution_message and keep the unified version
DROP FUNCTION IF EXISTS public.send_dispute_resolution_message(uuid, text, numeric, text);
DROP FUNCTION IF EXISTS public.send_dispute_resolution_message(uuid, text, numeric, text, boolean);

-- Recreate the unified version that takes dispute_id
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
        CASE WHEN p_resolution_notes IS NOT NULL AND p_resolution_notes != ''
          THEN format(E'Resolution Notes:\n%s\n\n', p_resolution_notes)
          ELSE ''
        END ||
        E'The refund will be processed to your original payment method within 5-7 business days.\n\n' ||
        E'This thread is now closed. Thank you for your patience.',
        COALESCE(p_refund_amount::TEXT, '0.00')
      );
    ELSE
      -- Host dispute approved
      v_message_body := format(
        E'Your dispute has been resolved in your favor.\n\n' ||
        E'Decision: Approved\n' ||
        E'Claim Amount: $%s\n\n' ||
        CASE WHEN p_resolution_notes IS NOT NULL AND p_resolution_notes != ''
          THEN format(E'Resolution Notes:\n%s\n\n', p_resolution_notes)
          ELSE ''
        END ||
        E'A debt record has been created for the guest. You will receive payment once the guest settles their debt.\n\n' ||
        E'This thread is now closed. Thank you for your patience.',
        COALESCE(p_refund_amount::TEXT, '0.00')
      );
    END IF;
  ELSIF p_decision = 'declined' THEN
    v_message_body := format(
      E'Your dispute has been reviewed and declined.\n\n' ||
      E'Decision: Declined\n\n' ||
      CASE WHEN p_resolution_notes IS NOT NULL AND p_resolution_notes != ''
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
      CASE WHEN p_resolution_notes IS NOT NULL AND p_resolution_notes != ''
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

-- Now update process_guest_refund to call with dispute_id instead of thread_id
DROP FUNCTION IF EXISTS public.process_guest_refund(uuid, numeric, text);

CREATE OR REPLACE FUNCTION public.process_guest_refund(
  p_dispute_id uuid,
  p_approved_refund_amount numeric,
  p_resolution_notes text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute disputes%ROWTYPE;
  v_booking bookings%ROWTYPE;
  v_listing listings%ROWTYPE;
  v_payout payouts%ROWTYPE;
  v_payout_id uuid;
  v_refund_transaction_id uuid;
  v_remaining_refund numeric;
  v_debt_amount numeric;
  v_new_payout_amount numeric;
BEGIN
  -- Lock and load dispute
  SELECT * INTO v_dispute FROM disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;

  -- Load booking and listing
  SELECT * INTO v_booking FROM bookings WHERE id = v_dispute.booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  SELECT * INTO v_listing FROM listings WHERE id = v_booking.listing_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  -- Find the most recent payout for this booking
  SELECT * INTO v_payout 
  FROM payouts 
  WHERE booking_id = v_booking.id 
    AND host_user_id = v_listing.host_user_id
    AND transaction_type = 'booking_payout'
  ORDER BY created_at DESC 
  LIMIT 1;

  IF FOUND AND v_payout.status = 'pending' THEN
    -- Reduce the pending payout
    v_remaining_refund := p_approved_refund_amount;
    v_debt_amount := LEAST(v_remaining_refund, v_payout.amount);
    v_new_payout_amount := GREATEST(v_payout.amount - v_debt_amount, 0);

    UPDATE payouts
    SET 
      amount = v_new_payout_amount,
      original_amount = v_payout.amount,
      debt_applied_amount = v_debt_amount,
      dispute_id = p_dispute_id,
      transaction_type = CASE WHEN v_new_payout_amount = 0 THEN 'refund' ELSE 'booking_payout' END,
      notes = COALESCE(notes || E'\n\n', '') ||
              'Dispute Resolution: Refund of $' || p_approved_refund_amount || ' approved. ' ||
              'Original payout: $' || v_payout.amount || ', Reduced by: $' || v_debt_amount || '. ' ||
              COALESCE(p_resolution_notes, '')
    WHERE id = v_payout.id;

    v_payout_id := v_payout.id;
    v_remaining_refund := p_approved_refund_amount - v_debt_amount;

    -- If refund exceeds payout, create additional debt payout
    IF v_remaining_refund > 0 THEN
      INSERT INTO payouts (
        host_user_id,
        booking_id,
        amount,
        currency,
        status,
        transaction_type,
        original_amount,
        debt_applied_amount,
        dispute_id,
        notes
      ) VALUES (
        v_listing.host_user_id,
        v_booking.id,
        -v_remaining_refund,
        COALESCE(v_booking.currency, 'USD'),
        'pending',
        'refund_debt',
        0,
        v_remaining_refund,
        p_dispute_id,
        'Guest refund debt - amount exceeding available payout. ' || COALESCE(p_resolution_notes, '')
      ) RETURNING id INTO v_payout_id;
    END IF;

  ELSE
    -- No pending payout or payout already completed - create debt payout
    INSERT INTO payouts (
      host_user_id,
      booking_id,
      amount,
      currency,
      status,
      transaction_type,
      original_amount,
      debt_applied_amount,
      dispute_id,
      notes
    ) VALUES (
      v_listing.host_user_id,
      v_booking.id,
      -p_approved_refund_amount,
      COALESCE(v_booking.currency, 'USD'),
      'pending',
      'refund_debt',
      0,
      p_approved_refund_amount,
      p_dispute_id,
      'Guest refund debt - no pending payout available. ' || COALESCE(p_resolution_notes, '')
    ) RETURNING id INTO v_payout_id;
  END IF;

  -- Create guest refund transaction with correct status and booking currency
  INSERT INTO transactions (
    booking_id,
    amount,
    type,
    status,
    currency,
    provider,
    dispute_id
  ) VALUES (
    v_booking.id,
    p_approved_refund_amount,
    'refund',
    'succeeded',
    COALESCE(v_booking.currency, 'USD'),
    'stripe',
    p_dispute_id
  ) RETURNING id INTO v_refund_transaction_id;

  -- Update dispute status
  UPDATE disputes
  SET 
    status = 'resolved_approved',
    resolved_at = now(),
    resolution_notes = p_resolution_notes,
    approved_refund_amount = p_approved_refund_amount
  WHERE id = p_dispute_id;

  -- Send automated resolution message and lock thread via helper (using dispute_id)
  PERFORM send_dispute_resolution_message(
    p_dispute_id,
    'approved',
    p_approved_refund_amount,
    p_resolution_notes,
    TRUE
  );

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'dispute_id', p_dispute_id,
    'host_payout_id', v_payout_id,
    'refund_amount', p_approved_refund_amount,
    'refund_transaction_id', v_refund_transaction_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error processing guest refund: %', SQLERRM;
END;
$$;