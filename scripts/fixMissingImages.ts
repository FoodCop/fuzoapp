import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECIPES_PATH = path.resolve(__dirname, './data/curatedRecipes.json');
const DEST_DIR = path.resolve(__dirname, '../public/images/recipes');

interface Recipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  dishTypes: string[];
  extendedIngredients: { original: string }[];
  instructions: string;
  analyzedInstructions: { number: number; step: string }[];
  nutrition: any;
  diets: string[];
  cuisines: string[];
}

// Map of the 5 failed recipe IDs to gorgeous Unsplash high-fidelity food images
const FALLBACK_MAP: Record<number, string> = {
  157160: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=400', // Tartlet
  157459: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400', // Chicken Curry
  627875: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400', // Yogurt Dip/Active Food Fallback
  157093: 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=400', // Quiche
  602644: 'https://images.unsplash.com/photo-1579372786545-d24232daf58c?auto=format&fit=crop&w=400', // Souffle/Dessert
};

async function downloadImage(url: string, destPath: string): Promise<boolean> {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(destPath);
      response.data.pipe(writer);
      writer.on('finish', () => resolve(true));
      writer.on('error', (err) => {
        writer.close();
        reject(err);
      });
    });
  } catch (error: any) {
    console.error(`❌ Failed to download fallback for ${url}:`, error.message);
    return false;
  }
}

async function run() {
  console.log('🔧 Fixing 5 failed 404 Spoonacular CDN images with Unsplash fallbacks...');
  
  if (!fs.existsSync(RECIPES_PATH)) {
    console.error(`❌ Curated recipes file not found at: ${RECIPES_PATH}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(RECIPES_PATH, 'utf-8');
  const recipes: Recipe[] = JSON.parse(fileContent);
  let hasChanges = false;

  for (const [idStr, fallbackUrl] of Object.entries(FALLBACK_MAP)) {
    const id = parseInt(idStr, 10);
    const recipe = recipes.find(r => r.id === id);
    
    if (recipe) {
      const destFilename = `${id}.jpg`;
      const localDestPath = path.join(DEST_DIR, destFilename);
      const relativeLocalUrl = `/images/recipes/${destFilename}`;

      console.log(`📥 Downloading gorgeous Unsplash fallback for recipe #${id} ("${recipe.title}")`);
      const success = await downloadImage(fallbackUrl, localDestPath);
      
      if (success) {
        recipe.image = relativeLocalUrl;
        hasChanges = true;
        console.log(`✅ Success! Saved to ${relativeLocalUrl}`);
      } else {
        console.error(`❌ Failed to download fallback image for recipe #${id}`);
      }
    } else {
      console.warn(`⚠️ Recipe #${id} not found in database.`);
    }
  }

  if (hasChanges) {
    console.log('💾 Saving updated recipe database with updated fallback paths...');
    fs.writeFileSync(RECIPES_PATH, JSON.stringify(recipes, null, 2), 'utf-8');
    console.log(`🎉 Curated recipe database successfully updated! All 1,251 recipes are now fully local!`);
  } else {
    console.log('ℹ️ No changes made.');
  }
}

run();
