-- Align dispute statuses and fix transactions status for guest refunds

-- 1) Update 3-arg process_guest_refund to use allowed transaction status and proper dispute status
CREATE OR REPLACE FUNCTION public.process_guest_refund(
  p_dispute_id uuid,
  p_approved_refund_amount numeric,
  p_resolution_notes text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      'succeeded'  -- changed from 'completed'
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
      'succeeded'  -- changed from 'completed'
    ) RETURNING id INTO v_transaction_id;
  END IF;

  -- Update dispute status to resolved_approved
  UPDATE disputes 
  SET 
    status = 'resolved_approved',
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

-- 2) Update 3-arg process_host_claim to set resolved_approved
CREATE OR REPLACE FUNCTION public.process_host_claim(
  p_dispute_id uuid,
  p_approved_claim_amount numeric,
  p_resolution_notes text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    status = 'resolved_approved',
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

-- 3) Update 4-arg admin_resolve_dispute to use resolved_approved/declined
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_dispute_id uuid,
  p_decision text,
  p_refund_amount numeric DEFAULT NULL,
  p_resolution_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dispute RECORD;
  v_booking RECORD;
  v_refund_transaction_id UUID;
  v_host_user_id UUID;
  v_is_guest_dispute BOOLEAN;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can resolve disputes';
  END IF;

  SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dispute not found'; END IF;

  IF v_dispute.status NOT IN ('open', 'in_progress', 'escalated') THEN
    RAISE EXCEPTION 'Dispute is already resolved (status: %)', v_dispute.status;
  END IF;

  SELECT b.*, l.host_user_id INTO v_booking
  FROM public.bookings b JOIN public.listings l ON l.id = b.listing_id
  WHERE b.id = v_dispute.booking_id;

  v_host_user_id := v_booking.host_user_id;
  v_is_guest_dispute := (v_dispute.user_role = 'guest');

  IF p_decision = 'approved' THEN
    IF v_is_guest_dispute THEN
      INSERT INTO public.transactions (
        booking_id, dispute_id, type, amount, currency, provider, status
      ) VALUES (
        v_dispute.booking_id, p_dispute_id, 'refund', p_refund_amount, v_booking.currency, 'admin', 'succeeded'
      ) RETURNING id INTO v_refund_transaction_id;

      INSERT INTO public.payouts (
        booking_id, host_user_id, amount, currency, status, transaction_type, dispute_ids, notes
      ) VALUES (
        v_dispute.booking_id, v_host_user_id, -p_refund_amount, v_booking.currency,
        CASE WHEN v_booking.status = 'confirmed' THEN 'pending' ELSE 'settled' END,
        'refund_debt', ARRAY[p_dispute_id],
        format('Guest refund approved. Dispute ID: %s. Amount: $%s', p_dispute_id, p_refund_amount)
      );

      UPDATE public.disputes
      SET status = 'resolved_approved'::dispute_status,
          admin_decision = 'approved',
          approved_refund_amount = p_refund_amount,
          resolution_notes = p_resolution_notes,
          resolved_by_admin_id = auth.uid(),
          resolved_at = NOW(),
          refund_transaction_id = v_refund_transaction_id,
          updated_at = NOW()
      WHERE id = p_dispute_id;
    ELSE
      -- Host dispute approved path unchanged here
      UPDATE public.disputes
      SET status = 'resolved_approved'::dispute_status,
          admin_decision = 'approved',
          resolution_notes = p_resolution_notes,
          resolved_by_admin_id = auth.uid(),
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE id = p_dispute_id;
    END IF;
  ELSIF p_decision = 'declined' THEN
    UPDATE public.disputes
    SET status = 'resolved_declined'::dispute_status,
        admin_decision = 'declined',
        resolution_notes = p_resolution_notes,
        resolved_by_admin_id = auth.uid(),
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_dispute_id;
  ELSIF p_decision = 'on_hold' THEN
    UPDATE public.disputes
    SET status = 'on_hold'::dispute_status,
        resolution_notes = p_resolution_notes,
        updated_at = NOW()
    WHERE id = p_dispute_id;
  ELSE
    RAISE EXCEPTION 'Invalid decision: %. Must be approved, declined, or on_hold', p_decision;
  END IF;

  PERFORM send_dispute_resolution_message(p_dispute_id, p_decision, p_refund_amount, p_resolution_notes, v_is_guest_dispute);

  RETURN json_build_object('success', true, 'dispute_id', p_dispute_id, 'decision', p_decision, 'refund_amount', p_refund_amount);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4) Ensure 5-arg admin_resolve_dispute delegates to corrected helpers and uses proper declined status
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_dispute_id uuid,
  p_admin_decision text,
  p_approved_refund_amount numeric DEFAULT NULL,
  p_resolution_notes text DEFAULT NULL,
  p_is_submit boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dispute RECORD;
  v_new_status dispute_status;
  v_result JSON;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  IF p_admin_decision NOT IN ('approved', 'declined', 'on_hold', 'hold') THEN
    RETURN json_build_object('success', false, 'error', format('Invalid decision: must be approved, declined, or on_hold (got: %s)', p_admin_decision));
  END IF;

  SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Dispute not found');
  END IF;

  IF p_is_submit THEN
    IF p_admin_decision IN ('on_hold', 'hold') THEN
      v_new_status := 'on_hold'::dispute_status;
    ELSIF p_admin_decision = 'approved' THEN
      IF v_dispute.user_role = 'guest' THEN
        v_result := process_guest_refund(p_dispute_id, p_approved_refund_amount, p_resolution_notes);
        RETURN v_result;
      ELSIF v_dispute.user_role = 'host' THEN
        v_result := process_host_claim(p_dispute_id, p_approved_refund_amount, p_resolution_notes);
        RETURN v_result;
      ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid user_role in dispute');
      END IF;
    ELSIF p_admin_decision = 'declined' THEN
      v_new_status := 'resolved_declined'::dispute_status;
      UPDATE public.disputes
      SET admin_decision = p_admin_decision,
          resolution_notes = p_resolution_notes,
          status = v_new_status,
          resolved_by_admin_id = auth.uid(),
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE id = p_dispute_id;
      PERFORM send_dispute_resolution_message(p_dispute_id, 'declined', NULL, p_resolution_notes, v_dispute.user_role = 'guest');
    END IF;
  ELSE
    IF p_admin_decision IN ('on_hold', 'hold') THEN
      v_new_status := 'on_hold'::dispute_status;
    ELSE
      v_new_status := 'in_progress'::dispute_status;
    END IF;
    UPDATE public.disputes
    SET admin_decision = p_admin_decision,
        approved_refund_amount = COALESCE(p_approved_refund_amount, approved_refund_amount),
        resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
        status = v_new_status,
        updated_at = NOW()
    WHERE id = p_dispute_id;
    IF v_new_status = 'on_hold'::dispute_status THEN
      PERFORM send_dispute_resolution_message(p_dispute_id, 'on_hold', NULL, p_resolution_notes, v_dispute.user_role = 'guest');
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'dispute_id', p_dispute_id, 'status', v_new_status::TEXT, 'decision', p_admin_decision);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;