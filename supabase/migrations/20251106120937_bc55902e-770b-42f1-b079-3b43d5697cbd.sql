-- Create function to mark past bookings as completed
CREATE OR REPLACE FUNCTION public.mark_past_bookings_completed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update bookings where checkout date has passed and status is confirmed
  UPDATE public.bookings
  SET 
    status = 'completed'::booking_status,
    updated_at = now()
  WHERE 
    checkout_date < CURRENT_DATE
    AND status = 'confirmed'::booking_status;
END;
$$;

-- Grant execute permission to authenticated users (for the edge function to call it)
GRANT EXECUTE ON FUNCTION public.mark_past_bookings_completed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_past_bookings_completed() TO service_role;