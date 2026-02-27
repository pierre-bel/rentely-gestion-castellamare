-- Create system support user profile for dispute handling
-- This user receives all support thread messages from the dispute system

-- First, check if the support user already exists in auth.users
-- If not, we need to insert it there first (with a dummy email since it's a system account)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'system-support@internal.system',
  crypt('SYSTEM_ACCOUNT_NO_LOGIN', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"email":"system-support@internal.system","first_name":"Support","last_name":"System","is_system":true}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Create the system support user profile
INSERT INTO public.profiles (
  id,
  email,
  first_name,
  last_name,
  status,
  verified,
  is_system,
  is_demo,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'system-support@internal.system',
  'Support',
  'System',
  'active',
  true,
  true,
  false,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_system = true,
  verified = true;

-- Ensure the system support user has the admin role
INSERT INTO public.user_roles (
  user_id,
  role,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin',
  now()
)
ON CONFLICT (user_id, role) DO NOTHING;