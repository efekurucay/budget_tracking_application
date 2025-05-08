-- Grup islemleri tablosu olustur
CREATE TABLE IF NOT EXISTS public.group_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date DATE NOT NULL,
  is_expense BOOLEAN NOT NULL DEFAULT TRUE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grup işlem katılımcıları tablosu
CREATE TABLE IF NOT EXISTS public.group_transaction_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.group_transactions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, member_id)
);

-- Temel RLS politikalarini ekle
ALTER TABLE public.group_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_transaction_members ENABLE ROW LEVEL SECURITY;

-- Var olan politikaları temizle
DROP POLICY IF EXISTS "Grup uyeleri grup islemlerini gorebilir" ON public.group_transactions;
DROP POLICY IF EXISTS "Grup uyeleri islem katilimcilarini gorebilir" ON public.group_transaction_members;
DROP POLICY IF EXISTS "Grup uyeleri islem ekleyebilir" ON public.group_transactions;
DROP POLICY IF EXISTS "Grup uyeleri islem katilimcilarini ekleyebilir" ON public.group_transaction_members;
DROP POLICY IF EXISTS "Grup uyeleri kendi islemlerini guncelleyebilir" ON public.group_transactions;
DROP POLICY IF EXISTS "Kullanicilar kendi islemlerini veya sahipler tum islemleri silebilir" ON public.group_transactions;
DROP POLICY IF EXISTS "İşlem sahibi veya sahipler katilimcilarini silebilir" ON public.group_transaction_members;

-- Grup uyeleri kendi gruplarinin islemlerini gorebilir
CREATE POLICY "Grup uyeleri grup islemlerini gorebilir" 
  ON public.group_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_transactions.group_id
    AND group_members.user_id = auth.uid()
  ));

-- Grup uyeleri işlem katılımcılarını görebilir
CREATE POLICY "Grup uyeleri islem katilimcilarini gorebilir" 
  ON public.group_transaction_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_transactions
    JOIN public.group_members 
    ON group_members.group_id = group_transactions.group_id
    WHERE group_transactions.id = group_transaction_members.transaction_id
    AND group_members.user_id = auth.uid()
  ));

-- Grup uyeleri kendi gruplarina islem ekleyebilir
CREATE POLICY "Grup uyeleri islem ekleyebilir" 
  ON public.group_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_transactions.group_id
      AND group_members.user_id = auth.uid()
    )
    AND auth.uid() = user_id
  );

-- Grup uyeleri islem katilimcilarini ekleyebilir
CREATE POLICY "Grup uyeleri islem katilimcilarini ekleyebilir" 
  ON public.group_transaction_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_transactions
      JOIN public.group_members 
      ON group_members.group_id = group_transactions.group_id
      WHERE group_transactions.id = group_transaction_members.transaction_id
      AND group_members.user_id = auth.uid()
      AND (group_transactions.user_id = auth.uid() OR group_members.role = 'owner')
    )
  );

-- Grup uyeleri kendi ekledikleri islemleri guncelleyebilir
CREATE POLICY "Grup uyeleri kendi islemlerini guncelleyebilir" 
  ON public.group_transactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Grup uyeleri kendi ekledikleri islemleri silebilir, grup sahipleri tum islemleri silebilir
CREATE POLICY "Kullanicilar kendi islemlerini veya sahipler tum islemleri silebilir" 
  ON public.group_transactions FOR DELETE
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_transactions.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'owner'
    )
  );

-- İşlem ekleyen kullanıcı veya grup sahipleri katılımcıları silebilir
CREATE POLICY "İşlem sahibi veya sahipler katilimcilarini silebilir" 
  ON public.group_transaction_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_transactions 
      JOIN public.group_members 
      ON group_members.group_id = group_transactions.group_id
      WHERE group_transactions.id = group_transaction_members.transaction_id
      AND (
        group_transactions.user_id = auth.uid() OR 
        (group_members.user_id = auth.uid() AND group_members.role = 'owner')
      )
    )
  );

-- RPC Fonksiyonlari
-- Var olan fonksiyonları temizle
DROP FUNCTION IF EXISTS public.get_group_transactions(UUID);
DROP FUNCTION IF EXISTS public.get_transaction_members(UUID);
DROP FUNCTION IF EXISTS public.add_group_transaction(UUID, UUID, NUMERIC, TEXT, DATE, BOOLEAN, TEXT, UUID[]);

-- Grup islemlerini getiren fonksiyon
CREATE OR REPLACE FUNCTION public.get_group_transactions(group_id_param UUID)
RETURNS SETOF public.group_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cagiran kullanicinin bu gruba erisim hakki olup olmadigini kontrol et
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_id_param
    AND group_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Bu gruba erisim izniniz yok';
  END IF;

  -- Islemleri don
  RETURN QUERY
  SELECT * FROM public.group_transactions
  WHERE group_id = group_id_param
  ORDER BY date DESC, created_at DESC;
END;
$$;

-- İşlemin katılımcılarını getiren fonksiyon
CREATE OR REPLACE FUNCTION public.get_transaction_members(transaction_id_param UUID)
RETURNS TABLE(
  id UUID, 
  transaction_id UUID, 
  member_id UUID, 
  created_at TIMESTAMPTZ,
  first_name TEXT,
  last_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Çağıran kullanıcının bu işleme erişim hakkı olup olmadığını kontrol et
  IF NOT EXISTS (
    SELECT 1 
    FROM public.group_transactions gt
    JOIN public.group_members gm ON gm.group_id = gt.group_id
    WHERE gt.id = transaction_id_param
    AND gm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Bu işleme erişim izniniz yok';
  END IF;

  -- Katılımcıları ve profil bilgilerini dön
  RETURN QUERY
  SELECT 
    gtm.id, 
    gtm.transaction_id, 
    gtm.member_id, 
    gtm.created_at,
    p.first_name,
    p.last_name
  FROM 
    public.group_transaction_members gtm
  LEFT JOIN
    public.profiles p ON p.id = gtm.member_id
  WHERE 
    gtm.transaction_id = transaction_id_param;
END;
$$;

-- Grup islemi eklemek icin guvenli fonksiyon
CREATE OR REPLACE FUNCTION public.add_group_transaction(
  p_group_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_date DATE,
  p_is_expense BOOLEAN DEFAULT TRUE,
  p_category TEXT DEFAULT NULL,
  p_member_ids UUID[] DEFAULT NULL
)
RETURNS public.group_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_transaction public.group_transactions;
  v_member_id UUID;
BEGIN
  -- Kullanicinin kendisi icin bir islem olusturdugunu dogrula
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Sadece kendi adiniza islem ekleyebilirsiniz';
  END IF;

  -- Kullanicinin gruba uye oldugunu kontrol et
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = p_group_id
    AND group_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Bu gruba uye olmaniz gerekiyor';
  END IF;

  -- Tutari dogrula
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Islem tutari sifirdan buyuk olmalidir';
  END IF;

  -- Islemi ekle
  INSERT INTO public.group_transactions (
    group_id,
    user_id,
    amount,
    description,
    date,
    is_expense,
    category
  ) VALUES (
    p_group_id,
    p_user_id,
    p_amount,
    p_description,
    p_date,
    p_is_expense,
    p_category
  )
  RETURNING * INTO v_new_transaction;
  
  -- Eğer katılımcılar belirtilmişse onları ekle
  IF p_member_ids IS NOT NULL AND array_length(p_member_ids, 1) > 0 THEN
    FOREACH v_member_id IN ARRAY p_member_ids
    LOOP
      -- Kullanıcının grup üyesi olduğunu doğrula
      IF NOT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_members.group_id = p_group_id
        AND group_members.user_id = v_member_id
      ) THEN
        CONTINUE; -- Grup üyesi değilse atla
      END IF;
    
      -- Katılımcıyı ekle
      INSERT INTO public.group_transaction_members (
        transaction_id,
        member_id
      ) VALUES (
        v_new_transaction.id,
        v_member_id
      )
      ON CONFLICT (transaction_id, member_id) DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_new_transaction;
END;
$$;