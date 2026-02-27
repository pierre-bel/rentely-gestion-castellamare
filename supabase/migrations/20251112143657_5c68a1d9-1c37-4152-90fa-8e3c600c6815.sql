-- Update admin_search_payouts to return rich payout data matching host_search_payouts structure
CREATE OR REPLACE FUNCTION public.admin_search_payouts(
  search_query TEXT DEFAULT NULL,
  transaction_type_filter TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  min_amount NUMERIC DEFAULT NULL,
  max_amount NUMERIC DEFAULT NULL,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE(
  id UUID,
  booking_id UUID,
  host_user_id UUID,
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
  guest_avatar TEXT,
  host_name TEXT,
  host_email TEXT,
  host_avatar TEXT,
  booking_status TEXT,
  transaction_type TEXT,
  dispute_category TEXT,
  guest_debt_status TEXT,
  refund_amount NUMERIC,
  cancellation_date TIMESTAMP WITH TIME ZONE,
  original_amount NUMERIC,
  cleaning_fee NUMERIC,
  refund_percentage_applied INTEGER,
  host_retained_gross NUMERIC,
  commission_on_retained NUMERIC,
  guest_total_payment NUMERIC,
  base_subtotal NUMERIC,
  base_cleaning_fee NUMERIC,
  gross_revenue NUMERIC,
  commission_amount NUMERIC,
  net_before_adjustments NUMERIC,
  dispute_ids UUID[],
  total_dispute_refunds NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: only admins can search payouts
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.booking_id,
    p.host_user_id,
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
    guest_prof.first_name || ' ' || COALESCE(guest_prof.last_name, '') AS guest_name,
    guest_prof.email AS guest_email,
    guest_prof.avatar_url AS guest_avatar,
    host_prof.first_name || ' ' || COALESCE(host_prof.last_name, '') AS host_name,
    host_prof.email AS host_email,
    host_prof.avatar_url AS host_avatar,
    b.status::TEXT AS booking_status,
    p.transaction_type,
    -- Get dispute category from first dispute in array (for refund_debt type)
    CASE 
      WHEN p.dispute_ids IS NOT NULL AND array_length(p.dispute_ids, 1) > 0 
      THEN (SELECT d.category::TEXT FROM disputes d WHERE d.id = p.dispute_ids[1])
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
  LEFT JOIN profiles guest_prof ON b.guest_user_id = guest_prof.id
  LEFT JOIN profiles host_prof ON p.host_user_id = host_prof.id
  WHERE
    -- Search filter
    (search_query IS NULL OR 
     l.title ILIKE '%' || search_query || '%' OR
     guest_prof.first_name || ' ' || guest_prof.last_name ILIKE '%' || search_query || '%' OR
     guest_prof.email ILIKE '%' || search_query || '%' OR
     host_prof.first_name || ' ' || host_prof.last_name ILIKE '%' || search_query || '%' OR
     host_prof.email ILIKE '%' || search_query || '%')
    -- Transaction type filter
    AND (transaction_type_filter IS NULL OR p.transaction_type = transaction_type_filter)
    -- Status filter
    AND (status_filter IS NULL OR p.status = status_filter)
    -- Amount filter
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
$$;