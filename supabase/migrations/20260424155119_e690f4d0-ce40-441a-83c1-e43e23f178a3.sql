
-- 1. Fix portal_settings: remove bank fields from anon-accessible view
DROP VIEW IF EXISTS public.public_portal_settings CASCADE;
CREATE VIEW public.public_portal_settings
WITH (security_invoker=on) AS
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
FROM public.portal_settings;

GRANT SELECT ON public.public_portal_settings TO anon, authenticated;

-- 2. Create SECURITY DEFINER RPC to fetch bank info only via valid booking access token
CREATE OR REPLACE FUNCTION public.get_portal_bank_info(_access_token text)
RETURNS TABLE (
  bank_beneficiary_name text,
  bank_iban text,
  bank_bic text,
  bank_transfer_reference_template text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.bank_beneficiary_name,
    ps.bank_iban,
    ps.bank_bic,
    ps.bank_transfer_reference_template
  FROM public.bookings b
  JOIN public.listings l ON l.id = b.listing_id
  JOIN public.portal_settings ps ON ps.host_user_id = l.host_user_id
  WHERE b.access_token = _access_token
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_portal_bank_info(text) TO anon, authenticated;

-- 3. Drop the overly permissive anon SELECT policy on portal_settings
-- (the public_portal_settings view + RPC now provide scoped access)
DROP POLICY IF EXISTS "Anon can view portal settings" ON public.portal_settings;

-- 4. Fix transactions: remove permissive INSERT policy
-- (SECURITY DEFINER functions like confirm_booking_payment bypass RLS for legitimate inserts)
DROP POLICY IF EXISTS "System can insert transactions" ON public.transactions;

-- 5. Fix booking_payment_items: restrict write access to hosts/admins only (guests read-only)
DROP POLICY IF EXISTS "Hosts can insert payment items" ON public.booking_payment_items;
DROP POLICY IF EXISTS "Hosts can update payment items" ON public.booking_payment_items;
DROP POLICY IF EXISTS "Hosts can delete payment items" ON public.booking_payment_items;

CREATE POLICY "Hosts can insert payment items"
ON public.booking_payment_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.listings l ON l.id = b.listing_id
    WHERE b.id = booking_payment_items.booking_id
      AND l.host_user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Hosts can update payment items"
ON public.booking_payment_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.listings l ON l.id = b.listing_id
    WHERE b.id = booking_payment_items.booking_id
      AND l.host_user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Hosts can delete payment items"
ON public.booking_payment_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.listings l ON l.id = b.listing_id
    WHERE b.id = booking_payment_items.booking_id
      AND l.host_user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 6. Fix SECURITY DEFINER view warning: add security_invoker to public_booking_dates
ALTER VIEW public.public_booking_dates SET (security_invoker = on);
