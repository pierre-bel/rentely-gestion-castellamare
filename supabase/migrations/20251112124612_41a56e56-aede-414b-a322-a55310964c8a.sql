-- Add dispute_refund_amount column to payouts table
ALTER TABLE public.payouts
ADD COLUMN IF NOT EXISTS dispute_refund_amount NUMERIC(10,2);

-- Drop and recreate process_guest_refund to properly set dispute_refund_amount
DROP FUNCTION IF EXISTS public.process_guest_refund(uuid, numeric);

CREATE OR REPLACE FUNCTION public.process_guest_refund(
  p_dispute_id UUID,
  p_approved_refund_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dispute RECORD;
  v_booking RECORD;
  v_payout RECORD;
  v_remaining_payout NUMERIC;
  v_result JSONB;
BEGIN
  -- Get dispute details
  SELECT * INTO v_dispute
  FROM public.disputes
  WHERE id = p_dispute_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Dispute not found'
    );
  END IF;

  -- Get booking details
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = v_dispute.booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- Find pending payout for this booking
  SELECT * INTO v_payout
  FROM public.payouts
  WHERE booking_id = v_dispute.booking_id
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Calculate remaining payout after refund
    v_remaining_payout := v_payout.amount - p_approved_refund_amount;

    IF v_remaining_payout <= 0 THEN
      -- Cancel the payout entirely
      UPDATE public.payouts
      SET 
        status = 'cancelled',
        dispute_id = p_dispute_id,
        dispute_refund_amount = p_approved_refund_amount,
        notes = format('Cancelled due to approved dispute refund of $%s. Original amount: $%s',
          p_approved_refund_amount::TEXT, v_payout.amount::TEXT),
        updated_at = NOW()
      WHERE id = v_payout.id;

      v_result := jsonb_build_object(
        'payout_action', 'cancelled',
        'payout_id', v_payout.id,
        'original_amount', v_payout.amount,
        'refund_amount', p_approved_refund_amount
      );
    ELSE
      -- Reduce the payout amount
      UPDATE public.payouts
      SET 
        amount = v_remaining_payout,
        dispute_id = p_dispute_id,
        dispute_refund_amount = p_approved_refund_amount,
        notes = format('Reduced by $%s due to approved dispute refund. Original amount: $%s',
          p_approved_refund_amount::TEXT, v_payout.amount::TEXT),
        updated_at = NOW()
      WHERE id = v_payout.id;

      v_result := jsonb_build_object(
        'payout_action', 'reduced',
        'payout_id', v_payout.id,
        'original_amount', v_payout.amount,
        'new_amount', v_remaining_payout,
        'refund_amount', p_approved_refund_amount
      );
    END IF;
  ELSE
    -- No pending payout found, create a debt record
    INSERT INTO public.guest_debts (
      guest_user_id,
      booking_id,
      dispute_id,
      amount,
      currency,
      status,
      reason,
      expires_at
    ) VALUES (
      v_booking.guest_user_id,
      v_dispute.booking_id,
      p_dispute_id,
      p_approved_refund_amount,
      v_booking.currency,
      'pending',
      format('Approved dispute refund: %s', v_dispute.subject),
      NOW() + INTERVAL '30 days'
    );

    v_result := jsonb_build_object(
      'payout_action', 'debt_created',
      'debt_amount', p_approved_refund_amount
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'result', v_result
  );
END;
$$;

-- Backfill the existing payout that's missing dispute_refund_amount
UPDATE public.payouts p
SET 
  dispute_refund_amount = d.approved_refund_amount,
  updated_at = NOW()
FROM public.disputes d
WHERE p.id = '92a71b26-d4cc-46f1-9a54-0db91c9fbea8'
  AND p.dispute_id = d.id
  AND d.id = '43d46e9f-726f-4ed4-81dc-613ceb9b0bcc';