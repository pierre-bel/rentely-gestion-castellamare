-- Fix booking status to pending_payment and restore proper checkout flow

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
  -- STATUS: Set to 'pending_payment' (payment happens at checkout)
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
    'pending_payment'::booking_status
  ) RETURNING id INTO v_booking_id;
  
  -- Transaction will be created by confirm_booking_payment() when user completes checkout
  -- DO NOT create transaction here
  
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