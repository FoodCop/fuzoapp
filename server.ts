import express from "express";
import { createServer as createViteServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const cleanEnv = (val: string | undefined) => {
  if (!val) return "";
  const trimmed = val.trim();
  const withoutLeading = (trimmed.startsWith('"') || trimmed.startsWith("'")) ? trimmed.slice(1) : trimmed;
  return (withoutLeading.endsWith('"') || withoutLeading.endsWith("'")) ? withoutLeading.slice(0, -1) : withoutLeading;
};

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

type GeminiConfigInput = {
  temperature?: unknown;
  topP?: unknown;
  topK?: unknown;
  maxOutputTokens?: unknown;
  responseMimeType?: unknown;
  responseSchema?: unknown;
  systemInstruction?: unknown;
};

const buildGeminiGenerationConfig = (config: GeminiConfigInput) => {
  const generationConfig: Record<string, unknown> = {};
  const numericFields: Array<[keyof GeminiConfigInput, string]> = [
    ['temperature', 'temperature'],
    ['topP', 'topP'],
    ['topK', 'topK'],
    ['maxOutputTokens', 'maxOutputTokens'],
  ];

  for (const [sourceKey, targetKey] of numericFields) {
    const value = config[sourceKey];
    if (typeof value === 'number') {
      generationConfig[targetKey] = value;
    }
  }

  if (typeof config.responseMimeType === 'string' && config.responseMimeType.length > 0) {
    generationConfig.responseMimeType = config.responseMimeType;
  }

  if (config.responseSchema && typeof config.responseSchema === 'object') {
    generationConfig.responseSchema = config.responseSchema;
  }

  return generationConfig;
};

const buildGeminiPayload = (contents: unknown, config: GeminiConfigInput) => {
  const payload: Record<string, unknown> = { contents };
  const generationConfig = buildGeminiGenerationConfig(config);

  if (Object.keys(generationConfig).length > 0) {
    payload.generationConfig = generationConfig;
  }

  if (typeof config.systemInstruction === 'string' && config.systemInstruction.trim().length > 0) {
    payload.systemInstruction = {
      role: 'system',
      parts: [{ text: config.systemInstruction.trim() }],
    };
  }

  return payload;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  const getGeminiApiKey = () => cleanEnv(process.env.GEMINI_API_KEY);

  const asRecord = (value: unknown): Record<string, unknown> => {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  };

  const extractGeminiText = (payload: unknown): string => {
    const payloadRecord = asRecord(payload);
    const candidates = Array.isArray(payloadRecord.candidates) ? payloadRecord.candidates : [];
    const firstCandidate = candidates.length > 0 ? asRecord(candidates[0]) : {};
    const parts = asRecord(asRecord(firstCandidate.content)).parts;
    if (!Array.isArray(parts)) return '';
    return parts.map((part) => {
      const partRecord = asRecord(part);
      return typeof partRecord.text === 'string' ? partRecord.text : '';
    }).join('').trim();
  };

  app.get('/api/local-gemini/health', async (_req, res) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(200).json({
        success: true,
        health: {
          keyConfigured: false,
          keyValid: false,
          testError: 'GEMINI_API_KEY is not configured on server.',
        },
      });
    }

    try {
      const response = await fetch(`${GEMINI_BASE_URL}/models?key=${encodeURIComponent(apiKey)}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return res.status(200).json({
          success: true,
          health: {
            keyConfigured: true,
            keyValid: false,
            testError: data?.error?.message || `Gemini health failed (${response.status})`,
          },
        });
      }

      return res.status(200).json({
        success: true,
        health: {
          keyConfigured: true,
          keyValid: true,
          modelCount: Array.isArray(data?.models) ? data.models.length : 0,
        },
      });
    } catch (error) {
      return res.status(200).json({
        success: true,
        health: {
          keyConfigured: true,
          keyValid: false,
          testError: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  });

  app.post('/api/local-gemini', async (req, res) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY not configured on server.',
      });
    }

    const model = String(req.body?.model || 'gemini-flash-latest');
    const contents = req.body?.contents;
    const config = (req.body?.config || {}) as GeminiConfigInput;

    if (!contents) {
      return res.status(400).json({ success: false, error: 'contents is required' });
    }

    const payload = buildGeminiPayload(contents, config);

    try {
      const response = await fetch(`${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: data?.error?.message || `Gemini proxy failed (${response.status})`,
          details: data,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...data,
          text: extractGeminiText(data),
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  console.log("Starting server...");
  const rawSpoonKey = process.env.SPOONACULAR_API_KEY || process.env.VITE_SPOONACULAR_API_KEY;
  const spoonKey = cleanEnv(rawSpoonKey);
  console.log(`[Debug] SPOONACULAR_API_KEY source: ${process.env.SPOONACULAR_API_KEY ? 'env' : 'not in env'}`);
  console.log(`[Debug] VITE_SPOONACULAR_API_KEY source: ${process.env.VITE_SPOONACULAR_API_KEY ? 'env' : 'not in env'}`);
  console.log(`[Debug] Key Length: ${spoonKey?.length || 0}`);
  if (spoonKey) {
    console.log(`[Debug] Key Prefix: ${spoonKey.substring(0, 4)}...`);
    console.log(`[Debug] Key Suffix: ...${spoonKey.substring(spoonKey.length - 4)}`);
  }

  // Generic Spoonacular Proxy Handler
  const handleSpoonacularRequest = async (endpoint: string, method: string, params: Record<string, unknown>, res: express.Response) => {
    const rawKey = process.env.SPOONACULAR_API_KEY || process.env.VITE_SPOONACULAR_API_KEY;
    const apiKey = cleanEnv(rawKey);
    
    if (!apiKey) {
      console.error("SPOONACULAR_API_KEY is empty or undefined");
      return res.status(500).json({ error: "SPOONACULAR_API_KEY not configured on server" });
    }

    try {
      // Build URL
      const baseUrl = `https://api.spoonacular.com/${endpoint}`;
      const url = new URL(baseUrl);
      
      // Add apiKey to query params (Spoonacular default)
      url.searchParams.append("apiKey", apiKey);
      
      // Add other params
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'apiKey') {
          url.searchParams.append(key, String(value));
        }
      });

      const finalUrl = url.toString();
      console.log(`[Proxy] ${method} ${endpoint}`);
      console.log(`[Proxy] URL: ${finalUrl.replace(apiKey, "REDACTED")}`);
      console.log(`[Proxy] Key Length: ${apiKey.length}`);

      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json'
          // Removed x-api-key header to avoid potential conflicts
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Proxy] Spoonacular Error ${response.status}:`, errorText);
        
        // Forward the exact status from Spoonacular
        return res.status(response.status).json({ 
          success: false,
          error: `Spoonacular API error: ${response.status}`, 
          message: errorText,
          status: response.status
        });
      }

      const data = await response.json();
      console.log(`[Proxy] Success: Received data from ${endpoint}`);
      res.json(data);
    } catch (error) {
      console.error("[Proxy] Critical Error:", error);
      res.status(500).json({ success: false, error: "Internal Server Error during proxying" });
    }
  };

  // Support the routes used in SpoonacularService
  app.post("/api/spoonacular/recipes/complexSearch", (req, res) => handleSpoonacularRequest("recipes/complexSearch", "POST", req.body, res));
  app.post("/api/spoonacular/recipes/:id/information", (req, res) => handleSpoonacularRequest(`recipes/${req.params.id}/information`, "POST", req.body, res));
  app.post("/api/spoonacular/recipes/random", (req, res) => handleSpoonacularRequest("recipes/random", "POST", req.body, res));
  app.post("/api/spoonacular/recipes/:id/similar", (req, res) => handleSpoonacularRequest(`recipes/${req.params.id}/similar`, "POST", req.body, res));

  // Legacy GET route for compatibility
  app.get("/api/recipes/random", async (req, res) => {
    handleSpoonacularRequest("recipes/complexSearch", "GET", { ...req.query, sort: "random", addRecipeInformation: true, addRecipeNutrition: true, fillIngredients: true }, res);
  });

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

await startServer();
