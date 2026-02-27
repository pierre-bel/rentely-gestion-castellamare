-- Fix create_payout_on_booking_completion to only check for booking_payout duplicates
CREATE OR REPLACE FUNCTION create_payout_on_booking_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_user_id UUID;
  v_subtotal NUMERIC;
  v_cleaning_fee NUMERIC;
  v_host_commission_rate NUMERIC;
  v_currency TEXT;
  v_total_debt NUMERIC := 0;
  v_dispute_id UUID;
  v_gross_revenue NUMERIC;
  v_commission_amount NUMERIC;
  v_final_payout_amount NUMERIC;
  v_payout_exists BOOLEAN;
BEGIN
  -- Only trigger on completed bookings
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get host_user_id from listing
  SELECT host_user_id
  INTO v_host_user_id
  FROM listings
  WHERE id = NEW.listing_id;

  -- Get financial details from the booking record (NEW)
  v_subtotal := NEW.subtotal;
  v_cleaning_fee := COALESCE(NEW.cleaning_fee, 0);
  v_host_commission_rate := COALESCE(NEW.host_commission_rate, 0);
  v_currency := NEW.currency;

  -- FIXED: Only check for existing booking_payout, not all payout types
  SELECT EXISTS (
    SELECT 1 FROM payouts 
    WHERE booking_id = NEW.id
    AND transaction_type = 'booking_payout'
  ) INTO v_payout_exists;

  -- Exit if booking payout already exists
  IF v_payout_exists THEN
    RETURN NEW;
  END IF;

  -- Calculate host debt (refund_debt records with negative amounts)
  SELECT 
    COALESCE(SUM(ABS(amount)), 0),
    (array_agg(dispute_id ORDER BY created_at))[1]
  INTO v_total_debt, v_dispute_id
  FROM payouts
  WHERE booking_id = NEW.id
    AND transaction_type = 'refund_debt'
    AND status = 'pending';

  -- Calculate gross revenue and commission
  v_gross_revenue := v_subtotal + v_cleaning_fee;
  v_commission_amount := v_gross_revenue * v_host_commission_rate;
  
  -- Final payout is gross minus commission minus any debts
  v_final_payout_amount := v_gross_revenue - v_commission_amount - v_total_debt;

  -- Create payout record
  INSERT INTO payouts (
    booking_id,
    host_user_id,
    amount,
    currency,
    status,
    transaction_type,
    dispute_id,
    original_amount,
    debt_applied_amount,
    base_subtotal,
    base_cleaning_fee,
    gross_revenue,
    commission_amount,
    net_before_adjustments,
    notes
  ) VALUES (
    NEW.id,
    v_host_user_id,
    v_final_payout_amount,
    v_currency,
    'pending',
    'booking_payout',
    v_dispute_id,
    v_gross_revenue - v_commission_amount,
    v_total_debt,
    v_subtotal,
    v_cleaning_fee,
    v_gross_revenue,
    v_commission_amount,
    v_gross_revenue - v_commission_amount,
    CASE 
      WHEN v_total_debt > 0 THEN 
        format('Booking completed. Debt settlement applied: $%s', v_total_debt)
      ELSE 
        'Booking completed'
    END
  );

  -- If debts were applied, mark them as settled
  IF v_total_debt > 0 THEN
    UPDATE payouts
    SET 
      status = 'settled',
      payout_date = NOW(),
      notes = COALESCE(notes, '') || format(
        E'\n\nSettled on %s via booking completion payout (Booking: B-%s)',
        NOW()::DATE,
        SUBSTRING(NEW.id::TEXT, 1, 8)
      ),
      updated_at = NOW()
    WHERE booking_id = NEW.id
      AND transaction_type = 'refund_debt'
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;