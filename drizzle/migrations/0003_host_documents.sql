CREATE TABLE public.host_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.host_documents TO authenticated;
GRANT ALL ON public.host_documents TO service_role;
ALTER TABLE public.host_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts manage own documents" ON public.host_documents FOR ALL TO authenticated
  USING (auth.uid() = host_user_id) WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "Hosts read own document files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'host-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Hosts upload own document files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'host-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Hosts delete own document files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'host-documents' AND (storage.foldername(name))[1] = auth.uid()::text);