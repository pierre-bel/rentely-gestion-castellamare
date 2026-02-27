-- Drop existing function before recreating with new return type
DROP FUNCTION IF EXISTS public.host_search_payouts(uuid, text, text, numeric, numeric, text, text);

-- Update host_search_payouts RPC to include pre-calculated financial fields
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
  dispute_refund_amount numeric,
  -- Pre-calculated financial fields
  refund_percentage_applied integer,
  host_retained_gross numeric,
  commission_on_retained numeric,
  guest_total_payment numeric,
  base_subtotal numeric,
  base_cleaning_fee numeric,
  gross_revenue numeric,
  commission_amount numeric,
  net_before_adjustments numeric
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
    NULL::numeric AS dispute_refund_amount,
    -- Pre-calculated financial fields
    p.refund_percentage_applied,
    p.host_retained_gross,
    p.commission_on_retained,
    p.guest_total_payment,
    p.base_subtotal,
    p.base_cleaning_fee,
    p.gross_revenue,
    p.commission_amount,
    p.net_before_adjustments
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