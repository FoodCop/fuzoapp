-- Fix infinite recursion in group_members RLS

-- Create a security definer function to check group membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = check_group_id AND user_id = auth.uid()
  );
$$;

-- Drop the broken policies
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
DROP POLICY IF EXISTS "Admins can manage group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Users can view messages in their groups" ON public.group_messages;
DROP POLICY IF EXISTS "Users can send messages to their groups" ON public.group_messages;

-- Re-create the policies using the new function
CREATE POLICY "Users can view members of their groups"
  ON public.group_members
  FOR SELECT
  USING (
    user_id = auth.uid() OR public.is_group_member(group_id)
  );

CREATE POLICY "Admins can manage group members"
  ON public.group_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.role = 'admin'
    )
  );
-- Note: 'Admins can manage group members' might still recurse. Let's fix that too:

CREATE OR REPLACE FUNCTION public.is_group_admin(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = check_group_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Admins can manage group members" ON public.group_members;
CREATE POLICY "Admins can manage group members"
  ON public.group_members
  FOR ALL
  USING ( public.is_group_admin(group_id) );

CREATE POLICY "Users can view groups they are members of"
  ON public.groups
  FOR SELECT
  USING ( public.is_group_member(id) );

CREATE POLICY "Users can view messages in their groups"
  ON public.group_messages
  FOR SELECT
  USING ( public.is_group_member(group_id) );

CREATE POLICY "Users can send messages to their groups"
  ON public.group_messages
  FOR INSERT
  WITH CHECK ( public.is_group_member(group_id) );
