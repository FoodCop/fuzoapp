export type BiteNutrient = {
  name: string;
  amount: number;
  unit: string;
};

export type BiteIngredient = {
  original: string;
};

export type BiteInstructionStep = {
  number: number;
  step: string;
};

export type BiteRecipe = {
  id: string | number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  dishTypes: string[];
  extendedIngredients: BiteIngredient[];
  instructions: string;
  analyzedInstructions?: BiteInstructionStep[];
  nutrition: { nutrients: BiteNutrient[] } | null;
};

export type BiteActionItem = {
  id: string;
  name: string;
  cat: string;
  img: string;
  metadata?: Record<string, unknown>;
};

export type BiteRecipeInput = {
  id?: string | number;
  title?: string;
  image?: string;
  readyInMinutes?: number;
  ready_in_minutes?: number;
  servings?: number;
  dishTypes?: string[];
  dish_types?: string[];
  extendedIngredients?: BiteIngredient[];
  extended_ingredients?: BiteIngredient[];
  instructions?: string;
  analyzedInstructions?: { name: string; steps: BiteInstructionStep[] }[];
  analyzed_instructions?: { name: string; steps: BiteInstructionStep[] }[];
  summary?: string;
  nutrition?: { nutrients?: BiteNutrient[] } | null;
};
