/**
 * ============================================================================
 * OPENAI SERVICE — LLM Chat Completions
 * ============================================================================
 *
 * All OpenAI requests are routed through the Supabase Edge Function proxy
 * to keep API keys server-side only. No client-side key exposure.
 */

import { hasSupabaseConfig, supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseClient';
import type { ServiceResult } from '../shared/types/serviceResult';

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface OpenAIResponseData {
  text: string;
  raw: unknown;
}

const extractContent = (responseData: unknown): string | null => {
  if (!responseData || typeof responseData !== 'object') {
    return null;
  }

  const root = responseData as {
    data?: { choices?: Array<{ message?: { content?: unknown } }> };
    choices?: Array<{ message?: { content?: unknown } }>;
  };

  const content = root.data?.choices?.[0]?.message?.content ?? root.choices?.[0]?.message?.content;
  return typeof content === 'string' && content.length > 0 ? content : null;
};

const requestViaProxy = async (payload: Record<string, unknown>): Promise<ServiceResult<OpenAIResponseData>> => {
  if (!SUPABASE_URL) {
    return { success: false, error: 'Supabase URL missing for OpenAI proxy.' };
  }

  let bearerToken = SUPABASE_ANON_KEY;
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      bearerToken = data.session.access_token;
    }
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/openai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { success: false, error: data?.error || `OpenAI proxy failed (${response.status})` };
  }

  if (data?.success === false) {
    return { success: false, error: data?.error || 'OpenAI proxy returned an error.' };
  }

  const text = extractContent(data);
  if (!text) {
    return { success: false, error: 'No response content returned from OpenAI proxy.' };
  }

  return { success: true, data: { text, raw: data } };
};

export const OpenAIService = {
  async chatCompletion(messages: OpenAIChatMessage[], options: OpenAIChatOptions = {}): Promise<ServiceResult<OpenAIResponseData>> {
    if (!messages.length) {
      return { success: false, error: 'At least one message is required.' };
    }

    if (!hasSupabaseConfig || !SUPABASE_URL) {
      return {
        success: false,
        error: 'OpenAI is not configured. Set up the Supabase Edge Function proxy.',
      };
    }

    const payload = {
      model: options.model || 'gpt-4o-mini',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 700,
    };

    try {
      return await requestViaProxy(payload);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  isConfigured() {
    return hasSupabaseConfig;
  },
};

export default OpenAIService;
