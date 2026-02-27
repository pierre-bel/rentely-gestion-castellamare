-- Phase 1: Create cancellation_policies table
CREATE TABLE public.cancellation_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  refund_percentage INTEGER NOT NULL CHECK (refund_percentage >= 0 AND refund_percentage <= 100),
  days_before_checkin INTEGER NOT NULL CHECK (days_before_checkin >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial policies matching the specification
INSERT INTO public.cancellation_policies (policy_key, name, description, refund_percentage, days_before_checkin)
VALUES 
  ('flexible', 'Flexible', 'Full refund up to 1 day before check-in', 100, 1),
  ('moderate', 'Moderate', 'Full refund up to 5 days before check-in', 100, 5),
  ('strict', 'Strict', '50% refund up to 7 days before check-in', 50, 7);

-- Enable RLS on cancellation_policies
ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view active policies
CREATE POLICY "Active policies are viewable by everyone"
ON public.cancellation_policies
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policy: Only admins can insert policies
CREATE POLICY "Admins can insert policies"
ON public.cancellation_policies
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policy: Only admins can update policies
CREATE POLICY "Admins can update policies"
ON public.cancellation_policies
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policy: Only admins can delete policies
CREATE POLICY "Admins can delete policies"
ON public.cancellation_policies
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Phase 2: Modify listings table
-- Add new cancellation_policy_id column (nullable initially for migration)
ALTER TABLE public.listings ADD COLUMN cancellation_policy_id UUID;

-- Migrate existing data: Map enum values to policy IDs
UPDATE public.listings
SET cancellation_policy_id = (
  SELECT id FROM public.cancellation_policies 
  WHERE policy_key = listings.cancellation_policy::text
);

-- Add foreign key constraint
ALTER TABLE public.listings 
ADD CONSTRAINT fk_listings_cancellation_policy 
FOREIGN KEY (cancellation_policy_id) 
REFERENCES public.cancellation_policies(id) 
ON DELETE RESTRICT;

-- Make cancellation_policy_id NOT NULL
ALTER TABLE public.listings ALTER COLUMN cancellation_policy_id SET NOT NULL;

-- Drop old cancellation_policy enum column
ALTER TABLE public.listings DROP COLUMN cancellation_policy;

-- Phase 3: Modify bookings table
-- Add temporary column for JSONB
ALTER TABLE public.bookings ADD COLUMN cancellation_policy_snapshot_new JSONB;

-- Migrate existing enum data to JSONB format
UPDATE public.bookings
SET cancellation_policy_snapshot_new = (
  SELECT jsonb_build_object(
    'policy_key', cp.policy_key,
    'name', cp.name,
    'description', cp.description,
    'refund_percentage', cp.refund_percentage,
    'days_before_checkin', cp.days_before_checkin
  )
  FROM public.cancellation_policies cp
  WHERE cp.policy_key = bookings.cancellation_policy_snapshot::text
)
WHERE cancellation_policy_snapshot IS NOT NULL;

-- Drop old column and rename new one
ALTER TABLE public.bookings DROP COLUMN cancellation_policy_snapshot;
ALTER TABLE public.bookings RENAME COLUMN cancellation_policy_snapshot_new TO cancellation_policy_snapshot;