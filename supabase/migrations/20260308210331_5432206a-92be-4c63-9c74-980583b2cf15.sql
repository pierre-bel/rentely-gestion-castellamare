
ALTER TABLE public.bookings ADD COLUMN beach_cabin boolean NOT NULL DEFAULT false;

ALTER TABLE public.portal_settings 
  ADD COLUMN beach_cabin_start_month integer NOT NULL DEFAULT 6,
  ADD COLUMN beach_cabin_start_day integer NOT NULL DEFAULT 1,
  ADD COLUMN beach_cabin_end_month integer NOT NULL DEFAULT 9,
  ADD COLUMN beach_cabin_end_day integer NOT NULL DEFAULT 30;
