-- Fix host_search_payouts to query actual refund transactions
DROP FUNCTION IF EXISTS public.host_search_payouts(uuid, text, text, text, numeric, numeric, text, text);

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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    NULLIF(b.subtotal, 0) AS booking_subtotal,
    NULLIF(b.host_commission_amount, 0) AS booking_host_commission_amount,
    NULLIF(b.host_payout_net, 0) AS booking_host_payout_net,
    NULLIF(b.host_payout_gross, 0) AS booking_host_payout_gross,
    b.checkin_date,
    b.checkout_date,
    l.id AS listing_id,
    l.title AS listing_title,
    CONCAT(prof.first_name, ' ', prof.last_name) AS guest_name,
    prof.email AS guest_email,
    p.dispute_id,
    b.status::TEXT AS booking_status,
    p.transaction_type,
    d.category::TEXT AS dispute_category,
    gd.status AS guest_debt_status,
    -- Query actual refund from transactions table instead of using payout amount
    (
      SELECT COALESCE(ABS(SUM(t.amount)), 0)
      FROM transactions t
      WHERE t.booking_id = b.id 
        AND t.type = 'refund'
        AND t.status = 'succeeded'
    ) AS refund_amount,
    CASE WHEN b.status IN ('cancelled_guest'::booking_status, 'cancelled_host'::booking_status) 
      THEN b.updated_at ELSE NULL END AS cancellation_date,
    NULLIF(p.original_amount, 0) AS original_amount,
    NULLIF(p.debt_applied_amount, 0) AS debt_applied_amount,
    NULLIF(b.cleaning_fee, 0) AS cleaning_fee,
    NULL::numeric AS dispute_refund_amount
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
    AND (p_transaction_type_filter IS NULL OR p.transaction_type = p_transaction_type_filter)
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
$$;