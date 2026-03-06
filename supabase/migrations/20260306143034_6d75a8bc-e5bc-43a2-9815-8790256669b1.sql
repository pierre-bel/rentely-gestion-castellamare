
-- Add section_order to portal_settings
ALTER TABLE public.portal_settings
ADD COLUMN section_order jsonb DEFAULT '["dates","access_code","address","amenities","pricing","payment_schedule","house_rules","notes"]'::jsonb;

-- Create portal_custom_sections table
CREATE TABLE public.portal_custom_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL,
  section_key text NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  title text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_custom_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own custom sections"
ON public.portal_custom_sections FOR SELECT
TO authenticated
USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can insert their own custom sections"
ON public.portal_custom_sections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their own custom sections"
ON public.portal_custom_sections FOR UPDATE
TO authenticated
USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can delete their own custom sections"
ON public.portal_custom_sections FOR DELETE
TO authenticated
USING (auth.uid() = host_user_id);

-- Recreate public_portal_settings view with section_order
DROP VIEW IF EXISTS public.public_portal_settings;
CREATE VIEW public.public_portal_settings AS
SELECT
  host_user_id,
  welcome_message,
  show_price,
  show_address,
  show_house_rules,
  show_access_code,
  show_payment_schedule,
  show_amenities,
  show_map_link,
  custom_footer_text,
  section_order
FROM public.portal_settings;

-- Public view for custom sections (no auth needed for portal display)
CREATE VIEW public.public_portal_custom_sections AS
SELECT
  id,
  host_user_id,
  section_key,
  title,
  body_html,
  sort_order,
  is_enabled
FROM public.portal_custom_sections
WHERE is_enabled = true;
