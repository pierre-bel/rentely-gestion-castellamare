
-- Fix host_search_payouts function - resolve ambiguous column reference
DROP FUNCTION IF EXISTS public.host_search_payouts(text, text, numeric, numeric, text, text, text);

CREATE OR REPLACE FUNCTION public.host_search_payouts(
  search_query text DEFAULT NULL::text,
  status_filter text DEFAULT NULL::text,
  min_amount numeric DEFAULT NULL::numeric,
  max_amount numeric DEFAULT NULL::numeric,
  sort_by text DEFAULT 'created_at'::text,
  sort_order text DEFAULT 'desc'::text,
  transaction_type_filter text DEFAULT NULL::text
)
RETURNS TABLE(
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
  cancellation_date timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify caller is a host
  IF NOT has_role(auth.uid(), 'host'::app_role) AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only hosts can search their payouts';
  END IF;

  RETURN QUERY
  WITH all_transactions AS (
    -- Part 1: Regular payouts and debt-related payouts
    SELECT 
      p.id,
      p.booking_id,
      p.amount,
      p.currency,
      p.status,
      p.payout_date,
      p.created_at,
      p.notes,
      b.subtotal as booking_subtotal,
      b.host_commission_amount as booking_host_commission_amount,
      b.host_payout_net as booking_host_payout_net,
      b.host_payout_gross as booking_host_payout_gross,
      b.checkin_date,
      b.checkout_date,
      l.id as listing_id,
      COALESCE(l.title, 'Dispute Refund Debt') as listing_title,
      COALESCE(guest_prof.first_name || ' ' || guest_prof.last_name, 'N/A') as guest_name,
      COALESCE(guest_prof.email, '') as guest_email,
      p.dispute_id,
      b.status::text as booking_status,
      CASE 
        WHEN p.amount < 0 THEN 'refund_debt'
        WHEN p.dispute_id IS NOT NULL AND p.amount > 0 THEN 'debt_collection'
        ELSE 'regular_earning'
      END as transaction_type,
      d.category::text as dispute_category,
      gd.status as guest_debt_status,
      NULL::numeric as refund_amount,
      NULL::timestamp with time zone as cancellation_date
    FROM payouts p
    LEFT JOIN bookings b ON b.id = p.booking_id
    LEFT JOIN listings l ON l.id = b.listing_id
    LEFT JOIN profiles guest_prof ON guest_prof.id = b.guest_user_id
    LEFT JOIN disputes d ON d.id = p.dispute_id
    LEFT JOIN guest_debts gd ON gd.dispute_id = p.dispute_id AND gd.guest_user_id = b.guest_user_id
    WHERE 
      p.host_user_id = auth.uid()
      AND (search_query IS NULL OR 
           l.title ILIKE '%' || search_query || '%' OR
           guest_prof.first_name ILIKE '%' || search_query || '%' OR
           guest_prof.last_name ILIKE '%' || search_query || '%')
      AND (status_filter IS NULL OR p.status = status_filter)
      AND (min_amount IS NULL OR ABS(p.amount) >= min_amount)
      AND (max_amount IS NULL OR ABS(p.amount) <= max_amount)
      AND (transaction_type_filter IS NULL OR 
           CASE 
             WHEN p.amount < 0 THEN 'refund_debt'
             WHEN p.dispute_id IS NOT NULL AND p.amount > 0 THEN 'debt_collection'
             ELSE 'regular_earning'
           END = transaction_type_filter)

    UNION ALL

    -- Part 2: Cancelled bookings with refunds
    SELECT 
      NULL::uuid as id,
      b.id as booking_id,
      COALESCE(-1 * t.amount, 0) as amount,
      b.currency,
      'cancelled'::text as status,
      t.created_at as payout_date,
      b.created_at,
      CASE 
        WHEN b.status = 'cancelled_guest' THEN 'Booking cancelled by guest'
        WHEN b.status = 'cancelled_host' THEN 'Booking cancelled by host'
        ELSE 'Booking cancelled'
      END as notes,
      b.subtotal as booking_subtotal,
      b.host_commission_amount as booking_host_commission_amount,
      b.host_payout_net as booking_host_payout_net,
      b.host_payout_gross as booking_host_payout_gross,
      b.checkin_date,
      b.checkout_date,
      l.id as listing_id,
      l.title as listing_title,
      COALESCE(guest_prof.first_name || ' ' || guest_prof.last_name, 'N/A') as guest_name,
      COALESCE(guest_prof.email, '') as guest_email,
      NULL::uuid as dispute_id,
      b.status::text as booking_status,
      'cancelled'::text as transaction_type,
      NULL::text as dispute_category,
      NULL::text as guest_debt_status,
      t.amount as refund_amount,
      b.updated_at as cancellation_date
    FROM bookings b
    JOIN listings l ON l.id = b.listing_id
    LEFT JOIN profiles guest_prof ON guest_prof.id = b.guest_user_id
    LEFT JOIN LATERAL (
      SELECT amount, created_at
      FROM transactions
      WHERE booking_id = b.id 
        AND type = 'refund'
      ORDER BY created_at DESC
      LIMIT 1
    ) t ON true
    WHERE 
      l.host_user_id = auth.uid()
      AND b.status IN ('cancelled_guest', 'cancelled_host')
      AND (search_query IS NULL OR 
           l.title ILIKE '%' || search_query || '%' OR
           guest_prof.first_name ILIKE '%' || search_query || '%' OR
           guest_prof.last_name ILIKE '%' || search_query || '%')
      AND (status_filter IS NULL OR 'cancelled' = status_filter)
      AND (min_amount IS NULL OR COALESCE(t.amount, 0) >= min_amount)
      AND (max_amount IS NULL OR COALESCE(t.amount, 0) <= max_amount)
      AND (transaction_type_filter IS NULL OR 'cancelled' = transaction_type_filter)
  )
  SELECT 
    at.id,
    at.booking_id,
    at.amount,
    at.currency,
    at.status,
    at.payout_date,
    at.created_at,
    at.notes,
    at.booking_subtotal,
    at.booking_host_commission_amount,
    at.booking_host_payout_net,
    at.booking_host_payout_gross,
    at.checkin_date,
    at.checkout_date,
    at.listing_id,
    at.listing_title,
    at.guest_name,
    at.guest_email,
    at.dispute_id,
    at.booking_status,
    at.transaction_type,
    at.dispute_category,
    at.guest_debt_status,
    at.refund_amount,
    at.cancellation_date
  FROM all_transactions at
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN at.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN at.created_at END ASC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'desc' THEN ABS(at.amount) END DESC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'asc' THEN ABS(at.amount) END ASC,
    CASE WHEN sort_by = 'payout_date' AND sort_order = 'desc' THEN at.payout_date END DESC,
    CASE WHEN sort_by = 'payout_date' AND sort_order = 'asc' THEN at.payout_date END ASC,
    at.created_at DESC;
END;
$function$;
