-- Migration 025: Fix chat RLS recursion
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
CREATE POLICY "Users can view groups they are members of"
  ON public.groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.group_members 
      WHERE group_id = groups.id 
      AND user_id = auth.uid()
    )
  );

-- Fix member recursion
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
CREATE POLICY "Users can view members of their groups"
  ON public.group_members
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM public.group_members 
      WHERE group_id = group_members.group_id
    )
  );
