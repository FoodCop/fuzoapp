import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_KEY = process.env.VITE_SPOONACULAR_API_KEY || process.env.SPOONACULAR_API_KEY;
const OUTPUT_PATH = path.resolve(process.cwd(), 'src/services/curatedRecipes.json');

// Core Scrape Configurations
const MEAL_TYPES = ['breakfast', 'main course', 'dessert', 'snack', 'salad', 'soup', 'side dish', 'appetizer', 'fingerfood', 'bread'];
const CUISINES = ['Italian', 'Mexican', 'Asian', 'Indian', 'French', 'Japanese', 'Greek', 'Mediterranean', 'American', 'Thai'];
const DIETS = ['Vegetarian', 'Vegan', 'Gluten Free', 'Ketogenic', 'Paleo'];

interface RawSpoonacularRecipe {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  dishTypes?: string[];
  extendedIngredients?: { original: string }[];
  instructions?: string;
  summary?: string;
  analyzedInstructions?: { steps: { number: number; step: string }[] }[];
  nutrition?: { nutrients?: { name: string; amount: number; unit: string }[] };
  diets?: string[];
  cuisines?: string[];
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchFromSpoonacular(params: Record<string, string | number | boolean>) {
  const url = `https://api.spoonacular.com/recipes/complexSearch`;
  const response = await axios.get(url, {
    params: {
      apiKey: API_KEY,
      number: 100,
      addRecipeInformation: true,
      fillIngredients: true,
      addRecipeNutrition: true,
      instructionsRequired: true,
      ...params,
    },
    timeout: 15000,
  });
  return response.data;
}

function cleanRecipeData(raw: RawSpoonacularRecipe, currentCuisine?: string, currentDiet?: string): CleanRecipe {
  // Normalize and clean arrays
  const diets = raw.diets ? raw.diets.map(d => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()) : [];
  const cuisines = raw.cuisines ? raw.cuisines.map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()) : [];
  const dishTypes = raw.dishTypes ? raw.dishTypes.map(d => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()) : ['Recipe'];

  // Enrich diets and cuisines based on matching query criteria
  if (currentDiet && !diets.includes(currentDiet)) {
    diets.push(currentDiet);
  }
  if (currentCuisine && !cuisines.includes(currentCuisine)) {
    cuisines.push(currentCuisine);
  }

  // Flatten instructions
  const steps = raw.analyzedInstructions?.flatMap(set => set.steps) || [];
  const cleanSteps = steps.map((s, idx) => ({
    number: s.number || idx + 1,
    step: s.step || '',
  }));

  // Clean nutrients to match exactly the top 5 key nutrients
  const nutrients = raw.nutrition?.nutrients || [];
  const cleanNutrients = nutrients
    .filter(n => ['Calories', 'Protein', 'Fat', 'Carbohydrates', 'Sugar'].includes(n.name))
    .map(n => ({
      name: n.name === 'Carbohydrates' ? 'Carbohydrates' : n.name,
      amount: n.amount || 0,
      unit: n.unit || '',
    }));

  return {
    id: raw.id,
    title: raw.title || 'Untitled Recipe',
    image: raw.image || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=400',
    readyInMinutes: raw.readyInMinutes || 20,
    servings: raw.servings || 2,
    dishTypes,
    extendedIngredients: raw.extendedIngredients?.map(ing => ({ original: ing.original })) || [],
    instructions: raw.instructions || raw.summary || 'Enjoy your chef-crafted bite.',
    analyzedInstructions: cleanSteps,
    nutrition: cleanNutrients.length > 0 ? { nutrients: cleanNutrients } : null,
    diets,
    cuisines,
  };
}

async function runScraper() {
  console.log('🍽️ FUZO Recipe Database Scraper initialized.');
  
  if (!API_KEY) {
    console.error('❌ Error: VITE_SPOONACULAR_API_KEY or SPOONACULAR_API_KEY is not defined in your .env file!');
    process.exit(1);
  }

  console.log(`🔑 Using API Key: ${API_KEY.substring(0, 5)}...${API_KEY.substring(API_KEY.length - 4)}`);

  const uniqueRecipesMap = new Map<number, CleanRecipe>();
  
  // Load existing recipes to run "from where we left off"
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      console.log(`📂 Loading existing database from ${OUTPUT_PATH}...`);
      const existingData = fs.readFileSync(OUTPUT_PATH, 'utf-8');
      const existingRecipes: CleanRecipe[] = JSON.parse(existingData);
      existingRecipes.forEach(r => {
        uniqueRecipesMap.set(r.id, r);
      });
      console.log(`✅ Loaded ${uniqueRecipesMap.size} existing recipes.`);
    } catch (e: any) {
      console.warn(`⚠️ Failed to load existing recipes:`, e.message);
    }
  }

  let totalApiRequests = 0;

  // 1. Fetch Meal Types
  console.log('\n--- 🥣 Phase 1: Meal Types ---');
  for (const mealType of MEAL_TYPES) {
    console.log(`🔍 Fetching up to 100 recipes for Meal Type: "${mealType}"...`);
    try {
      const data = await fetchFromSpoonacular({ type: mealType });
      totalApiRequests++;
      
      const results = data.results || [];
      console.log(`   Fetched ${results.length} recipes.`);
      
      for (const raw of results) {
        const cleaned = cleanRecipeData(raw);
        if (uniqueRecipesMap.has(cleaned.id)) {
          const existing = uniqueRecipesMap.get(cleaned.id)!;
          if (existing.image && existing.image.startsWith('/images/')) {
            cleaned.image = existing.image;
          }
        }
        uniqueRecipesMap.set(cleaned.id, cleaned);
      }
      
      console.log(`   Current Database Size: ${uniqueRecipesMap.size} unique recipes.`);
      await sleep(2000); // 2 seconds delay to protect rate limit
    } catch (error: any) {
      console.error(`❌ Failed to fetch meal type "${mealType}":`, error.message);
    }
  }

  // 2. Fetch Cuisines
  console.log('\n--- 🌮 Phase 2: Cuisines ---');
  for (const cuisine of CUISINES) {
    console.log(`🔍 Fetching up to 100 recipes for Cuisine: "${cuisine}"...`);
    try {
      const data = await fetchFromSpoonacular({ cuisine });
      totalApiRequests++;
      
      const results = data.results || [];
      console.log(`   Fetched ${results.length} recipes.`);
      
      for (const raw of results) {
        const cleaned = cleanRecipeData(raw, cuisine);
        // If recipe already exists, enrich its cuisines
        if (uniqueRecipesMap.has(cleaned.id)) {
          const existing = uniqueRecipesMap.get(cleaned.id)!;
          if (!existing.cuisines.includes(cuisine)) {
            existing.cuisines.push(cuisine);
          }
        } else {
          uniqueRecipesMap.set(cleaned.id, cleaned);
        }
      }
      
      console.log(`   Current Database Size: ${uniqueRecipesMap.size} unique recipes.`);
      await sleep(2000);
    } catch (error: any) {
      console.error(`❌ Failed to fetch cuisine "${cuisine}":`, error.message);
    }
  }

  // 3. Fetch Diets
  console.log('\n--- 🥗 Phase 3: Diets ---');
  for (const diet of DIETS) {
    console.log(`🔍 Fetching up to 100 recipes for Diet: "${diet}"...`);
    try {
      const data = await fetchFromSpoonacular({ diet });
      totalApiRequests++;
      
      const results = data.results || [];
      console.log(`   Fetched ${results.length} recipes.`);
      
      for (const raw of results) {
        const cleaned = cleanRecipeData(raw, undefined, diet);
        // If recipe already exists, enrich its diets
        if (uniqueRecipesMap.has(cleaned.id)) {
          const existing = uniqueRecipesMap.get(cleaned.id)!;
          if (!existing.diets.includes(diet)) {
            existing.diets.push(diet);
          }
        } else {
          uniqueRecipesMap.set(cleaned.id, cleaned);
        }
      }
      
      console.log(`   Current Database Size: ${uniqueRecipesMap.size} unique recipes.`);
      await sleep(2000);
    } catch (error: any) {
      console.error(`❌ Failed to fetch diet "${diet}":`, error.message);
    }
  }

  // 4. Save to JSON File
  console.log('\n--- 💾 Phase 4: Finalizing & Saving Database ---');
  const recipesList = Array.from(uniqueRecipesMap.values());
  console.log(`✅ Collected a total of ${recipesList.length} unique, curated recipes.`);
  console.log(`📈 API Queries Executed: ${totalApiRequests} calls.`);

  try {
    const parentDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    // Save compressed JSON database file
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(recipesList, null, 2), 'utf-8');
    console.log(`🎉 Successfully saved curated recipes JSON to: ${OUTPUT_PATH}`);
    console.log(`📊 Total Database File Size: ${(fs.statSync(OUTPUT_PATH).size / (1024 * 1024)).toFixed(2)} MB`);
  } catch (error: any) {
    console.error('❌ Failed to save recipes JSON database:', error.message);
  }
}

runScraper();
