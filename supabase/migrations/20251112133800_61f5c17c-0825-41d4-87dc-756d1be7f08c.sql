-- Drop unused apply_outstanding_debts_to_payout function
-- This function is no longer called after the create_payout_on_booking_completion trigger
-- was updated to handle debt application logic directly with array-based dispute tracking

DROP FUNCTION IF EXISTS public.apply_outstanding_debts_to_payout(UUID, UUID, NUMERIC);