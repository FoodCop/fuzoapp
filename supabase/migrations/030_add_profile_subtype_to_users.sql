-- Migration 030: Add profile_subtype to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS profile_subtype TEXT;

COMMENT ON COLUMN public.users.profile_subtype IS 'Detailed category or specialization for the user profile (e.g. Executive Chef, Food Explorer).';
