-- Create function to calculate admin dashboard KPIs
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_kpis()
RETURNS TABLE(
  total_revenue NUMERIC,
  active_bookings INTEGER,
  occupancy_rate NUMERIC,
  pending_listings INTEGER,
  cancelled_bookings INTEGER,
  open_disputes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_completed_revenue NUMERIC;
  v_cancelled_revenue NUMERIC;
  v_total_nights_booked INTEGER;
  v_total_available_nights INTEGER;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can view dashboard KPIs';
  END IF;

  -- Calculate revenue from completed bookings
  SELECT COALESCE(SUM(platform_revenue_total), 0)
  INTO v_completed_revenue
  FROM bookings
  WHERE status = 'completed';

  -- Calculate platform revenue from cancelled bookings
  -- Platform gets commission on the amount retained by the host
  WITH cancelled_bookings AS (
    SELECT 
      b.id,
      b.subtotal,
      COALESCE(b.cleaning_fee, 0) as cleaning_fee,
      b.host_commission_rate,
      b.cancellation_policy_snapshot,
      b.checkin_date,
      CURRENT_DATE as cancellation_date
    FROM bookings b
    WHERE b.status IN ('cancelled_guest', 'cancelled_host')
  ),
  calculated_revenue AS (
    SELECT
      cb.id,
      -- Calculate host gross revenue
      (cb.subtotal + cb.cleaning_fee) as host_gross,
      -- Determine refund percentage based on policy
      CASE
        WHEN (cb.cancellation_policy_snapshot->>'policy_key') = 'flexible' THEN
          CASE WHEN (cb.checkin_date - cb.cancellation_date) >= 1 THEN 100 ELSE 0 END
        WHEN (cb.cancellation_policy_snapshot->>'policy_key') = 'moderate' THEN
          CASE WHEN (cb.checkin_date - cb.cancellation_date) >= 5 THEN 100 
               WHEN (cb.checkin_date - cb.cancellation_date) >= 1 THEN 50 
               ELSE 0 END
        WHEN (cb.cancellation_policy_snapshot->>'policy_key') = 'strict' THEN
          CASE WHEN (cb.checkin_date - cb.cancellation_date) >= 14 THEN 50 ELSE 0 END
        ELSE 0
      END as refund_percentage,
      cb.host_commission_rate
    FROM cancelled_bookings cb
  )
  SELECT COALESCE(SUM(
    -- Host retains: host_gross * (1 - refund_percentage/100)
    -- Platform commission: retained_amount * commission_rate
    (cr.host_gross * (1 - cr.refund_percentage::numeric / 100)) * cr.host_commission_rate
  ), 0)
  INTO v_cancelled_revenue
  FROM calculated_revenue cr;

  -- Calculate occupancy rate
  SELECT 
    COALESCE(SUM(b.nights), 0)
  INTO v_total_nights_booked
  FROM bookings b
  WHERE b.status IN ('confirmed', 'completed');

  -- Calculate total available nights (approved listings * days since created)
  SELECT 
    COALESCE(SUM((CURRENT_DATE - l.created_at::date) * 1), 0)
  INTO v_total_available_nights
  FROM listings l
  WHERE l.status = 'approved';

  RETURN QUERY
  SELECT
    -- Total Revenue
    (v_completed_revenue + v_cancelled_revenue) as total_revenue,
    
    -- Active Bookings
    (SELECT COUNT(*)::integer FROM bookings WHERE status = 'confirmed') as active_bookings,
    
    -- Occupancy Rate
    CASE 
      WHEN v_total_available_nights > 0 THEN
        (v_total_nights_booked::numeric / v_total_available_nights::numeric) * 100
      ELSE 0
    END as occupancy_rate,
    
    -- Pending Listings
    (SELECT COUNT(*)::integer FROM listings WHERE status = 'pending') as pending_listings,
    
    -- Cancelled Bookings
    (SELECT COUNT(*)::integer FROM bookings WHERE status IN ('cancelled_guest', 'cancelled_host')) as cancelled_bookings,
    
    -- Open Disputes
    (SELECT COUNT(*)::integer FROM disputes WHERE status NOT IN ('resolved_approved', 'resolved_declined')) as open_disputes;
END;
$function$;