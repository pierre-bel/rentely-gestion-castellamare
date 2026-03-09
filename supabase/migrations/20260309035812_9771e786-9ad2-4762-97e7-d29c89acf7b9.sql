
-- Table for imported bank transactions (CSV import)
CREATE TABLE public.bank_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id uuid NOT NULL,
  external_id text,
  transaction_date date NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  description text,
  debtor_name text,
  debtor_iban text,
  matched_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  matched_payment_item_id uuid REFERENCES public.booking_payment_items(id) ON DELETE SET NULL,
  matched_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(host_user_id, external_id)
);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own bank transactions"
  ON public.bank_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can insert their own bank transactions"
  ON public.bank_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their own bank transactions"
  ON public.bank_transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can delete their own bank transactions"
  ON public.bank_transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = host_user_id);

CREATE POLICY "Admins can view all bank transactions"
  ON public.bank_transactions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
