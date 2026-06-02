import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey ? supabaseKey.length : 0);

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing!');
  process.exit(1);
}

try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('user_settings').select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error('Supabase query error:', error);
  } else {
    console.log('Success! Connected to Supabase. Query result:', data);
  }
} catch (err) {
  console.error('Catch error:', err);
}
