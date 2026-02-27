-- Function for host-initiated booking cancellations with 100% guest refund
CREATE OR REPLACE FUNCTION public.host_cancel_booking_full_refund(p_booking_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_booking RECORD;
  v_host_user_id UUID;
  
  -- Financial amounts from booking snapshot
  v_subtotal NUMERIC;
  v_cleaning_fee NUMERIC;
  v_service_fee NUMERIC;
  v_taxes NUMERIC;
  
  -- Calculated refund amounts
  v_guest_total_paid NUMERIC;
  v_refund_to_guest NUMERIC;
  
  v_refund_transaction_id UUID;
BEGIN
  -- Get authenticated user
  v_host_user_id := auth.uid();
  IF v_host_user_id IS NULL THEN
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
  
  -- Validate authorization: caller must be the host of the listing
  IF NOT EXISTS (
    SELECT 1
    FROM public.listings
    WHERE id = v_booking.listing_id
    AND host_user_id = v_host_user_id
  ) AND NOT has_role(v_host_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only the host can cancel this booking';
  END IF;
  
  -- Validate booking status
  IF v_booking.status != 'confirmed'::booking_status THEN
    RAISE EXCEPTION 'Booking cannot be cancelled (status: %)', v_booking.status;
  END IF;
  
  -- Extract financial amounts from booking snapshot
  v_subtotal := v_booking.subtotal;
  v_cleaning_fee := COALESCE(v_booking.cleaning_fee, 0);
  v_service_fee := COALESCE(v_booking.service_fee, 0);
  v_taxes := COALESCE(v_booking.taxes, 0);
  
  -- Calculate 100% refund amounts
  v_guest_total_paid := v_subtotal + v_cleaning_fee + v_service_fee + v_taxes;
  v_refund_to_guest := v_guest_total_paid;
  
  -- Update booking status to 'cancelled_host'
  UPDATE public.bookings
  SET status = 'cancelled_host'::booking_status, updated_at = now()
  WHERE id = p_booking_id;
  
  -- Create refund transaction record
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
  
  -- Return success with financial breakdown
  RETURN json_build_object(
    'success', true,
    'refund_amount', v_refund_to_guest,
    'financial_breakdown', json_build_object(
      'refund_to_guest', v_refund_to_guest,
      'host_payout', 0,
      'platform_revenue', 0
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;