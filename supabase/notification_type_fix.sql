-- Notifications tablosundaki tip kısıtlama sorunu için düzeltme
-- Bu script, Pro üyelik talebi sırasında oluşan bildirim hatalarını düzeltir

-- Önce mevcut kısıtlamaları kontrol edelim (bu yalnızca bilgi amaçlıdır, çalıştırıldığında sonuç döndürür)
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con 
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'notifications' 
AND con.conname = 'notifications_type_check';

-- notifications tablosu için kısıtlamayı kaldır
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Pro üyelik bildirimi için yeni tip değerini içeren güncellenmiş kısıtlama
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'info', 
    'warning', 
    'success', 
    'error', 
    'new_badge', 
    'goal_completed', 
    'pro_upgrade_requested', 
    'pro_upgrade_approved', 
    'pro_upgrade_rejected', 
    'group_invite', 
    'group_join'
));

-- request_pro_upgrade fonksiyonunu güncelle
-- mevcut bildirimlerde kullanılan bir tür kullanacağız
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
  
  -- Create notification for the user (info tipini kullanıyoruz)
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    read
  ) VALUES (
    v_user_id,
    'info',  -- 'pro_upgrade_requested' yerine 'info' kullanıyoruz (eski değeri: 'pro_upgrade_requested')
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