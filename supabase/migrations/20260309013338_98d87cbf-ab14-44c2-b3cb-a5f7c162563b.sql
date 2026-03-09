
-- Table for school holiday periods per host
CREATE TABLE public.host_school_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL,
  label text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.host_school_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own holidays" ON public.host_school_holidays
  FOR SELECT TO authenticated USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can insert their own holidays" ON public.host_school_holidays
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their own holidays" ON public.host_school_holidays
  FOR UPDATE TO authenticated USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can delete their own holidays" ON public.host_school_holidays
  FOR DELETE TO authenticated USING (auth.uid() = host_user_id);

-- Public view for school holidays (for embed pages)
CREATE OR REPLACE VIEW public.public_host_school_holidays AS
SELECT id, host_user_id, label, start_date, end_date
FROM public.host_school_holidays;

GRANT SELECT ON public.public_host_school_holidays TO anon, authenticated;

-- Public view for host contact info (for embed pages)
CREATE OR REPLACE VIEW public.public_host_contact AS
SELECT host_user_id, contact_email, contact_phone, contact_whatsapp
FROM public.portal_settings;

GRANT SELECT ON public.public_host_contact TO anon, authenticated;
