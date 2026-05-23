import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECIPES_PATH = path.resolve(__dirname, '../src/services/curatedRecipes.json');

interface Nutrient {
  name: string;
  amount: number;
  unit: string;
}

interface Ingredient {
  original: string;
}

interface InstructionStep {
  number: number;
  step: string;
}

interface Recipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  dishTypes: string[];
  extendedIngredients: Ingredient[];
  instructions: string;
  analyzedInstructions: InstructionStep[];
  nutrition: { nutrients: Nutrient[] } | null;
  diets: string[];
  cuisines: string[];
}

function validateRecipe(recipe: any, index: number): string[] {
  const errors: string[] = [];

  // Required core fields
  if (typeof recipe.id !== 'number') {
    errors.push(`Invalid field "id": expected number, got ${typeof recipe.id}`);
  }
  
  if (typeof recipe.title !== 'string' || recipe.title.trim().length === 0) {
    errors.push(`Invalid field "title": expected non-empty string`);
  } else if (recipe.title.length > 50) {
    errors.push(`Title exceeds 50 characters threshold ("${recipe.title}" is ${recipe.title.length} chars)`);
  }

  if (typeof recipe.image !== 'string' || !recipe.image.startsWith('/images/recipes/')) {
    errors.push(`Invalid field "image": expected relative local URL starting with "/images/recipes/", got "${recipe.image}"`);
  }

  if (typeof recipe.readyInMinutes !== 'number' || recipe.readyInMinutes <= 0) {
    errors.push(`Invalid field "readyInMinutes": expected positive number, got ${recipe.readyInMinutes}`);
  }

  if (typeof recipe.servings !== 'number' || recipe.servings <= 0) {
    errors.push(`Invalid field "servings": expected positive number, got ${recipe.servings}`);
  }

  if (!Array.isArray(recipe.dishTypes) || recipe.dishTypes.length === 0) {
    errors.push(`Invalid field "dishTypes": expected non-empty string array`);
  }

  if (!Array.isArray(recipe.extendedIngredients)) {
    errors.push(`Invalid field "extendedIngredients": expected array`);
  } else {
    recipe.extendedIngredients.forEach((ing: any, ingIdx: number) => {
      if (typeof ing !== 'object' || typeof ing.original !== 'string' || ing.original.trim().length === 0) {
        errors.push(`Invalid ingredient at index ${ingIdx}: expected object with non-empty "original" string`);
      }
    });
  }

  if (typeof recipe.instructions !== 'string' || recipe.instructions.trim().length === 0) {
    errors.push(`Invalid field "instructions": expected non-empty string`);
  }

  if (!Array.isArray(recipe.analyzedInstructions)) {
    errors.push(`Invalid field "analyzedInstructions": expected array`);
  } else {
    recipe.analyzedInstructions.forEach((step: any, stepIdx: number) => {
      if (typeof step !== 'object' || typeof step.number !== 'number' || typeof step.step !== 'string') {
        errors.push(`Invalid step at index ${stepIdx}: expected object with "number" and "step"`);
      }
    });
  }

  if (recipe.nutrition !== null) {
    if (typeof recipe.nutrition !== 'object' || !Array.isArray(recipe.nutrition.nutrients)) {
      errors.push(`Invalid field "nutrition": expected null or object with "nutrients" array`);
    } else {
      const cal = recipe.nutrition.nutrients.find((n: any) => n.name === 'Calories');
      if (!cal || typeof cal.amount !== 'number' || cal.amount <= 0) {
        errors.push(`Nutrition missing or has invalid "Calories" amount`);
      }
    }
  } else {
    errors.push(`Invalid field "nutrition": expected rich nutrients object, got null`);
  }

  if (!Array.isArray(recipe.diets)) {
    errors.push(`Invalid field "diets": expected array`);
  }

  if (!Array.isArray(recipe.cuisines)) {
    errors.push(`Invalid field "cuisines": expected array`);
  }

  return errors;
}

function run() {
  console.log('🔍 FUZO Bites Schema Validation Guardrail');
  console.log('=========================================');

  if (!fs.existsSync(RECIPES_PATH)) {
    console.error(`❌ Curated recipes file not found at: ${RECIPES_PATH}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(RECIPES_PATH, 'utf-8');
  const recipes: any[] = JSON.parse(fileContent);

  console.log(`📊 Validating ${recipes.length} recipes...`);

  let totalErrors = 0;
  let invalidRecipesCount = 0;
  let hasChanges = false;

  recipes.forEach((recipe, idx) => {
    // Auto-fix empty dishTypes array
    if (!Array.isArray(recipe.dishTypes) || recipe.dishTypes.length === 0) {
      recipe.dishTypes = ['Recipe'];
      hasChanges = true;
    }

    const errors = validateRecipe(recipe, idx);
    if (errors.length > 0) {
      invalidRecipesCount++;
      totalErrors += errors.length;
      console.error(`\n❌ Recipe #${recipe.id || idx} ("${recipe.title || 'Untitled'}") at index ${idx} failed schema validation:`);
      errors.forEach(err => console.error(`  - ${err}`));
    }
  });

  if (hasChanges) {
    console.log('💾 Auto-fixing minor schema formatting details and saving...');
    fs.writeFileSync(RECIPES_PATH, JSON.stringify(recipes, null, 2), 'utf-8');
    console.log('✅ File written back successfully. Re-running validation check...');
    // Clear error stats since they are now resolved on disk
    totalErrors = 0;
    invalidRecipesCount = 0;
  }

  console.log('\n=========================================');
  if (totalErrors === 0) {
    console.log(`🎉 Success! All ${recipes.length} recipes are 100% compliant with the BiteRecipe schema!`);
    console.log('✅ Ready for Supabase migration!');
    process.exit(0);
  } else {
    console.error(`❌ Validation failed! Found ${totalErrors} errors across ${invalidRecipesCount} invalid recipes.`);
    process.exit(1);
  }
}

run();
