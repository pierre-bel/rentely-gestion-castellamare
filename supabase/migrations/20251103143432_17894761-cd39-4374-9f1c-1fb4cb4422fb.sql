-- Add weekly and monthly discount columns to listings table
ALTER TABLE public.listings 
ADD COLUMN weekly_discount numeric DEFAULT 0 CHECK (weekly_discount >= 0 AND weekly_discount <= 100),
ADD COLUMN monthly_discount numeric DEFAULT 0 CHECK (monthly_discount >= 0 AND monthly_discount <= 100);

COMMENT ON COLUMN public.listings.weekly_discount IS 'Discount percentage for weekly stays (0-100)';
COMMENT ON COLUMN public.listings.monthly_discount IS 'Discount percentage for monthly stays (0-100)';