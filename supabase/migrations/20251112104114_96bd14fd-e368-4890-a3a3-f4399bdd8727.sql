-- Fix process_guest_refund to handle bookings without payouts (not completed yet)

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
  v_listing RECORD;
  v_payout RECORD;
  v_host_payout_id UUID;
  v_refund_transaction_id UUID;
BEGIN
  -- Get dispute details
  SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dispute not found'; END IF;
  
  -- Get booking and listing details
  SELECT * INTO v_booking FROM public.bookings WHERE id = v_dispute.booking_id;
  SELECT * INTO v_listing FROM public.listings WHERE id = v_dispute.listing_id;
  
  -- Try to find existing payout
  SELECT * INTO v_payout FROM public.payouts
  WHERE booking_id = v_dispute.booking_id 
    AND host_user_id = v_listing.host_user_id
    AND transaction_type = 'booking_payout' 
    AND status IN ('pending', 'completed')
  ORDER BY created_at DESC LIMIT 1;
  
  -- Handle based on payout status
  IF v_payout.id IS NOT NULL THEN
    -- Payout exists
    IF v_payout.status = 'pending' THEN
      -- Reduce or cancel pending payout
      IF v_payout.amount <= p_approved_refund_amount THEN
        -- Cancel payout entirely
        UPDATE public.payouts 
        SET 
          status = 'cancelled',
          notes = format('Cancelled due to guest refund. Original: $%s. Refund: $%s. %s', 
                        v_payout.amount, p_approved_refund_amount, p_resolution_notes),
          dispute_refund_amount = p_approved_refund_amount,
          updated_at = NOW()
        WHERE id = v_payout.id;
        
        -- Create debt record if refund exceeds payout
        IF p_approved_refund_amount > v_payout.amount THEN
          INSERT INTO public.payouts (
            host_user_id, booking_id, amount, currency, status, notes, 
            dispute_id, debt_applied_amount, transaction_type
          )
          VALUES (
            v_listing.host_user_id, v_dispute.booking_id, 
            -(p_approved_refund_amount - v_payout.amount), 
            v_booking.currency, 'debit',
            format('Refund debt. Total refund: $%s. Cancelled payout: $%s. Debt: $%s. %s', 
                   p_approved_refund_amount, v_payout.amount, 
                   (p_approved_refund_amount - v_payout.amount), p_resolution_notes),
            p_dispute_id, (p_approved_refund_amount - v_payout.amount), 'refund'
          )
          RETURNING id INTO v_host_payout_id;
        END IF;
      ELSE
        -- Reduce pending payout
        UPDATE public.payouts 
        SET 
          amount = amount - p_approved_refund_amount,
          original_amount = amount,
          debt_applied_amount = p_approved_refund_amount,
          notes = format('Reduced due to guest refund. Original: $%s. Refund: $%s. New: $%s. %s', 
                        (amount + p_approved_refund_amount), p_approved_refund_amount, 
                        (amount - p_approved_refund_amount), p_resolution_notes),
          dispute_refund_amount = p_approved_refund_amount,
          updated_at = NOW()
        WHERE id = v_payout.id 
        RETURNING id INTO v_host_payout_id;
      END IF;
      
    ELSIF v_payout.status = 'completed' THEN
      -- Payout already completed - create debt record
      INSERT INTO public.payouts (
        host_user_id, booking_id, amount, currency, status, notes, 
        dispute_id, debt_applied_amount, transaction_type
      )
      VALUES (
        v_listing.host_user_id, v_dispute.booking_id, 
        -p_approved_refund_amount, v_booking.currency, 'debit',
        format('Refund debt (payout completed). Refund: $%s. %s', 
               p_approved_refund_amount, p_resolution_notes),
        p_dispute_id, p_approved_refund_amount, 'refund'
      )
      RETURNING id INTO v_host_payout_id;
    END IF;
  ELSE
    -- No payout exists yet (booking not completed) - create debt record
    INSERT INTO public.payouts (
      host_user_id, booking_id, amount, currency, status, notes, 
      dispute_id, debt_applied_amount, transaction_type
    )
    VALUES (
      v_listing.host_user_id, v_dispute.booking_id, 
      -p_approved_refund_amount, v_booking.currency, 'debit',
      format('Refund debt (booking not completed). Refund: $%s. %s', 
             p_approved_refund_amount, p_resolution_notes),
      p_dispute_id, p_approved_refund_amount, 'refund'
    )
    RETURNING id INTO v_host_payout_id;
  END IF;
  
  -- Create refund transaction for guest
  INSERT INTO public.transactions (booking_id, type, amount, currency, provider, status)
  VALUES (v_dispute.booking_id, 'refund', p_approved_refund_amount, v_booking.currency, 'stripe', 'succeeded')
  RETURNING id INTO v_refund_transaction_id;
  
  -- Update dispute status
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
  PERFORM send_dispute_resolution_message(p_dispute_id, 'approved', p_approved_refund_amount, p_resolution_notes, TRUE);
  
  RETURN json_build_object(
    'success', true,
    'dispute_id', p_dispute_id,
    'host_payout_id', v_host_payout_id,
    'refund_amount', p_approved_refund_amount,
    'refund_transaction_id', v_refund_transaction_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;