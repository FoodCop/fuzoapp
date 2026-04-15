import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
  console.log(`Listing available models...`);
  try {
    const response = await fetch(URL);
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    if (data.models) {
      console.log('Available Models:');
      data.models.forEach(m => console.log(` - ${m.name}`));
    } else {
      console.log('No models found or error:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}

listModels();
