-- Modify the create_payout_on_booking_completion trigger to automatically apply debts
CREATE OR REPLACE FUNCTION public.create_payout_on_booking_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_listing RECORD;
  v_host_payout_net NUMERIC;
  v_host_commission_amount NUMERIC;
  v_new_payout_id UUID;
BEGIN
  -- Only process if booking status changed to 'completed'
  IF NEW.status = 'completed'::booking_status AND (OLD.status IS NULL OR OLD.status != 'completed'::booking_status) THEN
    
    -- Get listing details
    SELECT * INTO v_listing
    FROM public.listings
    WHERE id = NEW.listing_id;
    
    -- Calculate host commission and net payout
    v_host_commission_amount := ROUND(NEW.subtotal * 0.15, 2);
    v_host_payout_net := NEW.subtotal - v_host_commission_amount;
    
    -- Update booking with calculated commission
    UPDATE public.bookings
    SET 
      host_commission_amount = v_host_commission_amount,
      host_payout_net = v_host_payout_net
    WHERE id = NEW.id;
    
    -- Create payout record for host and capture the ID
    INSERT INTO public.payouts (
      host_user_id,
      booking_id,
      amount,
      currency,
      status,
      transaction_type,
      notes
    ) VALUES (
      v_listing.host_user_id,
      NEW.id,
      v_host_payout_net,
      NEW.currency,
      'pending',
      'booking_payout',
      format('Payout for booking %s', SUBSTRING(NEW.id::TEXT, 1, 8))
    )
    RETURNING id INTO v_new_payout_id;
    
    -- Automatically apply any outstanding debts to this new payout
    BEGIN
      PERFORM apply_outstanding_debts_to_payout(v_new_payout_id);
    EXCEPTION WHEN OTHERS THEN
      -- Log warning but don't fail the payout creation
      RAISE WARNING 'Could not apply debts to payout %: %', v_new_payout_id, SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$function$;