-- Migration 024: Add youtube_url to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

COMMENT ON COLUMN public.users.youtube_url IS 'External YouTube channel URL or handle.';
