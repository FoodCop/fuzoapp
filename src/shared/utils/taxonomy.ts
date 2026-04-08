/**
 * Global Taxonomy for FUZO V2
 * Ensures database alignment and clean cataloging of UGC.
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

export const UGC_CATEGORIES = [
  'Recipe', 'Review', 'Hack', 'Tip', 'Spot', 'News', 'Trivia'
] as const;

export const UGC_VIBES = [
  'Chic', 'Street', 'Healthy', 'Comfort', 'Fancy', 'Budget', 'Hidden Gem', 'Date Night', 'Quick Bite'
] as const;

export type UgcCuisine = typeof UGC_CUISINES[number];
export type UgcDiet = typeof UGC_DIETS[number];
export type UgcCategory = typeof UGC_CATEGORIES[number];
export type UgcVibe = typeof UGC_VIBES[number];

/**
 * Normalization Engine
 * Strips redundant suffixes and maps synonyms to core taxonomy.
 */
export const normalizeTag = (tag: string): string => {
  if (!tag) return '';
  
  let normalized = tag.trim();
  
  // 1. Remove common suffixes like "Cuisine", "Food", "Cooking", "Style"
  const suffixes = [/ cuisine$/i, / food$/i, / cooking$/i, / style$/i, / dishes$/i];
  suffixes.forEach(pattern => {
    normalized = normalized.replace(pattern, '');
  });

  // 2. Case normalization (Title Case)
  normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();

  // 3. Synonym Mapping
  const synonymMap: Record<string, UgcCuisine | UgcCategory | string> = {
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
    'Recipe card': 'Recipe',
    'Kitchen hack': 'Hack',
    'Food hack': 'Hack',
    'Bite site': 'Spot',
    'Restaurant': 'Spot',
  };

  if (synonymMap[normalized]) {
    return synonymMap[normalized];
  }

  return normalized;
};
