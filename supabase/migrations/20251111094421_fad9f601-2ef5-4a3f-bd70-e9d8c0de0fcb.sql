-- ============================================================================
-- Phase 1: Update create_booking_with_financial_snapshot
-- Add guest debt check and set booking status to 'confirmed' directly
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_booking_with_financial_snapshot(
  p_listing_id UUID,
  p_checkin_date DATE,
  p_checkout_date DATE,
  p_guests INTEGER,
  p_subtotal NUMERIC,
  p_cleaning_fee NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_user_id UUID;
  v_nights INTEGER;
  v_cancellation_policy JSONB;
  
  -- Financial rates from platform_settings
  v_service_fee_rate NUMERIC;
  v_tax_rate NUMERIC;
  v_host_commission_rate NUMERIC;
  
  -- Calculated financial amounts
  v_service_fee NUMERIC;
  v_taxes NUMERIC;
  v_total_price NUMERIC;
  v_host_payout_gross NUMERIC;
  v_host_commission_amount NUMERIC;
  v_host_payout_net NUMERIC;
  v_platform_revenue_total NUMERIC;
  
  v_booking_id UUID;
BEGIN
  -- Get authenticated user
  v_guest_user_id := auth.uid();
  IF v_guest_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- CHECK FOR OUTSTANDING DEBTS (CRITICAL - BLOCKS BOOKING)
  IF check_guest_outstanding_debts(v_guest_user_id) THEN
    RAISE EXCEPTION 'OUTSTANDING_DEBT::You have an outstanding debt that must be paid before making new bookings. Please visit your Payments page to resolve this.';
  END IF;
  
  -- Calculate nights
  v_nights := p_checkout_date - p_checkin_date;
  IF v_nights <= 0 THEN
    RAISE EXCEPTION 'Invalid date range';
  END IF;
  
  -- Fetch current active financial rates from platform_settings
  SELECT setting_value::NUMERIC INTO v_service_fee_rate
  FROM public.platform_settings
  WHERE setting_key = 'default_guest_service_fee_rate' AND is_active = true;
  
  SELECT setting_value::NUMERIC INTO v_tax_rate
  FROM public.platform_settings
  WHERE setting_key = 'default_tax_rate' AND is_active = true;
  
  SELECT setting_value::NUMERIC INTO v_host_commission_rate
  FROM public.platform_settings
  WHERE setting_key = 'default_host_commission_rate' AND is_active = true;
  
  -- Validate rates were found
  IF v_service_fee_rate IS NULL OR v_tax_rate IS NULL OR v_host_commission_rate IS NULL THEN
    RAISE EXCEPTION 'Platform financial settings not configured';
  END IF;
  
  -- Calculate guest-side amounts
  v_service_fee := p_subtotal * v_service_fee_rate;
  v_taxes := (p_subtotal + p_cleaning_fee + v_service_fee) * v_tax_rate;
  v_total_price := p_subtotal + p_cleaning_fee + v_service_fee + v_taxes;
  
  -- Calculate host-side amounts
  v_host_payout_gross := p_subtotal + p_cleaning_fee;
  v_host_commission_amount := v_host_payout_gross * v_host_commission_rate;
  v_host_payout_net := v_host_payout_gross - v_host_commission_amount;
  
  -- Calculate platform revenue
  v_platform_revenue_total := v_service_fee + v_taxes + v_host_commission_amount;
  
  -- Fetch cancellation policy snapshot
  SELECT jsonb_build_object(
    'policy_key', cp.policy_key,
    'name', cp.name,
    'description', cp.description,
    'refund_percentage', cp.refund_percentage,
    'days_before_checkin', cp.days_before_checkin
  ) INTO v_cancellation_policy
  FROM public.listings l
  INNER JOIN public.cancellation_policies cp ON cp.id = l.cancellation_policy_id
  WHERE l.id = p_listing_id;
  
  -- Insert booking with complete financial snapshot
  -- STATUS: Set to 'confirmed' directly (simulating automatic successful payment)
  INSERT INTO public.bookings (
    listing_id,
    guest_user_id,
    checkin_date,
    checkout_date,
    nights,
    guests,
    subtotal,
    cleaning_fee,
    service_fee,
    taxes,
    total_price,
    guest_service_fee_rate,
    tax_rate,
    host_commission_rate,
    host_commission_amount,
    host_payout_gross,
    host_payout_net,
    platform_revenue_total,
    cancellation_policy_snapshot,
    notes,
    status
  ) VALUES (
    p_listing_id,
    v_guest_user_id,
    p_checkin_date,
    p_checkout_date,
    v_nights,
    p_guests,
    p_subtotal,
    p_cleaning_fee,
    v_service_fee,
    v_taxes,
    v_total_price,
    v_service_fee_rate,
    v_tax_rate,
    v_host_commission_rate,
    v_host_commission_amount,
    v_host_payout_gross,
    v_host_payout_net,
    v_platform_revenue_total,
    v_cancellation_policy,
    p_notes,
    'confirmed'::booking_status
  ) RETURNING id INTO v_booking_id;
  
  -- Create payment transaction record (simulated successful payment)
  INSERT INTO public.transactions (
    booking_id,
    type,
    amount,
    currency,
    provider,
    status
  ) VALUES (
    v_booking_id,
    'capture',
    v_total_price,
    'USD',
    'stripe',
    'succeeded'
  );
  
  -- Return success with booking details
  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'total_price', v_total_price,
    'financial_breakdown', json_build_object(
      'subtotal', p_subtotal,
      'cleaning_fee', p_cleaning_fee,
      'service_fee', v_service_fee,
      'taxes', v_taxes,
      'total', v_total_price,
      'host_payout_net', v_host_payout_net,
      'platform_revenue', v_platform_revenue_total
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- Phase 2: Create process_guest_debt_payment function
-- ============================================================================

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
  
  -- Create damage_charge transaction
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
    'damage_charge',
    p_payment_amount,
    p_payment_currency,
    p_payment_provider,
    'succeeded',
    v_debt.dispute_id
  ) RETURNING id INTO v_transaction_id;
  
  -- Update debt status to paid
  UPDATE public.guest_debts
  SET 
    status = 'paid',
    paid_at = NOW(),
    updated_at = NOW()
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
      notes = format('Guest debt paid. Transaction ID: %s. Ready for payout processing.', v_transaction_id::TEXT),
      updated_at = NOW()
    WHERE id = v_payout.id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'debt_id', p_guest_debt_id,
    'transaction_id', v_transaction_id,
    'payout_activated', v_payout.id IS NOT NULL
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;