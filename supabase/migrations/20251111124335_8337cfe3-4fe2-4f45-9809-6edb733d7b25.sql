-- Update apply_outstanding_debts_to_payout to set payout_date on original debt payouts when settled

CREATE OR REPLACE FUNCTION public.apply_outstanding_debts_to_payout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_debt RECORD;
  v_remaining_amount NUMERIC;
  v_applied_amount NUMERIC;
BEGIN
  -- Only process positive payouts that are pending
  IF NEW.amount <= 0 OR NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;
  
  -- Store original amount before any debt deductions
  IF NEW.original_amount IS NULL THEN
    UPDATE public.payouts
    SET original_amount = NEW.amount
    WHERE id = NEW.id;
    
    NEW.original_amount := NEW.amount;
  END IF;
  
  v_remaining_amount := NEW.amount;
  
  -- Process outstanding debts for this host
  FOR v_debt IN 
    SELECT gd.id, gd.amount, gd.booking_id
    FROM public.guest_debts gd
    INNER JOIN public.bookings b ON b.id = gd.booking_id
    INNER JOIN public.listings l ON l.id = b.listing_id
    WHERE l.host_user_id = NEW.host_user_id
      AND gd.status = 'outstanding'
      AND (gd.expires_at IS NULL OR gd.expires_at > NOW())
    ORDER BY gd.created_at ASC
    FOR UPDATE OF gd
  LOOP
    -- Calculate how much we can apply
    v_applied_amount := LEAST(v_debt.amount, v_remaining_amount);
    
    IF v_applied_amount > 0 THEN
      -- Create a debt settlement payout record (negative amount)
      INSERT INTO public.payouts (
        host_user_id,
        booking_id,
        amount,
        currency,
        status,
        notes,
        transaction_type,
        payout_date
      ) VALUES (
        NEW.host_user_id,
        v_debt.booking_id,
        -v_applied_amount,
        NEW.currency,
        'debit',
        format('Debt settlement applied to payout %s', NEW.id),
        'debt_settlement',
        NOW()
      );
      
      -- Update the main payout amount and track debt application
      v_remaining_amount := v_remaining_amount - v_applied_amount;
      
      UPDATE public.payouts
      SET 
        amount = v_remaining_amount,
        debt_applied_amount = COALESCE(debt_applied_amount, 0) + v_applied_amount,
        debt_payout_ids = array_append(COALESCE(debt_payout_ids, ARRAY[]::UUID[]), v_debt.id),
        notes = COALESCE(notes || E'\n', '') || format('Debt of $%s applied from booking %s', v_applied_amount, v_debt.booking_id),
        updated_at = NOW()
      WHERE id = NEW.id;
      
      NEW.amount := v_remaining_amount;
      NEW.debt_applied_amount := COALESCE(NEW.debt_applied_amount, 0) + v_applied_amount;
      NEW.debt_payout_ids := array_append(COALESCE(NEW.debt_payout_ids, ARRAY[]::UUID[]), v_debt.id);
      
      -- Update the ORIGINAL debt payout's payout_date when debt is settled
      UPDATE public.payouts
      SET 
        payout_date = NOW(),
        status = CASE 
          WHEN v_applied_amount >= ABS(amount) THEN 'settled'
          ELSE 'partially_settled'
        END,
        updated_at = NOW()
      WHERE host_user_id = NEW.host_user_id
        AND booking_id = v_debt.booking_id
        AND amount < 0
        AND dispute_id = (SELECT dispute_id FROM public.guest_debts WHERE id = v_debt.id)
        AND status = 'debit';
      
      -- Update guest debt status
      IF v_applied_amount >= v_debt.amount THEN
        -- Debt fully paid
        UPDATE public.guest_debts
        SET 
          status = 'settled',
          paid_at = NOW()
        WHERE id = v_debt.id;
      ELSE
        -- Partial payment
        UPDATE public.guest_debts
        SET 
          status = 'partially_settled',
          amount = amount - v_applied_amount
        WHERE id = v_debt.id;
      END IF;
    END IF;
    
    -- Stop if payout is exhausted
    EXIT WHEN v_remaining_amount <= 0;
  END LOOP;
  
  RETURN NEW;
END;
$$;