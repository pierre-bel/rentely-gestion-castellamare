-- Add validation to prevent modifying resolved disputes
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_dispute_id uuid,
  p_admin_decision text,
  p_approved_refund_amount numeric,
  p_resolution_notes text,
  p_is_submit boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dispute RECORD;
  v_booking RECORD;
  v_currency TEXT;
  v_refund_transaction_id UUID;
  v_original_payout RECORD;
  v_debit_payout_id UUID;
BEGIN
  -- Verify caller is an admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Validate decision value
  IF p_admin_decision NOT IN ('approved', 'declined', 'on_hold') THEN
    RAISE EXCEPTION 'Invalid decision. Must be: approved, declined, or on_hold';
  END IF;
  
  -- Lock dispute row
  SELECT * INTO v_dispute
  FROM disputes
  WHERE id = p_dispute_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;
  
  -- ✅ Prevent editing resolved disputes
  IF v_dispute.status IN ('resolved_approved', 'resolved_declined') THEN
    RAISE EXCEPTION 'Cannot modify dispute: Already resolved with status "%"', v_dispute.status;
  END IF;
  
  -- Get booking details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = v_dispute.booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated booking not found';
  END IF;
  
  v_currency := COALESCE(v_booking.currency, 'USD');
  
  -- SAVE MODE: Just update the dispute fields without changing status
  IF NOT p_is_submit THEN
    UPDATE disputes
    SET 
      admin_decision = p_admin_decision,
      approved_refund_amount = p_approved_refund_amount,
      resolution_notes = p_resolution_notes,
      updated_at = NOW()
    WHERE id = p_dispute_id;
    
    RETURN json_build_object(
      'success', true,
      'dispute_id', p_dispute_id,
      'message', 'Draft saved successfully'
    );
  END IF;
  
  -- SUBMIT MODE: Full resolution processing
  -- Validate required fields for submission
  IF p_admin_decision IS NULL OR p_admin_decision = '' THEN
    RAISE EXCEPTION 'Decision is required for submission';
  END IF;
  
  IF p_admin_decision = 'approved' THEN
    IF p_approved_refund_amount IS NULL OR p_approved_refund_amount <= 0 THEN
      RAISE EXCEPTION 'Refund amount is required and must be greater than 0 for approval';
    END IF;
    
    IF p_approved_refund_amount > v_booking.total_price THEN
      RAISE EXCEPTION 'Refund amount cannot exceed booking total price';
    END IF;
    
    -- Create refund transaction
    INSERT INTO transactions (
      booking_id, type, amount, currency, provider, status
    )
    VALUES (
      v_dispute.booking_id,
      'refund',
      p_approved_refund_amount,
      v_currency,
      'admin_refund',
      'succeeded'
    )
    RETURNING id INTO v_refund_transaction_id;
    
    -- Find the original payout for this booking (if exists and is completed)
    SELECT * INTO v_original_payout
    FROM payouts
    WHERE booking_id = v_dispute.booking_id
      AND status = 'completed'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Create debt payout record (negative amount)
    INSERT INTO payouts (
      host_user_id,
      booking_id,
      dispute_id,
      amount,
      currency,
      status,
      notes
    )
    VALUES (
      (SELECT host_user_id FROM listings WHERE id = v_dispute.listing_id),
      v_dispute.booking_id,
      p_dispute_id,
      -p_approved_refund_amount,
      v_currency,
      'debit',
      format('Refund approved for dispute %s. Amount: $%s. %s',
        'D-' || SUBSTRING(p_dispute_id::TEXT, 1, 8),
        p_approved_refund_amount,
        COALESCE('Note: ' || p_resolution_notes, ''))
    )
    RETURNING id INTO v_debit_payout_id;
    
    -- Update dispute to resolved_approved
    UPDATE disputes
    SET 
      status = 'resolved_approved',
      admin_decision = 'approved',
      approved_refund_amount = p_approved_refund_amount,
      resolution_notes = p_resolution_notes,
      refund_transaction_id = v_refund_transaction_id,
      resolved_by_admin_id = auth.uid(),
      resolved_at = NOW(),
      updated_at = NOW()
    WHERE id = p_dispute_id;
    
    RETURN json_build_object(
      'success', true,
      'dispute_id', p_dispute_id,
      'status', 'resolved_approved',
      'refund_transaction_id', v_refund_transaction_id,
      'debit_payout_id', v_debit_payout_id,
      'message', 'Dispute approved and refund processed'
    );
    
  ELSIF p_admin_decision = 'declined' THEN
    -- Update dispute to resolved_declined
    UPDATE disputes
    SET 
      status = 'resolved_declined',
      admin_decision = 'declined',
      approved_refund_amount = NULL,
      resolution_notes = p_resolution_notes,
      resolved_by_admin_id = auth.uid(),
      resolved_at = NOW(),
      updated_at = NOW()
    WHERE id = p_dispute_id;
    
    RETURN json_build_object(
      'success', true,
      'dispute_id', p_dispute_id,
      'status', 'resolved_declined',
      'message', 'Dispute declined'
    );
    
  ELSIF p_admin_decision = 'on_hold' THEN
    -- Update dispute to on_hold
    UPDATE disputes
    SET 
      status = 'on_hold',
      admin_decision = 'on_hold',
      approved_refund_amount = p_approved_refund_amount,
      resolution_notes = p_resolution_notes,
      updated_at = NOW()
    WHERE id = p_dispute_id;
    
    RETURN json_build_object(
      'success', true,
      'dispute_id', p_dispute_id,
      'status', 'on_hold',
      'message', 'Dispute placed on hold'
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;