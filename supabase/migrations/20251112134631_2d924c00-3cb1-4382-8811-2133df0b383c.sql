-- Fix ambiguous column reference in host_search_payouts
DROP FUNCTION IF EXISTS public.host_search_payouts(uuid, text, text, text, numeric, numeric, text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.host_search_payouts(
  p_host_user_id uuid,
  p_search_query text DEFAULT NULL,
  p_status_filter text DEFAULT NULL,
  p_transaction_type_filter text DEFAULT NULL,
  p_min_amount numeric DEFAULT NULL,
  p_max_amount numeric DEFAULT NULL,
  p_sort_by text DEFAULT 'created_at',
  p_sort_order text DEFAULT 'desc'
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
  booking_status text,
  transaction_type text,
  dispute_category text,
  guest_debt_status text,
  refund_amount numeric,
  cancellation_date timestamp with time zone,
  original_amount numeric,
  cleaning_fee numeric,
  refund_percentage_applied integer,
  host_retained_gross numeric,
  commission_on_retained numeric,
  guest_total_payment numeric,
  base_subtotal numeric,
  base_cleaning_fee numeric,
  gross_revenue numeric,
  commission_amount numeric,
  net_before_adjustments numeric,
  dispute_ids uuid[],
  total_dispute_refunds numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
    b.status::text AS booking_status,
    p.transaction_type,
    -- Get dispute category from first dispute in array (for refund_debt type)
    CASE 
      WHEN p.dispute_ids IS NOT NULL AND array_length(p.dispute_ids, 1) > 0 
      THEN (SELECT d.category::text FROM disputes d WHERE d.id = p.dispute_ids[1])
      ELSE NULL 
    END AS dispute_category,
    -- Get guest debt status from first dispute in array (for refund_debt type)
    CASE 
      WHEN p.dispute_ids IS NOT NULL AND array_length(p.dispute_ids, 1) > 0 
      THEN (SELECT gd.status FROM guest_debts gd WHERE gd.dispute_id = p.dispute_ids[1])
      ELSE NULL 
    END AS guest_debt_status,
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
    b.cleaning_fee,
    p.refund_percentage_applied,
    p.host_retained_gross,
    p.commission_on_retained,
    p.guest_total_payment,
    p.base_subtotal,
    p.base_cleaning_fee,
    p.gross_revenue,
    p.commission_amount,
    p.net_before_adjustments,
    p.dispute_ids,
    p.total_dispute_refunds
  FROM payouts p
  INNER JOIN bookings b ON p.booking_id = b.id
  LEFT JOIN listings l ON b.listing_id = l.id
  LEFT JOIN profiles prof ON b.guest_user_id = prof.id
  WHERE p.host_user_id = p_host_user_id
    AND (p_search_query IS NULL OR 
         l.title ILIKE '%' || p_search_query || '%' OR 
         prof.first_name || ' ' || prof.last_name ILIKE '%' || p_search_query || '%' OR
         prof.email ILIKE '%' || p_search_query || '%')
    AND (p_status_filter IS NULL OR p.status = p_status_filter)
    AND (p_transaction_type_filter IS NULL OR p.transaction_type = p_transaction_type_filter)
    AND (p_min_amount IS NULL OR p.amount >= p_min_amount)
    AND (p_max_amount IS NULL OR p.amount <= p_max_amount)
  ORDER BY
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN p.created_at END DESC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN p.created_at END ASC,
    CASE WHEN p_sort_by = 'amount' AND p_sort_order = 'desc' THEN p.amount END DESC,
    CASE WHEN p_sort_by = 'amount' AND p_sort_order = 'asc' THEN p.amount END ASC,
    CASE WHEN p_sort_by = 'payout_date' AND p_sort_order = 'desc' THEN p.payout_date END DESC,
    CASE WHEN p_sort_by = 'payout_date' AND p_sort_order = 'asc' THEN p.payout_date END ASC;
END;
$function$;