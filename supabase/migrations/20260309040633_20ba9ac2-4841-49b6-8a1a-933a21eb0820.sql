
-- Add configurable transfer reference template
ALTER TABLE public.portal_settings
  ADD COLUMN IF NOT EXISTS bank_transfer_reference_template text DEFAULT '{{guest_last_name}} - {{listing_title}} - {{checkin_date}} au {{checkout_date}}';

-- Update the public view to include new column
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
  bank_bic,
  bank_transfer_reference_template
FROM portal_settings;
