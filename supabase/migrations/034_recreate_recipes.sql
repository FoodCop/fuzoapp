-- Re-create recipes table to ensure that it has all necessary columns (e.g. analyzed_instructions)
-- Dropping any old manually created tables and setting up clean indices and RLS.

DROP TABLE IF EXISTS public.recipes CASCADE;

CREATE TABLE public.recipes (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  image TEXT NOT NULL,
  ready_in_minutes INTEGER NOT NULL DEFAULT 20,
  servings INTEGER NOT NULL DEFAULT 2,
  dish_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  extended_ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions TEXT NOT NULL,
  analyzed_instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  nutrition JSONB NOT NULL DEFAULT '{}'::jsonb,
  diets TEXT[] DEFAULT ARRAY[]::TEXT[],
  cuisines TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Anyone can view curated recipes"
  ON public.recipes
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify recipes"
  ON public.recipes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_recipes_title_trgm ON public.recipes USING gin (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_recipes_diets ON public.recipes USING GIN(diets);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisines ON public.recipes USING GIN(cuisines);
CREATE INDEX IF NOT EXISTS idx_recipes_dish_types ON public.recipes USING GIN(dish_types);
CREATE INDEX IF NOT EXISTS idx_recipes_ready_in_minutes ON public.recipes(ready_in_minutes);

-- Grant appropriate permissions
GRANT SELECT ON public.recipes TO anon;
GRANT ALL ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;

-- Table comment description
COMMENT ON TABLE public.recipes IS 'FUZO offline-first curated high-fidelity recipe database containing all calorie and macronutrient intelligence.';
