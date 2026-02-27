-- Update default status for disputes table to 'pending'
ALTER TABLE public.disputes 
ALTER COLUMN status SET DEFAULT 'pending'::dispute_status;