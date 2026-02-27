-- Fix process_guest_refund: Remove non-existent dispute_refund_amount column references

CREATE OR REPLACE FUNCTION process_guest_refund(
  p_dispute_id UUID,
  p_approved_refund_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute RECORD;
  v_booking RECORD;
  v_existing_payout RECORD;
  v_refund_transaction_id UUID;
  v_host_debt_amount NUMERIC;
  v_new_payout_amount NUMERIC;
BEGIN
  -- Get dispute and booking details
  SELECT d.*, b.host_user_id, b.currency, b.total_price
  INTO v_dispute
  FROM disputes d
  JOIN bookings b ON b.id = d.booking_id
  WHERE d.id = p_dispute_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;

  -- Create refund transaction for guest
  INSERT INTO transactions (
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
    v_dispute.currency,
    'stripe',
    'succeeded',
    p_dispute_id
  ) RETURNING id INTO v_refund_transaction_id;

  -- Check if there's an existing pending payout for this booking
  SELECT * INTO v_existing_payout
  FROM payouts
  WHERE booking_id = v_dispute.booking_id
    AND status = 'pending'
  LIMIT 1;

  IF FOUND THEN
    -- Reduce existing payout by refund amount
    v_new_payout_amount := GREATEST(0, v_existing_payout.amount - p_approved_refund_amount);
    
    UPDATE payouts
    SET 
      amount = v_new_payout_amount,
      original_amount = v_existing_payout.amount,
      debt_applied_amount = (v_existing_payout.amount - v_new_payout_amount),
      dispute_id = p_dispute_id,
      transaction_type = CASE 
        WHEN v_new_payout_amount = 0 THEN 'refund'
        ELSE 'booking_payout'
      END,
      notes = COALESCE(notes || E'\n\n', '') || 
              format('Refund applied: $%s (Dispute %s)', 
                     p_approved_refund_amount, 
                     SUBSTRING(p_dispute_id::TEXT, 1, 8)),
      updated_at = NOW()
    WHERE id = v_existing_payout.id;
  ELSE
    -- No pending payout exists, create host debt
    v_host_debt_amount := p_approved_refund_amount;
    
    INSERT INTO payouts (
      booking_id,
      host_user_id,
      amount,
      currency,
      status,
      transaction_type,
      dispute_id,
      original_amount,
      debt_applied_amount,
      notes
    ) VALUES (
      v_dispute.booking_id,
      v_dispute.host_user_id,
      -v_host_debt_amount,
      v_dispute.currency,
      'pending',
      'refund_debt',
      p_dispute_id,
      0,
      v_host_debt_amount,
      format('Host owes platform for guest refund: $%s (Dispute %s)', 
             p_approved_refund_amount,
             SUBSTRING(p_dispute_id::TEXT, 1, 8))
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'refund_transaction_id', v_refund_transaction_id,
    'refund_amount', p_approved_refund_amount,
    'adjusted_existing_payout', FOUND
  );
END;
$$;