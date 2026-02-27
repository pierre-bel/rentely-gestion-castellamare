-- Fix process_guest_refund to set dispute_id when modifying existing payouts
CREATE OR REPLACE FUNCTION public.process_guest_refund(p_dispute_id uuid, p_approved_refund_amount numeric, p_resolution_notes text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dispute RECORD;
  v_booking RECORD;
  v_eligible_refund NUMERIC;
  v_payout RECORD;
  v_refund_transaction_id UUID;
  v_remaining_payout NUMERIC;
BEGIN
  -- Lock and get dispute
  SELECT * INTO v_dispute
  FROM public.disputes
  WHERE id = p_dispute_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;
  
  -- Get booking details
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = v_dispute.booking_id;
  
  -- Validate refund amount
  v_eligible_refund := get_eligible_refund_amount(v_dispute.booking_id);
  
  IF p_approved_refund_amount > v_eligible_refund THEN
    RAISE EXCEPTION 'Refund amount ($%) exceeds eligible refund amount ($%)', 
      p_approved_refund_amount, v_eligible_refund;
  END IF;
  
  -- Create refund transaction for guest
  INSERT INTO public.transactions (
    booking_id,
    type,
    amount,
    currency,
    provider,
    status,
    dispute_id
  ) VALUES (
    v_dispute.booking_id,
    'refund',
    p_approved_refund_amount,
    v_booking.currency,
    'stripe',
    'succeeded',
    p_dispute_id
  ) RETURNING id INTO v_refund_transaction_id;
  
  -- Check if host payout exists and its status
  SELECT * INTO v_payout
  FROM public.payouts
  WHERE booking_id = v_dispute.booking_id
    AND host_user_id = (SELECT host_user_id FROM public.listings WHERE id = v_booking.listing_id)
    AND transaction_type = 'booking_payout'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_payout.id IS NOT NULL THEN
    IF v_payout.status = 'pending' THEN
      -- Scenario A: Payout is pending, reduce or cancel it
      v_remaining_payout := v_payout.amount - p_approved_refund_amount;
      
      IF v_remaining_payout <= 0 THEN
        -- Cancel payout entirely
        UPDATE public.payouts
        SET 
          status = 'cancelled',
          dispute_id = p_dispute_id,
          notes = format('Cancelled due to approved dispute refund of $%s. Original amount: $%s',
            p_approved_refund_amount::TEXT, v_payout.amount::TEXT),
          updated_at = NOW()
        WHERE id = v_payout.id;
      ELSE
        -- Reduce payout amount
        UPDATE public.payouts
        SET 
          amount = v_remaining_payout,
          dispute_id = p_dispute_id,
          notes = format('Reduced by $%s due to approved dispute refund. Original amount: $%s',
            p_approved_refund_amount::TEXT, v_payout.amount::TEXT),
          updated_at = NOW()
        WHERE id = v_payout.id;
      END IF;
      
    ELSIF v_payout.status = 'completed' THEN
      -- Scenario B: Payout already completed, create debt record for host
      INSERT INTO public.payouts (
        host_user_id,
        booking_id,
        amount,
        currency,
        status,
        notes,
        dispute_id,
        transaction_type
      ) VALUES (
        v_payout.host_user_id,
        v_dispute.booking_id,
        -p_approved_refund_amount, -- Negative amount = debt
        v_booking.currency,
        'pending',
        format('Host owes $%s due to approved guest dispute refund. Original payout (ID: %s) was already completed on %s',
          p_approved_refund_amount::TEXT, v_payout.id::TEXT, v_payout.payout_date::TEXT),
        p_dispute_id,
        'refund_debt'
      );
    END IF;
  ELSE
    -- Scenario C: No payout exists yet (booking not completed), create debt record
    INSERT INTO public.payouts (
      host_user_id,
      booking_id,
      amount,
      currency,
      status,
      notes,
      dispute_id,
      transaction_type
    ) VALUES (
      (SELECT host_user_id FROM public.listings WHERE id = v_booking.listing_id),
      v_dispute.booking_id,
      -p_approved_refund_amount, -- Negative amount = debt
      v_booking.currency,
      'pending',
      format('Host owes $%s due to approved guest dispute refund. No payout record existed yet.',
        p_approved_refund_amount::TEXT),
      p_dispute_id,
      'refund_debt'
    );
  END IF;
  
  -- Update dispute to resolved_approved
  UPDATE public.disputes
  SET 
    status = 'resolved_approved',
    admin_decision = 'approved',
    approved_refund_amount = p_approved_refund_amount,
    resolution_notes = p_resolution_notes,
    resolved_by_admin_id = auth.uid(),
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_dispute_id;
  
  -- Send resolution message
  PERFORM send_dispute_resolution_message(
    p_dispute_id,
    'approved',
    p_approved_refund_amount,
    p_resolution_notes,
    TRUE -- is_guest_dispute
  );
  
  RETURN json_build_object(
    'success', true,
    'dispute_id', p_dispute_id,
    'refund_transaction_id', v_refund_transaction_id,
    'refund_amount', p_approved_refund_amount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;