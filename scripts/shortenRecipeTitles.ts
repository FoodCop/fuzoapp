import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECIPES_PATH = path.resolve(__dirname, './data/curatedRecipes.json');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

interface Recipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  dishTypes: string[];
  extendedIngredients: any[];
  instructions: string;
  analyzedInstructions: any[];
  nutrition: any;
  diets: string[];
  cuisines: string[];
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Deterministic rules-based shortener as a high-fidelity fallback
function rulesBasedShorten(title: string): string {
  // Preposition splits
  const splitKeywords = [
    ' served with ',
    ' with ',
    ' in a ',
    ' in ',
    ' on a ',
    ' on ',
    ' over ',
    ' to cool off ',
    ' made at home ',
    ' - ',
    ' & '
  ];

  let shortened = title;

  for (const keyword of splitKeywords) {
    if (shortened.toLowerCase().includes(keyword)) {
      shortened = shortened.split(new RegExp(keyword, 'i'))[0].trim();
    }
  }

  // Remove trailing parentheses or punctuation
  shortened = shortened.replace(/,\s*$/, '').trim();

  // If still too long, hard truncate gracefully
  if (shortened.length > 45) {
    shortened = shortened.substring(0, 42).trim() + '...';
  }

  return shortened;
}

// AI-powered shortener using Gemini Flash
async function aiShorten(title: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `You are a professional culinary editor. Shorten the following long recipe title into a catchy, Appetizing, gourmet, and concise title. It MUST be under 40 characters.
Retain key ingredients and core identity (e.g. 'Maine Diver Scallops' instead of full description, 'Bánh Xèo' instead of descriptive pancake sentence). 

Return ONLY the shortened title without any quotes, explanations, or extra characters.

Original title: "${title}"`;

  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 20
      }
    }, { timeout: 8000 });

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text && text.trim().length > 0) {
      return text.trim().replace(/^["']|["']$/g, '');
    }
  } catch (error: any) {
    console.warn(`⚠️ Gemini AI shortening failed for "${title}":`, error.message);
  }
  return null;
}

async function run() {
  console.log('✨ FUZO Recipe Title Shortening Optimizer');
  console.log('=========================================');

  if (!fs.existsSync(RECIPES_PATH)) {
    console.error(`❌ Curated recipes file not found at: ${RECIPES_PATH}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(RECIPES_PATH, 'utf-8');
  const recipes: Recipe[] = JSON.parse(fileContent);

  const longRecipes = recipes.filter(r => r.title.length > 50);
  console.log(`📊 Total recipes: ${recipes.length}`);
  console.log(`🔍 Recipes with titles > 50 characters: ${longRecipes.length}`);

  if (longRecipes.length === 0) {
    console.log('✅ No long recipe titles found! Database is already optimized.');
    process.exit(0);
  }

  if (GEMINI_API_KEY) {
    console.log(`🔑 Gemini API Key detected! Running high-quality AI-powered shortening...`);
  } else {
    console.log(`ℹ️ No Gemini API Key detected. Using deterministic rules engine...`);
  }

  let optimizedCount = 0;

  for (let i = 0; i < longRecipes.length; i++) {
    const recipe = longRecipes[i];
    const originalTitle = recipe.title;
    let newTitle: string = '';

    if (GEMINI_API_KEY) {
      const aiResult = await aiShorten(originalTitle);
      const isValid = aiResult && 
                      aiResult.length >= 6 && 
                      aiResult.split(' ').length >= 2 &&
                      !aiResult.includes('Request failed') &&
                      !aiResult.includes('429');
                      
      if (isValid) {
        newTitle = aiResult;
      } else {
        if (aiResult) {
          console.log(`⚠️ Rejecting malformed AI title "${aiResult}". Using rules engine.`);
        }
        newTitle = rulesBasedShorten(originalTitle);
      }
      // Gentle pause to protect API rate limits (300ms)
      await sleep(300);
    } else {
      newTitle = rulesBasedShorten(originalTitle);
    }

    // Ensure we don't accidentally get an empty string
    if (!newTitle || newTitle.trim().length === 0) {
      newTitle = rulesBasedShorten(originalTitle);
    }

    recipe.title = newTitle;
    optimizedCount++;

    console.log(`[${i + 1}/${longRecipes.length}] Optimized:`);
    console.log(`  ❌ Old: "${originalTitle}" (${originalTitle.length} chars)`);
    console.log(`  ✅ New: "${newTitle}" (${newTitle.length} chars)\n`);
  }

  console.log('💾 Saving updated optimized database...');
  fs.writeFileSync(RECIPES_PATH, JSON.stringify(recipes, null, 2), 'utf-8');
  console.log(`🎉 Title optimization complete! Successfully optimized ${optimizedCount} recipe titles.`);
}

run();
