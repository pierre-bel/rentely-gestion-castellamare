-- Create review status enum
CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected', 'blocked');

-- Add status and updated_at columns to reviews table
ALTER TABLE public.reviews 
ADD COLUMN status review_status NOT NULL DEFAULT 'pending',
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Drop old update policy
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;

-- Create new update policy with 2-day edit window
CREATE POLICY "Users can update their own reviews within 2 days"
ON public.reviews
FOR UPDATE
USING (
  auth.uid() = author_user_id 
  AND created_at > (now() - interval '2 days')
);

-- Update select policy to show approved reviews or own reviews
DROP POLICY IF EXISTS "Public reviews are viewable by everyone" ON public.reviews;

CREATE POLICY "Approved reviews and own reviews are viewable"
ON public.reviews
FOR SELECT
USING (
  (status = 'approved' AND is_public = true) 
  OR auth.uid() = author_user_id
  OR has_role(auth.uid(), 'admin')
);