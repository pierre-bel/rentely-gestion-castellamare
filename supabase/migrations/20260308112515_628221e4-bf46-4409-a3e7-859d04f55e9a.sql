ALTER TABLE public.portal_settings 
  ADD COLUMN IF NOT EXISTS require_full_payment_for_access_code boolean NOT NULL DEFAULT true;