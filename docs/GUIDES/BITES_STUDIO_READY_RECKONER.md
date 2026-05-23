# Developer Guide: Bites Studio & Gallery Ready Reckoner

This guide serves as a technical reference for the **Bites Studio** (the AI-powered recipe creation wizard) and the **Bites Gallery** (the high-fidelity recipe discovery and filter engine).

---

## 🏗️ Technical Root
All logic and UI for the Bites feature are modularized within `src/features/bites/`.

* **Main Entry Point**: [BitesView.tsx](file:///k:/H/DRIVE/Quantum/Climb/APPS/FUZO_V2/src/features/bites/components/BitesView.tsx)
* **Local Recipe Service**: [spoonacularService.ts](file:///k:/H/DRIVE/Quantum/Climb/APPS/FUZO_V2/src/services/spoonacularService.ts)
* **Local JSON Database**: `curatedRecipes.json` (1,251 high-fidelity entries)
* **Shared AI Helpers**: `src/shared/lib/studioHelpers.ts`
* **Taxonomy & Tags**: `src/shared/utils/taxonomy.ts`

---

## 🧭 Multi-Step Studio Architecture

The **AI Recipe Studio** uses a standardized **6-step wizard** orchestrated by the `AIRecipeStudio` component:

| Step | Name         | Component Logic                                      |
|:----:|:-------------|:-----------------------------------------------------|
|  0   | **Visuals**  | `BitesSourceStep`: Optional culinary image upload    |
|  1   | **Identity** | `BitesIdentityStep`: Dish name + Cuisine mapping    |
|  2   | **Assembly** | `BitesStoryStep`: AI-guiding description & notes    |
|  3   | **Reveal**   | `NeuralReveal`: Immersive AI synthesis animation    |
|  4   | **Review**   | `BitesReviewStep`: Card preview & data verification |
|  5   | **Success**  | Final post-creation actions & feed syndication      |

### 🧠 Neural Generation Pipeline
Bites Studio leverages **Gemini 2.5 Flash** for structured data extraction.
* **Enforced JSON Schema**: The prompt requires strict validation for `title`, `readyInMinutes`, `servings`, `ingredients`, `instructions`, `nutrition` (calories, protein, fat, carbs), and `aiTag`.
* **Cuisines Mapping**: Categories are strictly mapped to `UGC_CUISINES` dynamically.

---

## 🌐 The Bites Gallery Discovery Engine

The **Bites Gallery** provides an immersive recipe explorer grid displaying the curated dataset of 1,251 recipes.

### 1. In-Memory Local Search (`SpoonacularService`)
* To ensure instant offline performance (under 1ms responses), searches, cuisines, diets, and max cook times are queried synchronously over `curatedRecipes.json` entirely on the client.
* Dynamic query params (`query`, `diet`, `cuisine`, `maxReadyTime`, `number`, `offset`) are fully supported.

### 2. Premium 12-Item Grid Pagination
* **Page State**: Connected `activePage` and `totalResults` state inside the `useBitesFeed` hook in `BitesView.tsx`.
* **Automatic Resets**: Active page resets to `0` whenever a new search query, diet filter chip, or cuisine filter chip changes to avoid empty list views.
* **Responsive Control Bar**: A custom glassmorphic pagination control bar is rendered at the bottom of the grid whenever `totalResults > 12`:
  ```typescript
  // Connected pagination offsets inside spoonacularService.ts
  const results = filtered.slice(offset, offset + number);
  ```

### 3. Calorie Count Badge (`PieChart`)
* Following premium visual guidelines, the recipe cards display the exact calorie count (e.g. `340 Kcal`) instead of prep time.
* Uses the dynamic `PieChart` icon with a custom yellow glow.
* Safely extracts calories from the recipe's nested nutrient metadata:
  ```typescript
  const cal = recipe.nutrition?.nutrients?.find((n) => n.name === 'Calories');
  const kcalDisplay = cal ? `${Math.round(cal.amount)} Kcal` : '0 Kcal';
  ```

---

## 💾 Supabase Cloud Migration Pipeline

To transition the app to the cloud, all **1,251 recipes** and their assets were migrated to Supabase. This process is documented in `MIGRATION_PLAN_SUPABASE.md`.

### 1. Title Length Optimization
* All recipe titles exceeding 50 characters were optimized to under 40 characters using Gemini AI (with deterministic rules-based fallbacks) for visually perfect alignment on standard card grid layouts.
* **Migration Script**: `scripts/shortenRecipeTitles.ts`

### 2. Database Schema: `public.recipes`
The cloud database schema mirrors the `BiteRecipe` TypeScript type:
* **JSONB Columns**: `extended_ingredients`, `analyzed_instructions`, and `nutrition` are mapped to JSONB datatype columns to preserve structural hierarchy.
* **Optimized GIN Indexes**: Created on JSONB columns for lightning-fast database filtering.
* **Row-Level Security (RLS)**: Public select access is allowed while update/insert requires authenticated admin privilege.

### 3. Storage Bucket: `recipe-images`
* Local recipe images were uploaded to a public Supabase Storage bucket (`recipe-images`).
* Database image URLs were dynamically rewritten to point directly to the public CDN storage bucket paths.
* **Migration Script**: `scripts/uploadRecipesToSupabase.ts`

---

## 🛠️ Developer Modifications Guide

### Adding a New Cuisine or Diet Tag
Update `BITE_CUISINES` or `BITE_DIETS` in `src/features/bites/constants/filters.ts` to see changes reflected in the search filter drawer.

### Switching Spoonacular Service to Cloud-First Mode
`SpoonacularService` currently operates over client-side `curatedRecipes.json`. To fetch recipes directly from the cloud `recipes` table, replace the synchronous JSON filter code inside `src/services/spoonacularService.ts` with a select query on the `recipes` table via the `supabaseClient`.

---

> [!TIP]
> **Data Integrity**: Every recipe in our offline database contains a fully populated `"nutrition"` array, enabling error-free dynamic lookups for key macros (`Calories`, `Protein`, `Fat`, `Carbs`).
