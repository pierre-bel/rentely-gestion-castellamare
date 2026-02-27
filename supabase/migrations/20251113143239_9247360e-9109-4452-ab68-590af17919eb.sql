-- Update get_host_dashboard_kpis function with corrected revenue calculations
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
AS $$
BEGIN
  -- Verify user is host or admin
  IF NOT (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'host')
    OR has_role(auth.uid(), 'admin'::app_role)
    OR auth.uid() = p_host_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  RETURN QUERY
  WITH host_bookings AS (
    SELECT 
      b.id,
      b.checkin_date,
      b.checkout_date,
      b.nights,
      b.subtotal,
      b.status
    FROM bookings b
    JOIN listings l ON l.id = b.listing_id
    WHERE l.host_user_id = p_host_user_id
      AND b.status = 'completed'
  ),
  host_listings AS (
    SELECT 
      COUNT(*) as listing_count,
      MIN(created_at) as first_listing_date
    FROM listings
    WHERE host_user_id = p_host_user_id
      AND status = 'approved'
  ),
  revenue_metrics AS (
    SELECT
      -- Gross Revenue: gross_revenue for booking_payout, amount for cancelled and debt_collection
      COALESCE(SUM(
        CASE 
          WHEN transaction_type = 'booking_payout' THEN gross_revenue
          WHEN transaction_type IN ('cancelled', 'debt_collection') THEN amount
          ELSE 0
        END
      ), 0) as total_gross,
      
      -- Actual Net Revenue: amount for cancelled, booking_payout, debt_collection
      COALESCE(SUM(
        CASE 
          WHEN transaction_type IN ('cancelled', 'booking_payout', 'debt_collection') THEN amount
          ELSE 0
        END
      ), 0) as total_net,
      
      -- Pending Payouts
      COALESCE(SUM(
        CASE 
          WHEN transaction_type IN ('booking_payout', 'cancelled') AND status = 'pending' THEN amount
          WHEN transaction_type = 'debt_collection' AND status = 'pending_guest_payment' THEN amount
          ELSE 0
        END
      ), 0) as total_pending,
      
      -- Host Fees Paid
      COALESCE(SUM(
        CASE 
          WHEN transaction_type IN ('booking_payout', 'cancelled') 
            AND status IN ('pending', 'completed') 
          THEN commission_amount
          ELSE 0
        END
      ), 0) as total_fees
    FROM payouts
    WHERE host_user_id = p_host_user_id
  ),
  occupancy_metrics AS (
    SELECT
      COALESCE(SUM(nights), 0) as total_nights_booked,
      COALESCE(SUM(subtotal), 0) as total_revenue
    FROM host_bookings
  ),
  possible_nights AS (
    SELECT
      CASE 
        WHEN hl.listing_count > 0 AND hl.first_listing_date IS NOT NULL THEN
          (EXTRACT(EPOCH FROM (CURRENT_DATE - hl.first_listing_date::date)) / 86400) * hl.listing_count
        ELSE 0
      END as total_possible_nights
    FROM host_listings hl
  )
  SELECT
    -- Occupancy Rate
    CASE 
      WHEN pn.total_possible_nights > 0 THEN
        (om.total_nights_booked::numeric / pn.total_possible_nights::numeric) * 100
      ELSE 0
    END as occupancy_rate,
    
    -- Average Rate
    CASE 
      WHEN om.total_nights_booked > 0 THEN
        om.total_revenue / om.total_nights_booked
      ELSE 0
    END as average_rate,
    
    -- Total Gross Revenue
    rm.total_gross as total_gross_revenue,
    
    -- Actual Net Revenue
    rm.total_net as actual_net_revenue,
    
    -- Pending Payouts
    rm.total_pending as pending_payouts,
    
    -- Host Fees Paid
    rm.total_fees as host_fees_paid
  FROM revenue_metrics rm
  CROSS JOIN occupancy_metrics om
  CROSS JOIN possible_nights pn;
END;
$$;