-- Fix process_guest_debt_payment function to handle dispute_ids array correctly
-- This fixes transaction column references, status values, and payment tracking

DROP FUNCTION IF EXISTS public.process_guest_debt_payment(uuid, numeric, text, text);

CREATE OR REPLACE FUNCTION public.process_guest_debt_payment(
  p_guest_debt_id uuid,
  p_amount numeric,
  p_currency text,
  p_provider text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guest_debt guest_debts%ROWTYPE;
  v_transaction_id uuid;
BEGIN
  -- Get and validate guest debt
  SELECT * INTO v_guest_debt
  FROM guest_debts
  WHERE id = p_guest_debt_id
    AND status = 'outstanding';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Guest debt not found or already paid'
    );
  END IF;

  -- Verify ownership
  IF v_guest_debt.guest_user_id != auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: You can only pay your own debts'
    );
  END IF;

  -- Validate amount
  IF p_amount < v_guest_debt.amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Payment amount must be at least ' || v_guest_debt.amount::text
    );
  END IF;

  -- Create transaction record for guest payment (capture)
  INSERT INTO transactions (
    booking_id,
    type,
    amount,
    currency,
    provider,
    status,
    dispute_id
  ) VALUES (
    v_guest_debt.booking_id,
    'capture',
    p_amount,
    p_currency,
    p_provider,
    'succeeded',
    v_guest_debt.dispute_id
  ) RETURNING id INTO v_transaction_id;

  -- Mark debt as paid and link payment transaction
  UPDATE guest_debts
  SET
    status = 'paid',
    paid_at = now(),
    payment_transaction_id = v_transaction_id,
    updated_at = now()
  WHERE id = p_guest_debt_id;

  -- Update corresponding payout to settled
  UPDATE public.payouts
  SET
    status = 'settled',
    payout_date = now(),
    notes = COALESCE(notes || E'\n', '') || 'Guest debt paid via ' || p_provider,
    updated_at = now()
  WHERE booking_id = v_guest_debt.booking_id
    AND dispute_ids @> ARRAY[v_guest_debt.dispute_id]
    AND status = 'pending_guest_payment';

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'amount_paid', p_amount
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;