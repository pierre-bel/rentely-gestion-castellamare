-- Add server-side date conflict validation to booking creation

-- Drop the existing function to recreate it with validation
DROP FUNCTION IF EXISTS create_booking_with_financial_snapshot(uuid, date, date, integer, numeric, numeric, jsonb, jsonb);
DROP FUNCTION IF EXISTS create_booking_with_financial_snapshot(uuid, date, date, integer, numeric, numeric, jsonb);
DROP FUNCTION IF EXISTS create_booking_with_financial_snapshot(uuid, date, date, integer, numeric, numeric);

-- Recreate the function with date conflict validation
CREATE OR REPLACE FUNCTION create_booking_with_financial_snapshot(
  p_listing_id uuid,
  p_checkin_date date,
  p_checkout_date date,
  p_guests integer,
  p_subtotal numeric,
  p_cleaning_fee numeric,
  p_nights_breakdown jsonb DEFAULT NULL,
  p_pricing_breakdown jsonb DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id uuid;
  v_nights integer;
  v_guest_user_id uuid;
  v_guest_service_fee_rate numeric;
  v_tax_rate numeric;
  v_service_fee numeric;
  v_taxes numeric;
  v_total_price numeric;
  v_host_commission_rate numeric;
  v_host_commission_amount numeric;
  v_host_payout_gross numeric;
  v_host_payout_net numeric;
  v_platform_revenue_total numeric;
  v_cancellation_policy jsonb;
  v_conflict_count integer;
BEGIN
  -- Get authenticated user
  v_guest_user_id := auth.uid();
  
  IF v_guest_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create a booking';
  END IF;

  -- Check for date conflicts with existing bookings
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE listing_id = p_listing_id
    AND status IN ('confirmed', 'pending_payment', 'completed')
    AND (
      -- Check if the new booking overlaps with existing bookings
      (p_checkin_date < checkout_date AND p_checkout_date > checkin_date)
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'The selected dates are no longer available. Please choose different dates.';
  END IF;

  -- Check for manually blocked dates
  SELECT COUNT(*) INTO v_conflict_count
  FROM listing_availability
  WHERE listing_id = p_listing_id
    AND price IS NULL  -- NULL price means blocked
    AND (
      -- Check if the new booking overlaps with blocked dates
      (p_checkin_date <= end_date AND p_checkout_date >= start_date)
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Some dates in your selection are blocked by the host. Please choose different dates.';
  END IF;

  -- Calculate nights
  v_nights := p_checkout_date - p_checkin_date;

  -- Fetch guest service fee rate
  SELECT COALESCE(
    (SELECT setting_value::numeric 
     FROM platform_settings 
     WHERE setting_key = 'default_guest_service_fee_rate' 
       AND is_active = true 
     ORDER BY effective_from DESC 
     LIMIT 1),
    0.08
  ) INTO v_guest_service_fee_rate;

  -- Fetch tax rate
  SELECT COALESCE(
    (SELECT setting_value::numeric 
     FROM platform_settings 
     WHERE setting_key = 'default_tax_rate' 
       AND is_active = true 
     ORDER BY effective_from DESC 
     LIMIT 1),
    0.10
  ) INTO v_tax_rate;

  -- Fetch host commission rate
  SELECT COALESCE(
    (SELECT setting_value::numeric 
     FROM platform_settings 
     WHERE setting_key = 'default_host_commission_rate' 
       AND is_active = true 
     ORDER BY effective_from DESC 
     LIMIT 1),
    0.15
  ) INTO v_host_commission_rate;

  -- Calculate fees
  v_service_fee := p_subtotal * v_guest_service_fee_rate;
  v_taxes := (p_subtotal + p_cleaning_fee + v_service_fee) * v_tax_rate;
  v_total_price := p_subtotal + p_cleaning_fee + v_service_fee + v_taxes;

  -- Calculate host payout amounts
  v_host_payout_gross := p_subtotal + p_cleaning_fee;
  v_host_commission_amount := v_host_payout_gross * v_host_commission_rate;
  v_host_payout_net := v_host_payout_gross - v_host_commission_amount;
  v_platform_revenue_total := v_service_fee + v_taxes + v_host_commission_amount;

  -- Fetch cancellation policy
  SELECT jsonb_build_object(
    'policy_key', cp.policy_key,
    'name', cp.name,
    'description', cp.description,
    'refund_percentage', cp.refund_percentage,
    'days_before_checkin', cp.days_before_checkin
  ) INTO v_cancellation_policy
  FROM listings l
  JOIN cancellation_policies cp ON cp.id = l.cancellation_policy_id
  WHERE l.id = p_listing_id;

  -- Create booking with complete financial snapshot
  INSERT INTO bookings (
    listing_id,
    guest_user_id,
    status,
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
    pricing_breakdown,
    notes
  ) VALUES (
    p_listing_id,
    v_guest_user_id,
    'pending_payment',
    p_checkin_date,
    p_checkout_date,
    v_nights,
    p_guests,
    p_subtotal,
    p_cleaning_fee,
    v_service_fee,
    v_taxes,
    v_total_price,
    v_guest_service_fee_rate,
    v_tax_rate,
    v_host_commission_rate,
    v_host_commission_amount,
    v_host_payout_gross,
    v_host_payout_net,
    v_platform_revenue_total,
    v_cancellation_policy,
    p_pricing_breakdown,
    p_notes
  ) RETURNING id INTO v_booking_id;

  -- Return success with booking ID
  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'message', 'Booking created successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create booking: %', SQLERRM;
END;
$$;