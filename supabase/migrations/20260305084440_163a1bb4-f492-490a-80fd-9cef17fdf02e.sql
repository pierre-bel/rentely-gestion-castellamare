
-- Email automation trigger types
CREATE TYPE public.email_trigger_type AS ENUM (
  'booking_confirmed',
  'days_before_checkin',
  'day_of_checkin',
  'days_after_checkin',
  'days_before_checkout',
  'day_of_checkout',
  'days_after_checkout'
);

-- Email automations table
CREATE TABLE public.email_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  trigger_type email_trigger_type NOT NULL,
  trigger_days INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own email automations"
  ON public.email_automations FOR SELECT
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can create their own email automations"
  ON public.email_automations FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their own email automations"
  ON public.email_automations FOR UPDATE
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can delete their own email automations"
  ON public.email_automations FOR DELETE
  USING (auth.uid() = host_user_id);

CREATE POLICY "Admins can view all email automations"
  ON public.email_automations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Email send log
CREATE TABLE public.email_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES public.email_automations(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  resend_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own email logs"
  ON public.email_send_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.email_automations ea
    WHERE ea.id = email_send_log.automation_id
    AND ea.host_user_id = auth.uid()
  ));

CREATE POLICY "System can insert email logs"
  ON public.email_send_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all email logs"
  ON public.email_send_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
