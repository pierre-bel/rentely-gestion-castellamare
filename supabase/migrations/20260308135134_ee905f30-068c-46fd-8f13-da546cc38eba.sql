
-- Contract templates table
CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL,
  name text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view own templates" ON public.contract_templates FOR SELECT TO authenticated USING (auth.uid() = host_user_id);
CREATE POLICY "Hosts can insert own templates" ON public.contract_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "Hosts can update own templates" ON public.contract_templates FOR UPDATE TO authenticated USING (auth.uid() = host_user_id);
CREATE POLICY "Hosts can delete own templates" ON public.contract_templates FOR DELETE TO authenticated USING (auth.uid() = host_user_id);

-- Booking contracts table
CREATE TABLE public.booking_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  generated_html text NOT NULL,
  signed_at timestamptz,
  signature_data text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_contracts ENABLE ROW LEVEL SECURITY;

-- Host can view/manage contracts for their listings' bookings
CREATE POLICY "Hosts can view contracts for their bookings" ON public.booking_contracts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM bookings b JOIN listings l ON l.id = b.listing_id
  WHERE b.id = booking_contracts.booking_id AND l.host_user_id = auth.uid()
));

CREATE POLICY "Hosts can insert contracts" ON public.booking_contracts FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM bookings b JOIN listings l ON l.id = b.listing_id
  WHERE b.id = booking_contracts.booking_id AND l.host_user_id = auth.uid()
));

CREATE POLICY "Hosts can update contracts" ON public.booking_contracts FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM bookings b JOIN listings l ON l.id = b.listing_id
  WHERE b.id = booking_contracts.booking_id AND l.host_user_id = auth.uid()
));

CREATE POLICY "Hosts can delete contracts" ON public.booking_contracts FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM bookings b JOIN listings l ON l.id = b.listing_id
  WHERE b.id = booking_contracts.booking_id AND l.host_user_id = auth.uid()
));

-- Guests can view contracts for their bookings
CREATE POLICY "Guests can view their booking contracts" ON public.booking_contracts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM bookings b WHERE b.id = booking_contracts.booking_id AND b.guest_user_id = auth.uid()
));

-- Guests can update (sign) their booking contracts
CREATE POLICY "Guests can sign their booking contracts" ON public.booking_contracts FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM bookings b WHERE b.id = booking_contracts.booking_id AND b.guest_user_id = auth.uid()
));

-- Admin access
CREATE POLICY "Admins can view all contracts" ON public.booking_contracts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all templates" ON public.contract_templates FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for contracts
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', false);
