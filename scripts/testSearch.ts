import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const effectiveQuery = 'LUNCH';
  const dishTypeString = `{"Lunch"}`;

  let query = supabase.from('recipes').select('*', { count: 'exact' });
  // Test with double quotes around the ilike value
  query = query.or(`title.ilike."*${effectiveQuery}*",dish_types.ov.${dishTypeString}`);

  const { data, count, error } = await query.range(0, 11);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Data count with quotes: ', data?.length);
  }
}

run();
