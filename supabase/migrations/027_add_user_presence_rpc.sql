-- Migration 027: Add user presence RPC
CREATE OR REPLACE FUNCTION public.update_user_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET last_seen = now(), is_online = true
  WHERE id = auth.uid();
END;
$$;
