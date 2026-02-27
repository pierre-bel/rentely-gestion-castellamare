-- ============================================================================
-- PHASE 1: Database Foundation
-- ============================================================================

-- 1.1 Create platform_settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL CHECK (setting_type IN ('decimal', 'integer', 'boolean', 'string')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies for platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active settings are viewable by everyone"
  ON public.platform_settings
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert settings"
  ON public.platform_settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings"
  ON public.platform_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete settings"
  ON public.platform_settings
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial platform settings
INSERT INTO public.platform_settings (setting_key, setting_value, setting_type, description) VALUES
  ('default_host_commission_rate', '0.05', 'decimal', 'Platform commission rate charged to hosts (5%)'),
  ('default_guest_service_fee_rate', '0.08', 'decimal', 'Service fee rate charged to guests (8%)'),
  ('default_tax_rate', '0.10', 'decimal', 'Tax rate applied to bookings (10%)');

-- 1.2 Extend bookings table with financial snapshot columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS taxes NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_service_fee_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS host_commission_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS host_commission_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS host_payout_gross NUMERIC,
  ADD COLUMN IF NOT EXISTS host_payout_net NUMERIC,
  ADD COLUMN IF NOT EXISTS platform_revenue_total NUMERIC;

-- Backfill existing bookings with assumed default rates
UPDATE public.bookings
SET
  guest_service_fee_rate = 0.08,
  tax_rate = 0.10,
  host_commission_rate = 0.05,
  taxes = COALESCE(taxes, subtotal * 0.10),
  host_payout_gross = subtotal + COALESCE(cleaning_fee, 0),
  host_commission_amount = (subtotal + COALESCE(cleaning_fee, 0)) * 0.05,
  host_payout_net = (subtotal + COALESCE(cleaning_fee, 0)) * 0.95,
  platform_revenue_total = (service_fee + (subtotal * 0.10) + ((subtotal + COALESCE(cleaning_fee, 0)) * 0.05))
WHERE guest_service_fee_rate IS NULL;

-- ============================================================================
-- PHASE 2: Booking Creation RPC Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_booking_with_financial_snapshot(
  p_listing_id UUID,
  p_checkin_date DATE,
  p_checkout_date DATE,
  p_guests INTEGER,
  p_subtotal NUMERIC,
  p_cleaning_fee NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_user_id UUID;
  v_nights INTEGER;
  v_cancellation_policy JSONB;
  
  -- Financial rates from platform_settings
  v_service_fee_rate NUMERIC;
  v_tax_rate NUMERIC;
  v_host_commission_rate NUMERIC;
  
  -- Calculated financial amounts
  v_service_fee NUMERIC;
  v_taxes NUMERIC;
  v_total_price NUMERIC;
  v_host_payout_gross NUMERIC;
  v_host_commission_amount NUMERIC;
  v_host_payout_net NUMERIC;
  v_platform_revenue_total NUMERIC;
  
  v_booking_id UUID;
BEGIN
  -- Get authenticated user
  v_guest_user_id := auth.uid();
  IF v_guest_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Calculate nights
  v_nights := p_checkout_date - p_checkin_date;
  IF v_nights <= 0 THEN
    RAISE EXCEPTION 'Invalid date range';
  END IF;
  
  -- Fetch current active financial rates from platform_settings
  SELECT setting_value::NUMERIC INTO v_service_fee_rate
  FROM public.platform_settings
  WHERE setting_key = 'default_guest_service_fee_rate' AND is_active = true;
  
  SELECT setting_value::NUMERIC INTO v_tax_rate
  FROM public.platform_settings
  WHERE setting_key = 'default_tax_rate' AND is_active = true;
  
  SELECT setting_value::NUMERIC INTO v_host_commission_rate
  FROM public.platform_settings
  WHERE setting_key = 'default_host_commission_rate' AND is_active = true;
  
  -- Validate rates were found
  IF v_service_fee_rate IS NULL OR v_tax_rate IS NULL OR v_host_commission_rate IS NULL THEN
    RAISE EXCEPTION 'Platform financial settings not configured';
  END IF;
  
  -- Calculate guest-side amounts
  v_service_fee := p_subtotal * v_service_fee_rate;
  v_taxes := (p_subtotal + p_cleaning_fee + v_service_fee) * v_tax_rate;
  v_total_price := p_subtotal + p_cleaning_fee + v_service_fee + v_taxes;
  
  -- Calculate host-side amounts
  v_host_payout_gross := p_subtotal + p_cleaning_fee;
  v_host_commission_amount := v_host_payout_gross * v_host_commission_rate;
  v_host_payout_net := v_host_payout_gross - v_host_commission_amount;
  
  -- Calculate platform revenue
  v_platform_revenue_total := v_service_fee + v_taxes + v_host_commission_amount;
  
  -- Fetch cancellation policy snapshot
  SELECT jsonb_build_object(
    'policy_key', cp.policy_key,
    'name', cp.name,
    'description', cp.description,
    'refund_percentage', cp.refund_percentage,
    'days_before_checkin', cp.days_before_checkin
  ) INTO v_cancellation_policy
  FROM public.listings l
  INNER JOIN public.cancellation_policies cp ON cp.id = l.cancellation_policy_id
  WHERE l.id = p_listing_id;
  
  -- Insert booking with complete financial snapshot
  INSERT INTO public.bookings (
    listing_id,
    guest_user_id,
    checkin_date,
    checkout_date,
    nights,
    guests,
    subtotal,
    cleaning_fee,
    service_fee,
    taxes,
    total_price,
    guest_service_fee_rate,
    tax_rate,
    host_commission_rate,
    host_commission_amount,
    host_payout_gross,
    host_payout_net,
    platform_revenue_total,
    cancellation_policy_snapshot,
    notes,
    status
  ) VALUES (
    p_listing_id,
    v_guest_user_id,
    p_checkin_date,
    p_checkout_date,
    v_nights,
    p_guests,
    p_subtotal,
    p_cleaning_fee,
    v_service_fee,
    v_taxes,
    v_total_price,
    v_service_fee_rate,
    v_tax_rate,
    v_host_commission_rate,
    v_host_commission_amount,
    v_host_payout_gross,
    v_host_payout_net,
    v_platform_revenue_total,
    v_cancellation_policy,
    p_notes,
    'pending_payment'::booking_status
  ) RETURNING id INTO v_booking_id;
  
  -- Return success with booking details
  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'total_price', v_total_price,
    'financial_breakdown', json_build_object(
      'subtotal', p_subtotal,
      'cleaning_fee', p_cleaning_fee,
      'service_fee', v_service_fee,
      'taxes', v_taxes,
      'total', v_total_price,
      'host_payout_net', v_host_payout_net,
      'platform_revenue', v_platform_revenue_total
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- PHASE 3: Cancellation RPC Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cancel_booking_with_refund(
  p_booking_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_guest_user_id UUID;
  v_days_until_checkin INTEGER;
  v_refund_percentage INTEGER;
  v_cancellation_policy JSONB;
  
  -- Financial amounts from booking snapshot
  v_subtotal NUMERIC;
  v_cleaning_fee NUMERIC;
  v_service_fee NUMERIC;
  v_taxes NUMERIC;
  v_total_price NUMERIC;
  v_host_commission_rate NUMERIC;
  v_host_payout_net NUMERIC;
  
  -- Calculated refund amounts
  v_guest_total_paid NUMERIC;
  v_refund_to_guest NUMERIC;
  v_retained_funds NUMERIC;
  v_host_payout_from_cancellation NUMERIC;
  v_platform_revenue_from_cancellation NUMERIC;
  
  v_refund_transaction_id UUID;
  v_payout_id UUID;
BEGIN
  -- Get authenticated user
  v_guest_user_id := auth.uid();
  IF v_guest_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Lock and fetch booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Validate authorization
  IF v_booking.guest_user_id != v_guest_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only cancel your own bookings';
  END IF;
  
  -- Validate booking status
  IF v_booking.status NOT IN ('pending_payment', 'confirmed') THEN
    RAISE EXCEPTION 'Booking cannot be cancelled (status: %)', v_booking.status;
  END IF;
  
  -- Check if cancellation policy exists
  IF v_booking.cancellation_policy_snapshot IS NULL THEN
    RAISE EXCEPTION 'Booking does not have a cancellation policy';
  END IF;
  
  v_cancellation_policy := v_booking.cancellation_policy_snapshot;
  
  -- Calculate days until check-in
  v_days_until_checkin := v_booking.checkin_date - CURRENT_DATE;
  
  -- Determine refund percentage based on policy
  v_refund_percentage := (v_cancellation_policy->>'refund_percentage')::INTEGER;
  IF v_days_until_checkin < (v_cancellation_policy->>'days_before_checkin')::INTEGER THEN
    v_refund_percentage := 0;
  END IF;
  
  -- Extract financial amounts from booking snapshot
  v_subtotal := v_booking.subtotal;
  v_cleaning_fee := COALESCE(v_booking.cleaning_fee, 0);
  v_service_fee := COALESCE(v_booking.service_fee, 0);
  v_taxes := COALESCE(v_booking.taxes, 0);
  v_total_price := v_booking.total_price;
  v_host_commission_rate := v_booking.host_commission_rate;
  v_host_payout_net := v_booking.host_payout_net;
  
  -- Calculate refund amounts
  v_guest_total_paid := v_subtotal + v_cleaning_fee + v_service_fee + v_taxes;
  v_refund_to_guest := v_guest_total_paid * (v_refund_percentage::NUMERIC / 100);
  v_retained_funds := v_guest_total_paid - v_refund_to_guest;
  
  -- Calculate distribution of retained funds
  -- Host gets their net share of the retained booking amount (subtotal + cleaning - commission)
  v_host_payout_from_cancellation := (v_subtotal + v_cleaning_fee) * (1 - v_refund_percentage::NUMERIC / 100) * (1 - v_host_commission_rate);
  
  -- Platform keeps service fee, taxes, and commission from retained amount
  v_platform_revenue_from_cancellation := v_retained_funds - v_host_payout_from_cancellation;
  
  -- Update booking status
  UPDATE public.bookings
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE id = p_booking_id;
  
  -- Create refund transaction record (if refund > 0)
  IF v_refund_to_guest > 0 THEN
    INSERT INTO public.transactions (
      booking_id,
      type,
      amount,
      currency,
      provider,
      status
    ) VALUES (
      p_booking_id,
      'refund',
      v_refund_to_guest,
      v_booking.currency,
      'stripe',
      'succeeded'
    ) RETURNING id INTO v_refund_transaction_id;
  END IF;
  
  -- Create payout record for host (if host gets payout > 0)
  IF v_host_payout_from_cancellation > 0 THEN
    INSERT INTO public.payouts (
      host_user_id,
      booking_id,
      amount,
      currency,
      status,
      notes
    )
    SELECT
      l.host_user_id,
      p_booking_id,
      v_host_payout_from_cancellation,
      v_booking.currency,
      'pending',
      'Cancellation payout: ' || (100 - v_refund_percentage)::TEXT || '% of booking retained'
    FROM public.listings l
    WHERE l.id = v_booking.listing_id
    RETURNING id INTO v_payout_id;
  END IF;
  
  -- Return detailed financial breakdown
  RETURN json_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'refund_percentage', v_refund_percentage,
    'days_until_checkin', v_days_until_checkin,
    'financial_breakdown', json_build_object(
      'guest_total_paid', v_guest_total_paid,
      'refund_to_guest', v_refund_to_guest,
      'retained_funds', v_retained_funds,
      'host_payout', v_host_payout_from_cancellation,
      'platform_revenue', v_platform_revenue_from_cancellation
    ),
    'refund_transaction_id', v_refund_transaction_id,
    'payout_id', v_payout_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;