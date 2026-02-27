-- Fix create_payout_on_booking_completion to deduct pre-existing refund debts

CREATE OR REPLACE FUNCTION public.create_payout_on_booking_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_listing_id UUID;
  v_host_user_id UUID;
  v_total_debt NUMERIC;
  v_final_payout NUMERIC;
  v_debt_notes TEXT;
BEGIN
  -- Only process when booking transitions to completed status
  IF NEW.status = 'completed'::booking_status AND OLD.status = 'confirmed'::booking_status THEN
    -- Get listing and host info
    SELECT listing_id INTO v_listing_id FROM bookings WHERE id = NEW.id;
    SELECT host_user_id INTO v_host_user_id FROM listings WHERE id = v_listing_id;
    
    -- Check for pre-existing debt records (from disputes resolved before completion)
    SELECT COALESCE(SUM(ABS(amount)), 0)
    INTO v_total_debt
    FROM payouts
    WHERE booking_id = NEW.id
      AND host_user_id = v_host_user_id
      AND status = 'debit'
      AND transaction_type = 'refund';
    
    -- Calculate final payout after deducting debts
    v_final_payout := NEW.host_payout_net - v_total_debt;
    
    -- Build debt notes if applicable
    IF v_total_debt > 0 THEN
      v_debt_notes := format(' | Guest refund debt applied: $%s (Original: $%s, Final: $%s)', 
                             v_total_debt, NEW.host_payout_net, v_final_payout);
    ELSE
      v_debt_notes := '';
    END IF;
    
    -- Only create payout if final amount is positive
    IF v_final_payout > 0 THEN
      INSERT INTO payouts (
        booking_id,
        host_user_id,
        amount,
        currency,
        status,
        transaction_type,
        base_subtotal,
        base_cleaning_fee,
        gross_revenue,
        commission_amount,
        net_before_adjustments,
        guest_total_payment,
        original_amount,
        debt_applied_amount,
        notes
      ) VALUES (
        NEW.id,
        v_host_user_id,
        v_final_payout,
        NEW.currency,
        'pending',
        'booking_payout',
        NEW.subtotal,
        COALESCE(NEW.cleaning_fee, 0),
        NEW.subtotal + COALESCE(NEW.cleaning_fee, 0),
        NEW.host_commission_amount,
        NEW.host_payout_net,
        NEW.total_price,
        NEW.host_payout_net,
        v_total_debt,
        CASE 
          WHEN v_total_debt > 0 THEN format('Booking completed payout. Refund debt deducted: $%s', v_total_debt)
          ELSE 'Booking completed payout'
        END
      );
    END IF;
    
    -- If debt fully consumed the payout, the debt records remain but no payout is created
    -- This maintains transparency in the payouts table
  END IF;
  
  RETURN NEW;
END;
$function$;