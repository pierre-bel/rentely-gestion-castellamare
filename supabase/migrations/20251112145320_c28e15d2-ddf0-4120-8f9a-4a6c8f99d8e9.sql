-- Fix dispute_id column references in helper functions to use dispute_ids array

-- 1. Fix process_host_claim
CREATE OR REPLACE FUNCTION public.process_host_claim(
  p_dispute_id UUID,
  p_booking_id UUID,
  p_host_user_id UUID,
  p_approved_amount NUMERIC,
  p_currency TEXT,
  p_resolution_notes TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create negative payout (debt) for host to be settled later
  INSERT INTO public.payouts (
    booking_id,
    host_user_id,
    amount,
    currency,
    status,
    transaction_type,
    notes,
    dispute_ids,
    total_dispute_refunds
  ) VALUES (
    p_booking_id,
    p_host_user_id,
    -p_approved_amount, -- Negative amount = debt owed to host
    p_currency,
    'pending',
    'refund_debt',
    'Host claim approved: ' || COALESCE(p_resolution_notes, 'Guest responsible for damages/issues'),
    ARRAY[p_dispute_id],
    p_approved_amount
  );
END;
$function$;

-- 2. Fix process_guest_debt_payment
CREATE OR REPLACE FUNCTION public.process_guest_debt_payment(
  p_dispute_id UUID,
  p_approved_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_guest_debt RECORD;
BEGIN
  -- Get the guest debt record
  SELECT * INTO v_guest_debt
  FROM public.guest_debts
  WHERE dispute_id = p_dispute_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest debt not found for dispute %', p_dispute_id;
  END IF;
  
  -- Mark debt as paid
  UPDATE public.guest_debts
  SET 
    status = 'paid',
    paid_at = NOW(),
    notes = COALESCE(notes, '') || format(E'\n\nPaid via dispute resolution on %s', NOW()::DATE)
  WHERE dispute_id = p_dispute_id;
  
  -- Update the refund_debt payout to settled
  UPDATE public.payouts
  SET 
    status = 'settled',
    payout_date = NOW(),
    notes = COALESCE(notes, '') || format(E'\n\nSettled via guest debt payment on %s', NOW()::DATE)
  WHERE dispute_ids @> ARRAY[v_guest_debt.dispute_id]
    AND transaction_type = 'refund_debt'
    AND status = 'pending';
END;
$function$;

-- 3. Fix process_guest_refund
CREATE OR REPLACE FUNCTION public.process_guest_refund(
  p_dispute_id UUID,
  p_booking_id UUID,
  p_host_user_id UUID,
  p_approved_amount NUMERIC,
  p_currency TEXT,
  p_booking_status TEXT,
  p_resolution_notes TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking RECORD;
  v_gross_revenue NUMERIC;
  v_commission_on_refund NUMERIC;
  v_host_deduction NUMERIC;
BEGIN
  -- Get booking financial details
  SELECT 
    subtotal,
    cleaning_fee,
    host_commission_rate,
    total_price
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;
  
  -- Calculate financial breakdown
  v_gross_revenue := v_booking.subtotal + COALESCE(v_booking.cleaning_fee, 0);
  v_commission_on_refund := p_approved_amount * COALESCE(v_booking.host_commission_rate, 0);
  v_host_deduction := p_approved_amount - v_commission_on_refund;
  
  -- Branch based on booking status
  IF p_booking_status IN ('confirmed', 'pending_payment') THEN
    -- Booking not completed yet: Create negative payout (debt) to be deducted on completion
    INSERT INTO public.payouts (
      booking_id,
      host_user_id,
      amount,
      currency,
      status,
      transaction_type,
      notes,
      guest_total_payment,
      base_subtotal,
      base_cleaning_fee,
      gross_revenue,
      dispute_ids,
      total_dispute_refunds
    ) VALUES (
      p_booking_id,
      p_host_user_id,
      -v_host_deduction,
      p_currency,
      'pending',
      'refund_debt',
      'Guest refund approved (booking not completed): ' || COALESCE(p_resolution_notes, 'Refund issued'),
      v_booking.total_price,
      v_booking.subtotal,
      COALESCE(v_booking.cleaning_fee, 0),
      v_gross_revenue,
      ARRAY[p_dispute_id],
      p_approved_amount
    );
    
  ELSIF p_booking_status = 'completed' THEN
    -- Booking already completed: Create adjustment payout
    INSERT INTO public.payouts (
      booking_id,
      host_user_id,
      amount,
      currency,
      status,
      transaction_type,
      notes,
      guest_total_payment,
      base_subtotal,
      base_cleaning_fee,
      gross_revenue,
      commission_amount,
      dispute_ids,
      total_dispute_refunds
    ) VALUES (
      p_booking_id,
      p_host_user_id,
      -v_host_deduction,
      p_currency,
      'pending',
      'refund',
      'Guest refund approved (post-completion): ' || COALESCE(p_resolution_notes, 'Refund issued'),
      v_booking.total_price,
      v_booking.subtotal,
      COALESCE(v_booking.cleaning_fee, 0),
      v_gross_revenue,
      v_commission_on_refund,
      ARRAY[p_dispute_id],
      p_approved_amount
    );
    
  ELSIF p_booking_status IN ('cancelled_guest', 'cancelled_host') THEN
    -- Booking was cancelled: Create adjustment based on cancellation
    INSERT INTO public.payouts (
      booking_id,
      host_user_id,
      amount,
      currency,
      status,
      transaction_type,
      notes,
      guest_total_payment,
      base_subtotal,
      base_cleaning_fee,
      gross_revenue,
      dispute_ids,
      total_dispute_refunds
    ) VALUES (
      p_booking_id,
      p_host_user_id,
      -v_host_deduction,
      p_currency,
      'pending',
      'refund',
      'Guest refund approved (booking cancelled): ' || COALESCE(p_resolution_notes, 'Additional refund issued'),
      v_booking.total_price,
      v_booking.subtotal,
      COALESCE(v_booking.cleaning_fee, 0),
      v_gross_revenue,
      ARRAY[p_dispute_id],
      p_approved_amount
    );
  END IF;
  
  -- Insert refund transaction for guest
  INSERT INTO public.transactions (
    booking_id,
    type,
    amount,
    currency,
    provider,
    status,
    dispute_id
  ) VALUES (
    p_booking_id,
    'refund',
    p_approved_amount,
    p_currency,
    'stripe',
    'succeeded',
    p_dispute_id
  );
END;
$function$;