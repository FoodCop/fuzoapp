/**
 * ============================================================================
 * METADATA EXTRACTION HELPERS — Content Normalization
 * ============================================================================
 * 
 * This module provides a set of defensive utility functions for extracting 
 * structured data from heterogeneous AI responses and loose object records. 
 * It ensures that the UI receives clean, type-safe values regardless of 
 * the source metadata's volatility.
 */

/**
 * SECTION: Extraction Logic
 * Defensive wrappers for various data types found in UGC or AI metadata.
 */
export const getMetadataRecord = (value: unknown): Record<string, unknown> | undefined => {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
};

export const getMetadataString = (metadata: Record<string, unknown> | undefined, ...keys: string[]) => {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
};

export const getMetadataStringArray = (metadata: Record<string, unknown> | undefined, ...keys: string[]) => {
  for (const key of keys) {
    const value = metadata?.[key];
    if (Array.isArray(value)) {
      const strings = value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
      if (strings.length > 0) {
        return strings;
      }
    }
  }
  return [] as string[];
};

export const getMetadataNumber = (metadata: Record<string, unknown> | undefined, ...keys: string[]) => {
  for (const key of keys) {
    const value = metadata?.[key];
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

/**
 * SECTION: Specialized Parsers
 * Logic for extracting domain-specific entities (e.g., Calories, Macronutrients).
 */
export const getNutritionRecord = (...sources: Array<Record<string, unknown> | undefined>) => {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    const calories = getMetadataNumber(source, 'calories');
    const protein = getMetadataNumber(source, 'protein');
    const fat = getMetadataNumber(source, 'fat');
    const carbs = getMetadataNumber(source, 'carbs');

    if ([calories, protein, fat, carbs].some((value) => value !== undefined)) {
      return { calories, protein, fat, carbs };
    }
  }

  return undefined;
};
