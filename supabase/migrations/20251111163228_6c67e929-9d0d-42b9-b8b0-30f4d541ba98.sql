
-- Fix constraint to use 'debt_collection' instead of 'debt_settlement'
ALTER TABLE public.payouts 
DROP CONSTRAINT payouts_transaction_type_check;

ALTER TABLE public.payouts 
ADD CONSTRAINT payouts_transaction_type_check 
CHECK (transaction_type IN ('booking_payout', 'cancellation_fee', 'debt_collection', 'refund'));
