-- Phase 1: Update transaction_type constraint to include 'cancelled'
ALTER TABLE public.payouts 
DROP CONSTRAINT IF EXISTS payouts_transaction_type_check;

ALTER TABLE public.payouts
ADD CONSTRAINT payouts_transaction_type_check 
CHECK (transaction_type IN ('booking_payout', 'debt_collection', 'refund', 'cancelled'));

-- Phase 2: Update existing cancellation payouts to have correct type
UPDATE public.payouts p
SET transaction_type = 'cancelled'
FROM bookings b
WHERE p.booking_id = b.id 
  AND b.status IN ('cancelled_guest', 'cancelled_host')
  AND p.transaction_type = 'booking_payout';

-- Phase 3: Update host_search_payouts RPC function to query actual refunds
CREATE OR REPLACE FUNCTION public.host_search_payouts(
  host_id uuid,
  search_query text DEFAULT NULL,
  status_filter text DEFAULT NULL,
  min_amount numeric DEFAULT NULL,
  max_amount numeric DEFAULT NULL,
  sort_by text DEFAULT 'created_at',
  sort_order text DEFAULT 'desc'
)
RETURNS TABLE (
  id uuid,
  booking_id uuid,
  amount numeric,
  currency text,
  status text,
  payout_date timestamp with time zone,
  created_at timestamp with time zone,
  notes text,
  booking_subtotal numeric,
  booking_host_commission_amount numeric,
  booking_host_payout_net numeric,
  booking_host_payout_gross numeric,
  checkin_date date,
  checkout_date date,
  listing_id uuid,
  listing_title text,
  guest_name text,
  guest_email text,
  dispute_id uuid,
  booking_status text,
  transaction_type text,
  dispute_category text,
  guest_debt_status text,
  refund_amount numeric,
  cancellation_date timestamp with time zone,
  original_amount numeric,
  debt_applied_amount numeric,
  cleaning_fee numeric,
  dispute_refund_amount numeric
) AS $$
BEGIN
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
    prof.first_name || ' ' || COALESCE(prof.last_name, '') AS guest_name,
    prof.email AS guest_email,
    p.dispute_id,
    b.status::text AS booking_status,
    p.transaction_type,
    d.category::text AS dispute_category,
    gd.status AS guest_debt_status,
    -- Query actual refund from transactions table
    (
      SELECT COALESCE(ABS(SUM(t.amount)), 0)
      FROM transactions t
      WHERE t.booking_id = b.id 
        AND t.type = 'refund'
        AND t.status = 'succeeded'
    ) AS refund_amount,
    CASE WHEN b.status IN ('cancelled_guest'::booking_status, 'cancelled_host'::booking_status) 
      THEN b.updated_at ELSE NULL END AS cancellation_date,
    p.original_amount,
    p.debt_applied_amount,
    b.cleaning_fee,
    NULL::numeric AS dispute_refund_amount
  FROM payouts p
  INNER JOIN bookings b ON p.booking_id = b.id
  LEFT JOIN listings l ON b.listing_id = l.id
  LEFT JOIN profiles prof ON b.guest_user_id = prof.id
  LEFT JOIN disputes d ON p.dispute_id = d.id
  LEFT JOIN guest_debts gd ON d.id = gd.dispute_id
  WHERE p.host_user_id = host_id
    AND (search_query IS NULL OR 
         l.title ILIKE '%' || search_query || '%' OR 
         prof.first_name || ' ' || prof.last_name ILIKE '%' || search_query || '%' OR
         prof.email ILIKE '%' || search_query || '%')
    AND (status_filter IS NULL OR p.status = status_filter)
    AND (min_amount IS NULL OR p.amount >= min_amount)
    AND (max_amount IS NULL OR p.amount <= max_amount)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN p.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN p.created_at END ASC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'desc' THEN p.amount END DESC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'asc' THEN p.amount END ASC,
    CASE WHEN sort_by = 'payout_date' AND sort_order = 'desc' THEN p.payout_date END DESC,
    CASE WHEN sort_by = 'payout_date' AND sort_order = 'asc' THEN p.payout_date END ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 4: Update cancel_booking_with_refund function to set transaction_type = 'cancelled'
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
  v_host_retention numeric;
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

  -- Get cancellation policy
  SELECT cp.* INTO v_cancellation_policy
  FROM cancellation_policies cp
  WHERE cp.id = v_booking.cancellation_policy_snapshot->>'id'::text::uuid
  LIMIT 1;

  -- Determine refund percentage based on cancellation policy
  IF v_days_before_checkin >= v_cancellation_policy.days_before_checkin THEN
    v_refund_percentage := v_cancellation_policy.refund_percentage;
  ELSE
    v_refund_percentage := 0;
  END IF;

  -- Calculate refund and host retention
  v_refund_amount := v_booking.total_price * (v_refund_percentage::numeric / 100);
  v_host_retention := v_booking.total_price - v_refund_amount;
  
  -- Calculate service fee refund (same percentage as booking refund)
  v_guest_service_fee_refund := v_booking.service_fee * (v_refund_percentage::numeric / 100);

  -- Calculate host commission on retained amount
  v_commission_on_retention := v_host_retention * (v_booking.host_commission_rate / 100);
  v_host_payout_amount := v_host_retention - v_commission_on_retention;

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

  -- Create payout for host with cancelled transaction type
  IF v_host_payout_amount > 0 THEN
    INSERT INTO payouts (
      host_user_id,
      booking_id,
      amount,
      currency,
      status,
      notes,
      transaction_type
    ) VALUES (
      (SELECT host_user_id FROM listings WHERE id = v_booking.listing_id),
      p_booking_id,
      v_host_payout_amount,
      v_booking.currency,
      'pending',
      'Cancellation fee - ' || (100 - v_refund_percentage) || '% retention after ' || v_refund_percentage || '% guest refund',
      'cancelled'
    ) RETURNING id INTO v_payout_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'refund_amount', v_refund_amount,
    'refund_percentage', v_refund_percentage,
    'host_retention', v_host_retention,
    'host_payout', v_host_payout_amount,
    'service_fee_refund', v_guest_service_fee_refund,
    'transaction_id', v_transaction_id,
    'payout_id', v_payout_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;