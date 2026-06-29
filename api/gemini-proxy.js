const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const extractGeminiText = (payload) => {
  const candidates = payload?.candidates;
  const parts = candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => part?.text || '').join('').trim();
};

const buildGenerationPayload = (contents, config = {}) => {
  const payload = { contents };
  const generationConfig = {};

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

export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (req.method === 'GET') {
    if (!apiKey) {
      return res.status(200).json({
        success: true,
        health: {
          keyConfigured: false,
          keyValid: false,
          testError: 'GEMINI_API_KEY is not configured on Vercel server.',
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
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET or POST.' });
  }

  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'GEMINI_API_KEY not configured on server.' });
  }

  try {
    const body = req.body || {};
    const model = String(body.model || 'gemini-2.5-flash');
    const contents = body.contents;
    const config = body.config || {};

    if (!contents) {
      return res.status(400).json({ success: false, error: 'contents is required' });
    }

    const payload = buildGenerationPayload(contents, config);

    const response = await fetch(`${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
}
