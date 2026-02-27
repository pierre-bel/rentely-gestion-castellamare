-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true);

-- RLS policies for listing images
CREATE POLICY "Anyone can view listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "Hosts can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-images' 
    AND (public.has_role(auth.uid(), 'host') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Hosts can update their listing images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listing-images' 
    AND (public.has_role(auth.uid(), 'host') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Hosts can delete their listing images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-images' 
    AND (public.has_role(auth.uid(), 'host') OR public.has_role(auth.uid(), 'admin'))
  );