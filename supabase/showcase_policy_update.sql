-- Showcase tablosunda paylaşım politikasını güncelleme
-- Önce varsa mevcut paylaşım politikasını kaldırıyoruz
DROP POLICY IF EXISTS "Users can create their own showcase items" ON public.showcase;

-- Yeni politika: Tüm kullanıcılar kendi paylaşımlarını oluşturabilir (Pro hesap kontrolü kaldırıldı)
CREATE POLICY "Users can create their own showcase items"
  ON public.showcase FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Bu politika şunları sağlar:
-- 1. Tüm kullanıcılar (premium veya ücretsiz) kendi showcase öğelerini oluşturabilir
-- 2. Kullanıcılar hala sadece kendi adlarına paylaşım yapabilir (auth.uid() = user_id kontrolü)
-- 3. Pro kullanıcı (is_pro = true) kontrolü kaldırıldı 