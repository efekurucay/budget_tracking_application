-- AI Conversations Setup
-- This script creates the necessary tables and security policies for AI Assistant conversations

-- Create ai_conversations table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_messages table
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  visual_data JSONB -- For storing visual elements like progress bars, charts, links, suggestions
);

-- Enable Row Level Security
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.ai_conversations;

CREATE POLICY "Users can view their own conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for ai_messages
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.ai_messages;
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON public.ai_messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.ai_messages;
DROP POLICY IF EXISTS "Users can delete messages from their conversations" ON public.ai_messages;

CREATE POLICY "Users can view messages from their conversations"
  ON public.ai_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
    AND ai_conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert messages to their conversations"
  ON public.ai_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
    AND ai_conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can update messages in their conversations"
  ON public.ai_messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
    AND ai_conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete messages from their conversations"
  ON public.ai_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
    AND ai_conversations.user_id = auth.uid()
  ));

-- Function to get conversations for a user
CREATE OR REPLACE FUNCTION public.get_ai_conversations(user_id_param UUID)
RETURNS SETOF public.ai_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.ai_conversations
  WHERE user_id = user_id_param
  ORDER BY updated_at DESC;
END;
$$;

-- Function to get messages for a conversation
CREATE OR REPLACE FUNCTION public.get_ai_messages(conversation_id_param UUID, user_id_param UUID)
RETURNS SETOF public.ai_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user owns the conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE id = conversation_id_param AND user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'User does not own this conversation';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.ai_messages
  WHERE conversation_id = conversation_id_param
  ORDER BY timestamp ASC;
END;
$$; 