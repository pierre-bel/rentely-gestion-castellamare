-- Phase 1: Add expired status to booking_status enum
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'expired';

-- Phase 1: Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('capture', 'refund', 'payout')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal')),
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_transactions_booking_id ON public.transactions(booking_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = transactions.booking_id
      AND bookings.guest_user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can view listing transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      JOIN public.listings ON listings.id = bookings.listing_id
      WHERE bookings.id = transactions.booking_id
      AND listings.host_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (true);

-- Phase 2: Create atomic payment confirmation function
CREATE OR REPLACE FUNCTION public.confirm_booking_payment(
  p_booking_id UUID,
  p_provider TEXT,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'USD'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_transaction_id UUID;
  v_result JSON;
BEGIN
  -- Lock the booking row
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  IF v_booking.status != 'pending_payment'::booking_status THEN
    RAISE EXCEPTION 'Booking is not in pending_payment status';
  END IF;
  
  IF v_booking.guest_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  IF p_provider NOT IN ('stripe', 'paypal') THEN
    RAISE EXCEPTION 'Invalid payment provider';
  END IF;
  
  -- Insert transaction record
  INSERT INTO public.transactions (
    booking_id, type, amount, currency, provider, status
  )
  VALUES (
    p_booking_id, 'capture', p_amount, p_currency, p_provider, 'succeeded'
  )
  RETURNING id INTO v_transaction_id;
  
  -- Update booking status
  UPDATE public.bookings
  SET status = 'confirmed'::booking_status, updated_at = now()
  WHERE id = p_booking_id;
  
  -- Return success
  v_result := json_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'transaction_id', v_transaction_id
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_booking_payment TO authenticated;

-- Phase 3: Create automated cancellation function
CREATE OR REPLACE FUNCTION public.cancel_expired_bookings()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INTEGER;
  v_expired_booking_ids UUID[];
BEGIN
  WITH expired_bookings AS (
    SELECT id
    FROM public.bookings
    WHERE status = 'pending_payment'::booking_status
    AND created_at < (now() - INTERVAL '10 minutes')
  )
  UPDATE public.bookings
  SET status = 'expired'::booking_status, updated_at = now()
  WHERE id IN (SELECT id FROM expired_bookings)
  RETURNING id INTO v_expired_booking_ids;
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'cancelled_count', v_expired_count,
    'booking_ids', v_expired_booking_ids,
    'timestamp', now()
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_expired_bookings TO postgres;
GRANT EXECUTE ON FUNCTION public.cancel_expired_bookings TO service_role;