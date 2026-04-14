import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

const MAX_QUERIES_PER_REFRESH = 3;
const MAX_RESULTS_PER_QUERY = 8;
const MAX_MERGED_RESULTS = 20;
const USER_REFRESH_COOLDOWN_MS = 10 * 60 * 1000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const USER_HOURLY_CAP = 6;
const GLOBAL_DAILY_CAP = Number(Deno.env.get('YOUTUBE_DAILY_CAP') || '300');

type CachedResponse = {
  expiresAt: number;
  payload: unknown;
};

const responseCache = new Map<string, CachedResponse>();
const userLastRequest = new Map<string, number>();
const userWindowCounts = new Map<string, { windowStart: number; count: number }>();
let globalWindowStart = Date.now();
let globalDailyCount = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const hashText = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

const normalizeLocation = (location?: string | null): string => {
  if (!location) return '';
  return location.trim().toLowerCase();
};

const tokenizePreference = (value?: string | null): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);
};

const buildQueryCandidates = (params: {
  location?: string | null;
  cuisine?: string | null;
  diet?: string | null;
}): string[] => {
  const location = normalizeLocation(params.location);
  const cuisines = tokenizePreference(params.cuisine);
  const diets = tokenizePreference(params.diet);

  const cuisinePrimary = cuisines[0] || 'local';
  const dietPrimary = diets[0] || '';

  const queries = [
    `${location || 'local'} ${cuisinePrimary} street food shorts`.trim(),
    `${location || 'local'} ${dietPrimary} cooking recipes shorts`.trim(),
    `${cuisinePrimary} chef techniques shorts`.trim(),
  ];

  return Array.from(new Set(queries.map((query) => query.replace(/\s+/g, ' ').trim()))).slice(0, MAX_QUERIES_PER_REFRESH);
};

const fetchYouTubeSearch = async (
  query: string, 
  maxResults: number, 
  regionCode?: string | null,
  location?: string | null,
  locationRadius?: string | null
) => {
  const youtubeUrl = new URL(`${YOUTUBE_BASE_URL}/search`);
  youtubeUrl.searchParams.set('q', query);
  youtubeUrl.searchParams.set('key', YOUTUBE_API_KEY || '');
  youtubeUrl.searchParams.set('part', 'snippet');
  youtubeUrl.searchParams.set('maxResults', String(Math.min(Math.max(maxResults, 1), MAX_RESULTS_PER_QUERY)));
  youtubeUrl.searchParams.set('type', 'video');
  youtubeUrl.searchParams.set('videoDuration', 'short');
  youtubeUrl.searchParams.set('order', 'relevance');
  youtubeUrl.searchParams.set('relevanceLanguage', 'en');
  if (regionCode && regionCode.length === 2) {
    youtubeUrl.searchParams.set('regionCode', regionCode.toUpperCase());
  }

  // Handle native location parameters if provided as coordinates (lat,lng)
  if (location) {
    // Regex to match "lat,lng" or "near lat,lng"
    const coordMatch = location.match(/([-+]?\d+(\.\d+)?),\s*([-+]?\d+(\.\d+)?)/);
    if (coordMatch) {
      const latLng = `${coordMatch[1]},${coordMatch[3]}`;
      youtubeUrl.searchParams.set('location', latLng);
      youtubeUrl.searchParams.set('locationRadius', locationRadius || '50km');
      console.log(`[YouTubeProxy] Using native geo-anchor: ${latLng} with ${locationRadius || '50km'} radius`);
    }
  }

  const response = await fetch(youtubeUrl.toString());
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'YouTube API error');
  }

  return data;
};

const pruneExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (value.expiresAt <= now) {
      responseCache.delete(key);
    }
  }
};

const resetGlobalWindowIfNeeded = () => {
  const now = Date.now();
  if ((now - globalWindowStart) >= 24 * 60 * 60 * 1000) {
    globalWindowStart = now;
    globalDailyCount = 0;
  }
};

const trackUserWindow = (userHash: string) => {
  const now = Date.now();
  const existing = userWindowCounts.get(userHash);
  if (!existing || (now - existing.windowStart) >= 60 * 60 * 1000) {
    userWindowCounts.set(userHash, { windowStart: now, count: 1 });
    return 1;
  }

  existing.count += 1;
  userWindowCounts.set(userHash, existing);
  return existing.count;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!YOUTUBE_API_KEY) {
      console.error('YouTube API key not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'YouTube API key not configured on server' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'personalized-trims') {
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ success: false, error: 'Use POST for personalized-trims' }),
          {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const body = await req.json().catch(() => ({}));
      const userHash = String(body?.userHash || 'anonymous').slice(0, 128);
      const requestedQueries = Array.isArray(body?.queries) ? body.queries.filter((q: unknown) => typeof q === 'string') : [];
      const queries = (requestedQueries.length > 0
        ? requestedQueries.slice(0, MAX_QUERIES_PER_REFRESH)
        : buildQueryCandidates({
            location: typeof body?.location === 'string' ? body.location : null,
            cuisine: typeof body?.cuisine === 'string' ? body.cuisine : null,
            diet: typeof body?.diet === 'string' ? body.diet : null,
          })
      ).map((query: string) => query.trim()).filter(Boolean);

      if (queries.length === 0) {
        return new Response(
          JSON.stringify({ success: true, data: { items: [], source: 'fallback', reason: 'no_queries' } }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const maxResultsPerQuery = Math.min(Math.max(Number(body?.maxResultsPerQuery || MAX_RESULTS_PER_QUERY), 1), MAX_RESULTS_PER_QUERY);
      const regionCode = typeof body?.regionCode === 'string' ? body.regionCode : null;
      const location = typeof body?.location === 'string' ? body.location : null;
      const locationRadius = typeof body?.locationRadius === 'string' ? body.locationRadius : '50km';
      const normalizedRegionCode = typeof regionCode === 'string' && regionCode.length === 2 ? regionCode.toUpperCase() : '';
      const cuisine = typeof body?.cuisine === 'string' ? body.cuisine : '';
      const diet = typeof body?.diet === 'string' ? body.diet : '';
      const profileHash = hashText(`${normalizeLocation(location)}|${cuisine}|${diet}|${normalizedRegionCode}`);
      const cacheKey = `trims:${userHash}:${profileHash}:${hashText(queries.join('|'))}`;

      pruneExpiredCache();
      resetGlobalWindowIfNeeded();

      const now = Date.now();
      const cached = responseCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return new Response(
          JSON.stringify({ success: true, data: { ...(cached.payload as Record<string, unknown>), source: 'cache' } }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const lastRequestAt = userLastRequest.get(userHash) || 0;
      if ((now - lastRequestAt) < USER_REFRESH_COOLDOWN_MS && cached) {
        return new Response(
          JSON.stringify({ success: true, data: { ...(cached.payload as Record<string, unknown>), source: 'cache', reason: 'cooldown' } }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const userWindowCount = trackUserWindow(userHash);
      if (userWindowCount > USER_HOURLY_CAP || globalDailyCount >= GLOBAL_DAILY_CAP) {
        return new Response(
          JSON.stringify({ success: true, data: { items: [], source: 'fallback', reason: userWindowCount > USER_HOURLY_CAP ? 'user_rate_limited' : 'global_quota_limited' } }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const merged = new Map<string, unknown>();
      const errors: string[] = [];
      const startedAt = Date.now();

      for (const query of queries) {
        try {
          globalDailyCount += 1;
          const data = await fetchYouTubeSearch(query, maxResultsPerQuery, regionCode, location, locationRadius);
          const items = Array.isArray(data?.items) ? data.items : [];
          for (const item of items) {
            const id = item?.id?.videoId;
            if (!id || merged.has(id)) continue;
            merged.set(id, item);
            if (merged.size >= MAX_MERGED_RESULTS) break;
          }
          if (merged.size >= MAX_MERGED_RESULTS) break;
        } catch (error) {
          errors.push(error instanceof Error ? error.message : 'unknown_error');
        }
      }

      userLastRequest.set(userHash, now);

      const payload = {
        items: Array.from(merged.values()).slice(0, MAX_MERGED_RESULTS),
        source: merged.size > 0 ? 'live' : 'fallback',
        queryCount: queries.length,
        cacheStatus: 'miss',
        errorCount: errors.length,
      };

      responseCache.set(cacheKey, {
        expiresAt: now + CACHE_TTL_MS,
        payload,
      });

      console.log(JSON.stringify({
        event: 'trims_personalized_fetch',
        userHash,
        source: payload.source,
        queryCount: queries.length,
        resultCount: payload.items.length,
        errorCount: errors.length,
        latencyMs: Date.now() - startedAt,
      }));

      return new Response(
        JSON.stringify({ success: true, data: payload }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } else if (action === 'search') {
      // Search videos
      const q = url.searchParams.get('q');
      const maxResults = url.searchParams.get('maxResults') || '8';
      const order = url.searchParams.get('order') || 'relevance';

      if (!q) {
        return new Response(
          JSON.stringify({ success: false, error: 'Query parameter "q" is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const youtubeUrl = new URL(`${YOUTUBE_BASE_URL}/search`);
      youtubeUrl.searchParams.set('q', q);
      youtubeUrl.searchParams.set('key', YOUTUBE_API_KEY);
      youtubeUrl.searchParams.set('part', 'snippet');
      youtubeUrl.searchParams.set('maxResults', maxResults);
      youtubeUrl.searchParams.set('type', 'video');
      youtubeUrl.searchParams.set('videoDuration', 'short');
      youtubeUrl.searchParams.set('order', order);
      youtubeUrl.searchParams.set('relevanceLanguage', 'en');

      const response = await fetch(youtubeUrl.toString());
      const data = await response.json();

      if (!response.ok) {
        console.error('YouTube API error:', data);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: data.error?.message || 'YouTube API error',
            details: data 
          }),
          { 
            status: response.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else if (action === 'video-details') {
      // Get video details
      const videoId = url.searchParams.get('videoId');

      if (!videoId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Parameter "videoId" is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const youtubeUrl = new URL(`${YOUTUBE_BASE_URL}/videos`);
      youtubeUrl.searchParams.set('key', YOUTUBE_API_KEY);
      youtubeUrl.searchParams.set('id', videoId);
      youtubeUrl.searchParams.set('part', 'snippet,statistics');

      const response = await fetch(youtubeUrl.toString());
      const data = await response.json();

      if (!response.ok) {
        console.error('YouTube API error:', data);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: data.error?.message || 'YouTube API error',
            details: data 
          }),
          { 
            status: response.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid action. Use "search" or "video-details"' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in youtube-proxy:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
