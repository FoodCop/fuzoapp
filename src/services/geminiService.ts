/**
 * ============================================================================
 * NEURAL SYNTHESIS SERVICE — Gemini AI Orchestration
 * ============================================================================
 * 
 * This service acts as the primary gateway to the Google Gemini Pro Vision 
 * and Gemini Flash models. It orchestrates complex multimodal prompts 
 * (Image + Text) for the Snap, Bite, and Trim studios.
 * 
 * Core Capabilities:
 * 1. Hybrid Proxying: Attempts local Vite-based proxying first, falling back 
 *    to Supabase Edge Functions for production availability.
 * 2. Vision Intelligence: Specialized methods for analyzing culinary snaps 
 *    and video trimming.
 * 3. Robust Extraction: Advanced regex and recursive parsing to handle 
 *    malformed AI JSON structures.
 */

import { hasSupabaseConfig, supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseClient';

/**
 * SECTION: Global Constants & Proxies
 */
const LOCAL_PROXY_URL = '/api/local-gemini';
const EDGE_PROXY_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/gemini-proxy` : '';

export interface GeminiInlineData {
  mimeType: string;
  data: string;
}

export interface GeminiPart {
  text?: string;
  inlineData?: GeminiInlineData;
}

export interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

export interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
  systemInstruction?: string;
}

export interface GeminiGenerateRequest {
  model?: string;
  contents: GeminiContent | GeminiContent[] | string;
  config?: GeminiGenerationConfig;
}

/**
 * SECTION: Domain Entities & Config Types
 */
interface GeminiServiceResult {
  success: boolean;
  data?: {
    text: string;
    raw: unknown;
  };
  error?: string;
  status?: number;
}

/**
 * SECTION: Response Extraction & Normalization
 * Logic for extracting the valid 'text' completion from the deeply nested 
 * Gemini response payload. Handles multiple vendor response formats.
 */
const normalizeContents = (contents: GeminiGenerateRequest['contents']) => {
  if (typeof contents === 'string') {
    return [{ role: 'user', parts: [{ text: contents }] }];
  }

  if (Array.isArray(contents)) {
    return contents;
  }

  return [contents];
};

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
};

const extractGeminiText = (payload: unknown): string => {
  if (!payload) return '';

  const payloadRecord = asRecord(payload);

  if (typeof payloadRecord.text === 'string' && payloadRecord.text.length > 0) {
    return payloadRecord.text;
  }

  if (typeof payloadRecord.output_text === 'string' && payloadRecord.output_text.length > 0) {
    return payloadRecord.output_text;
  }

  const directCandidates = asRecord(payloadRecord).candidates;
  const nestedCandidates = asRecord(payloadRecord.data).candidates;
  let candidates: unknown[] = [];
  if (Array.isArray(directCandidates)) {
    candidates = directCandidates;
  } else if (Array.isArray(nestedCandidates)) {
    candidates = nestedCandidates;
  }

  const firstCandidate = candidates.length > 0 ? asRecord(candidates[0]) : {};
  const parts = asRecord(asRecord(firstCandidate.content)).parts;

  if (Array.isArray(parts)) {
    const joined = parts.map((part) => {
      const partRecord = asRecord(part);
      return typeof partRecord.text === 'string' ? partRecord.text : '';
    }).join('').trim();
    if (joined.length > 0) {
      return joined;
    }
  }

  return '';
};

/**
 * SECTION: Request Orchestration
 * Manages the HTTP handshake with the Gemini proxy. 
 * Logic:
 * - Injects Supabase Auth JWT if using the Edge Function.
 * - Parses results and handles 404/500 proxy errors gracefully.
 */
const requestProxy = async (url: string, body: Record<string, unknown>, useSupabaseAuth: boolean): Promise<GeminiServiceResult> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (useSupabaseAuth && SUPABASE_ANON_KEY) {
    let bearerToken = SUPABASE_ANON_KEY;
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        bearerToken = data.session.access_token;
      }
    }

    headers.apikey = SUPABASE_ANON_KEY;
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.success === false) {
    console.error(`[Gemini Proxy Error] ${url} failed:`, { status: response.status, data });
    return {
      success: false,
      error: data?.error || `Gemini proxy failed (${response.status})`,
      status: response.status,
    };
  }

  const text = extractGeminiText(data?.data || data);
  if (!text) {
    return {
      success: false,
      error: 'Gemini returned no text content.',
      status: response.status
    };
  }

  return {
    success: true,
    data: {
      text,
      raw: data,
    },
    status: response.status
  };
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const requestProxyWithRetry = async (url: string, body: Record<string, unknown>, useSupabaseAuth: boolean, maxRetries = 3): Promise<GeminiServiceResult & { status?: number }> => {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    const result = await requestProxy(url, body, useSupabaseAuth) as GeminiServiceResult & { status?: number };
    
    if (result.success) {
      return result;
    }
    
    // Only retry on 503 Service Unavailable or 429 Too Many Requests
    if (result.status === 503 || result.status === 429) {
      attempt++;
      if (attempt >= maxRetries) {
        return result;
      }
      
      const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      console.warn(`[Gemini Proxy] Received ${result.status}. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(backoffMs)}ms...`);
      await delay(backoffMs);
      continue;
    }
    
    // For other errors, fail immediately without retry
    return result;
  }
  
  return { success: false, error: 'Max retries exceeded' };
};

export const GeminiService = {
  /**
   * SUB-SECTION: Core Generate Method
   * The underlying driver for all AI requests. Implements local -> edge fallback.
   */
  async generateContent(request: GeminiGenerateRequest): Promise<GeminiServiceResult> {
    const payload = {
      model: request.model || 'gemini-2.5-flash',
      contents: normalizeContents(request.contents),
      config: request.config || {},
    };

    try {
      const localResult = await requestProxyWithRetry(LOCAL_PROXY_URL, payload, false);
      if (localResult.success) {
        return localResult;
      }

      let edgeError = '';
      if (hasSupabaseConfig && EDGE_PROXY_URL) {
        const edgeResult = await requestProxyWithRetry(EDGE_PROXY_URL, payload, true);
        if (edgeResult.success) {
          return edgeResult;
        }
        edgeError = edgeResult.error || '';
      }

      return {
        success: false,
        error: localResult.error || edgeError || 'Gemini proxy unavailable.',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },

  /**
   * SECTION: Task-Specific Neural Methods
   * Custom prompts and constraints for different App features.
   */
  async analyzeSnap(imageUrl: string, userDescription?: string): Promise<string> {
    const prompt = `
      Analyze this culinary snap. 
      ${userDescription ? `User context: "${userDescription}"` : ''}
      
      Extract the following details in JSON format:
      - restaurant: (Best guess name)
      - cuisine: (The type of food)
      - rating: (1-5 star based on visual quality)
      - description: (A punchy social media caption)
      - tags: (Array of 3-5 keywords)

      Return ONLY the JSON.
    `;

    const mimeType = imageUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    const base64Data = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl;

    const result = await this.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { 
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            restaurant: { type: 'string' },
            cuisine: { type: 'string' },
            rating: { type: 'number' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['restaurant', 'cuisine', 'rating', 'description', 'tags'],
        },
      },
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data?.text || '{}';
  },

  async analyzeScreenshot(imageUrl: string): Promise<string> {
    const prompt = `
      Analyze this food-related screenshot (possibly from Pinterest, Instagram, or a personal gallery).
      Extract the culinary essence for a high-fidelity "Photo Card".
      
      Extract the following details in JSON format:
      - name: (The dish name or title, be descriptive)
      - cat: (The cuisine or category, e.g. "Italian", "Dessert", "Healthy")
      - description: (A punchy, aesthetic social media caption that captures the vibe of the photo)
      - tags: (Array of 3-5 keywords like #pinterest, #foodie, #aesthetic)
      - restaurant: (If evident, else "Inspired by Pinterest")
      
      Return ONLY the JSON.
    `;

    const mimeType = imageUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    const base64Data = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl;

    const result = await this.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { 
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            cat: { type: 'string' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            restaurant: { type: 'string' },
          },
          required: ['name', 'cat', 'description', 'tags', 'restaurant'],
        },
      },
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data?.text || '{}';
  },

  async analyzeBite(title: string, category: string, description: string, image?: string, mimeType = 'image/jpeg'): Promise<string> {
    const prompt = `You are an expert chef. Analyze this dish: "${title}" (${category}). 
      Description: ${description}. 
      Generate a clean JSON recipe card.
      Fields: title, category, readyInMinutes, servings, ingredients (array), instructions, nutrition { calories, protein, fat, carbs }, aiTag.`;

    const parts: any[] = [{ text: prompt }];
    if (image?.includes(',')) {
      parts.push({
        inlineData: { mimeType, data: image.split(',')[1] }
      });
    }

    const result = await this.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            category: { type: 'string' },
            readyInMinutes: { type: 'number' },
            servings: { type: 'number' },
            ingredients: { type: 'array', items: { type: 'string' } },
            instructions: { type: 'string' },
            aiTag: { type: 'string' },
            nutrition: {
              type: 'object',
              properties: {
                calories: { type: 'number' },
                protein: { type: 'number' },
                fat: { type: 'number' },
                carbs: { type: 'number' },
              },
              required: ['calories', 'protein', 'fat', 'carbs'],
            },
          },
          required: ['title', 'ingredients', 'instructions', 'nutrition'],
        },
      },
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data?.text || '{}';
  },

  async analyzeTrim(prompt: string, schema: any, video?: string | null, mimeType = 'video/mp4'): Promise<string> {
    const parts: any[] = [{ text: prompt }];
    if (video?.includes(',')) {
      parts.push({
        inlineData: { mimeType, data: video.split(',')[1] }
      });
    }

    const result = await this.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data?.text || '{}';
  },

  /**
   * SECTION: Service Health Monitoring
   */
  async health() {
    const healthUrls = [LOCAL_PROXY_URL, `${LOCAL_PROXY_URL}/health`];

    try {
      for (const url of healthUrls) {
        const response = await fetch(url);
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          return {
            success: true,
            data,
          };
        }
      }

      return {
        success: false,
        error: 'Gemini health check failed on all configured health endpoints.',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

export default GeminiService;
