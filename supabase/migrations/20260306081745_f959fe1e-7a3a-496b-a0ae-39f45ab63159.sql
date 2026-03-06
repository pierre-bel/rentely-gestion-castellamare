
ALTER TABLE public.email_automations 
  ADD COLUMN IF NOT EXISTS recipient_type text NOT NULL DEFAULT 'tenant',
  ADD COLUMN IF NOT EXISTS recipient_email text;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS igloohome_code text;
