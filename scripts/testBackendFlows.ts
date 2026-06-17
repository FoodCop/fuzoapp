import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const cleanEnv = (value: string | undefined) => {
  if (!value) return '';
  const trimmed = value.trim();
  const withoutLeading = (trimmed.startsWith('"') || trimmed.startsWith("'")) ? trimmed.slice(1) : trimmed;
  return (withoutLeading.endsWith('"') || withoutLeading.endsWith("'")) ? withoutLeading.slice(0, -1) : withoutLeading;
};

const SUPABASE_URL = cleanEnv(process.env.VITE_SUPABASE_URL);
const SUPABASE_ANON_KEY = cleanEnv(process.env.VITE_SUPABASE_ANON_KEY);
const YOUTUBE_PROXY_URL = `${SUPABASE_URL}/functions/v1/youtube-proxy`;
const LOCAL_GEMINI_URL = 'http://localhost:3000/api/local-gemini';

async function testYouTubeProxy() {
  console.log('--- Testing YouTube Proxy (Share a Link data extraction) ---');
  try {
    const response = await axios.get(YOUTUBE_PROXY_URL, {
        params: { action: 'search', q: 'pasta recipe', maxResults: 1, order: 'relevance' },
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    console.log('YouTube Proxy Success:', response.data.success);
    if (!response.data.success) {
      console.log('Error from proxy:', response.data.error);
    } else {
      console.log('Found video title:', response.data.data?.items?.[0]?.snippet?.title || 'No items');
    }
  } catch (error: any) {
    console.error('YouTube Proxy Error:', error.response?.data || error.message);
  }
}

async function testGeminiTrim() {
  console.log('\n--- Testing Gemini Trim (A Video / Share Link synthesis) ---');
  try {
    const textPrompt = `You are a culinary neural analyst. Build a clean JSON trim card based on this YouTube video metadata.
User Context: 
YouTube Title: Authentic Italian Pasta Carbonara
YouTube Description: How to make authentic Carbonara with guanciale and pecorino.
URL: https://youtube.com/watch?v=12345
Required fields: title, summary, keyFoodItem, location (city/neighborhood), cuisineTags (array), caption.`;

    const payload = {
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
      config: {
        responseMimeType: 'application/json',
      }
    };
    
    const response = await axios.post(LOCAL_GEMINI_URL, payload);
    console.log('Gemini Trim Success:', response.data.success);
    if (response.data.success) {
       console.log('Gemini Trim Output Sample:', response.data.data?.text?.substring(0, 100) + '...');
    } else {
       console.log('Error from Gemini:', response.data.error);
    }
  } catch (error: any) {
    console.error('Gemini Error:', error);
  }
}

async function testGeminiRecipe() {
  console.log('\n--- Testing Gemini Recipe (Bites AI extraction) ---');
  try {
    const textPrompt = `Convert this unstructured text into a structured JSON recipe with title, prepTime, cookTime, servings, calories, ingredients (array of strings), and instructions (array of strings). Text: "Make a sandwich with 2 slices of bread and 1 slice of cheese."`;

    const payload = {
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
      config: {
        responseMimeType: 'application/json',
      }
    };
    
    const response = await axios.post(LOCAL_GEMINI_URL, payload);
    console.log('Gemini Recipe Success:', response.data.success);
    if (response.data.success) {
       console.log('Gemini Recipe Output Sample:', response.data.data?.text?.substring(0, 100) + '...');
    } else {
       console.log('Error from Gemini:', response.data.error);
    }
  } catch (error: any) {
    console.error('Gemini Error:', error);
  }
}

async function testGeminiVision() {
  console.log('\n--- Testing Gemini Vision (Local Image/Video snapshot) ---');
  try {
    const fakeImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
    
    const payload = {
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Describe what you see in this image." },
            {
              inlineData: {
                data: fakeImageBase64,
                mimeType: "image/png"
              }
            }
          ]
        }
      ]
    };

    const response = await axios.post(LOCAL_GEMINI_URL, payload);
    console.log('Gemini Vision Success:', response.data.success);
    if (response.data.success) {
       console.log('Gemini Vision Output Sample:', response.data.data?.text?.substring(0, 100) + '...');
    } else {
       console.log('Error from Gemini:', response.data.error);
    }
  } catch (error: any) {
    console.error('Gemini Error:', error);
  }
}

async function runAll() {
  await testYouTubeProxy();
  await testGeminiTrim();
  await testGeminiRecipe();
  await testGeminiVision();
  console.log('\n--- All Backend Tests Complete ---');
}

runAll();
