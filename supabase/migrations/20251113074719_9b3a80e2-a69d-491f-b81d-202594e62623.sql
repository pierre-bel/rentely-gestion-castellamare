-- Remove updated_at from guest_debts update (column doesn't exist)
DROP FUNCTION IF EXISTS public.process_guest_debt_payment(uuid, decimal, text, text);

CREATE OR REPLACE FUNCTION public.process_guest_debt_payment(
  p_guest_debt_id uuid,
  p_payment_amount decimal,
  p_payment_currency text,
  p_payment_provider text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_debt guest_debts%ROWTYPE;
  v_transaction_id uuid;
BEGIN
  -- Get the authenticated user's ID
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Get the guest debt record
  SELECT * INTO v_guest_debt
  FROM guest_debts
  WHERE id = p_guest_debt_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Guest debt not found'
    );
  END IF;

  -- Verify the debt belongs to the authenticated user
  IF v_guest_debt.guest_user_id != auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized'
    );
  END IF;

  -- Verify the debt is still outstanding
  IF v_guest_debt.status != 'outstanding' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Debt is not in outstanding status'
    );
  END IF;

  -- Create a transaction record for the payment (guest paying platform)
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
    p_payment_amount,
    p_payment_currency,
    p_payment_provider,
    'succeeded',
    v_guest_debt.dispute_id
  ) RETURNING id INTO v_transaction_id;

  -- Update the guest debt record (no updated_at column exists)
  UPDATE guest_debts
  SET
    status = 'paid',
    paid_at = now(),
    payment_transaction_id = v_transaction_id
  WHERE id = p_guest_debt_id;

  -- Update the corresponding payout to settled
  UPDATE public.payouts
  SET
    status = 'settled',
    payout_date = now(),
    notes = COALESCE(notes || E'\n', '') || 'Guest debt paid via ' || p_payment_provider,
    updated_at = now()
  WHERE booking_id = v_guest_debt.booking_id
    AND dispute_ids @> ARRAY[v_guest_debt.dispute_id]
    AND status = 'pending_guest_payment';

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'amount_paid', p_payment_amount
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;