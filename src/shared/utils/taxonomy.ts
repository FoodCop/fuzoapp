/**
 * ============================================================================
 * SHARED CULINARY ONTOLOGY — Global Taxonomy
 * ============================================================================
 * 
 * This module defines the strict hierarchical tagging system used across 
 * FUZO V2. It ensures that user-generated content (UGC), AI-generated 
 * recipes, and Google Places data are all mapped to a unified set of 
 * Cuisines, Diets, and Vibes.
 * 
 * Data Source: src/shared/data/fuzoTaxonomy.json
 */

import taxonomyData from '../data/fuzoTaxonomy.json';

/**
 * SECTION: Domain Categories & Enumerations
 * Strict constants representing the platform's primary filterable entities.
 */

// We cast the imported JSON arrays to readonly arrays to preserve the `as const` types for consumers
export const UGC_CUISINES = taxonomyData.cuisines.tags as unknown as readonly string[];
export const UGC_DIETS = taxonomyData.diets.tags as unknown as readonly string[];
export const UGC_MEAL_TYPES = taxonomyData.mealTypes.tags as unknown as readonly string[];
export const UGC_FOOD_CATEGORIES = taxonomyData.foodCategories.tags as unknown as readonly string[];
export const UGC_VIBES = taxonomyData.vibes.tags as unknown as readonly string[];
export const UGC_FEATURES = taxonomyData.features.tags as unknown as readonly string[];
export const UGC_PRICE_RANGES = taxonomyData.priceRanges.tags as unknown as readonly string[];
export const UGC_CATEGORIES = taxonomyData.contentCategories.tags as unknown as readonly string[];

export type UgcCuisine = string; // Simplified for runtime dynamic JSON
export type UgcDiet = string;
export type UgcMealType = string;
export type UgcFoodCategory = string;
export type UgcVibe = string;
export type UgcFeature = string;
export type UgcPriceRange = string;
export type UgcCategory = string;

/**
 * SECTION: Hybrid Tagging Mapping
 * Logic: Maps common descriptive keywords (often found in AI descriptions 
 * or Place reviews) to strict taxonomy tags.
 */
export const TAXONOMY_KEYWORD_MAP: Record<string, string> = {
  // Lowercase keys from all synonyms in the registry for AI matching
  ...Object.fromEntries(Object.entries(taxonomyData.cuisines.synonyms).map(([k, v]) => [k.toLowerCase(), v])),
  ...Object.fromEntries(Object.entries(taxonomyData.mealTypes.synonyms).map(([k, v]) => [k.toLowerCase(), v])),
  ...Object.fromEntries(Object.entries(taxonomyData.foodCategories.synonyms).map(([k, v]) => [k.toLowerCase(), v])),
  ...Object.fromEntries(Object.entries(taxonomyData.diets.synonyms).map(([k, v]) => [k.toLowerCase(), v])),
  ...Object.fromEntries(Object.entries(taxonomyData.vibes.synonyms).map(([k, v]) => [k.toLowerCase(), v])),
  ...Object.fromEntries(Object.entries(taxonomyData.features.synonyms).map(([k, v]) => [k.toLowerCase(), v])),
  ...Object.fromEntries(Object.entries(taxonomyData.priceRanges.synonyms).map(([k, v]) => [k.toLowerCase(), v])),
  ...Object.fromEntries(Object.entries(taxonomyData.contentCategories.synonyms).map(([k, v]) => [k.toLowerCase(), v])),
};

/**
 * Helper to get a flat list of all food-related searchable tags and their synonyms.
 * Useful for building dynamic search queries.
 */
export const getSearchableDishTypes = (): string[] => {
  return [
    ...taxonomyData.mealTypes.tags,
    ...Object.keys(taxonomyData.mealTypes.synonyms),
    ...taxonomyData.foodCategories.tags,
    ...Object.keys(taxonomyData.foodCategories.synonyms),
  ];
};

/**
 * SECTION: Normalization Engine
 * Logic: 
 * 1. Strips redundant suffixes (e.g., "Italian Cuisine" -> "Italian").
 * 2. Maps synonyms and specific dishes to parent categories.
 * 3. Enforces Title Case for consistency.
 */
export const normalizeTag = (tag: string): string => {
  if (!tag) return '';

  let normalized = tag.trim();

  // 1. Remove common suffixes
  const suffixes = [/ cuisine$/i, / food$/i, / cooking$/i, / style$/i, / dishes$/i];
  suffixes.forEach(pattern => {
    normalized = normalized.replace(pattern, '');
  });

  // 2. Case normalization (Title Case) if not price range
  if (!UGC_PRICE_RANGES.includes(normalized)) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  }

  // 3. Synonym/Heuristic Mapping
  const synonymMap: Record<string, string> = {
    ...taxonomyData.cuisines.synonyms,
    ...taxonomyData.mealTypes.synonyms,
    ...taxonomyData.foodCategories.synonyms,
    ...taxonomyData.diets.synonyms,
    ...taxonomyData.vibes.synonyms,
    ...taxonomyData.features.synonyms,
    ...taxonomyData.priceRanges.synonyms,
    ...taxonomyData.contentCategories.synonyms,
  };

  // Check exact case first, then fallback to lowercase check against keyword map
  if (synonymMap[normalized]) {
    return synonymMap[normalized];
  }

  const lowerNormalized = normalized.toLowerCase();
  if (TAXONOMY_KEYWORD_MAP[lowerNormalized]) {
    return TAXONOMY_KEYWORD_MAP[lowerNormalized];
  }

  return normalized;
};
