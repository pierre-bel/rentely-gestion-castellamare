-- Allow admins to create support threads between SUPPORT_USER_ID and any user
CREATE POLICY "Admins can create support threads for users"
ON public.message_threads
FOR INSERT
TO authenticated
WITH CHECK (
  thread_type = 'user_to_support' 
  AND has_role(auth.uid(), 'admin')
);