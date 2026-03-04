ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text;

UPDATE public.tenants SET email = '' WHERE email IS NULL;
UPDATE public.tenants SET last_name = '' WHERE last_name IS NULL;