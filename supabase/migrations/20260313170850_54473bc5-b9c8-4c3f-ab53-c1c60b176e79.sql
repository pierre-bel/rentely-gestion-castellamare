
CREATE TABLE public.host_ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL UNIQUE,
  custom_prompt text DEFAULT '',
  tone text DEFAULT 'professionnel et chaleureux',
  language text DEFAULT 'fr',
  signature text DEFAULT '',
  additional_instructions text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.host_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own AI settings"
  ON public.host_ai_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can insert their own AI settings"
  ON public.host_ai_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their own AI settings"
  ON public.host_ai_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_user_id);
