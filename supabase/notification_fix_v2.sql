-- Notifications tablosundaki tip kısıtlama sorununu güvenli şekilde düzeltme
-- Bu script, mevcut verileri bozmadan notification kısıtlamasını güncelleyecek

-- 1. Öncelikle mevcut tüm notification tiplerini bulalım
DO $$
DECLARE
    existing_types TEXT[];
    existing_constraint TEXT;
    new_constraint TEXT;
BEGIN
    -- Mevcut kısıtlamanın ifadesini al
    SELECT pg_get_constraintdef(con.oid) INTO existing_constraint
    FROM pg_constraint con 
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'notifications' 
    AND con.conname = 'notifications_type_check';
    
    RAISE NOTICE 'Mevcut kısıtlama: %', existing_constraint;
    
    -- Tablodaki mevcut tüm tipleri al (distinct)
    SELECT ARRAY(
        SELECT DISTINCT type 
        FROM notifications
    ) INTO existing_types;
    
    RAISE NOTICE 'Mevcut tipler: %', existing_types;
    
    -- 2. Notification fonksiyonunu daha güvenli bir şekilde güncelleyelim
    -- request_pro_upgrade fonksiyonunu güncelle (info tipini kullanarak)
    CREATE OR REPLACE FUNCTION public.request_pro_upgrade(p_notes TEXT DEFAULT NULL)
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
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
      
      -- Güvenli bildirim oluştur (info tipini kullanarak)
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        read
      ) VALUES (
        v_user_id,
        'info',  -- Güvenli tip kullanıyoruz
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
    $func$;
END $$; 