# Developer Guide: Bites Studio & Gallery Ready Reckoner

This guide serves as a technical reference for the **Bites Studio** (the AI-powered recipe creation wizard) and the **Bites Gallery** (the high-fidelity recipe discovery and filter engine).

---

## 🏗️ Technical Root
All logic and UI for the Bites feature are modularized within `src/features/bites/`.

* **Main Entry Point**: [BitesView.tsx](file:///k:/H/DRIVE/Quantum/Climb/APPS/FUZO_V2/src/features/bites/components/BitesView.tsx)
* **Data Source**: Supabase `public.recipes` table (cloud-first, 1,251+ entries)
* **Supabase Client**: [supabaseClient.ts](file:///k:/H/DRIVE/Quantum/Climb/APPS/FUZO_V2/src/services/supabaseClient.ts)
* **Normalizer & Helpers**: [bitesHelpers.ts](file:///k:/H/DRIVE/Quantum/Climb/APPS/FUZO_V2/src/features/bites/lib/bitesHelpers.ts)
* **Types**: [bites.ts](file:///k:/H/DRIVE/Quantum/Climb/APPS/FUZO_V2/src/features/bites/types/bites.ts)
* **Fallback Recipes**: `src/features/bites/constants/fallbackRecipes.ts` (used only when Supabase is unreachable)
* **Shared AI Helpers**: `src/shared/lib/studioHelpers.ts`
* **Taxonomy & Tags**: `src/shared/utils/taxonomy.ts`

> [!IMPORTANT]
> **SpoonacularService is deprecated.** The file `src/services/spoonacularService.ts` and the local `curatedRecipes.json` are legacy artifacts. All recipe data is now fetched directly from the Supabase `recipes` table. Do not add new logic to SpoonacularService.

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

The **Bites Gallery** is a cloud-first recipe explorer that queries the Supabase `recipes` table in real-time.

### 1. Supabase-Powered Search (`useBitesFeed` hook)

All search and filtering is performed **server-side** via Supabase PostgREST queries. There is no client-side re-filtering of results.

The `fetchBites` function inside the `useBitesFeed` hook constructs a dynamic query:

```typescript
let query = supabase.from('recipes').select('*', { count: 'exact' });

// Title + Dish Type search (see below)
// Diet filter:   query.contains('diets', [activeDiet])
// Cuisine filter: query.contains('cuisines', [activeCuisine])
// Pagination:    query.range(from, to)
```

### 2. Meal Type / Dish Type Search

The search bar supports searching by **meal type** in addition to recipe titles. When a user types a query like "Breakfast", "Lunch", or "Dinner", the system:

1. **Tokenizes** the query into individual words
2. **Matches** each word against a curated list of known dish types from the database
3. **Constructs** a Supabase `.or()` query that combines title matching with `dish_types` array overlap

**Known Dish Types** (from `curatedRecipes.json`):
```
Morning meal, Brunch, Beverage, Breakfast, Drink, Lunch, Main course,
Main dish, Dinner, Side dish, Snack, Soup, Salad, Appetizer, Dessert,
Antipasti, Starter, Fingerfood
```

**How it works in code:**
```typescript
const queryWords = effectiveQuery.toLowerCase().split(/\s+/);
const matchingDishTypes = KNOWN_DISH_TYPES.filter(dt =>
  queryWords.some(word => dt.toLowerCase().includes(word))
);

if (matchingDishTypes.length > 0) {
  // Searches BOTH title and dish_types array
  query = query.or(`title.ilike."*${effectiveQuery}*",dish_types.ov.${dishTypeString}`);
} else {
  // Falls back to title-only search
  query = query.ilike('title', `*${effectiveQuery}*`);
}
```

> [!NOTE]
> PostgREST in the browser requires `*` wildcards (not `%`) for `ilike` patterns inside `.or()` strings, because `%` gets URL-encoded to `%25`. The `.ilike()` method handles this automatically, but raw `.or()` strings need `*`.

### 3. Premium 12-Item Grid Pagination
* **Page State**: Connected `activePage` and `totalResults` state inside the `useBitesFeed` hook.
* **Automatic Resets**: Active page resets to `0` whenever a new search query, diet filter chip, or cuisine filter chip changes.
* **Server-Side Pagination**: Uses Supabase `.range(from, to)` for efficient offset-based pagination:
  ```typescript
  const from = activePage * 12;
  const to = from + 11;
  const { data, count, error } = await query.range(from, to);
  ```

### 4. Recipe Card Design
* **Full-image poster layout** with `aspect-[4/5]` ratio
* **Gradient overlay** from bottom for text legibility
* **Calorie badge** (top-right) using `PieChart` icon with yellow glow
* **Prep time badge** (below calories) using `Clock` icon
* **Title** overlaid at the bottom in bold white text
* **Dish type tags** displayed as translucent glassmorphism chips below the title

### 5. Share Modal
The share modal (`ShareModal` in `index.tsx`) displays a clean contact list:
* Full-width rows with left-aligned names and avatars
* Thin light grey `border-b` separator between contacts
* No paperplane/send icons — just a green checkmark after sharing
* No @email handles shown — names only

---

## 💾 Supabase Cloud Infrastructure

### 1. Database Schema: `public.recipes`
The cloud database schema mirrors the `BiteRecipe` TypeScript type:
* **Array Columns**: `dish_types`, `diets`, `cuisines` are PostgreSQL text arrays for efficient overlap queries
* **JSONB Columns**: `extended_ingredients`, `analyzed_instructions`, and `nutrition` preserve structural hierarchy
* **Optimized GIN Indexes**: Created on array and JSONB columns for fast filtering
* **Row-Level Security (RLS)**: Public select access; update/insert requires authenticated admin privilege
* **Migration**: `supabase/migrations/033_create_recipes_table.sql`, `034_recreate_recipes.sql`

### 2. Storage Bucket: `recipe-images`
* Recipe images hosted in a public Supabase Storage bucket (`recipe-images`)
* Database `image` URLs point directly to the public CDN storage paths
* **Upload Script**: `scripts/uploadRecipesToSupabase.ts`

### 3. Title Length Optimization
* All recipe titles exceeding 50 characters were shortened to under 40 characters using Gemini AI (with deterministic rules-based fallbacks) for card grid alignment
* **Script**: `scripts/shortenRecipeTitles.ts`

### 4. Data Normalization
The `normalizeRecipeList()` function in `bitesHelpers.ts` handles both snake_case (Supabase) and camelCase (legacy) field names:
```typescript
readyInMinutes: recipe.readyInMinutes || recipe.ready_in_minutes || 20,
dishTypes: recipe.dishTypes || recipe.dish_types || ['Recipe'],
```

---

## 🛠️ Developer Modifications Guide

### Adding a New Cuisine or Diet Tag
Update `BITE_CUISINES` or `BITE_DIETS` in `src/features/bites/constants/filters.ts` to see changes reflected in the search filter chips.

### Adding a New Meal Type / Dish Type to Search
Add the new dish type string to the `KNOWN_DISH_TYPES` array inside `fetchBites` in `BitesView.tsx`. Ensure the value matches exactly what is stored in the `dish_types` column of the `recipes` table (case-sensitive matching against the database).

### Fallback Behavior
If Supabase is unreachable (e.g. no config, network error), the catch block loads `BITE_FALLBACK_RECIPES` from `src/features/bites/constants/fallbackRecipes.ts` and displays an error banner.

---

> [!TIP]
> **Data Integrity**: Every recipe in the Supabase database contains a fully populated `"nutrition"` JSONB object, enabling error-free dynamic lookups for key macros (`Calories`, `Protein`, `Fat`, `Carbs`).
