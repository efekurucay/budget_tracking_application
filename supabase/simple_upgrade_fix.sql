-- Basitleştirilmiş Pro Üyelik Talebi Çözümü
-- Bildirim kısmını tamamen kaldırarak sadece talep oluşturan fonksiyon

-- request_pro_upgrade fonksiyonunu basitleştirilmiş haliyle yeniden oluştur
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
  -- Pro kullanıcı kontrolü
  SELECT is_pro INTO v_is_pro
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_is_pro THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You are already a Pro user'
    );
  END IF;
  
  -- Bekleyen talep kontrolü
  SELECT public.check_pending_upgrade_request(v_user_id) INTO v_has_pending;
  
  IF v_has_pending THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You already have a pending upgrade request'
    );
  END IF;
  
  -- Yeni talep oluştur
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
  
  -- BİLDİRİM EKLEME KISMI ÇIKARILDI
  -- Bildirim oluşturma işlemi sorun çıkardığından tamamen atlanıyor
  
  RETURN json_build_object(
    'success', true,
    'message', 'Your Pro upgrade request has been submitted',
    'request_id', v_request_id
  );
END;
$$; 