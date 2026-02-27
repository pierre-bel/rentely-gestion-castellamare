-- Fix create_payout_on_booking_completion: Copy dispute_id from debt records to new payout

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

  -- Get booking financial details
  SELECT 
    host_user_id,
    subtotal,
    COALESCE(cleaning_fee, 0),
    COALESCE(host_commission_rate, 0),
    currency
  INTO 
    v_host_user_id,
    v_subtotal,
    v_cleaning_fee,
    v_host_commission_rate,
    v_currency
  FROM listings
  WHERE id = NEW.listing_id;

  -- Check if payout already exists for this booking
  SELECT EXISTS (
    SELECT 1 FROM payouts WHERE booking_id = NEW.id
  ) INTO v_payout_exists;

  -- Exit if payout already exists
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

  RETURN NEW;
END;
$$;