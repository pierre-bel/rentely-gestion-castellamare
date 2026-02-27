-- Fix transaction_type for all dispute resolutions and payouts

-- 1. Fix process_host_claim: Set transaction_type for debt collection payouts
CREATE OR REPLACE FUNCTION public.process_host_claim(
  p_dispute_id uuid,
  p_approved_claim_amount numeric,
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
  v_guest_debt_id UUID;
  v_host_payout_id UUID;
BEGIN
  SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dispute not found'; END IF;
  
  SELECT * INTO v_booking FROM public.bookings WHERE id = v_dispute.booking_id;
  SELECT * INTO v_listing FROM public.listings WHERE id = v_dispute.listing_id;
  
  INSERT INTO public.guest_debts (
    guest_user_id, dispute_id, booking_id, amount, currency, status, reason, notes
  ) VALUES (
    v_booking.guest_user_id, p_dispute_id, v_dispute.booking_id,
    p_approved_claim_amount, v_booking.currency, 'outstanding',
    v_dispute.category::TEXT, p_resolution_notes
  ) RETURNING id INTO v_guest_debt_id;
  
  -- FIXED: Explicitly set transaction_type = 'debt_collection'
  INSERT INTO public.payouts (
    host_user_id, booking_id, amount, currency, status, notes, dispute_id, transaction_type
  ) VALUES (
    v_listing.host_user_id, v_dispute.booking_id, p_approved_claim_amount,
    v_booking.currency, 'pending_guest_payment',
    format('Awaiting guest debt payment. Guest debt ID: %s. Will be processed once guest pays their outstanding debt.', v_guest_debt_id::TEXT),
    p_dispute_id, 'debt_collection'
  ) RETURNING id INTO v_host_payout_id;
  
  UPDATE public.disputes
  SET status = 'resolved_approved', admin_decision = 'approved',
      approved_refund_amount = p_approved_claim_amount,
      resolution_notes = p_resolution_notes,
      resolved_by_admin_id = auth.uid(), resolved_at = NOW(), updated_at = NOW()
  WHERE id = p_dispute_id;
  
  PERFORM send_dispute_resolution_message(p_dispute_id, 'approved', p_approved_claim_amount, p_resolution_notes, FALSE);
  
  RETURN json_build_object('success', true, 'dispute_id', p_dispute_id, 'guest_debt_id', v_guest_debt_id, 'host_payout_id', v_host_payout_id, 'claim_amount', p_approved_claim_amount);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 2. Fix process_guest_debt_payment: Set transaction_type when activating payout
CREATE OR REPLACE FUNCTION public.process_guest_debt_payment(
  p_guest_debt_id uuid,
  p_provider text,
  p_amount numeric,
  p_currency text DEFAULT 'USD'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_guest_debt RECORD;
  v_booking_id UUID;
  v_host_payout_id UUID;
  v_transaction_id UUID;
BEGIN
  SELECT * INTO v_guest_debt FROM public.guest_debts WHERE id = p_guest_debt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guest debt not found'; END IF;
  IF v_guest_debt.guest_user_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF v_guest_debt.status != 'outstanding' THEN RAISE EXCEPTION 'Debt is not in outstanding status'; END IF;
  
  v_booking_id := v_guest_debt.booking_id;
  
  INSERT INTO public.transactions (booking_id, type, amount, currency, provider, status)
  VALUES (v_booking_id, 'debt_payment', p_amount, p_currency, p_provider, 'succeeded')
  RETURNING id INTO v_transaction_id;
  
  UPDATE public.guest_debts
  SET status = 'paid', paid_at = NOW(), updated_at = NOW()
  WHERE id = p_guest_debt_id;
  
  -- FIXED: Explicitly set transaction_type = 'debt_collection' when activating payout
  UPDATE public.payouts
  SET status = 'pending', notes = format('Guest debt paid. Original notes: %s', notes), updated_at = NOW(), transaction_type = 'debt_collection'
  WHERE dispute_id = v_guest_debt.dispute_id AND status = 'pending_guest_payment'
  RETURNING id INTO v_host_payout_id;
  
  RETURN json_build_object('success', true, 'guest_debt_id', p_guest_debt_id, 'transaction_id', v_transaction_id, 'host_payout_id', v_host_payout_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 3. Fix process_guest_refund: Set transaction_type for refund debts
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
  SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dispute not found'; END IF;
  
  SELECT * INTO v_booking FROM public.bookings WHERE id = v_dispute.booking_id;
  SELECT * INTO v_listing FROM public.listings WHERE id = v_dispute.listing_id;
  
  SELECT * INTO v_payout FROM public.payouts
  WHERE booking_id = v_dispute.booking_id AND host_user_id = v_listing.host_user_id
    AND transaction_type = 'booking_payout' AND status IN ('pending', 'completed')
  ORDER BY created_at DESC LIMIT 1;
  
  IF v_payout.id IS NULL THEN
    RAISE EXCEPTION 'No valid payout found for this booking';
  END IF;
  
  IF v_payout.status = 'pending' THEN
    IF v_payout.amount <= p_approved_refund_amount THEN
      UPDATE public.payouts SET status = 'cancelled', notes = format('Fully cancelled due to approved dispute refund. Original amount: $%s. Refund: $%s. %s', v_payout.amount, p_approved_refund_amount, p_resolution_notes), dispute_refund_amount = p_approved_refund_amount, updated_at = NOW()
      WHERE id = v_payout.id;
      
      IF p_approved_refund_amount > v_payout.amount THEN
        -- FIXED: Set transaction_type = 'refund' for debt records
        INSERT INTO public.payouts (host_user_id, booking_id, amount, currency, status, notes, dispute_id, debt_applied_amount, transaction_type)
        VALUES (v_listing.host_user_id, v_dispute.booking_id, -(p_approved_refund_amount - v_payout.amount), v_booking.currency, 'debit',
          format('Guest refund debt. Total refund: $%s. Cancelled payout: $%s. Debt: $%s. %s', p_approved_refund_amount, v_payout.amount, (p_approved_refund_amount - v_payout.amount), p_resolution_notes),
          p_dispute_id, (p_approved_refund_amount - v_payout.amount), 'refund')
        RETURNING id INTO v_host_payout_id;
      END IF;
    ELSE
      UPDATE public.payouts SET amount = amount - p_approved_refund_amount, notes = format('Reduced due to approved dispute refund. Original: $%s. Refund: $%s. New: $%s. %s', (amount + p_approved_refund_amount), p_approved_refund_amount, (amount - p_approved_refund_amount), p_resolution_notes), dispute_refund_amount = p_approved_refund_amount, updated_at = NOW()
      WHERE id = v_payout.id RETURNING id INTO v_host_payout_id;
    END IF;
  ELSIF v_payout.status = 'completed' THEN
    -- FIXED: Set transaction_type = 'refund' for debt records
    INSERT INTO public.payouts (host_user_id, booking_id, amount, currency, status, notes, dispute_id, debt_applied_amount, transaction_type)
    VALUES (v_listing.host_user_id, v_dispute.booking_id, -p_approved_refund_amount, v_booking.currency, 'debit',
      format('Guest refund debt (payout already completed). Refund: $%s. %s', p_approved_refund_amount, p_resolution_notes),
      p_dispute_id, p_approved_refund_amount, 'refund')
    RETURNING id INTO v_host_payout_id;
  END IF;
  
  INSERT INTO public.transactions (booking_id, type, amount, currency, provider, status)
  VALUES (v_dispute.booking_id, 'refund', p_approved_refund_amount, v_booking.currency, 'stripe', 'succeeded')
  RETURNING id INTO v_refund_transaction_id;
  
  UPDATE public.disputes
  SET status = 'resolved_approved', admin_decision = 'approved', approved_refund_amount = p_approved_refund_amount, resolution_notes = p_resolution_notes, resolved_by_admin_id = auth.uid(), resolved_at = NOW(), updated_at = NOW()
  WHERE id = p_dispute_id;
  
  PERFORM send_dispute_resolution_message(p_dispute_id, 'approved', p_approved_refund_amount, p_resolution_notes, TRUE);
  
  RETURN json_build_object('success', true, 'dispute_id', p_dispute_id, 'host_payout_id', v_host_payout_id, 'refund_amount', p_approved_refund_amount, 'refund_transaction_id', v_refund_transaction_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 4. Fix create_payout_on_booking_completion: Explicitly set transaction_type
CREATE OR REPLACE FUNCTION public.create_payout_on_booking_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_listing RECORD;
BEGIN
  IF NEW.status = 'completed'::booking_status AND OLD.status != 'completed'::booking_status THEN
    SELECT * INTO v_listing FROM public.listings WHERE id = NEW.listing_id;
    
    -- FIXED: Explicitly set transaction_type = 'booking_payout'
    INSERT INTO public.payouts (
      host_user_id, booking_id, amount, currency, status, notes, transaction_type
    ) VALUES (
      v_listing.host_user_id, NEW.id,
      COALESCE(NEW.host_payout_net, (NEW.subtotal + COALESCE(NEW.cleaning_fee, 0)) - COALESCE(NEW.host_commission_amount, 0)),
      NEW.currency, 'pending',
      format('Payout for completed booking. Subtotal: $%s, Cleaning: $%s, Commission: $%s',
        NEW.subtotal, COALESCE(NEW.cleaning_fee, 0), COALESCE(NEW.host_commission_amount, 0)),
      'booking_payout'
    );
  END IF;
  RETURN NEW;
END;
$function$;