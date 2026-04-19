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
 * Core Responsibilities:
 * 1. Schema Definition: Hard-coded constants for database-aligned tags.
 * 2. Normalization: Logic to strip suffixes and map synonyms (e.g., 'Tacos' -> 'Mexican').
 * 3. AI Bridge: Keyword mapping to help Gemini map free-text to taxonomy.
 */

/**
 * SECTION: Domain Categories & Enumerations
 * Strict constants representing the platform's primary filterable entities.
 */
export const UGC_CUISINES = [
  'Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian', 
  'Thai', 'French', 'Greek', 'Mediterranean', 'American', 
  'Middle Eastern', 'Korean', 'Vietnamese', 'Spanish', 
  'Brazilian', 'Turkish', 'Caribbean', 'Ethiopian', 'Fusion'
] as const;

export const UGC_DIETS = [
  'Vegetarian', 'Vegan', 'Gluten Free', 'Keto', 'Halal', 'Kosher', 'Paleo', 'Dairy Free'
] as const;

export const UGC_MEAL_TYPES = [
  'Breakfast', 'Lunch', 'Dinner', 'Brunch', 'Snack', 'Late Night'
] as const;

export const UGC_VIBES = [
  'Casual', 'Fine Dining', 'Cafe', 'Rooftop', 'Family-Friendly', 'Street Food', 'Romantic', 'Chill', 'Industrial'
] as const;

export const UGC_FEATURES = [
  'Outdoor Seating', 'Live Music', 'Pet-Friendly', 'WiFi', 'Bar', 'Valet Parking', 'Wheelchair Accessible'
] as const;

export const UGC_PRICE_RANGES = [
  '$', '$$', '$$$', '$$$$'
] as const;

export const UGC_CATEGORIES = [
  'Recipe', 'Review', 'Hack', 'Tip', 'Spot', 'News', 'Trivia'
] as const;

export type UgcCuisine = typeof UGC_CUISINES[number];
export type UgcDiet = typeof UGC_DIETS[number];
export type UgcMealType = typeof UGC_MEAL_TYPES[number];
export type UgcVibe = typeof UGC_VIBES[number];
export type UgcFeature = typeof UGC_FEATURES[number];
export type UgcPriceRange = typeof UGC_PRICE_RANGES[number];
export type UgcCategory = typeof UGC_CATEGORIES[number];

/**
 * SECTION: Hybrid Tagging Mapping
 * Logic: Maps common descriptive keywords (often found in AI descriptions 
 * or Place reviews) to strict taxonomy tags.
 */
export const TAXONOMY_KEYWORD_MAP: Record<string, string> = {
  'vegan': 'Vegan',
  'plant-based': 'Vegan',
  'vegetarian': 'Vegetarian',
  'halal': 'Halal',
  'kosher': 'Kosher',
  'rooftop': 'Rooftop',
  'outdoor': 'Outdoor Seating',
  'garden': 'Outdoor Seating',
  'music': 'Live Music',
  'band': 'Live Music',
  'dog': 'Pet-Friendly',
  'pet': 'Pet-Friendly',
  'wifi': 'WiFi',
  'internet': 'WiFi',
  'fancy': 'Fine Dining',
  'premium': 'Fine Dining',
  'street': 'Street Food',
  'cheap': '$',
  'affordable': '$',
  'expensive': '$$$',
  'cozy': 'Chill',
  'relaxed': 'Chill',
  'brunch': 'Brunch',
  'breakfast': 'Breakfast',
  'lunch': 'Lunch',
  'dinner': 'Dinner'
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
  if (!UGC_PRICE_RANGES.includes(normalized as any)) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  }

  // 3. Synonym/Heuristic Mapping
  const synonymMap: Record<string, string> = {
    'Chinatown': 'Chinese',
    'Cantonese': 'Chinese',
    'Szechuan': 'Chinese',
    'Sushi': 'Japanese',
    'Ramen': 'Japanese',
    'Taco': 'Mexican',
    'Tacos': 'Mexican',
    'Pasta': 'Italian',
    'Pizza': 'Italian',
    'Burger': 'American',
    'Burgers': 'American',
    'Diner': 'American',
    'Middle-east': 'Middle Eastern',
    'Arab': 'Middle Eastern',
    'Kitchen hack': 'Hack',
    'Food hack': 'Hack',
    'Restaurant': 'Spot',
    ...TAXONOMY_KEYWORD_MAP
  };

  if (synonymMap[normalized]) {
    return synonymMap[normalized];
  }

  return normalized;
};
