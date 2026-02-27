-- Drop and recreate apply_outstanding_debts_to_payout function with metadata tracking

DROP FUNCTION IF EXISTS public.apply_outstanding_debts_to_payout(UUID);

CREATE OR REPLACE FUNCTION public.apply_outstanding_debts_to_payout(p_payout_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout RECORD;
  v_debt RECORD;
  v_total_debts NUMERIC := 0;
  v_remaining_payout NUMERIC;
  v_applied_amount NUMERIC;
  v_total_settled NUMERIC := 0;
  v_first_dispute_id UUID := NULL;
BEGIN
  -- Lock and get the payout
  SELECT * INTO v_payout
  FROM public.payouts
  WHERE id = p_payout_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout not found';
  END IF;
  
  -- Store original amount before any debt deductions
  UPDATE public.payouts
  SET original_amount = v_payout.amount
  WHERE id = p_payout_id
    AND original_amount IS NULL;
  
  -- Get total outstanding debts for this host
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_debts
  FROM public.payouts
  WHERE host_user_id = v_payout.host_user_id
    AND status IN ('debit', 'partially_settled')
    AND amount < 0;
  
  -- If no debts, exit early
  IF v_total_debts = 0 THEN
    RETURN;
  END IF;
  
  v_remaining_payout := v_payout.amount;
  
  -- Process each debt in order (oldest first)
  FOR v_debt IN
    SELECT *
    FROM public.payouts
    WHERE host_user_id = v_payout.host_user_id
      AND status IN ('debit', 'partially_settled')
      AND amount < 0
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    -- Calculate how much we can apply to this debt
    v_applied_amount := LEAST(v_remaining_payout, ABS(v_debt.amount));
    
    -- Store first dispute_id for the main payout
    IF v_first_dispute_id IS NULL AND v_debt.dispute_id IS NOT NULL THEN
      v_first_dispute_id := v_debt.dispute_id;
    END IF;
    
    IF v_applied_amount >= ABS(v_debt.amount) THEN
      -- Debt fully settled
      UPDATE public.payouts
      SET 
        status = 'settled',
        payout_date = NOW(),
        notes = COALESCE(notes, '') || format(
          E'\n\nFully settled on %s from payout %s',
          NOW()::DATE,
          p_payout_id::TEXT
        ),
        updated_at = NOW()
      WHERE id = v_debt.id;
      
      v_remaining_payout := v_remaining_payout - ABS(v_debt.amount);
      v_total_settled := v_total_settled + ABS(v_debt.amount);
    ELSE
      -- Partial settlement
      UPDATE public.payouts
      SET 
        status = 'partially_settled',
        amount = v_debt.amount + v_applied_amount,
        notes = COALESCE(notes, '') || format(
          E'\n\nPartial settlement of $%s on %s from payout %s. Remaining debt: $%s',
          v_applied_amount,
          NOW()::DATE,
          p_payout_id::TEXT,
          ABS(v_debt.amount + v_applied_amount)
        ),
        updated_at = NOW()
      WHERE id = v_debt.id;
      
      v_remaining_payout := 0;
      v_total_settled := v_total_settled + v_applied_amount;
    END IF;
    
    -- Exit if payout exhausted
    EXIT WHEN v_remaining_payout <= 0;
  END LOOP;
  
  -- Update the main payout with final amount and metadata
  IF v_total_settled > 0 THEN
    UPDATE public.payouts
    SET 
      amount = v_remaining_payout,
      debt_applied_amount = v_total_settled,
      dispute_id = v_first_dispute_id,
      notes = COALESCE(notes, '') || format(
        E'\n\nDebt settlement applied: $%s. Original payout: $%s. Net payout: $%s',
        v_total_settled,
        v_payout.amount,
        v_remaining_payout
      ),
      updated_at = NOW()
    WHERE id = p_payout_id;
  END IF;
END;
$$;