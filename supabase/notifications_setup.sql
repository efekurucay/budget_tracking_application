-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('goal', 'budget', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create a trigger to notify users about goals being achieved
CREATE OR REPLACE FUNCTION public.notify_goal_achieved()
RETURNS TRIGGER AS $$
BEGIN
    -- If the goal was updated and is now complete
    IF NEW.current_amount >= NEW.target_amount AND 
       (OLD.current_amount IS NULL OR OLD.current_amount < OLD.target_amount) THEN
        -- Create a notification
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message
        ) VALUES (
            NEW.user_id,
            'goal',
            'Goal Achieved!',
            'Congratulations! You have achieved your goal: ' || NEW.name
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the trigger to the goals table
DROP TRIGGER IF EXISTS goal_achieved_trigger ON public.goals;
CREATE TRIGGER goal_achieved_trigger
    AFTER UPDATE ON public.goals
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_goal_achieved();

-- Create a function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.notifications
    SET read = true
    WHERE user_id = auth.uid() AND read = false;
END;
$$;

-- Insert some sample notifications for testing
INSERT INTO public.notifications (user_id, type, title, message, read, created_at)
SELECT 
    auth.uid(),
    'system',
    'Welcome to G15 Finance Genius!',
    'We''re excited to help you manage your finances better. Take a moment to explore all the features!',
    false,
    now() - interval '3 days'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid());

INSERT INTO public.notifications (user_id, type, title, message, read, created_at)
SELECT 
    auth.uid(),
    'budget',
    'Budget Alert',
    'You have reached 80% of your Entertainment budget this month.',
    false,
    now() - interval '1 day'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()); 