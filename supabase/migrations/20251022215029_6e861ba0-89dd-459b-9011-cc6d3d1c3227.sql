-- Create payouts table for host payment history
CREATE TABLE public.payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id UUID NOT NULL,
  booking_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  payout_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Hosts can view their own payouts
CREATE POLICY "Hosts can view their own payouts"
ON public.payouts
FOR SELECT
USING (auth.uid() = host_user_id);

-- Admins can view all payouts
CREATE POLICY "Admins can view all payouts"
ON public.payouts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert/update payouts (system managed)
CREATE POLICY "Admins can insert payouts"
ON public.payouts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update payouts"
ON public.payouts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_payouts_updated_at
BEFORE UPDATE ON public.payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();