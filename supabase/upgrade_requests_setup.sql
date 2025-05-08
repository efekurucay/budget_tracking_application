-- Upgrade Requests Setup
-- This script creates the necessary tables and security policies for managing Pro upgrade requests

-- Create upgrade_requests table
CREATE TABLE IF NOT EXISTS public.upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_user_id ON public.upgrade_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_status ON public.upgrade_requests(status);

-- Enable Row Level Security
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Clear existing policies
DROP POLICY IF EXISTS "Users can view their own upgrade requests" ON public.upgrade_requests;
DROP POLICY IF EXISTS "Users can create their own upgrade requests" ON public.upgrade_requests;
DROP POLICY IF EXISTS "Users can update their own upgrade requests" ON public.upgrade_requests;
DROP POLICY IF EXISTS "Users can delete their own upgrade requests" ON public.upgrade_requests;
DROP POLICY IF EXISTS "Admins can view all upgrade requests" ON public.upgrade_requests;
DROP POLICY IF EXISTS "Admins can update any upgrade request" ON public.upgrade_requests;

-- Users can view their own upgrade requests
CREATE POLICY "Users can view their own upgrade requests"
  ON public.upgrade_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own upgrade requests
CREATE POLICY "Users can create their own upgrade requests"
  ON public.upgrade_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending upgrade requests
CREATE POLICY "Users can update their own upgrade requests"
  ON public.upgrade_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Users can delete their own pending upgrade requests
CREATE POLICY "Users can delete their own upgrade requests"
  ON public.upgrade_requests FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Admin policies (requires the is_admin field in profiles table)
-- Admins can view all upgrade requests
CREATE POLICY "Admins can view all upgrade requests"
  ON public.upgrade_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  ));

-- Admins can update any upgrade request
CREATE POLICY "Admins can update any upgrade request"
  ON public.upgrade_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  ));

-- Functions for managing upgrade requests

-- Function to check if user already has a pending upgrade request
CREATE OR REPLACE FUNCTION public.check_pending_upgrade_request(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_pending BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM upgrade_requests
    WHERE user_id = p_user_id
    AND status = 'pending'
  ) INTO has_pending;
  
  RETURN has_pending;
END;
$$;

-- Function to request a pro upgrade
CREATE OR REPLACE FUNCTION public.request_pro_upgrade(p_notes TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_pro BOOLEAN;
  v_has_pending BOOLEAN;
  v_result JSON;
BEGIN
  -- Check if user is already pro
  SELECT is_pro INTO v_is_pro
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_is_pro THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You are already a Pro user'
    );
  END IF;
  
  -- Check if user already has a pending request
  SELECT public.check_pending_upgrade_request(v_user_id) INTO v_has_pending;
  
  IF v_has_pending THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You already have a pending upgrade request'
    );
  END IF;
  
  -- Create new upgrade request
  INSERT INTO upgrade_requests (
    user_id,
    status,
    notes
  ) VALUES (
    v_user_id,
    'pending',
    p_notes
  )
  RETURNING id INTO v_result;
  
  -- Create notification for the user
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    read
  ) VALUES (
    v_user_id,
    'pro_upgrade_requested',
    'Pro Üyelik Talebiniz Alındı',
    'Pro üyelik talebiniz alındı ve inceleniyor. İnceleme sonucunda size bildirim yapılacaktır.',
    false
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Your Pro upgrade request has been submitted',
    'request_id', v_result
  );
END;
$$;

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(v_is_admin, false);
END;
$$;

-- Function to approve a pro upgrade request (admin only)
CREATE OR REPLACE FUNCTION public.approve_upgrade_request(p_request_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_request_exists BOOLEAN;
  v_user_id UUID;
BEGIN
  -- Check if user is an admin
  SELECT public.is_admin() INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only admins can approve upgrade requests'
    );
  END IF;
  
  -- Check if request exists and get user_id
  SELECT EXISTS (
    SELECT 1 FROM upgrade_requests WHERE id = p_request_id
  ), 
  (SELECT user_id FROM upgrade_requests WHERE id = p_request_id)
  INTO v_request_exists, v_user_id;
  
  IF NOT v_request_exists THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Upgrade request not found'
    );
  END IF;
  
  -- Update request status
  UPDATE upgrade_requests
  SET 
    status = 'approved',
    approved_by = v_admin_id,
    approved_at = now()
  WHERE id = p_request_id;
  
  -- Update user to pro
  UPDATE profiles
  SET is_pro = true
  WHERE id = v_user_id;
  
  -- Create notification for the user
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    read
  ) VALUES (
    v_user_id,
    'pro_upgrade_approved',
    'Pro Üyelik Talebiniz Onaylandı',
    'Pro üyelik talebiniz onaylandı. Artık tüm Pro özelliklere erişebilirsiniz.',
    false
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Upgrade request approved successfully'
  );
END;
$$;

-- Function to reject a pro upgrade request (admin only)
CREATE OR REPLACE FUNCTION public.reject_upgrade_request(p_request_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_request_exists BOOLEAN;
  v_user_id UUID;
BEGIN
  -- Check if user is an admin
  SELECT public.is_admin() INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only admins can reject upgrade requests'
    );
  END IF;
  
  -- Check if request exists and get user_id
  SELECT EXISTS (
    SELECT 1 FROM upgrade_requests WHERE id = p_request_id
  ), 
  (SELECT user_id FROM upgrade_requests WHERE id = p_request_id)
  INTO v_request_exists, v_user_id;
  
  IF NOT v_request_exists THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Upgrade request not found'
    );
  END IF;
  
  -- Update request status
  UPDATE upgrade_requests
  SET 
    status = 'rejected',
    approved_by = v_admin_id,
    approved_at = now(),
    notes = COALESCE(notes, '') || E'\n--- Admin Rejection ---\n' || COALESCE(p_reason, 'No reason provided')
  WHERE id = p_request_id;
  
  -- Create notification for the user
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    read
  ) VALUES (
    v_user_id,
    'pro_upgrade_rejected',
    'Pro Üyelik Talebiniz Reddedildi',
    'Pro üyelik talebiniz reddedildi. ' || COALESCE(p_reason, 'Daha fazla bilgi için lütfen iletişime geçin.'),
    false
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Upgrade request rejected successfully'
  );
END;
$$;

-- Function to cancel a pro upgrade request (user can cancel their own request)
CREATE OR REPLACE FUNCTION public.cancel_upgrade_request(p_request_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request_exists BOOLEAN;
  v_request_user_id UUID;
  v_request_status TEXT;
BEGIN
  -- Check if request exists and get user_id and status
  SELECT EXISTS (
    SELECT 1 FROM upgrade_requests WHERE id = p_request_id
  ), 
  (SELECT user_id FROM upgrade_requests WHERE id = p_request_id),
  (SELECT status FROM upgrade_requests WHERE id = p_request_id)
  INTO v_request_exists, v_request_user_id, v_request_status;
  
  IF NOT v_request_exists THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Upgrade request not found'
    );
  END IF;
  
  -- Check if the request belongs to the user
  IF v_request_user_id <> v_user_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You can only cancel your own upgrade requests'
    );
  END IF;
  
  -- Check if the request is still pending
  IF v_request_status <> 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only pending requests can be canceled'
    );
  END IF;
  
  -- Delete the request
  DELETE FROM upgrade_requests
  WHERE id = p_request_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Upgrade request canceled successfully'
  );
END;
$$;

-- Function to get upgrade requests for admin
CREATE OR REPLACE FUNCTION public.get_upgrade_requests(p_status TEXT DEFAULT NULL)
RETURNS SETOF upgrade_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is an admin
  IF NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'Only admins can view all upgrade requests';
  END IF;
  
  -- Return all requests or filter by status
  IF p_status IS NULL THEN
    RETURN QUERY
    SELECT *
    FROM upgrade_requests
    ORDER BY created_at DESC;
  ELSE
    RETURN QUERY
    SELECT *
    FROM upgrade_requests
    WHERE status = p_status
    ORDER BY created_at DESC;
  END IF;
END;
$$; 