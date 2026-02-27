-- Phase 1: Fix process_guest_refund with correct calculations and field updates
DROP FUNCTION IF EXISTS public.process_guest_refund(uuid, numeric, text);

CREATE OR REPLACE FUNCTION public.process_guest_refund(
  p_dispute_id uuid,
  p_approved_refund_amount numeric,
  p_resolution_notes text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute disputes%ROWTYPE;
  v_booking bookings%ROWTYPE;
  v_host_user_id uuid;
  v_existing_payout payouts%ROWTYPE;
  v_new_host_net numeric;
  v_transaction_id uuid;
  v_refund_percentage integer;
BEGIN
  -- Get dispute and booking details
  SELECT * INTO v_dispute FROM disputes WHERE id = p_dispute_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Dispute not found');
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = v_dispute.booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Get host_user_id from listings
  SELECT host_user_id INTO v_host_user_id FROM listings WHERE id = v_booking.listing_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found');
  END IF;

  -- CORRECT calculation: simply subtract approved refund from net
  v_new_host_net := v_booking.host_payout_net - p_approved_refund_amount;
  v_refund_percentage := ROUND((p_approved_refund_amount / NULLIF(v_booking.total_price, 0)) * 100);

  -- Check if there's an existing pending payout for this booking
  SELECT * INTO v_existing_payout 
  FROM payouts 
  WHERE booking_id = v_dispute.booking_id 
    AND transaction_type = 'booking_payout'
    AND status = 'pending'
  ORDER BY created_at DESC 
  LIMIT 1;

  -- Create refund transaction with dispute_id
  INSERT INTO transactions (
    booking_id,
    type,
    amount,
    currency,
    provider,
    status,
    dispute_id
  ) VALUES (
    v_dispute.booking_id,
    'refund',
    p_approved_refund_amount,
    v_booking.currency,
    'admin',
    'succeeded',
    p_dispute_id
  ) RETURNING id INTO v_transaction_id;

  IF FOUND AND v_existing_payout.status = 'pending' THEN
    -- SCENARIO 1A: Update existing pending payout
    UPDATE payouts
    SET
      amount = v_new_host_net,
      original_amount = COALESCE(original_amount, net_before_adjustments),
      dispute_ids = array_append(COALESCE(dispute_ids, ARRAY[]::uuid[]), p_dispute_id),
      total_dispute_refunds = COALESCE(total_dispute_refunds, 0) + p_approved_refund_amount,
      refund_percentage_applied = v_refund_percentage,
      notes = COALESCE(notes || E'\n', '') || 'Dispute approved: ' || p_resolution_notes,
      updated_at = now()
    WHERE id = v_existing_payout.id;
  ELSE
    -- SCENARIO 1B/1C: No pending payout or already completed - create refund_debt with status='debit'
    INSERT INTO payouts (
      booking_id,
      host_user_id,
      amount,
      currency,
      status,
      transaction_type,
      dispute_ids,
      original_amount,
      notes
    ) VALUES (
      v_dispute.booking_id,
      v_host_user_id,
      -p_approved_refund_amount,
      v_booking.currency,
      'debit',
      'refund_debt',
      ARRAY[p_dispute_id],
      p_approved_refund_amount,
      'Dispute approved: ' || p_resolution_notes
    );
  END IF;

  -- Update dispute status with ALL required fields
  UPDATE disputes 
  SET 
    status = 'resolved_approved',
    admin_decision = 'approved',
    approved_refund_amount = p_approved_refund_amount,
    resolution_notes = p_resolution_notes,
    refund_transaction_id = v_transaction_id,
    resolved_by_admin_id = auth.uid(),
    resolved_at = now(),
    updated_at = now()
  WHERE id = p_dispute_id;

  RETURN json_build_object(
    'success', true,
    'approved_refund_amount', p_approved_refund_amount,
    'new_host_net', v_new_host_net,
    'transaction_id', v_transaction_id
  );
END;
$$;

-- Phase 2: Fix create_payout_on_booking_completion with carry-forward debt logic (Approach B)
DROP FUNCTION IF EXISTS public.create_payout_on_booking_completion() CASCADE;

CREATE OR REPLACE FUNCTION public.create_payout_on_booking_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_user_id uuid;
  v_debt RECORD;
  v_debt_payout_ids_to_settle uuid[] := ARRAY[]::uuid[];
  v_dispute_ids uuid[] := ARRAY[]::uuid[];
  v_total_debt numeric := 0;
  v_gross_revenue numeric;
  v_commission_amount numeric;
  v_net_before_adjustments numeric;
  v_final_payout numeric;
  v_payout_exists boolean;
  v_new_payout_id uuid;
  v_available numeric;
  v_needed numeric;
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

  -- Calculate baseline
  v_gross_revenue := NEW.subtotal + COALESCE(NEW.cleaning_fee, 0);
  v_commission_amount := NEW.host_commission_amount;
  v_net_before_adjustments := NEW.host_payout_net;
  v_available := v_net_before_adjustments;

  -- APPROACH B: Collect ALL host-wide refund_debt payouts with status='debit', ordered oldest-first
  FOR v_debt IN
    SELECT id, amount, dispute_ids
    FROM payouts
    WHERE host_user_id = v_host_user_id
      AND transaction_type = 'refund_debt'
      AND status = 'debit'
      AND amount < 0
    ORDER BY created_at ASC
  LOOP
    v_needed := ABS(v_debt.amount);
    
    IF v_available >= v_needed THEN
      -- Full settlement
      v_total_debt := v_total_debt + v_needed;
      v_dispute_ids := array_cat(v_dispute_ids, COALESCE(v_debt.dispute_ids, ARRAY[]::uuid[]));
      v_available := v_available - v_needed;
      
      -- Mark debt as settled
      UPDATE payouts
      SET 
        status = 'settled',
        payout_date = NOW(),
        notes = COALESCE(notes, '') || format(
          E'\n\nFully settled on %s via booking payout %s (Booking: B-%s)',
          NOW()::DATE,
          SUBSTRING(v_new_payout_id::TEXT, 1, 8),
          SUBSTRING(NEW.id::TEXT, 1, 8)
        ),
        updated_at = NOW()
      WHERE id = v_debt.id;
      
    ELSIF v_available > 0 THEN
      -- Partial settlement
      v_total_debt := v_total_debt + v_available;
      v_dispute_ids := array_cat(v_dispute_ids, COALESCE(v_debt.dispute_ids, ARRAY[]::uuid[]));
      
      -- Update debt with remaining amount
      UPDATE payouts
      SET 
        amount = -(v_needed - v_available),
        notes = COALESCE(notes, '') || format(
          E'\n\nPartially settled $%s on %s via booking payout %s (Booking: B-%s). Remaining: $%s',
          v_available,
          NOW()::DATE,
          SUBSTRING(v_new_payout_id::TEXT, 1, 8),
          SUBSTRING(NEW.id::TEXT, 1, 8),
          v_needed - v_available
        ),
        updated_at = NOW()
      WHERE id = v_debt.id;
      
      v_available := 0;
      EXIT; -- No more funds available
    ELSE
      EXIT; -- No funds available to settle more debts
    END IF;
  END LOOP;

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
        format('Booking completed. %s dispute refund(s) carried forward and deducted: $%s (Net: $%s)', 
               array_length(v_dispute_ids, 1), v_total_debt, v_final_payout)
      ELSE 'Booking completed'
    END
  )
  RETURNING id INTO v_new_payout_id;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_booking_completion
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_payout_on_booking_completion();