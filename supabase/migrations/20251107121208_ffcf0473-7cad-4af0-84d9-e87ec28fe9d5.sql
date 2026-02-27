-- Create trigger function to automatically create payout records when bookings are completed
CREATE OR REPLACE FUNCTION public.create_payout_on_booking_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_host_user_id UUID;
  v_payout_amount NUMERIC;
BEGIN
  -- Only proceed if status changed to 'completed' (and wasn't already 'completed')
  IF NEW.status = 'completed'::booking_status AND 
     (OLD.status IS NULL OR OLD.status != 'completed'::booking_status) THEN
    
    -- Get the host_user_id from the listing
    SELECT host_user_id INTO v_host_user_id
    FROM public.listings
    WHERE id = NEW.listing_id;
    
    IF v_host_user_id IS NULL THEN
      RAISE WARNING 'Could not find host for listing_id: %. Payout not created for booking_id: %', 
        NEW.listing_id, NEW.id;
      RETURN NEW;
    END IF;
    
    -- Get the payout amount from the booking's financial snapshot
    v_payout_amount := NEW.host_payout_net;
    
    IF v_payout_amount IS NULL OR v_payout_amount <= 0 THEN
      RAISE WARNING 'Invalid payout amount (%) for booking_id: %. Payout not created.', 
        v_payout_amount, NEW.id;
      RETURN NEW;
    END IF;
    
    -- Insert the payout record
    INSERT INTO public.payouts (
      host_user_id,
      booking_id,
      amount,
      currency,
      status,
      notes
    ) VALUES (
      v_host_user_id,
      NEW.id,
      v_payout_amount,
      COALESCE(NEW.currency, 'USD'),
      'pending',
      'Auto-generated payout for completed booking'
    );
    
    RAISE NOTICE 'Payout created for booking_id: %, host_user_id: %, amount: %', 
      NEW.id, v_host_user_id, v_payout_amount;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger on the bookings table
DROP TRIGGER IF EXISTS after_booking_completed ON public.bookings;

CREATE TRIGGER after_booking_completed
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_payout_on_booking_completion();