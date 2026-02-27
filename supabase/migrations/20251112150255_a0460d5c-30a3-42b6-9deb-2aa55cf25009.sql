-- Patch process_host_claim to use dispute_ids instead of dispute_id
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
    dispute_ids,
    booking_subtotal,
    booking_host_commission_amount,
    booking_host_payout_net,
    booking_host_payout_gross,
    listing_id
  ) VALUES (
    v_dispute.booking_id,
    v_booking.host_user_id,
    p_approved_claim_amount,
    v_booking.currency,
    'pending_guest_payment',
    p_resolution_notes,
    'debt_collection',
    ARRAY[p_dispute_id],
    v_booking.subtotal,
    v_booking.host_commission_amount,
    v_booking.host_payout_net,
    v_booking.host_payout_gross,
    v_booking.listing_id
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

-- Patch process_guest_refund to use dispute_ids instead of dispute_id
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
      refund_percentage_applied = v_refund_percentage,
      host_retained_gross = v_host_retained_amount,
      commission_on_retained = v_commission_on_retained,
      notes = COALESCE(notes || E'\n', '') || p_resolution_notes,
      updated_at = now()
    WHERE id = v_existing_payout.id;

    -- Create refund transaction
    INSERT INTO transactions (
      booking_id,
      guest_user_id,
      type,
      amount,
      currency,
      provider,
      status
    ) VALUES (
      v_dispute.booking_id,
      v_booking.guest_user_id,
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
      booking_subtotal,
      booking_host_commission_amount,
      booking_host_payout_net,
      booking_host_payout_gross,
      listing_id,
      refund_amount
    ) VALUES (
      v_dispute.booking_id,
      v_booking.host_user_id,
      -p_approved_refund_amount,
      v_booking.currency,
      'debit',
      p_resolution_notes,
      'refund_debt',
      ARRAY[p_dispute_id],
      v_booking.subtotal,
      v_booking.host_commission_amount,
      v_booking.host_payout_net,
      v_booking.host_payout_gross,
      v_booking.listing_id,
      p_approved_refund_amount
    );

    -- Create refund transaction
    INSERT INTO transactions (
      booking_id,
      guest_user_id,
      type,
      amount,
      currency,
      provider,
      status
    ) VALUES (
      v_dispute.booking_id,
      v_booking.guest_user_id,
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

-- Patch process_guest_debt_payment to use dispute_ids in WHERE clause
CREATE OR REPLACE FUNCTION public.process_guest_debt_payment(
  p_guest_debt_id uuid,
  p_provider text,
  p_amount numeric,
  p_currency text DEFAULT 'USD'::text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_debt guest_debts%ROWTYPE;
  v_booking bookings%ROWTYPE;
  v_transaction_id uuid;
  v_result json;
BEGIN
  -- Get guest debt details
  SELECT * INTO v_guest_debt FROM guest_debts WHERE id = p_guest_debt_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Guest debt not found');
  END IF;

  IF v_guest_debt.status != 'outstanding' THEN
    RETURN json_build_object('success', false, 'error', 'Debt already paid or cancelled');
  END IF;

  -- Get booking details
  SELECT * INTO v_booking FROM bookings WHERE id = v_guest_debt.booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Create payment transaction
  INSERT INTO transactions (
    booking_id,
    guest_user_id,
    type,
    amount,
    currency,
    provider,
    status
  ) VALUES (
    v_guest_debt.booking_id,
    v_guest_debt.guest_user_id,
    'debt_payment',
    p_amount,
    p_currency,
    p_provider,
    'completed'
  ) RETURNING id INTO v_transaction_id;

  -- Mark debt as paid
  UPDATE guest_debts
  SET
    status = 'paid',
    paid_at = now(),
    updated_at = now()
  WHERE id = p_guest_debt_id;

  -- Activate corresponding payout (change from pending_guest_payment to completed)
  UPDATE public.payouts
  SET
    status = 'completed',
    payout_date = now(),
    notes = COALESCE(notes || E'\n', '') || 'Guest debt paid via ' || p_provider,
    updated_at = now()
  WHERE booking_id = v_guest_debt.booking_id
    AND dispute_ids @> ARRAY[v_guest_debt.dispute_id]
    AND status = 'pending_guest_payment';

  v_result := json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'amount_paid', p_amount
  );

  RETURN v_result;
END;
$$;