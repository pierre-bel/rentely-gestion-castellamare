
-- Fix Security Definer Views: recreate all public views with security_invoker=on
-- And add necessary anon SELECT policies on underlying tables

-- 1. Add anon SELECT policies on tables that need public access through views

-- host_review_criteria: allow anon to read enabled criteria
CREATE POLICY "Anon can view enabled review criteria"
ON public.host_review_criteria FOR SELECT
TO anon
USING (is_enabled = true);

-- host_school_holidays: allow anon to read holidays
CREATE POLICY "Anon can view school holidays"
ON public.host_school_holidays FOR SELECT
TO anon
USING (true);

-- listing_weekly_pricing: allow anon to read pricing for approved listings
CREATE POLICY "Anon can view pricing for approved listings"
ON public.listing_weekly_pricing FOR SELECT
TO anon
USING (listing_id IN (SELECT id FROM listings WHERE status = 'approved'::listing_status));

-- portal_settings: allow anon to read contact info
CREATE POLICY "Anon can view portal settings"
ON public.portal_settings FOR SELECT
TO anon
USING (true);

-- portal_custom_sections: allow anon to read enabled sections
CREATE POLICY "Anon can view enabled custom sections"
ON public.portal_custom_sections FOR SELECT
TO anon
USING (is_enabled = true);

-- profiles: allow anon to view profiles of hosts with approved listings
CREATE POLICY "Anon can view host profiles"
ON public.profiles FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM listings l
  WHERE l.host_user_id = profiles.id
  AND l.status = 'approved'::listing_status
));

-- 2. Recreate all views with security_invoker=on

DROP VIEW IF EXISTS public.embed_host_listings;
CREATE VIEW public.embed_host_listings WITH (security_invoker=on) AS
SELECT id, host_user_id, title, city, base_price, cover_image, bedrooms
FROM listings
WHERE status = 'approved'::listing_status;

DROP VIEW IF EXISTS public.embed_listing_info;
CREATE VIEW public.embed_listing_info WITH (security_invoker=on) AS
SELECT id, title, city, base_price
FROM listings;

DROP VIEW IF EXISTS public.public_host_contact;
CREATE VIEW public.public_host_contact WITH (security_invoker=on) AS
SELECT host_user_id, contact_email, contact_phone, contact_whatsapp
FROM portal_settings;

DROP VIEW IF EXISTS public.public_host_review_criteria;
CREATE VIEW public.public_host_review_criteria WITH (security_invoker=on) AS
SELECT host_user_id, criterion_key, label, description, sort_order
FROM host_review_criteria
WHERE is_enabled = true
ORDER BY sort_order;

DROP VIEW IF EXISTS public.public_host_school_holidays;
CREATE VIEW public.public_host_school_holidays WITH (security_invoker=on) AS
SELECT id, host_user_id, label, start_date, end_date
FROM host_school_holidays;

DROP VIEW IF EXISTS public.public_listing_weekly_pricing;
CREATE VIEW public.public_listing_weekly_pricing WITH (security_invoker=on) AS
SELECT listing_id, week_start_date, weekly_rate, weekend_rate, extra_night_weekend_rate
FROM listing_weekly_pricing
WHERE listing_id IN (SELECT id FROM listings WHERE status = 'approved'::listing_status);

DROP VIEW IF EXISTS public.public_portal_custom_sections;
CREATE VIEW public.public_portal_custom_sections WITH (security_invoker=on) AS
SELECT id, host_user_id, sort_order, is_enabled, section_key, title, body_html
FROM portal_custom_sections
WHERE is_enabled = true;

DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker=on) AS
SELECT id, first_name, last_name, avatar_url, about, created_at
FROM profiles;
