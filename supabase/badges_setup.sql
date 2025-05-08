-- Badges Setup
-- Rozet sistemi için gerekli tablo ve fonksiyonları oluşturur

-- Mevcut badges tablosunu sil (varsa)
DROP TABLE IF EXISTS public.badges CASCADE;
DROP TABLE IF EXISTS public.user_badges CASCADE;

-- Rozetler tablosunu oluştur
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Lucide icon name veya özel ikon path
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  condition_type TEXT NOT NULL, -- transaction_count, goal_reached, login_streak, budget_creation vs.
  condition_value INTEGER NOT NULL, -- Koşul değeri (örn: 10 işlem, 5 gün login vs.)
  is_secret BOOLEAN NOT NULL DEFAULT false -- Sürpriz rozetler için
);

-- Kullanıcı rozetleri tablosunu oluştur
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_public BOOLEAN NOT NULL DEFAULT true, -- Showcase'de gösterilip gösterilmeyeceği
  UNIQUE(user_id, badge_id) -- Bir kullanıcı bir rozeti sadece bir kez kazanabilir
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_badges_condition_type ON public.badges(condition_type);

-- Row Level Security
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Politikalar
-- Herkes rozetleri görebilir (gizli rozetler hariç)
CREATE POLICY "Herkes rozetleri görebilir" 
  ON public.badges FOR SELECT
  USING (is_secret = false OR EXISTS (
    SELECT 1 FROM user_badges 
    WHERE user_badges.badge_id = badges.id 
    AND user_badges.user_id = auth.uid()
  ));

-- Kullanıcılar kendi rozetlerini görebilir
CREATE POLICY "Kullanıcılar kendi rozetlerini görebilir"
  ON public.user_badges FOR SELECT
  USING (user_id = auth.uid() OR (
    is_public = true AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = user_badges.user_id AND is_pro = true)
  ));

-- Örnek rozet verileri
INSERT INTO public.badges (name, description, icon, points, condition_type, condition_value, is_secret)
VALUES
  ('Başlangıç', 'İlk işleminizi eklediniz', 'Star', 5, 'transaction_count', 1, false),
  ('İşlem Uzmanı', '10 işlem eklediniz', 'Award', 10, 'transaction_count', 10, false),
  ('İşlem Kralı', '50 işlem eklediniz', 'Crown', 25, 'transaction_count', 50, false),
  ('İşlem Efsanesi', '100 işlem eklediniz', 'Trophy', 50, 'transaction_count', 100, false),
  ('Hedef Koyucu', 'İlk hedef oluşturdunuz', 'Target', 5, 'goal_count', 1, false),
  ('Hedef Takipçisi', '5 hedef oluşturdunuz', 'Flag', 15, 'goal_count', 5, false),
  ('İlk Bütçe', 'İlk bütçe kategorinizi oluşturdunuz', 'PieChart', 5, 'budget_count', 1, false),
  ('Bütçe Uzmanı', '5 bütçe kategorisi oluşturdunuz', 'BarChart2', 15, 'budget_count', 5, false),
  ('Tasarruf Başlangıcı', 'İlk tasarruf hedefi oluşturdunuz', 'PiggyBank', 10, 'saving_goal', 1, false),
  ('Hedef Tamamlayıcı', 'İlk hedefi tamamladınız', 'CheckCircle', 20, 'completed_goal', 1, false),
  ('Sosyal Finans', 'İlk grup oluşturdunuz', 'Users', 15, 'group_creation', 1, false),
  ('Doğru Yoldasınız', 'Uygulamayı 7 gün boyunca kullandınız', 'Calendar', 10, 'login_streak', 7, false),
  ('Finansal Bağımlı', 'Uygulamayı 30 gün boyunca kullandınız', 'CalendarCheck', 30, 'login_streak', 30, false),
  ('Gizli Kahraman', 'Özel bir başarı elde ettiniz', 'Sparkles', 100, 'secret_achievement', 1, true),
  ('Pro Kullanıcı', 'Pro üyeliğe geçiş yaptınız', 'Zap', 50, 'pro_subscription', 1, false);

-- Kullanıcı rozet kazanma fonksiyonu
CREATE OR REPLACE FUNCTION public.grant_badge(
  p_user_id UUID,
  p_badge_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_success BOOLEAN;
BEGIN
  -- Kullanıcı zaten bu rozete sahip mi kontrol et
  IF EXISTS (
    SELECT 1 FROM user_badges 
    WHERE user_id = p_user_id AND badge_id = p_badge_id
  ) THEN
    RETURN false; -- Zaten sahip
  END IF;
  
  -- Rozeti ver
  INSERT INTO user_badges (user_id, badge_id, earned_at)
  VALUES (p_user_id, p_badge_id, now());
  
  -- Kullanıcıya puan ekle
  UPDATE profiles
  SET points = COALESCE(points, 0) + (SELECT points FROM badges WHERE id = p_badge_id)
  WHERE id = p_user_id;
  
  -- Bildirim oluştur
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    read
  )
  SELECT
    p_user_id,
    'system',
    'Yeni Rozet Kazandınız: ' || badges.name,
    'Tebrikler! ' || badges.description || ' Puanlarınıza ' || badges.points || ' puan eklendi.',
    false
  FROM badges
  WHERE id = p_badge_id;
  
  RETURN true;
END;
$$;

-- Rozet kontrol fonksiyonu (tetikleyici)
CREATE OR REPLACE FUNCTION public.check_and_grant_badges(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  badge_id UUID;
  transaction_count INTEGER;
  goal_count INTEGER;
  completed_goal_count INTEGER;
  budget_count INTEGER;
  is_pro BOOLEAN;
  group_count INTEGER;
BEGIN
  -- Kullanıcı bilgilerini al
  SELECT 
    (SELECT COUNT(*) FROM transactions WHERE user_id = p_user_id),
    (SELECT COUNT(*) FROM goals WHERE user_id = p_user_id),
    (SELECT COUNT(*) FROM goals WHERE user_id = p_user_id AND completed_at IS NOT NULL),
    (SELECT COUNT(*) FROM budget_categories WHERE user_id = p_user_id),
    (SELECT profiles.is_pro FROM profiles WHERE id = p_user_id),
    (SELECT COUNT(*) FROM groups WHERE created_by = p_user_id)
  INTO 
    transaction_count, 
    goal_count, 
    completed_goal_count, 
    budget_count,
    is_pro,
    group_count;
  
  -- İşlem sayısı rozetleri
  FOR badge_id IN
    SELECT id FROM badges 
    WHERE condition_type = 'transaction_count' 
    AND condition_value <= transaction_count
  LOOP
    IF public.grant_badge(p_user_id, badge_id) THEN
      RETURN NEXT badge_id;
    END IF;
  END LOOP;
  
  -- Hedef sayısı rozetleri
  FOR badge_id IN
    SELECT id FROM badges 
    WHERE condition_type = 'goal_count' 
    AND condition_value <= goal_count
  LOOP
    IF public.grant_badge(p_user_id, badge_id) THEN
      RETURN NEXT badge_id;
    END IF;
  END LOOP;
  
  -- Tamamlanan hedef rozetleri
  FOR badge_id IN
    SELECT id FROM badges 
    WHERE condition_type = 'completed_goal' 
    AND condition_value <= completed_goal_count
  LOOP
    IF public.grant_badge(p_user_id, badge_id) THEN
      RETURN NEXT badge_id;
    END IF;
  END LOOP;
  
  -- Bütçe sayısı rozetleri
  FOR badge_id IN
    SELECT id FROM badges 
    WHERE condition_type = 'budget_count' 
    AND condition_value <= budget_count
  LOOP
    IF public.grant_badge(p_user_id, badge_id) THEN
      RETURN NEXT badge_id;
    END IF;
  END LOOP;
  
  -- Pro üyelik rozeti
  IF is_pro THEN
    FOR badge_id IN
      SELECT id FROM badges 
      WHERE condition_type = 'pro_subscription'
    LOOP
      IF public.grant_badge(p_user_id, badge_id) THEN
        RETURN NEXT badge_id;
      END IF;
    END LOOP;
  END IF;
  
  -- Grup oluşturma rozeti
  FOR badge_id IN
    SELECT id FROM badges 
    WHERE condition_type = 'group_creation' 
    AND condition_value <= group_count
  LOOP
    IF public.grant_badge(p_user_id, badge_id) THEN
      RETURN NEXT badge_id;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- İşlem Trigger'ı: Yeni işlem eklendiğinde rozet kontrolü
CREATE OR REPLACE FUNCTION public.transaction_badge_check() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.check_and_grant_badges(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER check_transaction_badges
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION public.transaction_badge_check();

-- Hedef Trigger'ı: Yeni hedef eklendiğinde veya tamamlandığında rozet kontrolü
CREATE OR REPLACE FUNCTION public.goal_badge_check() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.check_and_grant_badges(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER check_goal_badges
AFTER INSERT OR UPDATE OF completed_at ON goals
FOR EACH ROW
EXECUTE FUNCTION public.goal_badge_check();

-- Bütçe Kategori Trigger'ı: Yeni bütçe kategorisi eklendiğinde rozet kontrolü
CREATE OR REPLACE FUNCTION public.budget_badge_check() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.check_and_grant_badges(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER check_budget_badges
AFTER INSERT ON budget_categories
FOR EACH ROW
EXECUTE FUNCTION public.budget_badge_check();

-- Grup Trigger'ı: Yeni grup oluşturulduğunda rozet kontrolü
CREATE OR REPLACE FUNCTION public.group_badge_check() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    PERFORM public.check_and_grant_badges(NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER check_group_badges
AFTER INSERT ON groups
FOR EACH ROW
EXECUTE FUNCTION public.group_badge_check();

-- Pro üyelik Trigger'ı: Pro üyelik güncellendiğinde rozet kontrolü
CREATE OR REPLACE FUNCTION public.pro_badge_check() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_pro = true AND (OLD.is_pro IS NULL OR OLD.is_pro = false) THEN
    PERFORM public.check_and_grant_badges(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER check_pro_badges
AFTER UPDATE OF is_pro ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.pro_badge_check();

-- Mevcut kullanıcılar için rozet kontrolü çalıştır
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users
  LOOP
    PERFORM public.check_and_grant_badges(user_record.id);
  END LOOP;
END $$;

-- Opsiyonel: Gelecekte yapmak isterseniz
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('transaction', 'system', 'goal', 'budget', 'group', 'badge_earned')); 