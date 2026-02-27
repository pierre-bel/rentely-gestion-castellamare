-- Update apply_outstanding_debts_to_payout function to set payout_date on debt settlement
CREATE OR REPLACE FUNCTION public.apply_outstanding_debts_to_payout()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_debt RECORD;
  v_remaining_amount NUMERIC;
  v_applied_amount NUMERIC;
BEGIN
  -- Only process when payout is created or status changes to pending
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status != 'pending')) THEN
    -- Only process positive payouts (not debts)
    IF NEW.amount > 0 AND NEW.transaction_type IN ('booking_payout', 'regular_earning') THEN
      v_remaining_amount := NEW.amount;
      
      -- Get all outstanding debts for this host, oldest first
      FOR v_debt IN 
        SELECT id, amount, booking_id, dispute_id
        FROM public.payouts
        WHERE host_user_id = NEW.host_user_id
          AND amount < 0
          AND status IN ('pending', 'partially_settled')
          AND transaction_type IN ('refund_debt', 'debt_collection')
        ORDER BY created_at ASC
      LOOP
        -- Calculate how much debt we can settle with remaining amount
        v_applied_amount := LEAST(ABS(v_debt.amount), v_remaining_amount);
        
        -- Reduce the payout amount
        v_remaining_amount := v_remaining_amount - v_applied_amount;
        
        -- Update the debt record
        IF v_applied_amount >= ABS(v_debt.amount) THEN
          -- Fully settled
          UPDATE public.payouts
          SET 
            status = 'settled',
            payout_date = NOW(),
            notes = COALESCE(notes, '') || format(E'\n\nFully settled from payout %s on %s',
              NEW.id::TEXT, NOW()::TEXT),
            updated_at = NOW()
          WHERE id = v_debt.id;
        ELSE
          -- Partially settled
          UPDATE public.payouts
          SET 
            amount = v_debt.amount + v_applied_amount,
            status = 'partially_settled',
            payout_date = NOW(),
            notes = COALESCE(notes, '') || format(E'\n\nPartially settled: $%s from payout %s on %s. Remaining debt: $%s',
              v_applied_amount::TEXT, NEW.id::TEXT, NOW()::TEXT, 
              (ABS(v_debt.amount) - v_applied_amount)::TEXT),
            updated_at = NOW()
          WHERE id = v_debt.id;
        END IF;
        
        -- Update the new payout with adjusted amount and notes
        UPDATE public.payouts
        SET 
          amount = v_remaining_amount,
          notes = COALESCE(notes, '') || format(E'\n\nReduced by debt settlement: $%s (debt_id: %s)',
            v_applied_amount::TEXT, v_debt.id::TEXT),
          updated_at = NOW()
        WHERE id = NEW.id;
        
        -- If we've used up all the payout amount, stop
        EXIT WHEN v_remaining_amount <= 0;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;