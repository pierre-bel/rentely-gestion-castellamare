-- Add columns to payouts table for tracking debt applications and financial breakdown
ALTER TABLE public.payouts
ADD COLUMN IF NOT EXISTS original_amount NUMERIC,
ADD COLUMN IF NOT EXISTS debt_applied_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS debt_payout_ids UUID[] DEFAULT ARRAY[]::UUID[];

COMMENT ON COLUMN public.payouts.original_amount IS 'Original payout amount before any debt deductions';
COMMENT ON COLUMN public.payouts.debt_applied_amount IS 'Total amount of debt deducted from this payout';
COMMENT ON COLUMN public.payouts.debt_payout_ids IS 'Array of debt payout IDs that were applied to this payout';

-- Update the apply_outstanding_debts_to_payout trigger function to track debt applications
CREATE OR REPLACE FUNCTION public.apply_outstanding_debts_to_payout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_debt RECORD;
  v_remaining_amount NUMERIC;
  v_applied_amount NUMERIC;
BEGIN
  -- Only process positive payouts that are pending
  IF NEW.amount <= 0 OR NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;
  
  -- Store original amount before any debt deductions
  IF NEW.original_amount IS NULL THEN
    UPDATE public.payouts
    SET original_amount = NEW.amount
    WHERE id = NEW.id;
    
    NEW.original_amount := NEW.amount;
  END IF;
  
  v_remaining_amount := NEW.amount;
  
  -- Process outstanding debts for this host
  FOR v_debt IN 
    SELECT gd.id, gd.amount, gd.booking_id
    FROM public.guest_debts gd
    INNER JOIN public.bookings b ON b.id = gd.booking_id
    INNER JOIN public.listings l ON l.id = b.listing_id
    WHERE l.host_user_id = NEW.host_user_id
      AND gd.status = 'outstanding'
      AND (gd.expires_at IS NULL OR gd.expires_at > NOW())
    ORDER BY gd.created_at ASC
    FOR UPDATE OF gd
  LOOP
    -- Calculate how much we can apply
    v_applied_amount := LEAST(v_debt.amount, v_remaining_amount);
    
    IF v_applied_amount > 0 THEN
      -- Create a debt settlement payout record (negative amount)
      INSERT INTO public.payouts (
        host_user_id,
        booking_id,
        amount,
        currency,
        status,
        notes,
        transaction_type,
        payout_date
      ) VALUES (
        NEW.host_user_id,
        v_debt.booking_id,
        -v_applied_amount,
        NEW.currency,
        'debit',
        format('Debt settlement applied to payout %s', NEW.id),
        'debt_settlement',
        NOW()
      );
      
      -- Update the main payout amount and track debt application
      v_remaining_amount := v_remaining_amount - v_applied_amount;
      
      UPDATE public.payouts
      SET 
        amount = v_remaining_amount,
        debt_applied_amount = COALESCE(debt_applied_amount, 0) + v_applied_amount,
        debt_payout_ids = array_append(COALESCE(debt_payout_ids, ARRAY[]::UUID[]), v_debt.id),
        notes = COALESCE(notes || E'\n', '') || format('Debt of $%s applied from booking %s', v_applied_amount, v_debt.booking_id),
        updated_at = NOW()
      WHERE id = NEW.id;
      
      NEW.amount := v_remaining_amount;
      NEW.debt_applied_amount := COALESCE(NEW.debt_applied_amount, 0) + v_applied_amount;
      NEW.debt_payout_ids := array_append(COALESCE(NEW.debt_payout_ids, ARRAY[]::UUID[]), v_debt.id);
      
      -- Update guest debt status
      IF v_applied_amount >= v_debt.amount THEN
        -- Debt fully paid
        UPDATE public.guest_debts
        SET 
          status = 'settled',
          paid_at = NOW()
        WHERE id = v_debt.id;
      ELSE
        -- Partial payment
        UPDATE public.guest_debts
        SET 
          status = 'partially_settled',
          amount = amount - v_applied_amount
        WHERE id = v_debt.id;
      END IF;
    END IF;
    
    -- Stop if payout is exhausted
    EXIT WHEN v_remaining_amount <= 0;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Update host_search_payouts to include new financial breakdown columns
CREATE OR REPLACE FUNCTION public.host_search_payouts(
  p_host_user_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_transaction_type_filter TEXT DEFAULT NULL,
  p_min_amount NUMERIC DEFAULT NULL,
  p_max_amount NUMERIC DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE(
  id UUID,
  booking_id UUID,
  amount NUMERIC,
  currency TEXT,
  status TEXT,
  payout_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  booking_subtotal NUMERIC,
  booking_host_commission_amount NUMERIC,
  booking_host_payout_net NUMERIC,
  booking_host_payout_gross NUMERIC,
  checkin_date DATE,
  checkout_date DATE,
  listing_id UUID,
  listing_title TEXT,
  guest_name TEXT,
  guest_email TEXT,
  dispute_id UUID,
  booking_status TEXT,
  transaction_type TEXT,
  dispute_category TEXT,
  guest_debt_status TEXT,
  refund_amount NUMERIC,
  cancellation_date TIMESTAMP WITH TIME ZONE,
  original_amount NUMERIC,
  debt_applied_amount NUMERIC,
  cleaning_fee NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify caller is a host
  IF NOT has_role(p_host_user_id, 'host'::app_role) AND NOT has_role(p_host_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only hosts can view their payouts';
  END IF;
  
  -- Verify caller is requesting their own data or is an admin
  IF auth.uid() != p_host_user_id AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: You can only view your own payouts';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.booking_id,
    p.amount,
    p.currency,
    p.status,
    p.payout_date,
    p.created_at,
    p.notes,
    b.subtotal AS booking_subtotal,
    b.host_commission_amount AS booking_host_commission_amount,
    b.host_payout_net AS booking_host_payout_net,
    b.host_payout_gross AS booking_host_payout_gross,
    b.checkin_date,
    b.checkout_date,
    l.id AS listing_id,
    l.title AS listing_title,
    CONCAT(prof.first_name, ' ', prof.last_name) AS guest_name,
    prof.email AS guest_email,
    p.dispute_id,
    b.status::TEXT AS booking_status,
    CASE
      WHEN p.transaction_type = 'debt_settlement' THEN 'debt_collection'
      WHEN p.amount < 0 AND d.id IS NOT NULL THEN 'refund_debt'
      WHEN b.status IN ('cancelled_guest'::booking_status, 'cancelled_host'::booking_status) THEN 'cancelled'
      ELSE 'regular_earning'
    END AS transaction_type,
    d.category::TEXT AS dispute_category,
    gd.status AS guest_debt_status,
    CASE WHEN b.status IN ('cancelled_guest'::booking_status, 'cancelled_host'::booking_status) 
      THEN ABS(p.amount) ELSE NULL END AS refund_amount,
    CASE WHEN b.status IN ('cancelled_guest'::booking_status, 'cancelled_host'::booking_status) 
      THEN b.updated_at ELSE NULL END AS cancellation_date,
    p.original_amount,
    p.debt_applied_amount,
    b.cleaning_fee
  FROM public.payouts p
  INNER JOIN public.bookings b ON b.id = p.booking_id
  INNER JOIN public.listings l ON l.id = b.listing_id
  INNER JOIN public.profiles prof ON prof.id = b.guest_user_id
  LEFT JOIN public.disputes d ON d.id = p.dispute_id
  LEFT JOIN public.guest_debts gd ON gd.dispute_id = d.id
  WHERE 
    p.host_user_id = p_host_user_id
    AND (p_search_query IS NULL OR 
         l.title ILIKE '%' || p_search_query || '%' OR
         prof.first_name ILIKE '%' || p_search_query || '%' OR
         prof.last_name ILIKE '%' || p_search_query || '%' OR
         prof.email ILIKE '%' || p_search_query || '%')
    AND (p_status_filter IS NULL OR p.status = p_status_filter)
    AND (p_transaction_type_filter IS NULL OR 
         CASE
           WHEN p.transaction_type = 'debt_settlement' THEN 'debt_collection'
           WHEN p.amount < 0 AND d.id IS NOT NULL THEN 'refund_debt'
           WHEN b.status IN ('cancelled_guest'::booking_status, 'cancelled_host'::booking_status) THEN 'cancelled'
           ELSE 'regular_earning'
         END = p_transaction_type_filter)
    AND (p_min_amount IS NULL OR p.amount >= p_min_amount)
    AND (p_max_amount IS NULL OR p.amount <= p_max_amount)
  ORDER BY
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN p.created_at END DESC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN p.created_at END ASC,
    CASE WHEN p_sort_by = 'amount' AND p_sort_order = 'desc' THEN p.amount END DESC,
    CASE WHEN p_sort_by = 'amount' AND p_sort_order = 'asc' THEN p.amount END ASC,
    CASE WHEN p_sort_by = 'payout_date' AND p_sort_order = 'desc' THEN p.payout_date END DESC,
    CASE WHEN p_sort_by = 'payout_date' AND p_sort_order = 'asc' THEN p.payout_date END ASC,
    p.created_at DESC;
END;
$function$;