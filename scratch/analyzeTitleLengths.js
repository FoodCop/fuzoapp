import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECIPES_PATH = path.resolve(__dirname, '../scripts/data/curatedRecipes.json');
const data = fs.readFileSync(RECIPES_PATH, 'utf8');
const recipes = JSON.parse(data);

// Sort recipes by title length descending
const sorted = [...recipes].sort((a, b) => b.title.length - a.title.length);

console.log('Total recipes:', recipes.length);
console.log('Top 20 Longest Recipe Titles:');
console.log('=============================');
sorted.slice(0, 30).forEach((r, idx) => {
  console.log(`${idx + 1}. [Length: ${r.title.length}] ID: ${r.id} | "${r.title}"`);
});

// Length distribution
let lenGroup = {
  '0-30 chars': 0,
  '31-50 chars': 0,
  '51-70 chars': 0,
  '71-100 chars': 0,
  '100+ chars': 0
};

recipes.forEach(r => {
  const len = r.title.length;
  if (len <= 30) lenGroup['0-30 chars']++;
  else if (len <= 50) lenGroup['31-50 chars']++;
  else if (len <= 70) lenGroup['51-70 chars']++;
  else if (len <= 100) lenGroup['71-100 chars']++;
  else lenGroup['100+ chars']++;
});

console.log('\nTitle Length Distribution:');
console.log(JSON.stringify(lenGroup, null, 2));
