-- Allow users to request host role (but not admin)
CREATE POLICY "Users can request host role for themselves"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND role = 'host'
  );

-- Add rejection_reason column to listings
ALTER TABLE public.listings
ADD COLUMN rejection_reason TEXT;

-- Update listings table to track who approved/rejected
ALTER TABLE public.listings
ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN reviewed_at TIMESTAMPTZ;

-- Function to make first user admin (run once manually)
CREATE OR REPLACE FUNCTION public.make_user_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert admin role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.make_user_admin IS 'Use this to create the first admin user. Example: SELECT make_user_admin(''your-user-id'');';