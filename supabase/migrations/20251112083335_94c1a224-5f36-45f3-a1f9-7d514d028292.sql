-- Drop the old single-parameter version of cancel_booking_with_refund
DROP FUNCTION IF EXISTS public.cancel_booking_with_refund(uuid);

-- Update existing cancelled payouts to have correct transaction_type
UPDATE public.payouts p
SET transaction_type = 'cancelled'
FROM public.bookings b
WHERE p.booking_id = b.id 
  AND b.status IN ('cancelled_guest', 'cancelled_host')
  AND p.transaction_type = 'booking_payout';