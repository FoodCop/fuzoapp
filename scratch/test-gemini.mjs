import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

console.log('Testing Gemini API key...');
console.log('API Key length:', apiKey ? apiKey.length : 0);

if (!apiKey) {
  console.error('Error: GEMINI_API_KEY is missing!');
  process.exit(1);
}

try {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (!response.ok) {
    console.error('Gemini API error:', data);
  } else {
    console.log('Success! Connected to Gemini API. Available models:', data.models ? data.models.length : 0);
  }
} catch (err) {
  console.error('Catch error:', err);
}
