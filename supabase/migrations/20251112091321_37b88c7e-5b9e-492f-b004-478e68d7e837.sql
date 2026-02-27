-- ============================================================================
-- Phase 1: Fix JSONB Error in cancel_booking_with_refund
-- ============================================================================

-- Phase 2: Add Pre-Calculated Financial Columns to payouts table
-- ============================================================================
ALTER TABLE public.payouts 
ADD COLUMN IF NOT EXISTS refund_percentage_applied INTEGER,
ADD COLUMN IF NOT EXISTS host_retained_gross NUMERIC,
ADD COLUMN IF NOT EXISTS commission_on_retained NUMERIC,
ADD COLUMN IF NOT EXISTS guest_total_payment NUMERIC,
ADD COLUMN IF NOT EXISTS base_subtotal NUMERIC,
ADD COLUMN IF NOT EXISTS base_cleaning_fee NUMERIC,
ADD COLUMN IF NOT EXISTS gross_revenue NUMERIC,
ADD COLUMN IF NOT EXISTS commission_amount NUMERIC,
ADD COLUMN IF NOT EXISTS net_before_adjustments NUMERIC;

-- Phase 3: Update cancel_booking_with_refund with Pre-Calculated Fields
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_booking_with_refund(
  p_booking_id uuid,
  p_user_id uuid,
  p_cancellation_reason text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_days_before_checkin integer;
  v_cancellation_policy RECORD;
  v_refund_percentage integer;
  v_refund_amount numeric;
  v_guest_total_payment numeric;
  v_host_gross_revenue numeric;
  v_refund_percentage_actual numeric;
  v_host_retained_gross numeric;
  v_commission_on_retention numeric;
  v_host_payout_amount numeric;
  v_transaction_id uuid;
  v_payout_id uuid;
  v_guest_service_fee_refund numeric;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Check if user is authorized
  IF v_booking.guest_user_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the guest can cancel their booking';
  END IF;

  -- Check if booking can be cancelled
  IF v_booking.status NOT IN ('pending_payment', 'confirmed') THEN
    RAISE EXCEPTION 'Booking cannot be cancelled in current status: %', v_booking.status;
  END IF;

  -- Calculate days before check-in
  v_days_before_checkin := v_booking.checkin_date - CURRENT_DATE;

  -- Get cancellation policy (FIX: Correct JSONB extraction with parentheses)
  SELECT cp.* INTO v_cancellation_policy
  FROM cancellation_policies cp
  WHERE cp.id = (v_booking.cancellation_policy_snapshot->>'id')::uuid
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cancellation policy not found';
  END IF;

  -- Determine refund percentage based on cancellation policy
  IF v_days_before_checkin >= v_cancellation_policy.days_before_checkin THEN
    v_refund_percentage := v_cancellation_policy.refund_percentage;
  ELSE
    v_refund_percentage := 0;
  END IF;

  -- Store guest's total payment (what they paid including service fees)
  v_guest_total_payment := v_booking.total_price;
  
  -- Calculate host's gross revenue (subtotal + cleaning fee, no service fees)
  v_host_gross_revenue := v_booking.subtotal + COALESCE(v_booking.cleaning_fee, 0);

  -- Calculate refund based on guest's total payment
  v_refund_amount := v_guest_total_payment * (v_refund_percentage::numeric / 100);
  
  -- Calculate actual refund percentage applied (for tracking)
  v_refund_percentage_actual := CASE 
    WHEN v_guest_total_payment > 0 THEN (v_refund_amount / v_guest_total_payment) * 100
    ELSE 0 
  END;
  
  -- Calculate host retention from their gross revenue perspective
  v_host_retained_gross := v_host_gross_revenue * ((100 - v_refund_percentage)::numeric / 100);
  
  -- Calculate service fee refund (same percentage as booking refund)
  v_guest_service_fee_refund := COALESCE(v_booking.service_fee, 0) * (v_refund_percentage::numeric / 100);

  -- Calculate commission on retained amount only
  v_commission_on_retention := v_host_retained_gross * (COALESCE(v_booking.host_commission_rate, 0) / 100);
  
  -- Final host payout = retained gross - commission on retention
  v_host_payout_amount := v_host_retained_gross - v_commission_on_retention;

  -- Update booking status
  UPDATE bookings 
  SET status = 'cancelled_guest',
      notes = COALESCE(notes || E'\n\n', '') || 
              'Cancelled by guest. Refund: ' || v_refund_percentage || '%. ' ||
              COALESCE('Reason: ' || p_cancellation_reason, ''),
      updated_at = now()
  WHERE id = p_booking_id;

  -- Create refund transaction if applicable
  IF v_refund_amount > 0 THEN
    INSERT INTO transactions (
      booking_id, type, amount, currency, provider, status
    ) VALUES (
      p_booking_id, 'refund', -v_refund_amount, v_booking.currency, 'stripe', 'succeeded'
    ) RETURNING id INTO v_transaction_id;
  END IF;

  -- Create payout for host with pre-calculated financial breakdown
  IF v_host_payout_amount > 0 THEN
    INSERT INTO payouts (
      host_user_id,
      booking_id,
      amount,
      currency,
      status,
      notes,
      transaction_type,
      -- Pre-calculated financial fields
      refund_percentage_applied,
      host_retained_gross,
      commission_on_retained,
      guest_total_payment,
      base_subtotal,
      base_cleaning_fee,
      gross_revenue,
      commission_amount
    ) VALUES (
      (SELECT host_user_id FROM listings WHERE id = v_booking.listing_id),
      p_booking_id,
      v_host_payout_amount,
      v_booking.currency,
      'pending',
      'Cancellation fee - ' || (100 - v_refund_percentage) || '% retention after ' || v_refund_percentage || '% guest refund',
      'cancelled',
      -- Store pre-calculated values
      v_refund_percentage::integer,
      v_host_retained_gross,
      v_commission_on_retention,
      v_guest_total_payment,
      v_booking.subtotal,
      COALESCE(v_booking.cleaning_fee, 0),
      v_host_gross_revenue,
      v_commission_on_retention
    ) RETURNING id INTO v_payout_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'refund_amount', v_refund_amount,
    'refund_percentage', v_refund_percentage,
    'guest_total_payment', v_guest_total_payment,
    'host_gross_revenue', v_host_gross_revenue,
    'host_retained_gross', v_host_retained_gross,
    'commission_on_retention', v_commission_on_retention,
    'host_payout', v_host_payout_amount,
    'service_fee_refund', v_guest_service_fee_refund,
    'transaction_id', v_transaction_id,
    'payout_id', v_payout_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;