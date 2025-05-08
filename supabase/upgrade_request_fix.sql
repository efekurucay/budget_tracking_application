-- Pro üyelik talepleri için JSON format hatasını düzeltme
-- Bu script, Pro üyeliğe geçiş taleplerinde ortaya çıkan "invalid input syntax for type json" hatasını düzeltir

-- request_pro_upgrade fonksiyonunu güncelle
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
  v_request_id UUID;
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
  RETURNING id INTO v_request_id;
  
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
    'request_id', v_request_id
  );
END;
$$; 