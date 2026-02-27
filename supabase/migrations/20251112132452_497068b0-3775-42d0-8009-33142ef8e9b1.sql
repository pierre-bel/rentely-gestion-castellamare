-- Update create_payout_on_booking_completion trigger to properly merge dispute_ids arrays
CREATE OR REPLACE FUNCTION public.create_payout_on_booking_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_host_user_id UUID;
  v_debt RECORD;
  v_debt_payout_ids_to_settle UUID[] := ARRAY[]::UUID[];
  v_dispute_ids UUID[] := ARRAY[]::UUID[];
  v_total_debt NUMERIC := 0;
  v_gross_revenue NUMERIC;
  v_commission_amount NUMERIC;
  v_net_before_adjustments NUMERIC;
  v_final_payout NUMERIC;
  v_payout_exists BOOLEAN;
  v_new_payout_id UUID;
BEGIN
  -- Only trigger on completed bookings
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get host_user_id from listing
  SELECT host_user_id INTO v_host_user_id
  FROM listings
  WHERE id = NEW.listing_id;

  -- Check if booking_payout already exists
  SELECT EXISTS (
    SELECT 1 FROM payouts 
    WHERE booking_id = NEW.id
    AND transaction_type = 'booking_payout'
  ) INTO v_payout_exists;

  -- Exit if booking payout already exists
  IF v_payout_exists THEN
    RETURN NEW;
  END IF;

  -- Collect all refund_debt payouts for this booking and merge their dispute_ids
  FOR v_debt IN
    SELECT id, amount, dispute_ids
    FROM payouts
    WHERE booking_id = NEW.id
      AND host_user_id = v_host_user_id
      AND transaction_type = 'refund_debt'
      AND status = 'pending'
      AND amount < 0
    ORDER BY created_at ASC
  LOOP
    -- Track which debt payouts we're settling (for later update)
    v_debt_payout_ids_to_settle := array_append(v_debt_payout_ids_to_settle, v_debt.id);
    
    -- Merge dispute IDs from this debt payout into accumulated array
    v_dispute_ids := array_cat(v_dispute_ids, COALESCE(v_debt.dispute_ids, ARRAY[]::UUID[]));
    
    v_total_debt := v_total_debt + ABS(v_debt.amount);
  END LOOP;

  -- Calculate financial breakdown
  v_gross_revenue := NEW.subtotal + COALESCE(NEW.cleaning_fee, 0);
  v_commission_amount := NEW.host_commission_amount;
  v_net_before_adjustments := NEW.host_payout_net;
  
  -- Final payout after debt deductions
  v_final_payout := v_net_before_adjustments - v_total_debt;

  -- Create payout record with merged dispute_ids array
  INSERT INTO payouts (
    booking_id,
    host_user_id,
    amount,
    currency,
    status,
    transaction_type,
    base_subtotal,
    base_cleaning_fee,
    gross_revenue,
    commission_amount,
    net_before_adjustments,
    guest_total_payment,
    original_amount,
    dispute_ids,
    total_dispute_refunds,
    notes
  ) VALUES (
    NEW.id,
    v_host_user_id,
    v_final_payout,
    NEW.currency,
    'pending',
    'booking_payout',
    NEW.subtotal,
    COALESCE(NEW.cleaning_fee, 0),
    v_gross_revenue,
    v_commission_amount,
    v_net_before_adjustments,
    NEW.total_price,
    v_net_before_adjustments,
    v_dispute_ids,
    v_total_debt,
    CASE 
      WHEN v_total_debt > 0 THEN 
        format('Booking completed. %s dispute refund(s) deducted: $%s (Net: $%s)', 
               array_length(v_dispute_ids, 1), v_total_debt, v_final_payout)
      ELSE 'Booking completed'
    END
  )
  RETURNING id INTO v_new_payout_id;

  -- Mark all collected debt payouts as settled
  IF array_length(v_debt_payout_ids_to_settle, 1) > 0 THEN
    UPDATE payouts
    SET 
      status = 'settled',
      payout_date = NOW(),
      notes = COALESCE(notes, '') || format(
        E'\n\nSettled on %s via booking completion payout %s (Booking: B-%s)',
        NOW()::DATE,
        SUBSTRING(v_new_payout_id::TEXT, 1, 8),
        SUBSTRING(NEW.id::TEXT, 1, 8)
      ),
      updated_at = NOW()
    WHERE id = ANY(v_debt_payout_ids_to_settle);
  END IF;

  RETURN NEW;
END;
$$;