-- Create dispute-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('dispute-attachments', 'dispute-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own dispute attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view dispute attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins have full access to dispute attachments" ON storage.objects;

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own dispute attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dispute-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view all dispute attachments
CREATE POLICY "Authenticated users can view dispute attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'dispute-attachments');

-- Allow admins full access to dispute attachments
CREATE POLICY "Admins have full access to dispute attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'dispute-attachments' 
  AND has_role(auth.uid(), 'admin'::app_role)
);