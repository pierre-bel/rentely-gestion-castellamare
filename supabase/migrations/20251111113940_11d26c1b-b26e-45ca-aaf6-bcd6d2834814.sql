-- Add transaction_type column to payouts table
ALTER TABLE public.payouts 
ADD COLUMN transaction_type TEXT NOT NULL DEFAULT 'booking_payout';

-- Add a check constraint for valid transaction types
ALTER TABLE public.payouts
ADD CONSTRAINT payouts_transaction_type_check 
CHECK (transaction_type IN ('booking_payout', 'debt_collection', 'refund'));

-- Update existing records based on their characteristics
UPDATE public.payouts
SET transaction_type = CASE
  WHEN amount < 0 THEN 'refund'
  WHEN dispute_id IS NOT NULL AND status IN ('debit', 'settled', 'partially_settled') THEN 'debt_collection'
  ELSE 'booking_payout'
END;