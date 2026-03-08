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
  require_full_payment_for_access_code
FROM portal_settings;