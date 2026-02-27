-- Fix transaction status in process_guest_refund function
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
  v_admin_user_id uuid;
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

  -- Get an admin user ID for messages
  SELECT user_id INTO v_admin_user_id 
  FROM user_roles 
  WHERE role = 'admin' 
  LIMIT 1;

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
              p_resolution_notes
    WHERE id = v_payout.id;

    v_payout_id := v_payout.id;
    v_remaining_refund := p_approved_refund_amount - v_debt_amount;

    -- If refund exceeds payout, create additional debt payout
    IF v_remaining_refund > 0 THEN
      INSERT INTO payouts (
        host_user_id,
        booking_id,
        amount,
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
        'pending',
        'refund_debt',
        0,
        v_remaining_refund,
        p_dispute_id,
        'Guest refund debt - amount exceeding available payout. ' || p_resolution_notes
      ) RETURNING id INTO v_payout_id;
    END IF;

  ELSE
    -- No pending payout or payout already completed - create debt payout
    INSERT INTO payouts (
      host_user_id,
      booking_id,
      amount,
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
      'pending',
      'refund_debt',
      0,
      p_approved_refund_amount,
      p_dispute_id,
      'Guest refund debt - no pending payout available. ' || p_resolution_notes
    ) RETURNING id INTO v_payout_id;
  END IF;

  -- Create guest refund transaction with correct status
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
    'USD',
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

  -- Send resolution message to support thread
  IF v_dispute.support_thread_id IS NOT NULL AND v_admin_user_id IS NOT NULL THEN
    INSERT INTO messages (
      thread_id,
      from_user_id,
      to_user_id,
      body
    ) VALUES (
      v_dispute.support_thread_id,
      v_admin_user_id,
      v_dispute.initiated_by_user_id,
      'Your dispute has been resolved. Refund amount: $' || p_approved_refund_amount || '. ' || p_resolution_notes
    );
  END IF;

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