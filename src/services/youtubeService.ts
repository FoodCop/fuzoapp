import axios from 'axios';

const cleanEnv = (value: string | undefined) => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  const withoutLeading = (trimmed.startsWith('"') || trimmed.startsWith("'")) ? trimmed.slice(1) : trimmed;
  return (withoutLeading.endsWith('"') || withoutLeading.endsWith("'")) ? withoutLeading.slice(0, -1) : withoutLeading;
};

const SUPABASE_URL = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_ANON_KEY = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);
const YOUTUBE_PROXY_URL = `${SUPABASE_URL}/functions/v1/youtube-proxy`;

interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

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

export const YouTubeService = {
  async searchVideos(query: string, maxResults = 12): Promise<ServiceResult<{ items: YouTubeSearchItem[] }>> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return {
        success: false,
        error: 'Supabase env vars missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
      };
    }

    try {
      const response = await axios.get(YOUTUBE_PROXY_URL, {
        params: {
          action: 'search',
          q: query,
          maxResults,
          order: 'relevance',
        },
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        timeout: 10000,
      });

      if (!response.data?.success) {
        return { success: false, error: response.data?.error || 'YouTube proxy request failed' };
      }

      return { success: true, data: response.data.data };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || error.message,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  async getLocalizedTrimsFeed(payload: LocalizedTrimsRequest): Promise<ServiceResult<LocalizedTrimsResponse>> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return {
        success: false,
        error: 'Supabase env vars missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
      };
    }

    try {
      const response = await axios.post(`${YOUTUBE_PROXY_URL}?action=personalized-trims`, payload, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (!response.data?.success) {
        return { success: false, error: response.data?.error || 'YouTube personalized trims request failed' };
      }

      return { success: true, data: response.data.data };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || error.message,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  /**
   * Fetches the user's YouTube channel handle using a Google Access Token.
   */
  async getMyChannel(accessToken: string): Promise<ServiceResult<{ handle: string; url: string; title: string }>> {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'snippet',
          mine: true,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const items = response.data?.items || [];
      if (items.length === 0) {
        return { success: false, error: 'No YouTube channel found for this Google account.' };
      }

      const channel = items[0];
      const title = channel.snippet?.title || '';
      const handle = channel.snippet?.customUrl || '';
      const channelId = channel.id;
      const url = handle ? `https://youtube.com/${handle}` : `https://youtube.com/channel/${channelId}`;

      return {
        success: true,
        data: { handle, url, title },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error?.message || error.message,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch YouTube channel',
      };
    }
  },

  async getVideoDetails(videoId: string): Promise<ServiceResult<any>> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return {
        success: false,
        error: 'Supabase env vars missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
      };
    }

    try {
      const response = await axios.get(YOUTUBE_PROXY_URL, {
        params: {
          action: 'video-details',
          videoId,
        },
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        timeout: 10000,
      });

      if (!response.data?.success) {
        return { success: false, error: response.data?.error || 'YouTube proxy request failed' };
      }

      return { success: true, data: response.data.data };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || error.message,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },
};

export default YouTubeService;
