-- Fix admin_resolve_dispute to use dispute_ids array instead of dispute_id
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_dispute_id UUID,
  p_decision TEXT,
  p_refund_amount NUMERIC DEFAULT NULL,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute RECORD;
  v_booking RECORD;
  v_refund_transaction_id UUID;
  v_host_user_id UUID;
  v_is_guest_dispute BOOLEAN;
BEGIN
  -- Verify caller is an admin
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
  
  -- Verify dispute is still open
  IF v_dispute.status NOT IN ('open', 'in_progress', 'escalated') THEN
    RAISE EXCEPTION 'Dispute is already resolved (status: %)', v_dispute.status;
  END IF;
  
  -- Get booking and host info
  SELECT b.*, l.host_user_id INTO v_booking
  FROM public.bookings b
  JOIN public.listings l ON l.id = b.listing_id
  WHERE b.id = v_dispute.booking_id;
  
  v_host_user_id := v_booking.host_user_id;
  v_is_guest_dispute := (v_dispute.user_role = 'guest');
  
  -- Handle based on decision
  IF p_decision = 'approved' THEN
    IF v_is_guest_dispute THEN
      -- Guest dispute approved: Issue refund to guest
      
      -- Create refund transaction
      INSERT INTO public.transactions (
        booking_id,
        dispute_id,
        type,
        amount,
        currency,
        provider,
        status
      ) VALUES (
        v_dispute.booking_id,
        p_dispute_id,
        'refund',
        p_refund_amount,
        v_booking.currency,
        'admin',
        'succeeded'
      )
      RETURNING id INTO v_refund_transaction_id;
      
      -- Create refund_debt payout record for host (negative amount)
      INSERT INTO public.payouts (
        booking_id,
        host_user_id,
        amount,
        currency,
        status,
        transaction_type,
        dispute_ids,  -- Use array instead of single dispute_id
        notes
      ) VALUES (
        v_dispute.booking_id,
        v_host_user_id,
        -p_refund_amount,
        v_booking.currency,
        CASE 
          WHEN v_booking.status = 'confirmed' THEN 'pending'
          ELSE 'settled'
        END,
        'refund_debt',
        ARRAY[p_dispute_id],  -- Store as array
        format('Guest refund approved. Dispute ID: %s. Amount: $%s', p_dispute_id, p_refund_amount)
      );
      
      -- Update dispute
      UPDATE public.disputes
      SET 
        status = 'resolved'::dispute_status,
        admin_decision = 'approved',
        approved_refund_amount = p_refund_amount,
        resolution_notes = p_resolution_notes,
        resolved_by_admin_id = auth.uid(),
        resolved_at = NOW(),
        refund_transaction_id = v_refund_transaction_id,
        updated_at = NOW()
      WHERE id = p_dispute_id;
      
    ELSE
      -- Host dispute approved: Create guest debt
      
      -- Create guest debt record
      INSERT INTO public.guest_debts (
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
        p_refund_amount,
        v_booking.currency,
        'outstanding',
        v_dispute.category::TEXT,
        p_resolution_notes
      );
      
      -- Create debt_collection payout record for host (positive amount, pending guest payment)
      INSERT INTO public.payouts (
        booking_id,
        host_user_id,
        amount,
        currency,
        status,
        transaction_type,
        dispute_ids,  -- Use array instead of single dispute_id
        notes
      ) VALUES (
        v_dispute.booking_id,
        v_host_user_id,
        p_refund_amount,
        v_booking.currency,
        'pending',
        'debt_collection',
        ARRAY[p_dispute_id],  -- Store as array
        format('Host dispute approved. Guest owes: $%s. Dispute ID: %s', p_refund_amount, p_dispute_id)
      );
      
      -- Update dispute
      UPDATE public.disputes
      SET 
        status = 'resolved'::dispute_status,
        admin_decision = 'approved',
        approved_refund_amount = p_refund_amount,
        resolution_notes = p_resolution_notes,
        resolved_by_admin_id = auth.uid(),
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE id = p_dispute_id;
    END IF;
    
  ELSIF p_decision = 'declined' THEN
    -- Dispute declined: No financial transactions
    UPDATE public.disputes
    SET 
      status = 'resolved'::dispute_status,
      admin_decision = 'declined',
      resolution_notes = p_resolution_notes,
      resolved_by_admin_id = auth.uid(),
      resolved_at = NOW(),
      updated_at = NOW()
    WHERE id = p_dispute_id;
    
  ELSIF p_decision = 'on_hold' THEN
    -- Put dispute on hold
    UPDATE public.disputes
    SET 
      status = 'on_hold'::dispute_status,
      resolution_notes = p_resolution_notes,
      updated_at = NOW()
    WHERE id = p_dispute_id;
    
  ELSE
    RAISE EXCEPTION 'Invalid decision: %. Must be approved, declined, or on_hold', p_decision;
  END IF;
  
  -- Send resolution message to user
  PERFORM send_dispute_resolution_message(
    p_dispute_id,
    p_decision,
    p_refund_amount,
    p_resolution_notes,
    v_is_guest_dispute
  );
  
  RETURN json_build_object(
    'success', true,
    'dispute_id', p_dispute_id,
    'decision', p_decision,
    'refund_amount', p_refund_amount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;