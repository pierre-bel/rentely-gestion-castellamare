-- Drop and recreate host_search_payouts function to add booking_host_payout_gross
DROP FUNCTION IF EXISTS public.host_search_payouts(text, text, numeric, numeric, text, text);

CREATE OR REPLACE FUNCTION public.host_search_payouts(
  search_query text DEFAULT NULL::text,
  status_filter text DEFAULT NULL::text,
  min_amount numeric DEFAULT NULL::numeric,
  max_amount numeric DEFAULT NULL::numeric,
  sort_by text DEFAULT 'created_at'::text,
  sort_order text DEFAULT 'desc'::text
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
  guest_email text
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
  SELECT 
    p.id,
    p.booking_id,
    p.amount,
    p.currency,
    p.status,
    p.payout_date,
    p.created_at,
    p.notes,
    -- Financial breakdown from booking
    b.subtotal as booking_subtotal,
    b.host_commission_amount as booking_host_commission_amount,
    b.host_payout_net as booking_host_payout_net,
    b.host_payout_gross as booking_host_payout_gross,
    -- Booking dates
    b.checkin_date,
    b.checkout_date,
    -- Listing
    l.id as listing_id,
    l.title as listing_title,
    -- Guest
    (guest_prof.first_name || ' ' || guest_prof.last_name) as guest_name,
    guest_prof.email as guest_email
  FROM payouts p
  INNER JOIN bookings b ON b.id = p.booking_id
  INNER JOIN listings l ON l.id = b.listing_id
  INNER JOIN profiles guest_prof ON guest_prof.id = b.guest_user_id
  WHERE 
    p.host_user_id = auth.uid()
    AND (search_query IS NULL OR 
         l.title ILIKE '%' || search_query || '%' OR
         guest_prof.first_name ILIKE '%' || search_query || '%' OR
         guest_prof.last_name ILIKE '%' || search_query || '%')
    AND (status_filter IS NULL OR p.status = status_filter)
    AND (min_amount IS NULL OR p.amount >= min_amount)
    AND (max_amount IS NULL OR p.amount <= max_amount)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN p.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN p.created_at END ASC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'desc' THEN p.amount END DESC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'asc' THEN p.amount END ASC,
    CASE WHEN sort_by = 'payout_date' AND sort_order = 'desc' THEN p.payout_date END DESC,
    CASE WHEN sort_by = 'payout_date' AND sort_order = 'asc' THEN p.payout_date END ASC,
    p.created_at DESC;
END;
$function$;