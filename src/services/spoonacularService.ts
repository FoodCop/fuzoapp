/**
 * ============================================================================
 * EXTERNAL RECIPE SERVICE — Spoonacular Proxy Orchestration
 * ============================================================================
 * 
 * This service provides a typed interface to the Spoonacular API, routed 
 * through a localized Supabase Edge Function (`make-server-...`) to keep 
 * API keys secure.
 * 
 * Core Capabilities:
 * 1. Semantic Search: Complex filtering by diet, cuisine, and ready time.
 * 2. Recipe Intel: Fetches detailed macros, ingredients, and instructions.
 * 3. Discovery AI: Generates similar and random recipes to populate the 
 *    Discovery Feed when local content is low.
 */

import axios from 'axios';

/**
 * SECTION: Environment Sanitization Utilities
 */
const cleanEnv = (value: string | undefined) => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  const withoutLeading = (trimmed.startsWith('"') || trimmed.startsWith("'")) ? trimmed.slice(1) : trimmed;
  return (withoutLeading.endsWith('"') || withoutLeading.endsWith("'")) ? withoutLeading.slice(0, -1) : withoutLeading;
};

const SUPABASE_URL = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_ANON_KEY = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

// Match main app endpoint strategy (Proxied through Edge Function)
const SPOONACULAR_PROXY_URL = `${SUPABASE_URL}/functions/v1/make-server-5976446e`;

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

export const SpoonacularService = {
  /**
   * SECTION: Recipe Discovery Methods
   * Core methods for populating the Feed and Search results.
   */
  async searchRecipes(params: SearchRecipesParams) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { success: false, error: 'Supabase env vars missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' };
    }

    try {
      const res = await axios.post(
        `${SPOONACULAR_PROXY_URL}/spoonacular/recipes/search`,
        {
          ...params,
          number: params.number || 12,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          timeout: 10000,
        }
      );

      return { success: true, data: res.data };
    } catch (error) {
      console.error('Spoonacular searchRecipes error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return { success: false, error: 'Invalid API key. Please check your Spoonacular API key.' };
        } else if (error.response?.status === 402) {
          return { success: false, error: 'API quota exceeded. Please check your Spoonacular plan.' };
        } else if (error.response?.data?.error) {
          return { success: false, error: error.response.data.error };
        }
      }
      
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * SECTION: Recipe Metadata Retrieval
   * Fetches the granular details (Nutrition, Ingredients) for a specific recipe.
   */
  async getRecipeInformation(id: number, includeNutrition = true) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { success: false, error: 'Supabase env vars missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' };
    }

    try {
      const res = await axios.post(
        `${SPOONACULAR_PROXY_URL}/spoonacular/recipes/${id}`,
        { includeNutrition },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          timeout: 10000,
        }
      );

      return { success: true, data: res.data };
    } catch (error) {
      console.error('Spoonacular getRecipeInformation error:', error);
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        return { success: false, error: error.response.data.error };
      }
      return { success: false, error: (error as Error).message };
    }
  },

  async getRandomRecipes(number = 10, tags?: string) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { success: false, error: 'Supabase env vars missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' };
    }

    try {
      const res = await axios.post(
        `${SPOONACULAR_PROXY_URL}/spoonacular/recipes/random`,
        { number, tags },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          timeout: 10000,
        }
      );

      return { success: true, data: res.data };
    } catch (error) {
      console.error('Spoonacular getRandomRecipes error:', error);
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        return { success: false, error: error.response.data.error };
      }
      return { success: false, error: (error as Error).message };
    }
  },

  async getSimilarRecipes(id: number, number = 4) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { success: false, error: 'Supabase env vars missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' };
    }

    try {
      const res = await axios.post(
        `${SPOONACULAR_PROXY_URL}/spoonacular/recipes/${id}/similar`,
        { number },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          timeout: 10000,
        }
      );

      return { success: true, data: res.data };
    } catch (error) {
      console.error('Spoonacular getSimilarRecipes error:', error);
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        return { success: false, error: error.response.data.error };
      }
      return { success: false, error: (error as Error).message };
    }
  },
};

export default SpoonacularService;
