
-- Add contact columns to portal_settings
ALTER TABLE public.portal_settings
  ADD COLUMN IF NOT EXISTS contact_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_whatsapp text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_facebook_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS show_contact boolean NOT NULL DEFAULT true;

-- Update the public view to include contact fields
CREATE OR REPLACE VIEW public.public_portal_settings WITH (security_invoker = true) AS
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
  section_order,
  require_full_payment_for_access_code,
  contact_email,
  contact_phone,
  contact_whatsapp,
  contact_facebook_url,
  show_contact
FROM portal_settings;
