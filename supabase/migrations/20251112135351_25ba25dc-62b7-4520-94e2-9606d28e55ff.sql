-- Remove legacy single-dispute tracking columns from payouts table
-- These have been replaced by dispute_ids[] array and total_dispute_refunds

ALTER TABLE public.payouts
  DROP COLUMN IF EXISTS debt_payout_ids,
  DROP COLUMN IF EXISTS debt_applied_amount,
  DROP COLUMN IF EXISTS dispute_id;