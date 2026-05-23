import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECIPES_PATH = path.resolve(__dirname, '../src/services/curatedRecipes.json');
const IMAGES_DIR = path.resolve(__dirname, '../public/images/recipes');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in your .env file!');
  process.exit(1);
}

// Initialize Supabase Admin client with service_role key to bypass RLS policies
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('🚀 FUZO Supabase Recipe & Image Uploader');
  console.log('========================================');

  if (!fs.existsSync(RECIPES_PATH)) {
    console.error(`❌ Curated recipes file not found at: ${RECIPES_PATH}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(RECIPES_PATH, 'utf-8');
  const recipes: any[] = JSON.parse(fileContent);
  console.log(`📊 Loaded ${recipes.length} validated recipes.`);

  // 1. Setup Public Storage Bucket
  const BUCKET_NAME = 'recipe-images';
  console.log(`\n📦 Checking if Supabase Storage Bucket "${BUCKET_NAME}" exists...`);
  
  const { data: buckets, error: listBucketsError } = await supabase.storage.listBuckets();
  if (listBucketsError) {
    console.error('❌ Failed to list buckets:', listBucketsError.message);
    process.exit(1);
  }

  const bucketExists = buckets.some(b => b.name === BUCKET_NAME);
  if (!bucketExists) {
    console.log(`📁 Creating public storage bucket "${BUCKET_NAME}"...`);
    const { error: createBucketError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      fileSizeLimit: 2097152 // 2MB
    });

    if (createBucketError) {
      console.error('❌ Failed to create storage bucket:', createBucketError.message);
      process.exit(1);
    }
    console.log('✅ Bucket created successfully.');
  } else {
    console.log('✅ Bucket already exists.');
  }

  // 2. Upload images and resolve public URLs
  console.log('\n📥 Phase 1: Uploading local JPEGs to Supabase Storage...');
  const CONCURRENCY_LIMIT = 15;
  let uploadCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (let i = 0; i < recipes.length; i += CONCURRENCY_LIMIT) {
    const batch = recipes.slice(i, i + CONCURRENCY_LIMIT);
    
    await Promise.all(batch.map(async (recipe) => {
      const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
      let localPath = '';
      let localFilename = '';

      for (const ext of extensions) {
        const checkPath = path.join(IMAGES_DIR, `${recipe.id}${ext}`);
        if (fs.existsSync(checkPath)) {
          localPath = checkPath;
          localFilename = `${recipe.id}${ext}`;
          break;
        }
      }

      if (!localPath) {
        console.warn(`⚠️ Warning: Image not found locally for recipe #${recipe.id}`);
        failCount++;
        return;
      }

      try {
        const fileBuffer = fs.readFileSync(localPath);
        const contentType = localFilename.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        // Upload image to Supabase Storage Bucket
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(localFilename, fileBuffer, {
            contentType,
            upsert: true
          });

        if (uploadError) {
          console.error(`❌ Failed to upload image for #${recipe.id}:`, uploadError.message);
          failCount++;
          return;
        }

        // Get public CDN URL
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(localFilename);

        recipe.image = publicUrlData.publicUrl;
        uploadCount++;
      } catch (e: any) {
        console.error(`❌ Unexpected error uploading image for #${recipe.id}:`, e.message);
        failCount++;
      }
    }));

    const progress = Math.min(i + CONCURRENCY_LIMIT, recipes.length);
    console.log(`📈 Progress: ${progress}/${recipes.length} images processed (${uploadCount} uploaded, ${failCount} failed)`);
    // Minimal delay to prevent API flooding
    await sleep(100);
  }

  console.log(`\n🎉 Storage upload finished: ${uploadCount} uploaded, ${failCount} missing/failed.`);

  // 3. Map CamelCase to SnakeCase for DB Schema
  console.log('\n🔀 Phase 2: Mapping recipe records to Supabase SnakeCase Schema...');
  const dbRecords = recipes.map(r => ({
    id: r.id,
    title: r.title,
    image: r.image, // Public URL in Supabase Storage!
    ready_in_minutes: r.readyInMinutes,
    servings: r.servings,
    dish_types: r.dishTypes,
    extended_ingredients: r.extendedIngredients,
    instructions: r.instructions,
    analyzed_instructions: r.analyzedInstructions,
    nutrition: r.nutrition,
    diets: r.diets,
    cuisines: r.cuisines
  }));

  // 4. Bulk UPSERT in batches of 100
  console.log('\n📤 Phase 3: Bulk upserting recipe records to Supabase Database...');
  const DB_BATCH_SIZE = 100;
  let dbInsertCount = 0;

  for (let i = 0; i < dbRecords.length; i += DB_BATCH_SIZE) {
    const batch = dbRecords.slice(i, i + DB_BATCH_SIZE);
    
    try {
      const { error: dbError } = await supabase
        .from('recipes')
        .upsert(batch, { onConflict: 'id' });

      if (dbError) {
        console.error(`❌ Failed to upsert database batch [${i} - ${i + batch.length}]:`, dbError.message);
        process.exit(1);
      }

      dbInsertCount += batch.length;
      console.log(`📈 Progress: ${dbInsertCount}/${dbRecords.length} database records successfully upserted.`);
    } catch (e: any) {
      console.error(`❌ Unexpected database error in batch [${i}]:`, e.message);
      process.exit(1);
    }
    await sleep(150);
  }

  console.log('\n========================================');
  console.log('🎉 Supabase Recipe Migration Complete!');
  console.log(`- Uploaded Images: ${uploadCount}`);
  console.log(`- Upserted Database Records: ${dbInsertCount}/${recipes.length}`);
  console.log('========================================');
}

run();
