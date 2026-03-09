
-- Table to store host's custom review criteria configuration
CREATE TABLE public.host_review_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL,
  criterion_key text NOT NULL,
  label text NOT NULL,
  description text DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(host_user_id, criterion_key)
);

ALTER TABLE public.host_review_criteria ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Hosts can view their own criteria"
  ON public.host_review_criteria FOR SELECT
  TO authenticated
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can insert their own criteria"
  ON public.host_review_criteria FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their own criteria"
  ON public.host_review_criteria FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can delete their own criteria"
  ON public.host_review_criteria FOR DELETE
  TO authenticated
  USING (auth.uid() = host_user_id);

-- Public view for portal access (anonymous)
CREATE VIEW public.public_host_review_criteria AS
  SELECT host_user_id, criterion_key, label, description, sort_order
  FROM public.host_review_criteria
  WHERE is_enabled = true
  ORDER BY sort_order;

-- Store custom criteria ratings in a JSON column on reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS custom_ratings jsonb DEFAULT '{}';
