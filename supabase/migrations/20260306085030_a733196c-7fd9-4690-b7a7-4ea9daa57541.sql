
-- Add listing_ids array column
ALTER TABLE public.email_automations ADD COLUMN listing_ids uuid[] DEFAULT '{}';

-- Migrate existing data from listing_id to listing_ids
UPDATE public.email_automations 
SET listing_ids = ARRAY[listing_id] 
WHERE listing_id IS NOT NULL;

-- Drop old listing_id column and its foreign key
ALTER TABLE public.email_automations DROP CONSTRAINT IF EXISTS email_automations_listing_id_fkey;
ALTER TABLE public.email_automations DROP COLUMN listing_id;
