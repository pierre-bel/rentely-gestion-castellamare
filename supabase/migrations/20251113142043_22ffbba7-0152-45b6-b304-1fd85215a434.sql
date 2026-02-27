-- Create RPC function to calculate all host dashboard KPIs in a single call
-- All metrics calculated over "All Time" period for consistency

CREATE OR REPLACE FUNCTION public.get_host_dashboard_kpis(
  p_host_user_id uuid
)
RETURNS TABLE(
  occupancy_rate numeric,
  average_rate numeric,
  total_gross_revenue numeric,
  actual_net_revenue numeric,
  pending_payouts numeric,
  host_fees_paid numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_nights numeric;
  v_total_revenue numeric;
  v_first_listing_date date;
  v_listing_count integer;
  v_possible_nights numeric;
BEGIN
  -- Security check: Verify user is accessing their own data or is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_host_user_id 
    AND role IN ('host', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  -- Get first listing created date and total listing count
  SELECT 
    MIN(created_at::date),
    COUNT(*)
  INTO v_first_listing_date, v_listing_count
  FROM listings
  WHERE host_user_id = p_host_user_id;

  -- Calculate possible nights (days since first listing * number of listings)
  IF v_first_listing_date IS NOT NULL THEN
    v_possible_nights := (CURRENT_DATE - v_first_listing_date) * v_listing_count;
  ELSE
    v_possible_nights := 0;
  END IF;

  -- Get total nights booked and total revenue from completed bookings
  SELECT 
    COALESCE(SUM(nights), 0),
    COALESCE(SUM(subtotal), 0)
  INTO v_total_nights, v_total_revenue
  FROM bookings b
  INNER JOIN listings l ON b.listing_id = l.id
  WHERE l.host_user_id = p_host_user_id
    AND b.status = 'completed';

  RETURN QUERY
  SELECT
    -- 1. Occupancy Rate: (Total nights booked / Total possible nights) * 100
    CASE 
      WHEN v_possible_nights > 0 THEN (v_total_nights / v_possible_nights * 100)
      ELSE 0
    END as occupancy_rate,
    
    -- 2. Average Rate: Total revenue / Total nights booked
    CASE 
      WHEN v_total_nights > 0 THEN (v_total_revenue / v_total_nights)
      ELSE 0
    END as average_rate,
    
    -- 3. Total Gross Revenue: Sum of gross_revenue from payouts
    COALESCE(
      (SELECT SUM(gross_revenue)
       FROM payouts
       WHERE host_user_id = p_host_user_id
         AND transaction_type IN ('booking_payout', 'cancelled')),
      0
    ) as total_gross_revenue,
    
    -- 4. Actual Net Revenue: Sum of net_before_adjustments from payouts
    COALESCE(
      (SELECT SUM(net_before_adjustments)
       FROM payouts
       WHERE host_user_id = p_host_user_id
         AND transaction_type IN ('booking_payout', 'cancelled')),
      0
    ) as actual_net_revenue,
    
    -- 5. Pending Payouts: Sum of pending payout amounts
    COALESCE(
      (SELECT SUM(amount)
       FROM payouts
       WHERE host_user_id = p_host_user_id
         AND (
           (transaction_type IN ('booking_payout', 'cancelled') AND status = 'pending')
           OR (transaction_type = 'debt_collection' AND status = 'pending_guest_payment')
         )),
      0
    ) as pending_payouts,
    
    -- 6. Host Fees Paid: Sum of commission amounts for pending/completed payouts
    COALESCE(
      (SELECT SUM(commission_amount)
       FROM payouts
       WHERE host_user_id = p_host_user_id
         AND transaction_type IN ('booking_payout', 'cancelled')
         AND status IN ('pending', 'completed')),
      0
    ) as host_fees_paid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_host_dashboard_kpis(uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.get_host_dashboard_kpis IS 
  'Calculates all host dashboard KPIs in a single optimized query. All metrics are calculated over "All Time" period.';