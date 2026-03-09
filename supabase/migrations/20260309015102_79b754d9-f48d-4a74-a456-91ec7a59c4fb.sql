
-- Create access level enum
CREATE TYPE public.team_access_level AS ENUM ('full_access', 'read_only', 'read_only_anonymous', 'accounting_only');

-- Team invitations table
CREATE TABLE public.host_team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id UUID NOT NULL,
  email TEXT NOT NULL,
  access_level team_access_level NOT NULL DEFAULT 'read_only',
  token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(host_user_id, email)
);

-- Team members table (accepted invitations)
CREATE TABLE public.host_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id UUID NOT NULL,
  member_user_id UUID NOT NULL,
  access_level team_access_level NOT NULL DEFAULT 'read_only',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(host_user_id, member_user_id)
);

-- Enable RLS
ALTER TABLE public.host_team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_team_members ENABLE ROW LEVEL SECURITY;

-- RLS for host_team_invitations
CREATE POLICY "Hosts can view their own invitations"
  ON public.host_team_invitations FOR SELECT
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can create invitations"
  ON public.host_team_invitations FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their own invitations"
  ON public.host_team_invitations FOR UPDATE
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can delete their own invitations"
  ON public.host_team_invitations FOR DELETE
  USING (auth.uid() = host_user_id);

-- RLS for host_team_members
CREATE POLICY "Hosts can view their team members"
  ON public.host_team_members FOR SELECT
  USING (auth.uid() = host_user_id);

CREATE POLICY "Team members can view their own membership"
  ON public.host_team_members FOR SELECT
  USING (auth.uid() = member_user_id);

CREATE POLICY "Hosts can insert team members"
  ON public.host_team_members FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update team members"
  ON public.host_team_members FOR UPDATE
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can delete team members"
  ON public.host_team_members FOR DELETE
  USING (auth.uid() = host_user_id);

-- Security definer function to accept invitation by token
CREATE OR REPLACE FUNCTION public.accept_team_invitation(invitation_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  result JSON;
BEGIN
  -- Find valid invitation
  SELECT * INTO inv FROM host_team_invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation invalide ou expirée');
  END IF;

  -- Check user email matches
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != inv.email THEN
    RETURN json_build_object('success', false, 'error', 'Cette invitation ne correspond pas à votre adresse e-mail');
  END IF;

  -- Insert team member
  INSERT INTO host_team_members (host_user_id, member_user_id, access_level)
  VALUES (inv.host_user_id, auth.uid(), inv.access_level)
  ON CONFLICT (host_user_id, member_user_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = now();

  -- Mark invitation as accepted
  UPDATE host_team_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = inv.id;

  RETURN json_build_object('success', true);
END;
$$;

-- Function to get team memberships for current user (as a member)
CREATE OR REPLACE FUNCTION public.get_my_team_memberships()
RETURNS TABLE(host_user_id UUID, access_level team_access_level, host_email TEXT, host_first_name TEXT, host_last_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tm.host_user_id,
    tm.access_level,
    p.email as host_email,
    p.first_name as host_first_name,
    p.last_name as host_last_name
  FROM host_team_members tm
  JOIN profiles p ON p.id = tm.host_user_id
  WHERE tm.member_user_id = auth.uid();
$$;
