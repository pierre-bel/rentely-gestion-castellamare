
-- Default payment schedule templates per host
CREATE TABLE public.host_payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL,
  label text NOT NULL,
  percentage numeric NOT NULL,
  due_type text NOT NULL DEFAULT 'before_checkin',
  due_days integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.host_payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own payment schedules" ON public.host_payment_schedules FOR SELECT USING (auth.uid() = host_user_id);
CREATE POLICY "Hosts can insert their own payment schedules" ON public.host_payment_schedules FOR INSERT WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "Hosts can update their own payment schedules" ON public.host_payment_schedules FOR UPDATE USING (auth.uid() = host_user_id);
CREATE POLICY "Hosts can delete their own payment schedules" ON public.host_payment_schedules FOR DELETE USING (auth.uid() = host_user_id);

-- Per-booking payment schedule items
CREATE TABLE public.booking_payment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  label text NOT NULL,
  amount numeric NOT NULL,
  due_date date,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_payment_items ENABLE ROW LEVEL SECURITY;

-- Hosts can manage payment items for their bookings (via listings)
CREATE POLICY "Hosts can view payment items for their bookings" ON public.booking_payment_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN listings l ON l.id = b.listing_id
    WHERE b.id = booking_payment_items.booking_id AND l.host_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_payment_items.booking_id AND b.guest_user_id = auth.uid()
  )
);

CREATE POLICY "Hosts can insert payment items" ON public.booking_payment_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN listings l ON l.id = b.listing_id
    WHERE b.id = booking_payment_items.booking_id AND l.host_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_payment_items.booking_id AND b.guest_user_id = auth.uid()
  )
);

CREATE POLICY "Hosts can update payment items" ON public.booking_payment_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN listings l ON l.id = b.listing_id
    WHERE b.id = booking_payment_items.booking_id AND l.host_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_payment_items.booking_id AND b.guest_user_id = auth.uid()
  )
);

CREATE POLICY "Hosts can delete payment items" ON public.booking_payment_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN listings l ON l.id = b.listing_id
    WHERE b.id = booking_payment_items.booking_id AND l.host_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_payment_items.booking_id AND b.guest_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all payment items" ON public.booking_payment_items FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage all payment schedules" ON public.host_payment_schedules FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
