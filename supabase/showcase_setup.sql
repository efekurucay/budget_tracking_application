-- Showcase Setup
-- This script creates the necessary tables and security policies for showcase feature

-- Create showcase table
CREATE TABLE IF NOT EXISTS public.showcase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  badge_id UUID REFERENCES public.badges(id),
  goal_id UUID REFERENCES public.goals(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_showcase_user_id ON public.showcase(user_id);
CREATE INDEX IF NOT EXISTS idx_showcase_badge_id ON public.showcase(badge_id);
CREATE INDEX IF NOT EXISTS idx_showcase_goal_id ON public.showcase(goal_id);
CREATE INDEX IF NOT EXISTS idx_showcase_created_at ON public.showcase(created_at);

-- Enable Row Level Security
ALTER TABLE public.showcase ENABLE ROW LEVEL SECURITY;

-- Clear existing policies
DROP POLICY IF EXISTS "Users can view all showcase items" ON public.showcase;
DROP POLICY IF EXISTS "Users can create their own showcase items" ON public.showcase;
DROP POLICY IF EXISTS "Users can update their own showcase items" ON public.showcase;
DROP POLICY IF EXISTS "Users can delete their own showcase items" ON public.showcase;

-- Anyone can view all showcase items
CREATE POLICY "Users can view all showcase items"
  ON public.showcase FOR SELECT
  USING (true);

-- Pro users can create their own showcase items
CREATE POLICY "Users can create their own showcase items"
  ON public.showcase FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_pro = true
    )
  );

-- Users can update their own showcase items
CREATE POLICY "Users can update their own showcase items"
  ON public.showcase FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own showcase items
CREATE POLICY "Users can delete their own showcase items"
  ON public.showcase FOR DELETE
  USING (auth.uid() = user_id);

-- Create the showcase:badges foreign key relationship
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'showcase_badge_id_fkey'
  ) THEN
    ALTER TABLE public.showcase
    ADD CONSTRAINT showcase_badge_id_fkey
    FOREIGN KEY (badge_id) REFERENCES public.badges(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create the showcase:goals foreign key relationship
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'showcase_goal_id_fkey'
  ) THEN
    ALTER TABLE public.showcase
    ADD CONSTRAINT showcase_goal_id_fkey
    FOREIGN KEY (goal_id) REFERENCES public.goals(id)
    ON DELETE SET NULL;
  END IF;
END $$; 