CREATE OR REPLACE FUNCTION public.get_admin_dashboard_kpis()
 RETURNS TABLE(total_revenue numeric, active_bookings integer, occupancy_rate numeric, pending_listings integer, cancelled_bookings integer, open_disputes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_revenue NUMERIC;
  v_total_nights_booked INTEGER;
  v_total_available_nights INTEGER;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can view dashboard KPIs';
  END IF;

  -- Calculate total revenue from completed and cancelled bookings
  SELECT COALESCE(SUM(total_price), 0)
  INTO v_total_revenue
  FROM bookings
  WHERE status IN ('completed', 'cancelled_guest', 'cancelled_host');

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
    -- Total Revenue (simplified to total_price sum)
    v_total_revenue as total_revenue,
    
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