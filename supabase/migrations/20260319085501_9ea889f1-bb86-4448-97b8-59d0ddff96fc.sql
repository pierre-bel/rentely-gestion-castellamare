
-- Add hidden column to inbox_emails for soft-delete
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- Create host_notes table
CREATE TABLE public.host_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.host_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own notes" ON public.host_notes
  FOR SELECT TO authenticated USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can insert their own notes" ON public.host_notes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their own notes" ON public.host_notes
  FOR UPDATE TO authenticated USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can delete their own notes" ON public.host_notes
  FOR DELETE TO authenticated USING (auth.uid() = host_user_id);
