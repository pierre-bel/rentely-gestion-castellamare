DROP POLICY "System can insert emails" ON public.inbox_emails;

CREATE POLICY "Hosts can insert their own emails"
ON public.inbox_emails FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_id);