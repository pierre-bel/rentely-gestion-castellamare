
-- Add bank credentials columns to portal_settings
ALTER TABLE public.portal_settings
  ADD COLUMN IF NOT EXISTS bank_beneficiary_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_iban text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_bic text DEFAULT NULL;

-- Update the public view to include bank fields
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
  show_contact,
  bank_beneficiary_name,
  bank_iban,
  bank_bic
FROM portal_settings;
