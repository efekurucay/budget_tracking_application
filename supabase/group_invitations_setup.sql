-- Group Invitations Setup
-- This script creates the necessary tables and functions for the group invitation system

-- Create group_invites table
CREATE TABLE IF NOT EXISTS public.group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invitation_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_invites_email ON public.group_invites(email);
CREATE INDEX IF NOT EXISTS idx_group_invites_invitation_code ON public.group_invites(invitation_code);
CREATE INDEX IF NOT EXISTS idx_group_invites_status ON public.group_invites(status);

-- Enable Row Level Security
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Clear existing policies
DROP POLICY IF EXISTS "Group members can view invitations" ON public.group_invites;
DROP POLICY IF EXISTS "Group members can create invitations" ON public.group_invites;
DROP POLICY IF EXISTS "Group members can update invitations" ON public.group_invites;
DROP POLICY IF EXISTS "Group members can delete invitations" ON public.group_invites;
DROP POLICY IF EXISTS "Anyone can view invitations by code" ON public.group_invites;

-- Group members can view invitations for their groups
CREATE POLICY "Group members can view invitations" 
  ON public.group_invites FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_invites.group_id
    AND group_members.user_id = auth.uid()
  ));

-- Group members can create invitations
CREATE POLICY "Group members can create invitations" 
  ON public.group_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_invites.group_id
      AND group_members.user_id = auth.uid()
    )
    AND auth.uid() = invited_by
  );

-- Group members can update invitations
CREATE POLICY "Group members can update invitations" 
  ON public.group_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_invites.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Group members can delete invitations
CREATE POLICY "Group members can delete invitations" 
  ON public.group_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_invites.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Anyone can view invitations when they have the code (for accepting)
CREATE POLICY "Anyone can view invitations by code" 
  ON public.group_invites FOR SELECT
  USING (status = 'pending');

-- Clear existing functions
DROP FUNCTION IF EXISTS public.create_group_invitation(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.accept_group_invitation(TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_group_invitations(UUID);
DROP FUNCTION IF EXISTS public.get_invitation_by_code(TEXT);

-- Function to create an invitation
CREATE OR REPLACE FUNCTION public.create_group_invitation(
  p_group_id UUID,
  p_invited_by UUID,
  p_email TEXT
)
RETURNS public.group_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation public.group_invites;
  v_code TEXT;
BEGIN
  -- Verify user is creating invitation for themselves
  IF p_invited_by != auth.uid() THEN
    RAISE EXCEPTION 'You can only create invitations as yourself';
  END IF;

  -- Check that user is a member of the group
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = p_group_id
    AND group_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You must be a member of this group to send invitations';
  END IF;

  -- Generate unique invitation code
  v_code := encode(gen_random_bytes(12), 'hex');
  
  -- Check if email already has a pending invitation to this group
  IF EXISTS (
    SELECT 1 FROM public.group_invites
    WHERE group_id = p_group_id
    AND email = p_email
    AND status = 'pending'
    AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'There is already a pending invitation for this email';
  END IF;

  -- Create the invitation
  INSERT INTO public.group_invites (
    group_id,
    invited_by,
    email,
    invitation_code,
    status
  ) VALUES (
    p_group_id,
    p_invited_by,
    p_email,
    v_code,
    'pending'
  )
  RETURNING * INTO v_invitation;

  RETURN v_invitation;
END;
$$;

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION public.accept_group_invitation(
  p_invitation_code TEXT,
  p_user_id UUID
)
RETURNS public.group_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation public.group_invites;
  v_group_member public.group_members;
BEGIN
  -- Verify user is accepting for themselves
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only accept invitations for yourself';
  END IF;
  
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM public.group_invites
  WHERE invitation_code = p_invitation_code
  AND status = 'pending'
  AND expires_at > now();
  
  -- Check if invitation exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;
  
  -- Check if user is already a member of the group
  IF EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = v_invitation.group_id
    AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You are already a member of this group';
  END IF;
  
  -- Add user to group
  INSERT INTO public.group_members (
    group_id,
    user_id,
    role
  ) VALUES (
    v_invitation.group_id,
    p_user_id,
    'member'
  )
  RETURNING * INTO v_group_member;
  
  -- Update invitation status
  UPDATE public.group_invites
  SET 
    status = 'accepted',
    updated_at = now()
  WHERE id = v_invitation.id;
  
  RETURN v_group_member;
END;
$$;

-- Function to get invitations for a group
CREATE OR REPLACE FUNCTION public.get_group_invitations(
  p_group_id UUID
)
RETURNS SETOF public.group_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is a member of the group
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You must be a member of this group to view invitations';
  END IF;
  
  -- Return invitations for the group
  RETURN QUERY
  SELECT *
  FROM public.group_invites
  WHERE group_id = p_group_id
  ORDER BY created_at DESC;
END;
$$;

-- Function to get invitation by code
CREATE OR REPLACE FUNCTION public.get_invitation_by_code(
  p_invitation_code TEXT
)
RETURNS public.group_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation public.group_invites;
  v_group_name TEXT;
  v_invited_by_name TEXT;
BEGIN
  -- Get the invitation
  SELECT 
    gi.*
  INTO v_invitation
  FROM public.group_invites gi
  WHERE invitation_code = p_invitation_code
  AND status = 'pending'
  AND expires_at > now();
  
  -- Check if invitation exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;
  
  RETURN v_invitation;
END;
$$;

-- Function to join group directly by code without email verification
CREATE OR REPLACE FUNCTION public.join_group_by_code(
  p_invitation_code TEXT,
  p_user_id UUID
)
RETURNS public.group_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation public.group_invites;
  v_group_member public.group_members;
BEGIN
  -- Verify user is joining for themselves
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only join groups as yourself';
  END IF;
  
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM public.group_invites
  WHERE invitation_code = p_invitation_code
  AND status = 'pending'
  AND expires_at > now();
  
  -- Check if invitation exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;
  
  -- Check if user is already a member of the group
  IF EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = v_invitation.group_id
    AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You are already a member of this group';
  END IF;
  
  -- Add user to group
  INSERT INTO public.group_members (
    group_id,
    user_id,
    role
  ) VALUES (
    v_invitation.group_id,
    p_user_id,
    'member'
  )
  RETURNING * INTO v_group_member;
  
  -- Update invitation status
  UPDATE public.group_invites
  SET 
    status = 'accepted',
    updated_at = now()
  WHERE id = v_invitation.id;
  
  RETURN v_group_member;
END;
$$; 