-- Add pricing_breakdown column to bookings table

ALTER TABLE public.bookings
ADD COLUMN pricing_breakdown JSONB DEFAULT NULL;

COMMENT ON COLUMN public.bookings.pricing_breakdown IS 'Stores detailed pricing breakdown: base nights count/total, custom nights count/total, discount type/rate/amount';

-- Update the create_booking_with_financial_snapshot function to accept and store pricing_breakdown

CREATE OR REPLACE FUNCTION public.create_booking_with_financial_snapshot(
  p_listing_id UUID,
  p_checkin_date DATE,
  p_checkout_date DATE,
  p_guests INTEGER,
  p_subtotal NUMERIC,
  p_cleaning_fee NUMERIC,
  p_notes TEXT DEFAULT NULL,
  p_nights_breakdown JSONB DEFAULT NULL,
  p_pricing_breakdown JSONB DEFAULT NULL
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
  
  -- Discount verification variables
  v_listing RECORD;
  v_calculated_subtotal NUMERIC := 0;
  v_base_price_nights_total NUMERIC := 0;
  v_custom_price_nights_total NUMERIC := 0;
  v_base_price_nights_count INTEGER := 0;
  v_discount_to_apply NUMERIC := 0;
  
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
  
  -- Fetch listing with discount info
  SELECT 
    base_price, 
    COALESCE(weekly_discount, 0) as weekly_discount, 
    COALESCE(monthly_discount, 0) as monthly_discount
  INTO v_listing
  FROM listings
  WHERE id = p_listing_id;
  
  IF v_listing IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  
  -- Verify subtotal calculation if breakdown provided
  IF p_nights_breakdown IS NOT NULL THEN
    v_base_price_nights_count := COALESCE((p_nights_breakdown->>'base_nights')::INTEGER, 0);
    v_base_price_nights_total := COALESCE((p_nights_breakdown->>'base_total')::NUMERIC, 0);
    v_custom_price_nights_total := COALESCE((p_nights_breakdown->>'custom_total')::NUMERIC, 0);
    
    -- Determine which discount applies (if any)
    -- Weekly: 7-29 nights, Monthly: 30+ nights
    IF v_nights >= 30 AND v_listing.monthly_discount > 0 THEN
      v_discount_to_apply := v_listing.monthly_discount / 100.0;
    ELSIF v_nights >= 7 AND v_listing.weekly_discount > 0 THEN
      v_discount_to_apply := v_listing.weekly_discount / 100.0;
    END IF;
    
    -- Apply discount only to base-price nights
    v_calculated_subtotal := v_custom_price_nights_total + 
      (v_base_price_nights_total * (1 - v_discount_to_apply));
    
    -- Verify frontend calculation matches (tolerance of $0.02 for rounding)
    IF ABS(v_calculated_subtotal - p_subtotal) > 0.02 THEN
      RAISE EXCEPTION 'Subtotal mismatch. Expected: %, Received: %', 
        v_calculated_subtotal, p_subtotal;
    END IF;
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
    RAISE EXCEPTION 'Platform rates not configured';
  END IF;
  
  -- Calculate financial amounts
  v_service_fee := p_subtotal * v_service_fee_rate;
  v_taxes := (p_subtotal + p_cleaning_fee + v_service_fee) * v_tax_rate;
  v_total_price := p_subtotal + p_cleaning_fee + v_service_fee + v_taxes;
  
  -- Host payouts
  v_host_payout_gross := p_subtotal + p_cleaning_fee;
  v_host_commission_amount := v_host_payout_gross * v_host_commission_rate;
  v_host_payout_net := v_host_payout_gross - v_host_commission_amount;
  
  -- Platform revenue
  v_platform_revenue_total := v_service_fee + v_taxes + v_host_commission_amount;
  
  -- Fetch cancellation policy details
  SELECT jsonb_build_object(
    'name', cp.name,
    'description', cp.description,
    'refund_percentage', cp.refund_percentage,
    'days_before_checkin', cp.days_before_checkin
  ) INTO v_cancellation_policy
  FROM listings l
  JOIN cancellation_policies cp ON l.cancellation_policy_id = cp.id
  WHERE l.id = p_listing_id;
  
  -- Insert booking with financial snapshot
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
    status,
    pricing_breakdown
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
    'pending_payment',
    p_pricing_breakdown
  )
  RETURNING id INTO v_booking_id;
  
  -- Return success with booking_id
  RETURN json_build_object(
    'booking_id', v_booking_id,
    'status', 'pending_payment'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Catch all errors and return structured error
    RAISE;
END;
$$;