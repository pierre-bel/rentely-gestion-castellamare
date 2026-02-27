-- Fix process_host_claim to get host_user_id from listings
CREATE OR REPLACE FUNCTION public.process_host_claim(
  p_dispute_id uuid,
  p_approved_claim_amount numeric,
  p_resolution_notes text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute disputes%ROWTYPE;
  v_booking bookings%ROWTYPE;
  v_host_user_id uuid;
  v_guest_debt_id uuid;
  v_result json;
BEGIN
  -- Get dispute details
  SELECT * INTO v_dispute FROM disputes WHERE id = p_dispute_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Dispute not found');
  END IF;

  -- Get booking details
  SELECT * INTO v_booking FROM bookings WHERE id = v_dispute.booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Get host_user_id from listings
  SELECT host_user_id INTO v_host_user_id FROM listings WHERE id = v_booking.listing_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found');
  END IF;

  -- Create guest debt entry
  INSERT INTO guest_debts (
    guest_user_id,
    dispute_id,
    booking_id,
    amount,
    currency,
    status,
    reason,
    notes
  ) VALUES (
    v_booking.guest_user_id,
    p_dispute_id,
    v_dispute.booking_id,
    p_approved_claim_amount,
    v_booking.currency,
    'outstanding',
    v_dispute.category,
    p_resolution_notes
  ) RETURNING id INTO v_guest_debt_id;

  -- Create payout entry for host claim (pending guest payment)
  INSERT INTO public.payouts (
    booking_id,
    host_user_id,
    amount,
    currency,
    status,
    notes,
    transaction_type,
    dispute_ids
  ) VALUES (
    v_dispute.booking_id,
    v_host_user_id,
    p_approved_claim_amount,
    v_booking.currency,
    'pending_guest_payment',
    p_resolution_notes,
    'debt_collection',
    ARRAY[p_dispute_id]
  );

  -- Update dispute status
  UPDATE disputes 
  SET 
    status = 'resolved',
    resolution_notes = p_resolution_notes,
    updated_at = now()
  WHERE id = p_dispute_id;

  v_result := json_build_object(
    'success', true,
    'guest_debt_id', v_guest_debt_id,
    'approved_claim_amount', p_approved_claim_amount
  );

  RETURN v_result;
END;
$$;

-- Fix process_guest_refund to get host_user_id from listings
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
  v_host_user_id uuid;
  v_existing_payout payouts%ROWTYPE;
  v_refund_percentage numeric;
  v_host_retained_amount numeric;
  v_commission_on_retained numeric;
  v_new_host_net numeric;
  v_transaction_id uuid;
  v_result json;
BEGIN
  -- Get dispute and booking details
  SELECT * INTO v_dispute FROM disputes WHERE id = p_dispute_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Dispute not found');
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = v_dispute.booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Get host_user_id from listings
  SELECT host_user_id INTO v_host_user_id FROM listings WHERE id = v_booking.listing_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found');
  END IF;

  -- Calculate refund percentage and host adjustments
  v_refund_percentage := (p_approved_refund_amount / NULLIF(v_booking.total_price, 0)) * 100;
  v_host_retained_amount := v_booking.host_payout_gross - (v_booking.host_payout_gross * (p_approved_refund_amount / NULLIF(v_booking.total_price, 0)));
  v_commission_on_retained := v_host_retained_amount * (v_booking.host_commission_rate / 100);
  v_new_host_net := v_host_retained_amount - v_commission_on_retained;

  -- Check if there's an existing payout for this booking
  SELECT * INTO v_existing_payout 
  FROM payouts 
  WHERE booking_id = v_dispute.booking_id 
    AND transaction_type = 'booking_payout'
  ORDER BY created_at DESC 
  LIMIT 1;

  IF FOUND AND v_existing_payout.status = 'pending' THEN
    -- Update existing pending payout
    UPDATE payouts
    SET
      amount = v_new_host_net,
      dispute_ids = ARRAY[p_dispute_id],
      refund_percentage_applied = v_refund_percentage::integer,
      host_retained_gross = v_host_retained_amount,
      commission_on_retained = v_commission_on_retained,
      notes = COALESCE(notes || E'\n', '') || p_resolution_notes,
      updated_at = now()
    WHERE id = v_existing_payout.id;

    -- Create refund transaction
    INSERT INTO transactions (
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
      v_booking.currency,
      'stripe',
      'completed'
    ) RETURNING id INTO v_transaction_id;

  ELSE
    -- Payout already completed, create refund debt entry
    INSERT INTO public.payouts (
      booking_id,
      host_user_id,
      amount,
      currency,
      status,
      notes,
      transaction_type,
      dispute_ids,
      original_amount
    ) VALUES (
      v_dispute.booking_id,
      v_host_user_id,
      -p_approved_refund_amount,
      v_booking.currency,
      'debit',
      p_resolution_notes,
      'refund_debt',
      ARRAY[p_dispute_id],
      p_approved_refund_amount
    );

    -- Create refund transaction
    INSERT INTO transactions (
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
      v_booking.currency,
      'stripe',
      'completed'
    ) RETURNING id INTO v_transaction_id;
  END IF;

  -- Update dispute status
  UPDATE disputes 
  SET 
    status = 'resolved',
    resolution_notes = p_resolution_notes,
    updated_at = now()
  WHERE id = p_dispute_id;

  v_result := json_build_object(
    'success', true,
    'approved_refund_amount', p_approved_refund_amount,
    'refund_percentage', v_refund_percentage,
    'new_host_net', v_new_host_net,
    'transaction_id', v_transaction_id
  );

  RETURN v_result;
END;
$$;