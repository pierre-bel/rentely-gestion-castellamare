-- Add state and postal_code columns to listings table
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT;