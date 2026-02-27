-- Fix commission calculation in cancel_booking_with_refund
-- host_commission_rate is stored as decimal (0.05 = 5%), not percentage (5)
-- So we should NOT divide by 100

CREATE OR REPLACE FUNCTION cancel_booking_with_refund(
  p_booking_id UUID,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
  v_policy RECORD;
  v_refund_percentage INTEGER;
  v_refund_amount NUMERIC;
  v_host_retention NUMERIC;
  v_commission_on_retention NUMERIC;
  v_host_payout_amount NUMERIC;
  v_guest_service_fee_refund NUMERIC;
  v_guest_total_payment NUMERIC;
  v_host_gross_revenue NUMERIC;
  v_refund_percentage_actual NUMERIC;
  v_host_retained_gross NUMERIC;
BEGIN
  -- Get booking details with policy
  SELECT 
    b.*,
    cp.policy_key,
    cp.refund_percentage,
    cp.days_before_checkin
  INTO v_booking
  FROM bookings b
  JOIN cancellation_policies cp ON cp.id = b.cancellation_policy_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status NOT IN ('confirmed', 'pending_payment') THEN
    RAISE EXCEPTION 'Booking cannot be cancelled (status: %)', v_booking.status;
  END IF;

  -- Calculate days until check-in
  DECLARE
    v_days_until_checkin INTEGER;
  BEGIN
    v_days_until_checkin := v_booking.checkin_date - CURRENT_DATE;
    
    -- Determine refund percentage based on cancellation policy
    IF v_days_until_checkin >= v_booking.days_before_checkin THEN
      v_refund_percentage := v_booking.refund_percentage;
    ELSE
      v_refund_percentage := 0;
    END IF;
  END;
  
  -- Pre-calculate all financial values for transparency
  v_guest_total_payment := v_booking.total_price;
  v_host_gross_revenue := v_booking.subtotal + COALESCE(v_booking.cleaning_fee, 0);
  v_refund_amount := v_guest_total_payment * (v_refund_percentage::numeric / 100);
  v_refund_percentage_actual := CASE 
    WHEN v_guest_total_payment > 0 THEN (v_refund_amount / v_guest_total_payment) * 100
    ELSE 0 
  END;
  v_host_retained_gross := v_host_gross_revenue * ((100 - v_refund_percentage)::numeric / 100);
  v_guest_service_fee_refund := COALESCE(v_booking.service_fee, 0) * (v_refund_percentage::numeric / 100);
  
  -- FIXED: Remove the / 100 since host_commission_rate is already stored as decimal (0.05 = 5%)
  v_commission_on_retention := v_host_retained_gross * COALESCE(v_booking.host_commission_rate, 0);
  
  v_host_payout_amount := v_host_retained_gross - v_commission_on_retention;

  -- Update booking status
  UPDATE bookings 
  SET status = 'cancelled_guest',
      notes = COALESCE(notes || E'\n\n', '') || 
              'Cancelled by guest. Refund: ' || v_refund_percentage || '%. ' ||
              COALESCE('Reason: ' || p_cancellation_reason, ''),
      updated_at = now()
  WHERE id = p_booking_id;

  -- Create refund transaction for guest (if applicable)
  IF v_refund_amount > 0 THEN
    INSERT INTO transactions (booking_id, type, amount, currency, provider, status)
    VALUES (p_booking_id, 'refund', ABS(v_refund_amount), v_booking.currency, 'stripe', 'succeeded');
  END IF;

  -- Create payout record with complete financial breakdown
  INSERT INTO payouts (
    booking_id,
    host_user_id,
    amount,
    currency,
    status,
    transaction_type,
    notes,
    guest_total_payment,
    base_subtotal,
    base_cleaning_fee,
    gross_revenue,
    refund_percentage_applied,
    host_retained_gross,
    commission_amount,
    net_before_adjustments
  ) VALUES (
    p_booking_id,
    v_booking.host_user_id,
    v_host_payout_amount,
    v_booking.currency,
    'pending',
    'cancelled',
    'Booking cancelled by guest. Refund: ' || v_refund_percentage || '%. Host retained: ' || (100 - v_refund_percentage) || '%.',
    v_guest_total_payment,
    v_booking.subtotal,
    COALESCE(v_booking.cleaning_fee, 0),
    v_host_gross_revenue,
    v_refund_percentage,
    v_host_retained_gross,
    v_commission_on_retention,
    v_host_payout_amount
  );

  RETURN jsonb_build_object(
    'success', true,
    'refund_percentage', v_refund_percentage,
    'refund_amount', v_refund_amount,
    'host_payout', v_host_payout_amount,
    'guest_total_payment', v_guest_total_payment,
    'host_gross_revenue', v_host_gross_revenue,
    'host_retained_gross', v_host_retained_gross,
    'commission_on_retained', v_commission_on_retention
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;