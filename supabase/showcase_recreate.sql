-- Mevcut showcase tablosunu sil (varsa)
DROP TABLE IF EXISTS public.showcase;

-- Showcase tablosunu yeniden oluştur
CREATE TABLE public.showcase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  badge_id UUID,
  goal_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexleri ekle
CREATE INDEX idx_showcase_user_id ON public.showcase(user_id);
CREATE INDEX idx_showcase_created_at ON public.showcase(created_at);

-- Row Level Security aktif et
ALTER TABLE public.showcase ENABLE ROW LEVEL SECURITY;

-- Politikaları oluştur 
CREATE POLICY "Herkes showcase itemları görebilir" 
  ON public.showcase FOR SELECT USING (true);

CREATE POLICY "Pro kullanıcılar kendi showcase itemlarını oluşturabilir" 
  ON public.showcase FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_pro = true)
  );

CREATE POLICY "Kullanıcılar kendi showcase itemlarını düzenleyebilir" 
  ON public.showcase FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Kullanıcılar kendi showcase itemlarını silebilir" 
  ON public.showcase FOR DELETE USING (auth.uid() = user_id);

-- Test için basit bir veri ekle
INSERT INTO public.showcase (user_id, content, created_at)
SELECT 
  auth.uid(), 
  'Bu bir test showcase gönderisidir. Sistem çalışıyor!', 
  now()
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = auth.uid()
); 