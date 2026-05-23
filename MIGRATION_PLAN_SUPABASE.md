# 🚀 FUZO Recipe Engine: Supabase Migration & Title Shortening Guide

This document outlines the multi-phase plan to optimize recipe names, align data with frontend schemas, and set up a robust, scalable pipeline to upload our local curated recipes and downloaded images to Supabase (Database + Storage).

---

## 📅 Summary of the Migration Plan

### Phase 1: Recipe Title Shortening & Aesthetics
We will optimize all recipe titles exceeding **50 characters** (currently 125 recipes) to ensure they render beautifully and premium in our grid card layouts.
* **Mechanism**: We will run an automated script (`scripts/shortenRecipeTitles.ts`) that leverages Gemini AI (`gemini-2.5-flash`) to compress titles into appetizing, short gourmand names (e.g. *"Pan-Seared Maine Diver Scallops"*).
* **Command**: 
  ```bash
  npx tsx scripts/shortenRecipeTitles.ts
  ```

### Phase 2: Client Schema Validation
Before pushing any data to the cloud, we will run a strict validator to verify that all 1,251+ recipes in `curatedRecipes.json` perfectly match the TypeScript definition of `BiteRecipe` in the frontend code.
* **Mechanism**: A guardrail script (`scripts/validateBitesSchema.ts`) will inspect every record's types, nested arrays, and nutrient macros.
* **Command**:
  ```bash
  npx tsx scripts/validateBitesSchema.ts
  ```

### Phase 3: Supabase Database Migration
We will create a structured SQL table `public.recipes` (or `public.bites_recipes`) on Supabase to store and serve the recipe dataset in the future.
* **SQL Structure**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.recipes (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    image TEXT NOT NULL,
    ready_in_minutes INTEGER NOT NULL DEFAULT 20,
    servings INTEGER NOT NULL DEFAULT 2,
    dish_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    extended_ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
    instructions TEXT NOT NULL,
    analyzed_instructions JSONB DEFAULT '[]'::jsonb,
    nutrition JSONB DEFAULT '{}'::jsonb,
    diets TEXT[] DEFAULT ARRAY[]::TEXT[],
    cuisines TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  
  -- Enable Row Level Security (RLS)
  ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
  
  -- Policies
  CREATE POLICY "Anyone can read recipes" ON public.recipes FOR SELECT USING (true);
  ```

### Phase 4: Supabase Image Storage & Data Upload
To ensure that images render reliably on all client devices, we will host our locally downloaded recipe JPEGs on Supabase Storage.
* **Mechanism**: We will execute a migration script (`scripts/uploadRecipesToSupabase.ts`) that will:
  1. Initialize/connect to a public Supabase Storage Bucket named `recipe-images`.
  2. Upload all locally downloaded JPEGs in `public/images/recipes/` to the storage bucket.
  3. Map each recipe's `"image"` URL to its public Supabase Storage CDN URL.
  4. Perform a bulk UPSERT of all recipe records into the `public.recipes` table.
* **Command**:
  ```bash
  npx tsx scripts/uploadRecipesToSupabase.ts
  ```

---

## 🔒 Post-Migration Steps (Spoonacular Decoupling Completion)
Once this migration is finished and the DB is fully live:
1. We will update `SpoonacularService.ts` to query the Supabase `recipes` table rather than the local JSON file (which can then be purged from the frontend bundle to save ~4.9MB of static chunk weight!).
2. We can safely cancel all Spoonacular premium API subscriptions, as Fuzo will be 100% cloud-autonomous and decoupled!
