-- Create function to search and filter transactions for admin
CREATE OR REPLACE FUNCTION public.admin_search_transactions(
  search_query TEXT DEFAULT NULL,
  type_filter TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  min_amount NUMERIC DEFAULT NULL,
  max_amount NUMERIC DEFAULT NULL,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  id UUID,
  booking_id UUID,
  type TEXT,
  amount NUMERIC,
  currency TEXT,
  provider TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  guest_user_id UUID,
  guest_name TEXT,
  guest_email TEXT,
  guest_avatar TEXT,
  listing_id UUID,
  listing_title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can search transactions';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.booking_id,
    t.type,
    t.amount,
    t.currency,
    t.provider,
    t.status,
    t.created_at,
    b.guest_user_id,
    (p.first_name || ' ' || p.last_name) as guest_name,
    p.email as guest_email,
    p.avatar_url as guest_avatar,
    l.id as listing_id,
    l.title as listing_title
  FROM transactions t
  INNER JOIN bookings b ON b.id = t.booking_id
  INNER JOIN profiles p ON p.id = b.guest_user_id
  INNER JOIN listings l ON l.id = b.listing_id
  WHERE 
    (search_query IS NULL OR 
     t.id::text ILIKE '%' || search_query || '%' OR
     t.booking_id::text ILIKE '%' || search_query || '%' OR
     p.first_name ILIKE '%' || search_query || '%' OR
     p.last_name ILIKE '%' || search_query || '%' OR
     p.email ILIKE '%' || search_query || '%')
    AND
    (type_filter IS NULL OR t.type = type_filter)
    AND
    (status_filter IS NULL OR t.status = status_filter)
    AND
    (min_amount IS NULL OR t.amount >= min_amount)
    AND
    (max_amount IS NULL OR t.amount <= max_amount)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN t.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN t.created_at END ASC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'desc' THEN t.amount END DESC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'asc' THEN t.amount END ASC,
    t.created_at DESC;
END;
$$;

-- Create function to search and filter payouts for admin
CREATE OR REPLACE FUNCTION public.admin_search_payouts(
  search_query TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  min_amount NUMERIC DEFAULT NULL,
  max_amount NUMERIC DEFAULT NULL,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  id UUID,
  booking_id UUID,
  host_user_id UUID,
  amount NUMERIC,
  currency TEXT,
  status TEXT,
  notes TEXT,
  payout_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  host_name TEXT,
  host_email TEXT,
  host_avatar TEXT,
  listing_id UUID,
  listing_title TEXT,
  guest_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can search payouts';
  END IF;

  RETURN QUERY
  SELECT 
    pay.id,
    pay.booking_id,
    pay.host_user_id,
    pay.amount,
    pay.currency,
    pay.status,
    pay.notes,
    pay.payout_date,
    pay.created_at,
    pay.updated_at,
    (host_prof.first_name || ' ' || host_prof.last_name) as host_name,
    host_prof.email as host_email,
    host_prof.avatar_url as host_avatar,
    l.id as listing_id,
    l.title as listing_title,
    (guest_prof.first_name || ' ' || guest_prof.last_name) as guest_name
  FROM payouts pay
  INNER JOIN profiles host_prof ON host_prof.id = pay.host_user_id
  INNER JOIN bookings b ON b.id = pay.booking_id
  INNER JOIN listings l ON l.id = b.listing_id
  INNER JOIN profiles guest_prof ON guest_prof.id = b.guest_user_id
  WHERE 
    (search_query IS NULL OR 
     pay.id::text ILIKE '%' || search_query || '%' OR
     pay.booking_id::text ILIKE '%' || search_query || '%' OR
     host_prof.first_name ILIKE '%' || search_query || '%' OR
     host_prof.last_name ILIKE '%' || search_query || '%' OR
     host_prof.email ILIKE '%' || search_query || '%' OR
     l.title ILIKE '%' || search_query || '%')
    AND
    (status_filter IS NULL OR pay.status = status_filter)
    AND
    (min_amount IS NULL OR pay.amount >= min_amount)
    AND
    (max_amount IS NULL OR pay.amount <= max_amount)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN pay.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN pay.created_at END ASC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'desc' THEN pay.amount END DESC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'asc' THEN pay.amount END ASC,
    pay.created_at DESC;
END;
$$;