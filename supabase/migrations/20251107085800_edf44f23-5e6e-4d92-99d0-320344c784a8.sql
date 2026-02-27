-- Fix cancel_expired_bookings function to handle multiple bookings
CREATE OR REPLACE FUNCTION public.cancel_expired_bookings()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INTEGER;
  v_expired_booking_ids UUID[];
BEGIN
  -- Update expired bookings and collect IDs into array
  WITH expired_bookings AS (
    SELECT id
    FROM public.bookings
    WHERE status = 'pending_payment'::booking_status
    AND created_at < (now() - INTERVAL '10 minutes')
  ),
  updated_bookings AS (
    UPDATE public.bookings
    SET status = 'expired'::booking_status, updated_at = now()
    WHERE id IN (SELECT id FROM expired_bookings)
    RETURNING id
  )
  SELECT ARRAY_AGG(id), COUNT(*) INTO v_expired_booking_ids, v_expired_count
  FROM updated_bookings;
  
  RETURN json_build_object(
    'success', true,
    'cancelled_count', COALESCE(v_expired_count, 0),
    'booking_ids', COALESCE(v_expired_booking_ids, ARRAY[]::UUID[]),
    'timestamp', now()
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;