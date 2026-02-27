-- Create listing_moderation_feedback table
CREATE TABLE public.listing_moderation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id),
  section_key TEXT NOT NULL,
  comment TEXT,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected')),
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_listing_moderation_feedback_listing_id ON public.listing_moderation_feedback(listing_id);
CREATE INDEX idx_listing_moderation_feedback_admin_user_id ON public.listing_moderation_feedback(admin_user_id);

-- Enable Row Level Security
ALTER TABLE public.listing_moderation_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can do everything
CREATE POLICY "Admins can select all feedback"
ON public.listing_moderation_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert feedback"
ON public.listing_moderation_feedback
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update feedback"
ON public.listing_moderation_feedback
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policy: Hosts can view feedback for their own listings
CREATE POLICY "Hosts can view feedback for their own listings"
ON public.listing_moderation_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_moderation_feedback.listing_id
    AND listings.host_user_id = auth.uid()
  )
);