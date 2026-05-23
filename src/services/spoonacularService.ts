/**
 * ============================================================================
 * EXTERNAL RECIPE SERVICE — Curated Local Database Engine (Offline)
 * ============================================================================
 * 
 * This service replaces the live Spoonacular API proxy with a highly optimized,
 * synchronous search and query engine running entirely in-memory over our
 * curated recipes database of 1,251 high-fidelity entries.
 * 
 * Core Capabilities (All Client-side & Instant):
 * 1. Semantic Search: Case-insensitive matching over title, cuisine, and diets.
 * 2. Recipe Intel: Instant retrieval of ingredients, steps, and nutrition macros.
 * 3. Discovery AI: Weighted similarity mapping and random seed generation.
 */

import curatedRecipes from './curatedRecipes.json';

/**
 * SECTION: Domain Parameter Types
 */
interface SearchRecipesParams {
  query?: string;
  diet?: string;
  type?: string;
  cuisine?: string;
  maxReadyTime?: number;
  number?: number;
  offset?: number;
}

interface CleanRecipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  dishTypes: string[];
  extendedIngredients: { original: string }[];
  instructions: string;
  analyzedInstructions: { number: number; step: string }[];
  nutrition: { nutrients: { name: string; amount: number; unit: string }[] } | null;
  diets: string[];
  cuisines: string[];
}

export const SpoonacularService = {
  /**
   * SECTION: Recipe Discovery Methods
   * Searches locally over the curated in-memory recipes list.
   */
  async searchRecipes(params: SearchRecipesParams) {
    try {
      const query = params.query?.trim().toLowerCase() || '';
      const diet = params.diet?.trim().toLowerCase() || '';
      const cuisine = params.cuisine?.trim().toLowerCase() || '';
      const maxReadyTime = params.maxReadyTime || null;
      const number = params.number || 12;
      const offset = params.offset || 0;

      let filtered = curatedRecipes as unknown as CleanRecipe[];

      // 1. Query matching (case-insensitive over title)
      if (query) {
        filtered = filtered.filter(r => r.title.toLowerCase().includes(query));
      }

      // 2. Diet matching (case-insensitive over diets array)
      if (diet) {
        filtered = filtered.filter(r => 
          r.diets.some(d => d.toLowerCase() === diet)
        );
      }

      // 3. Cuisine matching (case-insensitive over cuisines array)
      if (cuisine) {
        filtered = filtered.filter(r => 
          r.cuisines.some(c => c.toLowerCase() === cuisine || c.toLowerCase().includes(cuisine))
        );
      }

      // 4. Max ready time matching
      if (maxReadyTime) {
        filtered = filtered.filter(r => r.readyInMinutes <= maxReadyTime);
      }

      const totalResults = filtered.length;
      const results = filtered.slice(offset, offset + number);

      return {
        success: true,
        data: {
          results,
          offset,
          number,
          totalResults,
        },
      };
    } catch (error) {
      console.error('Local searchRecipes error:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * SECTION: Recipe Metadata Retrieval
   * Directly retrieves recipe from the local database by ID.
   */
  async getRecipeInformation(id: number, _includeNutrition = true) {
    try {
      const recipe = (curatedRecipes as unknown as CleanRecipe[]).find(
        r => String(r.id) === String(id)
      );
      if (!recipe) {
        return { success: false, error: `Recipe with ID ${id} not found locally.` };
      }
      return { success: true, data: recipe };
    } catch (error) {
      console.error('Local getRecipeInformation error:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * SECTION: Discovery AI Methods
   * Random selection from the in-memory pool matching tags.
   */
  async getRandomRecipes(number = 10, tags?: string) {
    try {
      let pool = curatedRecipes as unknown as CleanRecipe[];
      if (tags) {
        const tagList = tags.split(',').map(t => t.trim().toLowerCase());
        pool = pool.filter(r => 
          tagList.some(tag => 
            r.diets.some(d => d.toLowerCase() === tag) ||
            r.cuisines.some(c => c.toLowerCase() === tag) ||
            r.dishTypes.some(dt => dt.toLowerCase() === tag)
          )
        );
      }

      if (pool.length === 0) {
        pool = curatedRecipes as unknown as CleanRecipe[];
      }

      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, number);

      return {
        success: true,
        data: {
          recipes: selected,
        },
      };
    } catch (error) {
      console.error('Local getRandomRecipes error:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * SECTION: Similarity AI Methods
   * Finds similar recipes by matching cuisines and dish types.
   */
  async getSimilarRecipes(id: number, number = 4) {
    try {
      const target = (curatedRecipes as unknown as CleanRecipe[]).find(r => String(r.id) === String(id));
      if (!target) {
        const shuffled = [...curatedRecipes].sort(() => 0.5 - Math.random());
        return { success: true, data: shuffled.slice(0, number) };
      }

      const others = (curatedRecipes as unknown as CleanRecipe[]).filter(r => String(r.id) !== String(id));
      
      const scored = others.map(r => {
        const sharedCuisines = r.cuisines.filter(c => target.cuisines.includes(c)).length;
        const sharedDishTypes = r.dishTypes.filter(d => target.dishTypes.includes(d)).length;
        const score = (sharedCuisines * 2) + sharedDishTypes;
        return { recipe: r, score };
      });

      const sorted = scored.sort((a, b) => b.score - a.score);
      const selected = sorted.slice(0, number).map(s => s.recipe);

      return { success: true, data: selected };
    } catch (error) {
      console.error('Local getSimilarRecipes error:', error);
      return { success: false, error: (error as Error).message };
    }
  },
};

export default SpoonacularService;
