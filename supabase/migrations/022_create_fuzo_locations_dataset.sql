-- Migration 022: Create FUZO locations dataset table for Snap-generated map data

CREATE TABLE IF NOT EXISTS public.fuzo_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_snap_id TEXT,
  source_post_id UUID,
  location_name TEXT NOT NULL,
  restaurant_name TEXT,
  cuisine TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL,
  photos TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fuzo_locations_snap_unique UNIQUE (source_snap_id)
);

CREATE INDEX IF NOT EXISTS idx_fuzo_locations_created_at
  ON public.fuzo_locations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fuzo_locations_user_id
  ON public.fuzo_locations(user_id);

CREATE INDEX IF NOT EXISTS idx_fuzo_locations_lat_lng
  ON public.fuzo_locations(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_fuzo_locations_tags
  ON public.fuzo_locations USING GIN(tags);

ALTER TABLE public.fuzo_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view FUZO locations" ON public.fuzo_locations;
CREATE POLICY "Authenticated users can view FUZO locations"
  ON public.fuzo_locations
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own FUZO locations" ON public.fuzo_locations;
CREATE POLICY "Users can insert own FUZO locations"
  ON public.fuzo_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own FUZO locations" ON public.fuzo_locations;
CREATE POLICY "Users can update own FUZO locations"
  ON public.fuzo_locations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own FUZO locations" ON public.fuzo_locations;
CREATE POLICY "Users can delete own FUZO locations"
  ON public.fuzo_locations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_fuzo_locations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_fuzo_locations_updated_at ON public.fuzo_locations;
CREATE TRIGGER trg_set_fuzo_locations_updated_at
BEFORE UPDATE ON public.fuzo_locations
FOR EACH ROW
EXECUTE FUNCTION public.set_fuzo_locations_updated_at();
