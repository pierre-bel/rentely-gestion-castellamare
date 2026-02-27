-- Fix refund transaction provider value in admin_resolve_dispute
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_dispute_id UUID,
  p_admin_decision TEXT,
  p_approved_refund_amount NUMERIC,
  p_resolution_notes TEXT,
  p_is_submit BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_dispute RECORD;
  v_booking RECORD;
  v_currency TEXT;
  v_refund_transaction_id UUID;
  v_original_payout RECORD;
  v_host_debt_payout_id UUID;
  v_eligible_amount NUMERIC;
BEGIN
  -- Verify admin access
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can resolve disputes';
  END IF;
  
  -- Lock and fetch dispute
  SELECT * INTO v_dispute
  FROM public.disputes
  WHERE id = p_dispute_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;
  
  -- Prevent editing resolved disputes
  IF v_dispute.status IN ('resolved_approved', 'resolved_declined') THEN
    RAISE EXCEPTION 'Cannot modify dispute: Already resolved with status "%"', v_dispute.status;
  END IF;
  
  -- Fetch booking details
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = v_dispute.booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  v_currency := COALESCE(v_booking.currency, 'USD');
  
  -- If submitting, perform full validation and resolution
  IF p_is_submit THEN
    -- Validate decision
    IF p_admin_decision NOT IN ('approved', 'declined', 'hold') THEN
      RAISE EXCEPTION 'Invalid decision: must be approved, declined, or hold';
    END IF;
    
    -- Validate refund amount
    IF p_admin_decision = 'approved' THEN
      IF p_approved_refund_amount IS NULL OR p_approved_refund_amount <= 0 THEN
        RAISE EXCEPTION 'Approved refund amount must be greater than 0';
      END IF;
      
      -- Get eligible amount (booking total minus previous refunds)
      v_eligible_amount := get_eligible_refund_amount(v_dispute.booking_id);
      
      IF p_approved_refund_amount > v_eligible_amount THEN
        RAISE EXCEPTION 'Approved refund amount ($%) exceeds eligible amount ($%)', 
          p_approved_refund_amount, v_eligible_amount;
      END IF;
      
      -- Create refund transaction (use 'stripe' as provider)
      INSERT INTO public.transactions (
        booking_id, type, amount, currency, provider, status
      )
      VALUES (
        v_dispute.booking_id, 'refund', p_approved_refund_amount, v_currency, 'stripe', 'succeeded'
      )
      RETURNING id INTO v_refund_transaction_id;
      
      -- Find the original completed payout for this booking
      SELECT * INTO v_original_payout
      FROM public.payouts
      WHERE booking_id = v_dispute.booking_id
        AND status = 'completed'
      ORDER BY payout_date DESC
      LIMIT 1;
      
      -- Create a debt record for the host (negative payout)
      INSERT INTO public.payouts (
        host_user_id,
        booking_id,
        dispute_id,
        amount,
        currency,
        status,
        notes
      )
      VALUES (
        (SELECT host_user_id FROM public.listings WHERE id = v_dispute.listing_id),
        v_dispute.booking_id,
        v_dispute.id,
        -p_approved_refund_amount,
        v_currency,
        'debit',
        format('Refund debt from dispute %s. Original payout: $%s on %s',
          'D-' || SUBSTRING(v_dispute.id::TEXT, 1, 8),
          COALESCE(v_original_payout.amount::TEXT, 'N/A'),
          COALESCE(v_original_payout.payout_date::DATE::TEXT, 'N/A')
        )
      )
      RETURNING id INTO v_host_debt_payout_id;
      
      -- Update dispute to resolved_approved
      UPDATE public.disputes
      SET
        status = 'resolved_approved',
        admin_decision = p_admin_decision,
        approved_refund_amount = p_approved_refund_amount,
        resolution_notes = p_resolution_notes,
        refund_transaction_id = v_refund_transaction_id,
        resolved_by_admin_id = auth.uid(),
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE id = p_dispute_id;
      
      -- Send automated resolution message and lock thread
      PERFORM send_dispute_resolution_message(
        p_dispute_id,
        'approved',
        p_approved_refund_amount,
        p_resolution_notes
      );
      
      RETURN json_build_object(
        'success', true,
        'dispute_id', p_dispute_id,
        'status', 'resolved_approved',
        'refund_transaction_id', v_refund_transaction_id,
        'host_debt_payout_id', v_host_debt_payout_id
      );
      
    ELSIF p_admin_decision = 'declined' THEN
      -- Update dispute to resolved_declined
      UPDATE public.disputes
      SET
        status = 'resolved_declined',
        admin_decision = p_admin_decision,
        approved_refund_amount = 0,
        resolution_notes = p_resolution_notes,
        resolved_by_admin_id = auth.uid(),
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE id = p_dispute_id;
      
      -- Send automated resolution message and lock thread
      PERFORM send_dispute_resolution_message(
        p_dispute_id,
        'declined',
        0,
        p_resolution_notes
      );
      
      RETURN json_build_object(
        'success', true,
        'dispute_id', p_dispute_id,
        'status', 'resolved_declined'
      );
      
    ELSE
      -- Hold status
      UPDATE public.disputes
      SET
        status = 'on_hold',
        admin_decision = p_admin_decision,
        approved_refund_amount = p_approved_refund_amount,
        resolution_notes = p_resolution_notes,
        updated_at = NOW()
      WHERE id = p_dispute_id;
      
      RETURN json_build_object(
        'success', true,
        'dispute_id', p_dispute_id,
        'status', 'on_hold'
      );
    END IF;
    
  ELSE
    -- Save draft without changing status
    UPDATE public.disputes
    SET
      admin_decision = p_admin_decision,
      approved_refund_amount = p_approved_refund_amount,
      resolution_notes = p_resolution_notes,
      updated_at = NOW()
    WHERE id = p_dispute_id;
    
    RETURN json_build_object(
      'success', true,
      'dispute_id', p_dispute_id,
      'status', v_dispute.status,
      'draft_saved', true
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;