import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECIPES_PATH = path.resolve(__dirname, '../src/services/curatedRecipes.json');
const DEST_DIR = path.resolve(__dirname, '../public/images/recipes');

interface Nutrient {
  name: string;
  amount: number;
  unit: string;
}

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
  nutrition: { nutrients: Nutrient[] } | null;
  diets: string[];
  cuisines: string[];
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function downloadImage(url: string, destPath: string, retries = 3, delay = 1000): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
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
      if (attempt === retries) {
        console.error(`❌ Failed to download ${url} after ${retries} attempts:`, error.message);
        return false;
      }
      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      await sleep(backoffDelay);
    }
  }
  return false;
}

async function run() {
  console.log('🥘 FUZO Recipe Local Image Downloader & Decoupler');
  console.log('==============================================');

  if (!fs.existsSync(RECIPES_PATH)) {
    console.error(`❌ Curated recipes file not found at: ${RECIPES_PATH}`);
    process.exit(1);
  }

  // Create destination folder
  if (!fs.existsSync(DEST_DIR)) {
    console.log(`📁 Creating recipes image directory: ${DEST_DIR}`);
    fs.mkdirSync(DEST_DIR, { recursive: true });
  }

  const fileContent = fs.readFileSync(RECIPES_PATH, 'utf-8');
  const recipes: Recipe[] = JSON.parse(fileContent);

  console.log(`📊 Found ${recipes.length} total recipes in curated database.`);

  const CONCURRENCY_LIMIT = 5;
  let downloadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let hasChanges = false;

  // Process in batches
  const recipesToProcess = recipes.filter(r => r.image && r.image.startsWith('http'));
  console.log(`🔍 Recipes with remote images: ${recipesToProcess.length}`);

  for (let i = 0; i < recipesToProcess.length; i += CONCURRENCY_LIMIT) {
    const batch = recipesToProcess.slice(i, i + CONCURRENCY_LIMIT);
    
    await Promise.all(batch.map(async (recipe) => {
      const extension = path.extname(new URL(recipe.image).pathname) || '.jpg';
      const localFilename = `${recipe.id}${extension}`;
      const localDestPath = path.join(DEST_DIR, localFilename);
      const relativeLocalUrl = `/images/recipes/${localFilename}`;

      // Check if already downloaded
      if (fs.existsSync(localDestPath)) {
        skippedCount++;
        // If the path in the JSON is still remote, update it to local
        if (recipe.image !== relativeLocalUrl) {
          recipe.image = relativeLocalUrl;
          hasChanges = true;
        }
        return;
      }

      console.log(`📥 Downloading image for recipe #${recipe.id}: "${recipe.title.substring(0, 40)}..."`);
      const success = await downloadImage(recipe.image, localDestPath);
      
      if (success) {
        downloadedCount++;
        recipe.image = relativeLocalUrl;
        hasChanges = true;
      } else {
        failedCount++;
      }
      
      // Gentle pause to protect remote CDN rate limits
      await sleep(200);
    }));

    const progress = Math.min(i + CONCURRENCY_LIMIT, recipesToProcess.length);
    console.log(`📈 Progress: ${progress}/${recipesToProcess.length} processed (${downloadedCount} downloaded, ${skippedCount} skipped, ${failedCount} failed)`);
  }

  console.log('\n==============================================');
  console.log('🎉 Execution Finished!');
  console.log(`- Downloaded: ${downloadedCount}`);
  console.log(`- Skipped (already downloaded): ${skippedCount}`);
  console.log(`- Failed: ${failedCount}`);

  if (hasChanges) {
    console.log('💾 Saving updated recipe database with local paths...');
    fs.writeFileSync(RECIPES_PATH, JSON.stringify(recipes, null, 2), 'utf-8');
    console.log(`✅ Curated recipe database successfully updated at: ${RECIPES_PATH}`);
  } else {
    console.log('ℹ️ No changes made to curatedRecipes.json.');
  }
}

run();
