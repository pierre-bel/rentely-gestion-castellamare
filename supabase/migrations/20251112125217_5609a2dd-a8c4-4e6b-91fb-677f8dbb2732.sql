-- Drop the single dispute_refund_amount column and add array-based tracking
ALTER TABLE public.payouts
DROP COLUMN IF EXISTS dispute_refund_amount,
ADD COLUMN IF NOT EXISTS dispute_ids UUID[] DEFAULT ARRAY[]::uuid[],
ADD COLUMN IF NOT EXISTS total_dispute_refunds NUMERIC(10,2) DEFAULT 0;

-- Drop and recreate process_guest_refund with array append logic
DROP FUNCTION IF EXISTS public.process_guest_refund(uuid, numeric, text);

CREATE OR REPLACE FUNCTION public.process_guest_refund(
  p_dispute_id uuid,
  p_approved_refund_amount numeric,
  p_resolution_notes text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        -- Cancel payout entirely with array append
        UPDATE public.payouts
        SET 
          status = 'cancelled',
          dispute_ids = array_append(COALESCE(dispute_ids, ARRAY[]::uuid[]), p_dispute_id),
          total_dispute_refunds = COALESCE(total_dispute_refunds, 0) + p_approved_refund_amount,
          notes = format('Cancelled due to approved dispute refund of $%s. Original amount: $%s',
            p_approved_refund_amount::TEXT, v_payout.amount::TEXT),
          updated_at = NOW()
        WHERE id = v_payout.id;
      ELSE
        -- Reduce payout amount with array append
        UPDATE public.payouts
        SET 
          amount = v_remaining_payout,
          dispute_ids = array_append(COALESCE(dispute_ids, ARRAY[]::uuid[]), p_dispute_id),
          total_dispute_refunds = COALESCE(total_dispute_refunds, 0) + p_approved_refund_amount,
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
        dispute_ids,
        total_dispute_refunds,
        transaction_type
      ) VALUES (
        v_payout.host_user_id,
        v_dispute.booking_id,
        -p_approved_refund_amount,
        v_booking.currency,
        'pending',
        format('Host owes $%s due to approved guest dispute refund. Original payout (ID: %s) was already completed on %s',
          p_approved_refund_amount::TEXT, v_payout.id::TEXT, v_payout.payout_date::TEXT),
        ARRAY[p_dispute_id],
        p_approved_refund_amount,
        'refund_debt'
      );
    END IF;
  ELSE
    -- Scenario C: No payout exists yet, create debt record
    INSERT INTO public.payouts (
      host_user_id,
      booking_id,
      amount,
      currency,
      status,
      notes,
      dispute_ids,
      total_dispute_refunds,
      transaction_type
    ) VALUES (
      (SELECT host_user_id FROM public.listings WHERE id = v_booking.listing_id),
      v_dispute.booking_id,
      -p_approved_refund_amount,
      v_booking.currency,
      'pending',
      format('Host owes $%s due to approved guest dispute refund. No payout record existed yet.',
        p_approved_refund_amount::TEXT),
      ARRAY[p_dispute_id],
      p_approved_refund_amount,
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
    TRUE
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

-- Backfill existing payout
UPDATE public.payouts
SET 
  dispute_ids = ARRAY['43d46e9f-726f-4ed4-81dc-613ceb9b0bcc'::uuid],
  total_dispute_refunds = 44.00,
  updated_at = NOW()
WHERE id = '92a71b26-d4cc-46f1-9a54-0db91c9fbea8';