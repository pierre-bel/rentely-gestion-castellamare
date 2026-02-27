-- Fix transaction status constraint error in cancel_booking_with_refund
-- Change transaction status from 'completed' to 'succeeded'

CREATE OR REPLACE FUNCTION public.cancel_booking_with_refund(p_booking_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking RECORD;
  v_guest_user_id UUID;
  v_days_until_checkin INTEGER;
  v_refund_percentage INTEGER;
  v_cancellation_policy JSONB;
  
  -- Financial amounts from booking snapshot
  v_subtotal NUMERIC;
  v_cleaning_fee NUMERIC;
  v_service_fee NUMERIC;
  v_taxes NUMERIC;
  v_total_price NUMERIC;
  v_host_commission_rate NUMERIC;
  v_host_payout_net NUMERIC;
  
  -- Calculated refund amounts
  v_guest_total_paid NUMERIC;
  v_refund_to_guest NUMERIC;
  v_retained_funds NUMERIC;
  v_host_payout_from_cancellation NUMERIC;
  v_platform_revenue_from_cancellation NUMERIC;
  
  v_refund_transaction_id UUID;
  v_payout_id UUID;
BEGIN
  -- Get authenticated user
  v_guest_user_id := auth.uid();
  IF v_guest_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Lock and fetch booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Validate authorization
  IF v_booking.guest_user_id != v_guest_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only cancel your own bookings';
  END IF;
  
  -- Validate booking status
  IF v_booking.status NOT IN ('pending_payment', 'confirmed') THEN
    RAISE EXCEPTION 'Booking cannot be cancelled (status: %)', v_booking.status;
  END IF;
  
  -- Check if cancellation policy exists
  IF v_booking.cancellation_policy_snapshot IS NULL THEN
    RAISE EXCEPTION 'Booking does not have a cancellation policy';
  END IF;
  
  v_cancellation_policy := v_booking.cancellation_policy_snapshot;
  
  -- Calculate days until check-in
  v_days_until_checkin := v_booking.checkin_date - CURRENT_DATE;
  
  -- Determine refund percentage based on policy
  v_refund_percentage := (v_cancellation_policy->>'refund_percentage')::INTEGER;
  IF v_days_until_checkin < (v_cancellation_policy->>'days_before_checkin')::INTEGER THEN
    v_refund_percentage := 0;
  END IF;
  
  -- Extract financial amounts from booking snapshot
  v_subtotal := v_booking.subtotal;
  v_cleaning_fee := COALESCE(v_booking.cleaning_fee, 0);
  v_service_fee := COALESCE(v_booking.service_fee, 0);
  v_taxes := COALESCE(v_booking.taxes, 0);
  v_total_price := v_booking.total_price;
  v_host_commission_rate := v_booking.host_commission_rate;
  v_host_payout_net := v_booking.host_payout_net;
  
  -- Calculate refund amounts
  v_guest_total_paid := v_subtotal + v_cleaning_fee + v_service_fee + v_taxes;
  v_refund_to_guest := v_guest_total_paid * (v_refund_percentage::NUMERIC / 100);
  v_retained_funds := v_guest_total_paid - v_refund_to_guest;
  
  -- Calculate distribution of retained funds
  -- Host gets their net share of the retained booking amount (subtotal + cleaning - commission)
  v_host_payout_from_cancellation := (v_subtotal + v_cleaning_fee) * (1 - v_refund_percentage::NUMERIC / 100) * (1 - v_host_commission_rate);
  
  -- Platform keeps service fee, taxes, and commission from retained amount
  v_platform_revenue_from_cancellation := v_retained_funds - v_host_payout_from_cancellation;
  
  -- Update booking status to 'cancelled_guest'
  UPDATE public.bookings
  SET status = 'cancelled_guest'::booking_status, updated_at = now()
  WHERE id = p_booking_id;
  
  -- Create refund transaction record (if refund > 0)
  IF v_refund_to_guest > 0 THEN
    INSERT INTO public.transactions (
      booking_id,
      type,
      amount,
      currency,
      provider,
      status
    ) VALUES (
      p_booking_id,
      'refund',
      v_refund_to_guest,
      v_booking.currency,
      'stripe',
      'succeeded'
    )
    RETURNING id INTO v_refund_transaction_id;
  END IF;
  
  -- Create payout record for host (if they should receive anything)
  IF v_host_payout_from_cancellation > 0 THEN
    INSERT INTO public.payouts (
      host_user_id,
      booking_id,
      amount,
      currency,
      status,
      notes
    )
    SELECT 
      l.host_user_id,
      p_booking_id,
      v_host_payout_from_cancellation,
      v_booking.currency,
      'pending',
      'Cancellation payout - ' || v_refund_percentage::TEXT || '% refund to guest'
    FROM public.listings l
    WHERE l.id = v_booking.listing_id
    RETURNING id INTO v_payout_id;
  END IF;
  
  -- Return success with financial breakdown
  RETURN json_build_object(
    'success', true,
    'refund_percentage', v_refund_percentage,
    'financial_breakdown', json_build_object(
      'refund_to_guest', v_refund_to_guest,
      'retained_funds', v_retained_funds,
      'host_payout', v_host_payout_from_cancellation,
      'platform_revenue', v_platform_revenue_from_cancellation
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;