-- Migration 029: Fix group_member RLS recursion
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
CREATE POLICY "Users can view members of their groups"
  ON public.group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.group_members gm 
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid()
    )
  );
