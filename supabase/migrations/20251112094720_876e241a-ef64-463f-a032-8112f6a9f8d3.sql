-- Fix cancel_booking_with_refund function with correct commission calculation
CREATE OR REPLACE FUNCTION cancel_booking_with_refund(
  p_booking_id UUID,
  p_user_id UUID,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_days_until_checkin INTEGER;
  v_refund_percentage INTEGER := 0;
  v_guest_refund_amount NUMERIC := 0;
  v_host_retained_gross NUMERIC := 0;
  v_commission_on_retention NUMERIC := 0;
  v_host_payout_net NUMERIC := 0;
  v_result jsonb;
  v_cancellation_policy jsonb;
BEGIN
  -- Get booking with all financial details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Authorization: user must be guest or host
  IF p_user_id != v_booking.guest_user_id AND 
     p_user_id NOT IN (SELECT host_user_id FROM listings WHERE id = v_booking.listing_id) THEN
    RAISE EXCEPTION 'Unauthorized to cancel this booking';
  END IF;

  -- Check if booking can be cancelled
  IF v_booking.status NOT IN ('confirmed', 'pending_payment') THEN
    RAISE EXCEPTION 'Booking cannot be cancelled in current status: %', v_booking.status;
  END IF;

  -- Get cancellation policy from snapshot
  v_cancellation_policy := v_booking.cancellation_policy_snapshot;
  
  IF v_cancellation_policy IS NULL THEN
    RAISE EXCEPTION 'Cancellation policy not found in booking snapshot';
  END IF;

  -- Calculate days until check-in
  v_days_until_checkin := v_booking.checkin_date - CURRENT_DATE;

  -- Determine refund percentage based on policy
  IF v_days_until_checkin >= (v_cancellation_policy->>'days_before_checkin')::INTEGER THEN
    v_refund_percentage := (v_cancellation_policy->>'refund_percentage')::INTEGER;
  ELSE
    v_refund_percentage := 0;
  END IF;

  -- Calculate financial breakdown
  v_guest_refund_amount := v_booking.total_price * (v_refund_percentage::NUMERIC / 100);
  v_host_retained_gross := (v_booking.subtotal + COALESCE(v_booking.cleaning_fee, 0)) * 
                           ((100 - v_refund_percentage)::NUMERIC / 100);
  
  -- FIX: Correct commission calculation (host_commission_rate is already a decimal like 0.05 for 5%)
  v_commission_on_retention := v_host_retained_gross * COALESCE(v_booking.host_commission_rate, 0);
  
  v_host_payout_net := v_host_retained_gross - v_commission_on_retention;

  -- Update booking status
  UPDATE bookings
  SET 
    status = 'cancelled',
    updated_at = NOW(),
    notes = COALESCE(notes || ' | ', '') || 
            format('Cancelled on %s. Days until check-in: %s. Refund: %s%% ($%s). Host retained: $%s. Commission: $%s. Net payout: $%s',
                   NOW()::date,
                   v_days_until_checkin,
                   v_refund_percentage,
                   ROUND(v_guest_refund_amount, 2),
                   ROUND(v_host_retained_gross, 2),
                   ROUND(v_commission_on_retention, 2),
                   ROUND(v_host_payout_net, 2))
  WHERE id = p_booking_id;

  -- Create refund transaction if applicable
  IF v_guest_refund_amount > 0 THEN
    INSERT INTO transactions (
      booking_id,
      type,
      amount,
      currency,
      status,
      provider
    ) VALUES (
      p_booking_id,
      'refund',
      v_guest_refund_amount,
      v_booking.currency,
      'completed',
      'stripe'
    );
  END IF;

  -- Create host payout record for retained amount
  IF v_host_payout_net > 0 THEN
    INSERT INTO payouts (
      booking_id,
      host_user_id,
      amount,
      currency,
      status,
      transaction_type,
      gross_revenue,
      commission_amount,
      net_before_adjustments,
      refund_percentage_applied,
      host_retained_gross,
      commission_on_retained,
      guest_total_payment,
      base_subtotal,
      base_cleaning_fee,
      notes
    )
    SELECT
      p_booking_id,
      l.host_user_id,
      v_host_payout_net,
      v_booking.currency,
      'pending',
      'cancelled',
      v_booking.subtotal + COALESCE(v_booking.cleaning_fee, 0),
      v_commission_on_retention,
      v_host_payout_net,
      v_refund_percentage,
      v_host_retained_gross,
      v_commission_on_retention,
      v_booking.total_price,
      v_booking.subtotal,
      v_booking.cleaning_fee,
      format('Cancellation payout - %s%% retained after %s%% guest refund',
             (100 - v_refund_percentage),
             v_refund_percentage)
    FROM listings l
    WHERE l.id = v_booking.listing_id;
  END IF;

  -- Return cancellation summary
  v_result := jsonb_build_object(
    'booking_id', p_booking_id,
    'status', 'cancelled',
    'days_until_checkin', v_days_until_checkin,
    'refund_percentage', v_refund_percentage,
    'guest_refund_amount', v_guest_refund_amount,
    'host_retained_gross', v_host_retained_gross,
    'commission_on_retention', v_commission_on_retention,
    'host_payout_net', v_host_payout_net
  );

  RETURN v_result;
END;
$$;