-- ============================================================================
-- Phase 4: Update create_payout_on_booking_completion with Pre-Calculated Fields
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_payout_on_booking_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_listing RECORD;
  v_gross_revenue NUMERIC;
BEGIN
  IF NEW.status = 'completed'::booking_status AND OLD.status != 'completed'::booking_status THEN
    SELECT * INTO v_listing FROM public.listings WHERE id = NEW.listing_id;
    
    -- Calculate gross revenue
    v_gross_revenue := NEW.subtotal + COALESCE(NEW.cleaning_fee, 0);
    
    -- Create payout with pre-calculated financial fields
    INSERT INTO public.payouts (
      host_user_id, 
      booking_id, 
      amount, 
      currency, 
      status, 
      notes, 
      transaction_type,
      -- Pre-calculated fields for normal bookings
      base_subtotal,
      base_cleaning_fee,
      gross_revenue,
      commission_amount
    ) VALUES (
      v_listing.host_user_id, 
      NEW.id,
      COALESCE(NEW.host_payout_net, v_gross_revenue - COALESCE(NEW.host_commission_amount, 0)),
      NEW.currency, 
      'pending',
      format('Payout for completed booking. Subtotal: $%s, Cleaning: $%s, Commission: $%s',
        NEW.subtotal, COALESCE(NEW.cleaning_fee, 0), COALESCE(NEW.host_commission_amount, 0)),
      'booking_payout',
      -- Store pre-calculated values
      NEW.subtotal,
      COALESCE(NEW.cleaning_fee, 0),
      v_gross_revenue,
      COALESCE(NEW.host_commission_amount, 0)
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- Fix cancel_booking_with_refund: Use snapshot data directly (no lookup needed)
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
  v_policy_days_before integer;
  v_policy_refund_percentage integer;
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

  -- Get cancellation policy from snapshot (FIX: Use snapshot data directly, no lookup)
  IF v_booking.cancellation_policy_snapshot IS NULL THEN
    -- Fallback to flexible policy if no snapshot
    v_policy_days_before := 1;
    v_policy_refund_percentage := 100;
  ELSE
    v_policy_days_before := COALESCE((v_booking.cancellation_policy_snapshot->>'days_before_checkin')::integer, 1);
    v_policy_refund_percentage := COALESCE((v_booking.cancellation_policy_snapshot->>'refund_percentage')::integer, 100);
  END IF;

  -- Determine refund percentage based on cancellation policy
  IF v_days_before_checkin >= v_policy_days_before THEN
    v_refund_percentage := v_policy_refund_percentage;
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