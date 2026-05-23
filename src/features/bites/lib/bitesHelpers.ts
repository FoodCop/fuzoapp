import { BITE_FALLBACK_RECIPES } from '../constants/fallbackRecipes';
import type { BiteActionItem, BiteNutrient, BiteRecipe, BiteRecipeInput } from '../types/bites';

export const normalizeRecipeList = (resultList: BiteRecipeInput[]): BiteRecipe[] => {
  return resultList.map((recipe, index) => ({
    id: recipe.id || index + 1,
    title: recipe.title || `Recipe ${index + 1}`,
    image: recipe.image || BITE_FALLBACK_RECIPES[index % BITE_FALLBACK_RECIPES.length].image,
    readyInMinutes: recipe.readyInMinutes || recipe.ready_in_minutes || 20,
    servings: recipe.servings || 2,
    dishTypes: recipe.dishTypes || recipe.dish_types || ['Recipe'],
    extendedIngredients: recipe.extendedIngredients || recipe.extended_ingredients || [],
    instructions: recipe.instructions || recipe.summary || 'No instructions available.',
    analyzedInstructions: (() => {
      const steps = recipe.analyzedInstructions || recipe.analyzed_instructions;
      if (!steps) return [];
      if (!Array.isArray(steps)) return [];
      return (steps as any[]).flatMap(set => {
        if (!set) return [];
        if (typeof set === 'object' && 'steps' in set) {
          return set.steps || [];
        }
        return [set];
      });
    })(),
    nutrition: recipe.nutrition?.nutrients ? { nutrients: recipe.nutrition.nutrients } : null,
    diets: recipe.diets || [],
    cuisines: recipe.cuisines || [],
  }));
};

export const getBiteKeyNutrients = (recipe: BiteRecipe): BiteNutrient[] => {
  if (!recipe.nutrition?.nutrients) return [];
  const macroNames = new Set(['Calories', 'Protein', 'Fat', 'Carbohydrates', 'Sugar']);
  return recipe.nutrition.nutrients.filter((nutrient) => macroNames.has(nutrient.name)).slice(0, 4);
};

const toBiteActionItem = (recipe: BiteRecipe): BiteActionItem => ({
  id: `recipe-${recipe.id}`,
  name: recipe.title,
  cat: recipe.dishTypes?.[0] || 'Recipe',
  img: recipe.image,
});

export const createBiteRecipeActions = (
  onSave: (item: BiteActionItem) => void,
  onShareRequest: (item: BiteActionItem) => void,
) => ({
  handleSaveRecipe: (recipe: BiteRecipe) => {
    onSave(toBiteActionItem(recipe));
  },
  handleShareRecipe: (recipe: BiteRecipe) => {
    onShareRequest(toBiteActionItem(recipe));
  },
});
