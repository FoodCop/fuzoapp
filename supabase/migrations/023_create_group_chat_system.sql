-- Migration 023: Create Group Chat System

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Create group_messages table
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  shared_item JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id_created_at ON public.group_messages(group_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Policies for groups
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
CREATE POLICY "Users can view groups they are members of"
  ON public.groups
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
CREATE POLICY "Users can create groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policies for group_members
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
CREATE POLICY "Users can view members of their groups"
  ON public.group_members
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage group members" ON public.group_members;
CREATE POLICY "Admins can manage group members"
  ON public.group_members
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'));

-- Policies for group_messages
DROP POLICY IF EXISTS "Users can view messages in their groups" ON public.group_messages;
CREATE POLICY "Users can view messages in their groups"
  ON public.group_messages
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can send messages to their groups" ON public.group_messages;
CREATE POLICY "Users can send messages to their groups"
  ON public.group_messages
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));

-- Trigger to sync last_message_at for groups
CREATE OR REPLACE FUNCTION public.sync_group_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.groups
  SET last_message_at = NEW.created_at
  WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_group_last_message ON public.group_messages;
CREATE TRIGGER trg_sync_group_last_message
  AFTER INSERT ON public.group_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_group_last_message();

-- Enable Realtime for groups, group_members, and group_messages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'groups') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
  END IF;
END $$;
