-- Profiles tablosu üzerinde herkesin okuma yapabilmesine izin veren politika
-- Önce varsa mevcut public_profiles politikasını kaldırıyoruz
DROP POLICY IF EXISTS "public_profiles" ON public.profiles;

-- Yeni politikayı ekliyoruz - Tüm kullanıcılar tüm profilleri okuyabilir
CREATE POLICY "public_profiles"
ON public.profiles 
FOR SELECT 
USING (true);

-- Bu politika aşağıdakilere izin verir:
-- 1. Tüm kullanıcılar (kimliği doğrulanmış veya doğrulanmamış) 
-- 2. Tüm profil kayıtlarını okuyabilir (SELECT yapabilir)
-- 3. Ancak düzenleme (UPDATE), silme (DELETE) veya ekleme (INSERT) yapamaz 