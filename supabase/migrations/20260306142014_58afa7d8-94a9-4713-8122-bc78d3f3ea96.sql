
-- Portal settings per host
CREATE TABLE public.portal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL UNIQUE,
  welcome_message text DEFAULT NULL,
  show_price boolean NOT NULL DEFAULT true,
  show_address boolean NOT NULL DEFAULT true,
  show_house_rules boolean NOT NULL DEFAULT true,
  show_access_code boolean NOT NULL DEFAULT true,
  show_payment_schedule boolean NOT NULL DEFAULT true,
  show_amenities boolean NOT NULL DEFAULT true,
  show_map_link boolean NOT NULL DEFAULT true,
  custom_footer_text text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own portal settings"
  ON public.portal_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can insert their own portal settings"
  ON public.portal_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their own portal settings"
  ON public.portal_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_user_id);

-- Public view for portal to read settings by booking token (no auth needed)
CREATE OR REPLACE VIEW public.public_portal_settings AS
SELECT
  ps.host_user_id,
  ps.welcome_message,
  ps.show_price,
  ps.show_address,
  ps.show_house_rules,
  ps.show_access_code,
  ps.show_payment_schedule,
  ps.show_amenities,
  ps.show_map_link,
  ps.custom_footer_text
FROM public.portal_settings ps;
