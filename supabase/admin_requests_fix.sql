-- Admin panelinde yükseltme taleplerini görüntüleme hatası için düzeltme

-- get_upgrade_requests fonksiyonunu yeniden oluştur
CREATE OR REPLACE FUNCTION public.get_upgrade_requests(p_status TEXT DEFAULT NULL)
RETURNS SETOF public.upgrade_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  -- Admin kontrolü
  SELECT COALESCE(is_admin, false) INTO v_is_admin
  FROM profiles
  WHERE id = v_user_id;
  
  -- Sadece adminler tüm talepleri görebilir
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Yetki hatası: Sadece admin kullanıcılar talepleri görüntüleyebilir';
  END IF;
  
  -- p_status parametresi belirtilmişse ona göre filtrele
  IF p_status IS NOT NULL THEN
    RETURN QUERY
    SELECT *
    FROM upgrade_requests
    WHERE status = p_status
    ORDER BY created_at DESC;
  ELSE
    -- Tüm talepleri getir
    RETURN QUERY
    SELECT *
    FROM upgrade_requests
    ORDER BY created_at DESC;
  END IF;
  
  RETURN;
END;
$$;

-- İlişkili veri getirmek için yeni bir view oluşturalım (daha zengin veri için)
DROP VIEW IF EXISTS admin_upgrade_requests_view;

CREATE VIEW admin_upgrade_requests_view AS
SELECT 
  ur.id,
  ur.user_id,
  ur.status,
  ur.notes,
  ur.created_at,
  ur.approved_by,
  ur.approved_at,
  p.first_name,
  p.last_name,
  p.email,
  COALESCE(p.is_pro, false) as is_already_pro
FROM 
  upgrade_requests ur
LEFT JOIN
  profiles p ON ur.user_id = p.id;

-- Admin için yükseltme talepleri görüntüleme fonksiyonu (view kullanarak)
CREATE OR REPLACE FUNCTION public.get_upgrade_requests_detailed(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  is_already_pro BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  -- Admin kontrolü
  SELECT COALESCE(is_admin, false) INTO v_is_admin
  FROM profiles
  WHERE id = v_user_id;
  
  -- Sadece adminler tüm talepleri görebilir
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Yetki hatası: Sadece admin kullanıcılar talepleri görüntüleyebilir';
  END IF;
  
  -- p_status parametresi belirtilmişse ona göre filtrele
  IF p_status IS NOT NULL THEN
    RETURN QUERY
    SELECT *
    FROM admin_upgrade_requests_view
    WHERE status = p_status
    ORDER BY created_at DESC;
  ELSE
    -- Tüm talepleri getir
    RETURN QUERY
    SELECT *
    FROM admin_upgrade_requests_view
    ORDER BY created_at DESC;
  END IF;
  
  RETURN;
END;
$$; 