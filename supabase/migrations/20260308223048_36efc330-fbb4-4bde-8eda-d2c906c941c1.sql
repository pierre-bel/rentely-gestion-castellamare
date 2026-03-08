
-- Make dispute-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'dispute-attachments';

-- Remove the overly broad SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view dispute attachments" ON storage.objects;

-- Admin policy for dispute attachments
CREATE POLICY "Admins can view all dispute attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'dispute-attachments' AND public.has_role(auth.uid(), 'admin'::public.app_role));
