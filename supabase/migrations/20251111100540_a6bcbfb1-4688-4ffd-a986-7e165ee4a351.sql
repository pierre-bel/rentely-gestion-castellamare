-- Fix process_guest_debt_payment function to use correct transaction type
-- Change 'damage_charge' to 'capture' to match the transactions_type_check constraint

CREATE OR REPLACE FUNCTION public.process_guest_debt_payment(
  p_guest_debt_id UUID,
  p_payment_amount NUMERIC,
  p_payment_currency TEXT DEFAULT 'USD',
  p_payment_provider TEXT DEFAULT 'stripe'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debt RECORD;
  v_guest_user_id UUID;
  v_payout RECORD;
  v_transaction_id UUID;
BEGIN
  -- Get authenticated user
  v_guest_user_id := auth.uid();
  IF v_guest_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Lock and get debt record
  SELECT * INTO v_debt
  FROM public.guest_debts
  WHERE id = p_guest_debt_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debt record not found';
  END IF;
  
  -- Verify ownership
  IF v_debt.guest_user_id != v_guest_user_id THEN
    RAISE EXCEPTION 'Unauthorized: This debt does not belong to you';
  END IF;
  
  -- Verify debt is outstanding
  IF v_debt.status != 'outstanding' THEN
    RAISE EXCEPTION 'This debt has already been processed (status: %)', v_debt.status;
  END IF;
  
  -- Verify payment amount matches debt amount
  IF p_payment_amount != v_debt.amount THEN
    RAISE EXCEPTION 'Payment amount ($%) does not match debt amount ($%)', p_payment_amount, v_debt.amount;
  END IF;
  
  -- Verify currency matches
  IF p_payment_currency != v_debt.currency THEN
    RAISE EXCEPTION 'Payment currency (%) does not match debt currency (%)', p_payment_currency, v_debt.currency;
  END IF;
  
  -- Create capture transaction for guest debt payment
  INSERT INTO public.transactions (
    booking_id,
    type,
    amount,
    currency,
    provider,
    status,
    dispute_id
  ) VALUES (
    v_debt.booking_id,
    'capture',
    p_payment_amount,
    p_payment_currency,
    p_payment_provider,
    'succeeded',
    v_debt.dispute_id
  ) RETURNING id INTO v_transaction_id;
  
  -- Update debt record
  UPDATE public.guest_debts
  SET 
    status = 'paid',
    paid_at = NOW(),
    payment_transaction_id = v_transaction_id
  WHERE id = p_guest_debt_id;
  
  -- Find and activate the host's pending payout
  SELECT * INTO v_payout
  FROM public.payouts
  WHERE dispute_id = v_debt.dispute_id
    AND status = 'pending_guest_payment'
  LIMIT 1;
  
  IF FOUND THEN
    -- Activate payout to pending (ready for admin to process)
    UPDATE public.payouts
    SET 
      status = 'pending',
      updated_at = NOW()
    WHERE id = v_payout.id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'debt_id', p_guest_debt_id,
    'message', 'Payment processed successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;