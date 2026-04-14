import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
};

type GeminiConfigInput = {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
  systemInstruction?: string;
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

const jsonResponse = (status: number, body: Record<string, unknown>) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
);

const buildGenerationPayload = (contents: unknown, config: GeminiConfigInput) => {
  const payload: Record<string, unknown> = { contents };
  const generationConfig: Record<string, unknown> = {};

  if (typeof config.temperature === 'number') generationConfig.temperature = config.temperature;
  if (typeof config.topP === 'number') generationConfig.topP = config.topP;
  if (typeof config.topK === 'number') generationConfig.topK = config.topK;
  if (typeof config.maxOutputTokens === 'number') generationConfig.maxOutputTokens = config.maxOutputTokens;
  if (typeof config.responseMimeType === 'string' && config.responseMimeType.length > 0) {
    generationConfig.responseMimeType = config.responseMimeType;
  }
  if (config.responseSchema && typeof config.responseSchema === 'object') {
    generationConfig.responseSchema = config.responseSchema;
  }

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

const forwardGeminiRequest = async (model: string, payload: Record<string, unknown>) => {
  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY || '')}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json().catch(() => ({}));
  return { response, data };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return jsonResponse(500, {
        success: false,
        error: 'Gemini API key is not configured in Supabase secrets.',
      });
    }

    if (req.method !== 'POST') {
      return jsonResponse(405, { success: false, error: 'Method not allowed. Use POST.' });
    }

    const body = await req.json().catch(() => ({}));
    const model = String(body?.model || 'gemini-flash-latest');
    const contents = body?.contents;
    const config = (body?.config || {}) as GeminiConfigInput;

    if (!contents) {
      return jsonResponse(400, { success: false, error: 'contents is required' });
    }

    const payload = buildGenerationPayload(contents, config);
    const { response, data } = await forwardGeminiRequest(model, payload);

    if (!response.ok) {
      console.error(`Gemini API Error: ${response.status}`, data);
      return jsonResponse(response.status, {
        success: false,
        error: data?.error?.message || `Gemini proxy failed (${response.status})`,
        errorDetail: data,
        details: data,
      });
    }

    return jsonResponse(200, {
      success: true,
      data: {
        ...data,
        text: extractGeminiText(data),
      },
    });
  } catch (error) {
    console.error('Edge Function error:', error);
    return jsonResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

