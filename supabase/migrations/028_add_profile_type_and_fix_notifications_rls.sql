-- Migration 028: Add profile_type and fix notifications RLS
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'Chef';

-- Fix notifications RLS
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());
