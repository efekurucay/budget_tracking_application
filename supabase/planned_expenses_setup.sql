-- planned_expenses tablosunu oluştur
-- Bu tablo, kullanıcıların gelecekteki planlanmış veya tekrarlayan giderlerini takip etmek için kullanılır.
CREATE TABLE public.planned_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description text NOT NULL,
    amount numeric(10, 2) NOT NULL CHECK (amount > 0),
    due_date date NOT NULL, -- Giderin planlanan ödeme tarihi
    category_id uuid NULL REFERENCES public.budget_categories(id) ON DELETE SET NULL, -- İlişkili bütçe kategorisi (opsiyonel, silinirse NULL olur)
    is_recurring boolean DEFAULT false NOT NULL, -- Giderin tekrarlayan olup olmadığını belirtir (örn: kira, abonelik)
    recurring_interval text NULL CHECK (is_recurring = false OR recurring_interval IS NOT NULL), -- Tekrarlama aralığı (örn: 'monthly', 'yearly', 'weekly'). is_recurring true ise zorunlu.
    status text DEFAULT 'planned'::text NOT NULL CHECK (status IN ('planned', 'paid', 'skipped', 'cancelled')), -- Giderin durumu
    notes text NULL, -- Giderle ilgili ek notlar
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tablo ve sütunlar için yorumlar
COMMENT ON TABLE public.planned_expenses IS 'Kullanıcıların gelecekteki planlanmış veya tekrarlayan giderlerini takip eder.';
COMMENT ON COLUMN public.planned_expenses.due_date IS 'Giderin planlanan ödeme tarihi veya tekrarlayan giderin bir sonraki ödeme tarihi.';
COMMENT ON COLUMN public.planned_expenses.category_id IS 'Giderin ilişkilendirildiği bütçe kategorisi.';
COMMENT ON COLUMN public.planned_expenses.is_recurring IS 'Giderin tek seferlik mi yoksa tekrarlayan mı olduğunu belirtir.';
COMMENT ON COLUMN public.planned_expenses.recurring_interval IS 'Tekrarlama sıklığı (örn: monthly, yearly, weekly). Sadece is_recurring true ise geçerlidir.';
COMMENT ON COLUMN public.planned_expenses.status IS 'Giderin mevcut durumu (planned, paid, skipped, cancelled).';
COMMENT ON COLUMN public.planned_expenses.notes IS 'Giderle ilgili ek kullanıcı notları.';

-- Performans için indeksler
CREATE INDEX idx_planned_expenses_user_id ON public.planned_expenses(user_id);
CREATE INDEX idx_planned_expenses_due_date ON public.planned_expenses(due_date);
CREATE INDEX idx_planned_expenses_status ON public.planned_expenses(status);

-- RLS (Row Level Security) Politikalarını Etkinleştir
ALTER TABLE public.planned_expenses ENABLE ROW LEVEL SECURITY;

-- Kullanıcıların kendi planlanan giderlerini görmesine izin ver
CREATE POLICY "Allow users to view their own planned expenses"
ON public.planned_expenses
FOR SELECT
USING (auth.uid() = user_id);

-- Kullanıcıların kendi planlanan giderlerini eklemesine izin ver
CREATE POLICY "Allow users to insert their own planned expenses"
ON public.planned_expenses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Kullanıcıların kendi planlanan giderlerini güncellemesine izin ver
CREATE POLICY "Allow users to update their own planned expenses"
ON public.planned_expenses
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Kullanıcıların kendi planlanan giderlerini silmesine izin ver
CREATE POLICY "Allow users to delete their own planned expenses"
ON public.planned_expenses
FOR DELETE
USING (auth.uid() = user_id);

-- handle_updated_at fonksiyonu zaten varsa oluşturma (diğer setup dosyalarında olabilir)
-- Bu fonksiyon, bir satır güncellendiğinde updated_at sütununu otomatik olarak ayarlar.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = timezone('utc', now());
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

-- planned_expenses tablosu için updated_at trigger'ı oluştur
-- Trigger zaten varsa hata vermemesi için kontrol ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_planned_expenses_updated' AND tgrelid = 'public.planned_expenses'::regclass
  ) THEN
    CREATE TRIGGER on_planned_expenses_updated
    BEFORE UPDATE ON public.planned_expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Bildirim: Kurulum tamamlandı.
SELECT 'planned_expenses table setup complete.';
