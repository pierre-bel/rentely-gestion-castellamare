-- Fix host payout calculation to include cleaning fee and use actual commission rate
CREATE OR REPLACE FUNCTION public.create_payout_on_booking_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_listing RECORD;
  v_host_payout_gross NUMERIC;
  v_host_commission_amount NUMERIC;
  v_host_payout_net NUMERIC;
  v_new_payout_id UUID;
BEGIN
  -- Only process if booking status changed to 'completed'
  IF NEW.status = 'completed'::booking_status AND (OLD.status IS NULL OR OLD.status != 'completed'::booking_status) THEN
    
    -- Get listing details
    SELECT * INTO v_listing
    FROM public.listings
    WHERE id = NEW.listing_id;
    
    -- Calculate gross payout (subtotal + cleaning fee)
    v_host_payout_gross := NEW.subtotal + COALESCE(NEW.cleaning_fee, 0);
    
    -- Calculate host commission using the booking's actual commission rate
    v_host_commission_amount := ROUND(v_host_payout_gross * COALESCE(NEW.host_commission_rate, 0.05), 2);
    
    -- Calculate net payout (gross - commission)
    v_host_payout_net := v_host_payout_gross - v_host_commission_amount;
    
    -- Update booking with calculated values
    UPDATE public.bookings
    SET 
      host_payout_gross = v_host_payout_gross,
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
      format('Payout for booking %s (Gross: $%s, Commission: $%s, Net: $%s)', 
        SUBSTRING(NEW.id::TEXT, 1, 8),
        v_host_payout_gross,
        v_host_commission_amount,
        v_host_payout_net
      )
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