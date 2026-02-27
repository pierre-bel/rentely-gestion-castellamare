
-- Drop the old check constraint
ALTER TABLE public.payouts 
DROP CONSTRAINT IF EXISTS payouts_transaction_type_check;

-- Add the new check constraint with 'debt_settlement' included
ALTER TABLE public.payouts 
ADD CONSTRAINT payouts_transaction_type_check 
CHECK (transaction_type IN ('booking_payout', 'cancellation_fee', 'debt_settlement'));
