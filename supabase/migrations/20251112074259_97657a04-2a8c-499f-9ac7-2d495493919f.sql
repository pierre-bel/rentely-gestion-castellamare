-- Allow unauthenticated users to view published FAQs on the homepage
CREATE POLICY "Published FAQs are publicly viewable"
ON public.faqs
FOR SELECT
TO anon, authenticated
USING (status = 'published');