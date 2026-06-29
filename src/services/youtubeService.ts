/**
 * ============================================================================
 * YOUTUBE SERVICE — Video Discovery & Channel Integration
 * ============================================================================
 *
 * Provides a typed interface to the YouTube Data API v3,
 * routed through a Supabase Edge Function to protect API credentials.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, hasSupabaseConfig } from './supabaseClient';
import type { ServiceResult } from '../shared/types/serviceResult';

const YOUTUBE_PROXY_URL = `${SUPABASE_URL}/functions/v1/youtube-proxy`;

interface LocalizedTrimsRequest {
  userHash: string;
  location?: string;
  cuisine?: string;
  diet?: string;
  regionCode?: string;
  queries?: string[];
  maxResultsPerQuery?: number;
}

interface LocalizedTrimsResponse {
  items: YouTubeSearchItem[];
  source?: 'live' | 'cache' | 'fallback';
  reason?: string;
  queryCount?: number;
}

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
    };
  };
}

interface YouTubeVideoDetails {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    thumbnails?: Record<string, { url?: string }>;
    publishedAt?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

/**
 * Shared headers for all Supabase Edge Function requests.
 */
const proxyHeaders = (): Record<string, string> => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
});

/**
 * Shared fetch wrapper with timeout and error handling.
 * Replaces axios usage — native fetch + AbortController handles the same.
 */
async function proxyFetch<T>(url: string, init: RequestInit): Promise<ServiceResult<T>> {
  if (!hasSupabaseConfig) {
    return {
      success: false,
      error: 'Supabase env vars missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.success === false) {
      return { success: false, error: data?.error || `YouTube proxy failed (${response.status})` };
    }

    return { success: true, data: data.data ?? data };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, error: 'YouTube request timed out (10s)' };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  } finally {
    clearTimeout(timeout);
  }
}

export const YouTubeService = {
  async searchVideos(query: string, maxResults = 12): Promise<ServiceResult<{ items: YouTubeSearchItem[] }>> {
    const params = new URLSearchParams({
      action: 'search',
      q: query,
      maxResults: String(maxResults),
      order: 'relevance',
    });

    return proxyFetch(`${YOUTUBE_PROXY_URL}?${params}`, {
      method: 'GET',
      headers: proxyHeaders(),
    });
  },

  async getLocalizedTrimsFeed(payload: LocalizedTrimsRequest): Promise<ServiceResult<LocalizedTrimsResponse>> {
    return proxyFetch(`${YOUTUBE_PROXY_URL}?action=personalized-trims`, {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetches the user's YouTube channel handle using a Google Access Token.
   * This goes directly to Google's API (not through proxy) because it uses
   * the user's OAuth token.
   */
  async getMyChannel(accessToken: string): Promise<ServiceResult<{ handle: string; url: string; title: string }>> {
    try {
      const params = new URLSearchParams({ part: 'snippet', mine: 'true' });
      const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return { success: false, error: data?.error?.message || `YouTube API failed (${response.status})` };
      }

      const items = data?.items || [];
      if (items.length === 0) {
        return { success: false, error: 'No YouTube channel found for this Google account.' };
      }

      const channel = items[0];
      const title = channel.snippet?.title || '';
      const handle = channel.snippet?.customUrl || '';
      const channelId = channel.id;
      const url = handle ? `https://youtube.com/${handle}` : `https://youtube.com/channel/${channelId}`;

      return { success: true, data: { handle, url, title } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch YouTube channel',
      };
    }
  },

  async getVideoDetails(videoId: string): Promise<ServiceResult<{ items: YouTubeVideoDetails[] }>> {
    const params = new URLSearchParams({
      action: 'video-details',
      videoId,
    });

    return proxyFetch(`${YOUTUBE_PROXY_URL}?${params}`, {
      method: 'GET',
      headers: proxyHeaders(),
    });
  },
};

export default YouTubeService;
