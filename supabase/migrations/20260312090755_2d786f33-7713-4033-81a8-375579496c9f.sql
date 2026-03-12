
-- Table to store Gmail OAuth tokens per host
CREATE TABLE public.gmail_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz NOT NULL,
  gmail_email text,
  last_sync_at timestamptz,
  last_history_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own gmail tokens"
  ON public.gmail_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can update their own gmail tokens"
  ON public.gmail_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can insert their own gmail tokens"
  ON public.gmail_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their own gmail tokens"
  ON public.gmail_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);

-- Add new columns to inbox_emails
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS ai_draft text;
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS gmail_message_id text UNIQUE;
