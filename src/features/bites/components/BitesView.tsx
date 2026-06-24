/**
 * ============================================================================
 * BITES FEATURE â€” Recipe Discovery + AI Recipe Studio
 * ============================================================================
 * 
 * Extracted from index.tsx for modular maintainability.
 * Contains: useBitesFeed hook, BitesGrid, BitesRecipeModal, 
 *           BitesControls, AIRecipeStudio, BitesView
 * 
 * @see docs/GUIDES/BITES_STUDIO_READY_RECKONER.md
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, ChefHat, Clock, User, X, Star, Loader2,
  Bookmark, Share2, RefreshCw, SlidersHorizontal, Sparkles,
  List, PieChart, Image as ImageIcon, CheckCircle2, Check, Send
} from 'lucide-react';
import { UGC_CUISINES, normalizeTag, TAXONOMY_KEYWORD_MAP, getSearchableDishTypes } from '../../../shared/utils/taxonomy';
import { Badge } from '../../../shared/ui/Badge';
import { StudioStepper } from '../../../shared/ui/StudioStepper';
import { BitesSkeleton } from '../../../shared/ui/Skeleton';
import { readImageFileAsDataUrl, parseAiJson } from '../../../shared/lib/studioHelpers';
import { NeuralReveal } from '../../../shared/ui/NeuralReveal';
import { BITE_CUISINES, BITE_DIETS } from '../constants/filters';
import { FeedService } from '../../feed';
import UgcFilterBar from '../../../shared/ui/UgcFilterBar';
import { BITE_FALLBACK_RECIPES } from '../constants/fallbackRecipes';
import { createBiteRecipeActions, getBiteKeyNutrients, normalizeRecipeList } from '../lib/bitesHelpers';
import type { BiteActionItem, BiteRecipe, BiteRecipeInput } from '../types/bites';
import { GeminiService } from '../../../services/geminiService';
import { MetaService } from '../../../services/metaService';
import { shouldApplyLatestRequest } from '../../../shared/utils/async';
import { supabase, hasSupabaseConfig } from '../../../services/supabaseClient';
import type { AppItem } from '../../../shared/types/appItem';
import type { ChatInboxItem } from '../../chat/types/chatUi';
import type { IconComponent } from '../../../shared/types/ui';
import { YouTubeService } from '../../../services/youtubeService';

// Lightweight motion shims (same as index.tsx)
type LightweightMotionProps = { children?: React.ReactNode;[key: string]: unknown; };
const MotionDiv = ({ children, initial: _i, animate: _a, exit: _e, transition: _t, whileHover: _wh, whileTap: _wt, ...rest }: LightweightMotionProps) => <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
const motion = { div: MotionDiv, img: (props: any) => <img {...props} />, section: (props: any) => <section {...props} />, h1: (props: any) => <h1 {...props} />, h2: (props: any) => <h2 {...props} />, p: (props: any) => <p {...props} />, span: (props: any) => <span {...props} /> };
const AnimatePresence = ({ children }: { children?: React.ReactNode; mode?: string; initial?: boolean }) => <>{children}</>;
const BITES_AI_TAG_OPTIONS = ['Recipe Card', 'Food Hacks', 'Kitchen Tricks', 'Weird Combos'] as const;
type BitesAiTag = (typeof BITES_AI_TAG_OPTIONS)[number];


const isYouTubeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(trimmed);
};

const isMetaUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch|instagram\.com|instagr\.am)\//i.test(trimmed);
};

const isSupportedMediaUrl = (value: string) => isYouTubeUrl(value) || isMetaUrl(value);

const filterFriendsByQuery = (friends: ChatInboxItem[], query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return friends;

  return friends.filter((friend) => {
    const username = 'username' in friend ? String(friend.username || '').toLowerCase() : '';
    const handle = 'handle' in friend ? String(friend.handle || '').toLowerCase() : '';
    const displayName = String(friend.name || '').toLowerCase();
    const displayNameRaw = 'display_name' in friend ? String(friend.display_name || '').toLowerCase() : '';
    const email = 'email' in friend ? String(friend.email || '').toLowerCase() : '';

    return username.includes(normalized) || 
           handle.includes(normalized) || 
           displayName.includes(normalized) || 
           displayNameRaw.includes(normalized) || 
           email.includes(normalized);
  });
};

const TRIM_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    author: { type: 'string' },
    caption: { type: 'string' },
    likes: { type: 'string' },
    sourceUrl: { type: 'string' },
    summary: { type: 'string' },
    keyFoodItem: { type: 'string' },
    location: { type: 'string' },
    cuisineTags: { type: 'array', items: { type: 'string' } },
    thumbnailUrl: { type: 'string' },
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
  required: ['title', 'author', 'caption', 'likes', 'summary', 'keyFoodItem', 'cuisineTags', 'nutrition'],
};

const fetchYouTubeOEmbedContext = async (url: string) => {
  if (!isYouTubeUrl(url)) return '';

  try {
    const oEmbed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!oEmbed.ok) return '';
    const oEmbedJson = await oEmbed.json();
    const title = typeof oEmbedJson?.title === 'string' ? oEmbedJson.title : '';
    const author = typeof oEmbedJson?.author_name === 'string' ? oEmbedJson.author_name : '';
    const thumbnail = typeof oEmbedJson?.thumbnail_url === 'string' ? oEmbedJson.thumbnail_url : '';
    return `oEmbed title: ${title}\noEmbed author: ${author}\noEmbed thumbnail: ${thumbnail}`;
  } catch {
    return '';
  }
};

const buildTrimPrompt = ({
  description,
  effectiveUrl,
  hasYoutubeUrl,
  oEmbedContext,
  taxonomy,
}: {
  description: string;
  effectiveUrl: string;
  hasYoutubeUrl: boolean;
  oEmbedContext: any;
  taxonomy?: any;
}) => {
  const taxonomyRule = taxonomy
    ? `\nCRITICAL: Use ONLY these cuisine tags: ${taxonomy.cuisines.join(', ')}. Use ONLY these vibes: ${taxonomy.vibes.join(', ')}. Do NOT add "Cuisine" suffix.`
    : '';

  return `You are a culinary neural analyst. Build a clean JSON trim card.
${taxonomyRule}
Context: ${description}
URL: ${effectiveUrl}
${(hasYoutubeUrl || isMetaUrl(effectiveUrl)) ? 'Target: Social Content Extraction' : 'Target: Vertical Media Analysis'}
${oEmbedContext ? `Metadata: ${JSON.stringify(oEmbedContext)}` : ''}
Required fields: title, summary, keyFoodItem, location (city/neighborhood), cuisineTags (array), caption.`;
};

const buildTrimPromptParts = ({
  prompt,
  video,
  videoMimeType,
}: {
  prompt: string;
  video: string | null;
  videoMimeType: string;
}) => {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
  if (video?.includes(',')) {
    parts.push({
      inlineData: {
        mimeType: videoMimeType,
        data: video.split(',')[1],
      },
    });
  }
  return parts;
};

const buildMockTrimCard = (description: string) => {
  const normalizedDescription = description.split(/#mock\b/gi).join('').trim();
  return {
    title: normalizedDescription || 'Mock Smoke Test Trim',
    author: 'FUZO QA Mock Studio',
    caption: normalizedDescription
      ? `${normalizedDescription} (mock smoke test card)`
      : 'Mock smoke test card generated from uploaded video context.',
    likes: '1.2k',
    nutrition: {
      calories: 320,
      protein: 18,
      fat: 11,
      carbs: 28,
    },
  };
};

type GeneratedTrimCard = {
  title?: string;
  author?: string;
  caption?: string;
  likes?: string;
  sourceUrl?: string;
  summary?: string;
  keyFoodItem?: string;
  location?: string;
  cuisineTags?: string[];
  thumbnailUrl?: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  };
};

const extractYouTubeVideoId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
};

const requestGeneratedTrimCard = async ({
  description,
  effectiveUrl,
  video,
  videoMimeType,
  taxonomy,
}: {
  description: string;
  effectiveUrl: string;
  video: string | null;
  videoMimeType: string;
  taxonomy?: any;
}): Promise<GeneratedTrimCard> => {
  const hasYoutubeUrl = isYouTubeUrl(effectiveUrl);
  const hasMetaUrl = isMetaUrl(effectiveUrl);

  if (/#mock\b/i.test(description) && !hasYoutubeUrl && !hasMetaUrl) {
    return buildMockTrimCard(description);
  }

  if (hasYoutubeUrl) {
    const videoId = extractYouTubeVideoId(effectiveUrl);
    let title = 'YouTube Trim';
    let author = 'FUZO Studio';
    let thumbnail = '';
    let videoDesc = '';

    if (videoId) {
      try {
        const detailsResult = await YouTubeService.getVideoDetails(videoId);
        if (detailsResult.success && detailsResult.data?.items?.length > 0) {
          const item = detailsResult.data.items[0];
          title = item.snippet?.title || title;
          author = item.snippet?.channelTitle || author;
          thumbnail = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || thumbnail;
          videoDesc = item.snippet?.description || '';
        }
      } catch (e) {
        // Silently continue
      }
    }

    if (!title || title === 'YouTube Trim') {
      try {
        const oEmbed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(effectiveUrl)}&format=json`);
        if (oEmbed.ok) {
          const oEmbedJson = await oEmbed.json();
          title = typeof oEmbedJson?.title === 'string' ? oEmbedJson.title : title;
          author = typeof oEmbedJson?.author_name === 'string' ? oEmbedJson.author_name : author;
          thumbnail = typeof oEmbedJson?.thumbnail_url === 'string' ? oEmbedJson.thumbnail_url : thumbnail;
        }
      } catch (e) {}
    }

    const taxonomyRule = taxonomy 
      ? `\nCRITICAL: Use ONLY these cuisine tags: ${taxonomy.cuisines.join(', ')}. Use ONLY these vibes: ${taxonomy.vibes.join(', ')}. Do NOT add "Cuisine" suffix.`
      : '';
    const textPrompt = `You are a culinary neural analyst. Build a clean JSON trim card based on this YouTube video metadata.
${taxonomyRule}
User Context: ${description}
YouTube Title: ${title}
YouTube Description: ${videoDesc}
URL: ${effectiveUrl}
Target: YouTube Content Extraction
Required fields: title, summary, keyFoodItem, location (city/neighborhood), cuisineTags (array), caption.`;

    try {
      const response = await GeminiService.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: TRIM_RESPONSE_SCHEMA,
        },
      });
      if (response.success && response.data?.text) {
        const parsed = parseAiJson(response.data.text);
        if (parsed?.title) {
          return {
            ...parsed,
            sourceUrl: parsed.sourceUrl || effectiveUrl,
            thumbnailUrl: parsed.thumbnailUrl || thumbnail || undefined,
          };
        }
      }
    } catch (e) {
      console.warn("Text-only Gemini extraction failed, returning generic metadata.", e);
    }

    return {
      title,
      author,
      caption: description || title,
      likes: '1.0k',
      sourceUrl: effectiveUrl,
      summary: title,
      keyFoodItem: 'Unknown',
      location: 'Global',
      cuisineTags: [],
      thumbnailUrl: thumbnail || undefined,
      nutrition: {
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0
      }
    };
  }

  let oEmbedContext = '';
  if (hasYoutubeUrl) {
    oEmbedContext = await fetchYouTubeOEmbedContext(effectiveUrl);
  } else if (hasMetaUrl) {
    oEmbedContext = await MetaService.fetchMetaOEmbedContext(effectiveUrl);
  }
  
  const prompt = buildTrimPrompt({
    description,
    effectiveUrl,
    hasYoutubeUrl,
    oEmbedContext,
    taxonomy,
  });
  const parts = buildTrimPromptParts({ prompt, video, videoMimeType });

  const response = await GeminiService.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: TRIM_RESPONSE_SCHEMA,
    },
  });

  if (!response.success || !response.data?.text) {
    throw new Error(response.error || 'Gemini generation failed');
  }

  const parsed = parseAiJson(response.data.text);
  if (!parsed?.title) {
    throw new Error('Invalid AI response format');
  }

  return {
    ...parsed,
    sourceUrl: parsed.sourceUrl || undefined,
    thumbnailUrl: parsed.thumbnailUrl || undefined,
  };
};

const toStringOr = (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback);

const toNumberOr = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
};

const toOptionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);


const ONBOARDING_V2_ENABLED = String(import.meta.env.VITE_ONBOARDING_V2_ENABLED || '').toLowerCase() === 'true';

// --- SHARED UI COMPONENTS ---

// Badge moved to src/shared/ui/Badge.tsx


const InstagramMark: IconComponent = ({ size = 18, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37a4 4 0 1 1-2.76-2.76A4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookMark: IconComponent = ({ size = 18, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

// --- SHARE MODAL ---

const ShareModal = ({ item, friends, onShare, onClose }: { item: AppItem, friends: ChatInboxItem[], onShare: (friendId: string | number, item: AppItem) => void, onClose: () => void }) => {
  const [sentTo, setSentTo] = useState<Array<string | number>>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const filteredFriends = useMemo(() => filterFriendsByQuery(friends, friendSearch), [friends, friendSearch]);

  const handleShareClick = (friendId: string | number) => {
    if (sentTo.includes(friendId)) return;
    onShare(friendId, item);
    setSentTo(prev => [...prev, friendId]);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Share with friend" className="fixed inset-0 z-[600] bg-stone-900/60 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-10 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-[4rem] md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-20 duration-500">
        <header className="p-10 border-b flex justify-between items-center bg-stone-50">
          <div>
            <Badge color="yellow">Studio Share</Badge>
            <h3 className="text-3xl font-black uppercase tracking-tighter mt-1">Send to Friend</h3>
          </div>
          <button onClick={onClose} className="p-4 bg-white rounded-3xl shadow-sm hover:scale-105 transition-transform"><X size={24} /></button>
        </header>

        <div className="p-10 flex items-center gap-6 border-b">
          <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-lg shrink-0">
            <img src={item.img} alt={item.name || 'Shared item'} className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="font-black uppercase text-xl leading-none">{item.name}</h4>
            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-stone-400 mt-2">{item.cat}</p>
          </div>
        </div>

        <div className="p-8 max-h-[50vh] overflow-y-auto space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
            <input
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              placeholder="Search username, name, or handle..."
              className="w-full bg-stone-50 pl-12 pr-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest outline-none border border-stone-100 focus:ring-4 focus:ring-yellow-400/10"
            />
          </div>
          <h5 className="px-2 text-[12px] font-black uppercase tracking-widest text-stone-500">Active Contacts</h5>
          {filteredFriends.map(friend => (
            <button
              type="button"
              key={friend.id}
              onClick={() => handleShareClick(friend.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleShareClick(friend.id);
                }
              }}
              tabIndex={0}
              className="flex items-center justify-between px-2 py-4 w-full text-left border-b border-stone-100 last:border-b-0 hover:bg-stone-50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-4">
                <img src={friend.avatar} alt={friend.name || 'Friend avatar'} className="w-12 h-12 rounded-full border border-stone-200" />
                <div>
                  <span className="font-black uppercase text-xs tracking-widest block">{friend.name}</span>
                </div>
              </div>
              {sentTo.includes(friend.id) && (
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 size={24} strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
          {filteredFriends.length === 0 && (
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100 text-[12px] font-black uppercase tracking-widest text-stone-400 text-center">
              No friends found.
            </div>
          )}
        </div>

        <footer className="p-10 bg-stone-50 text-center">
          <button
            onClick={onClose}
            className="w-full py-5 bg-stone-900 text-white rounded-[2rem] flex items-center justify-center shadow-xl active:scale-95 transition-transform"
          >
            <Check size={24} strokeWidth={3} />
          </button>
        </footer>
      </div>
    </div>
  );
};
// --- VIEWS ---


// --- SECTION: DATA LOGIC (Hooks) ---

/**
 * HOOK: useBitesFeed
 * Manages the data-lifecycle for the 'Discovery' mode.
 * Integrates Spoonacular for real-time recipes, with curated fallbacks.
 */
const useBitesFeed = () => {
  const [recipes, setRecipes] = useState<BiteRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDiet, setActiveDiet] = useState<string | null>(null);
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const bitesRequestSeqRef = useRef(0);
  const bitesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bitesMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      bitesMountedRef.current = false;
      if (bitesDebounceRef.current) {
        clearTimeout(bitesDebounceRef.current);
      }
    };
  }, []);

  // Reset page to 0 when search query or filter chips change
  useEffect(() => {
    setActivePage(0);
  }, [searchQuery, activeDiet, activeCuisine]);

  const fetchBites = useCallback(async (_isRefresh = false, queryOverride?: string) => {
    const requestSeq = ++bitesRequestSeqRef.current;
    setLoading(true);
    setServiceError('');
    const effectiveQuery = (queryOverride ?? searchQuery).trim();

    try {
      if (!hasSupabaseConfig || !supabase) {
        throw new Error('Supabase not configured');
      }

      let query = supabase
        .from('recipes')
        .select('*', { count: 'exact' });

      if (effectiveQuery) {
        // Dynamic list of meal types and dish categories directly from taxonomy
        const KNOWN_DISH_TYPES = getSearchableDishTypes();
        
        const queryLower = effectiveQuery.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(Boolean);
        const matchingDishTypes = KNOWN_DISH_TYPES.filter(dt => {
          const dtLower = dt.toLowerCase();
          return queryWords.some(word => dtLower.includes(word));
        });
        
        if (matchingDishTypes.length > 0) {
          const dishTypeString = `{${matchingDishTypes.map(t => `"${t}"`).join(',')}}`;
          query = query.or(`title.ilike."*${effectiveQuery}*",dish_types.ov.${dishTypeString}`);
        } else {
          query = query.ilike('title', `*${effectiveQuery}*`);
        }
      }

      if (activeDiet) {
        query = query.contains('diets', [activeDiet.toLowerCase()]);
      }

      if (activeCuisine) {
        query = query.contains('cuisines', [activeCuisine.toLowerCase()]);
      }

      // Order by ID or created_at for stable pagination
      query = query.order('id', { ascending: true });

      const from = activePage * 12;
      const to = from + 11;
      const { data, count, error } = await query.range(from, to);

      if (error) {
        throw error;
      }

      const isLatestRequest = shouldApplyLatestRequest(bitesMountedRef, requestSeq, bitesRequestSeqRef);

      if (isLatestRequest) {
        if (data && data.length > 0) {
          const normalized = normalizeRecipeList(data as unknown as BiteRecipeInput[]);
          setRecipes(normalized);
          setTotalResults(count || normalized.length);
        } else {
          // If no results match search, return empty instead of fallbacks
          setRecipes([]);
          setTotalResults(0);
        }
      }
    } catch (err) {
      if (shouldApplyLatestRequest(bitesMountedRef, requestSeq, bitesRequestSeqRef)) {
        setRecipes(BITE_FALLBACK_RECIPES);
        setTotalResults(BITE_FALLBACK_RECIPES.length);
        setServiceError('Unable to load live bites. Showing curated fallback recipes.');
      }
    }

    if (shouldApplyLatestRequest(bitesMountedRef, requestSeq, bitesRequestSeqRef)) {
      setLoading(false);
    }
  }, [activeCuisine, activeDiet, searchQuery, activePage]);

  useEffect(() => {
    if (bitesDebounceRef.current) {
      clearTimeout(bitesDebounceRef.current);
    }

    bitesDebounceRef.current = setTimeout(() => {
      fetchBites(false, searchQuery);
    }, 350);

    return () => {
      if (bitesDebounceRef.current) {
        clearTimeout(bitesDebounceRef.current);
      }
    };
  }, [searchQuery, fetchBites]);

  const filteredRecipes = recipes;

  // Autocomplete Suggestions Engine
  const autocompleteSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    
    // Add default cuisines and diets
    BITE_CUISINES.forEach((c) => suggestions.add(c));
    BITE_DIETS.forEach((d) => suggestions.add(d));

    // Extract terms from loaded recipe titles
    recipes.forEach((r) => {
      r.title.split(/\s+/).forEach((word) => {
        const clean = word.replace(/[^a-zA-Z]/g, '');
        if (clean.length > 3) {
          const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
          suggestions.add(capitalized);
        }
      });
    });

    return Array.from(suggestions);
  }, [recipes]);

  const matchingSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return autocompleteSuggestions
      .filter((s) => s.toLowerCase().includes(query) && s.toLowerCase() !== query)
      .slice(0, 5);
  }, [searchQuery, autocompleteSuggestions]);

  // Filter chips dynamic relevancy
  const relevantDiets = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const dietsInRecipes = new Set<string>();
    recipes.forEach((r) => {
      (r.diets || []).forEach((d) => dietsInRecipes.add(d.toLowerCase()));
      const titleLower = r.title.toLowerCase();
      if (titleLower.includes('vegetarian') || titleLower.includes('veg')) dietsInRecipes.add('vegetarian');
      if (titleLower.includes('vegan')) dietsInRecipes.add('vegan');
      if (titleLower.includes('gluten')) dietsInRecipes.add('gluten free');
      if (titleLower.includes('keto')) dietsInRecipes.add('ketogenic');
      if (titleLower.includes('paleo')) dietsInRecipes.add('paleo');
    });
    return BITE_DIETS.filter((d) => dietsInRecipes.has(d.toLowerCase()));
  }, [recipes, searchQuery]);

  const relevantCuisines = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const cuisinesInRecipes = new Set<string>();
    recipes.forEach((r) => {
      (r.cuisines || []).forEach((c) => cuisinesInRecipes.add(c.toLowerCase()));
      const titleLower = r.title.toLowerCase();
      BITE_CUISINES.forEach((cuisine) => {
        if (titleLower.includes(cuisine.toLowerCase())) {
          cuisinesInRecipes.add(cuisine.toLowerCase());
        }
      });
    });
    return BITE_CUISINES.filter((c) => cuisinesInRecipes.has(c.toLowerCase()));
  }, [recipes, searchQuery]);

  return {
    loading,
    serviceError,
    searchQuery,
    activeDiet,
    activeCuisine,
    filteredRecipes,
    matchingSuggestions,
    relevantDiets,
    relevantCuisines,
    setSearchQuery,
    setActiveDiet,
    setActiveCuisine,
    fetchBites,
    activePage,
    totalResults,
    setActivePage,
  };
};

// --- SECTION: UI COMPONENTS (Grid & Modals) ---

const BitesGrid = ({
  loading,
  filteredRecipes,
  onSelectRecipe,
  onReset,
}: {
  loading: boolean;
  filteredRecipes: BiteRecipe[];
  onSelectRecipe: (recipe: BiteRecipe) => void;
  onReset: () => void;
}) => {
  if (loading) {
    return <BitesSkeleton />;
  }

  if (filteredRecipes.length === 0) {
    return (
      <div className="py-20 text-center space-y-6">
        <Search size={48} className="mx-auto text-stone-200" />
        <p className="font-black uppercase text-xs tracking-widest text-stone-400">No matches in current pack</p>
        <button onClick={onReset} className="px-8 py-4 bg-stone-900 text-white rounded-2xl font-black uppercase text-[12px] tracking-widest">Refresh Feed</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {filteredRecipes.map((recipe) => (
        <button
          type="button"
          key={recipe.id}
          onClick={() => onSelectRecipe(recipe)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectRecipe(recipe);
            }
          }}
          tabIndex={0}
          className="group cursor-pointer text-left w-full h-full focus:outline-none"
        >
          <div className="relative rounded-[2rem] shadow-md overflow-hidden group-hover:scale-[1.02] group-focus:scale-[1.02] hover:shadow-xl transition-all duration-500 aspect-[4/5] w-full">
            <img src={recipe.image} alt={recipe.title || 'Recipe'} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
            
            <div className="absolute top-5 right-5 flex flex-col gap-2 items-end">
              <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl flex gap-1.5 items-center text-[10px] font-black uppercase tracking-widest text-stone-900 shadow-lg border border-white/20">
                <PieChart size={12} className="text-yellow-500" /> {(() => {
                  const cal = recipe.nutrition?.nutrients?.find((n: any) => n.name === 'Calories');
                  return cal ? `${Math.round(cal.amount)} Kcal` : '0 Kcal';
                })()}
              </div>
              <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl flex gap-1.5 items-center text-[10px] font-black uppercase tracking-widest text-stone-900 shadow-lg border border-white/20">
                <Clock size={12} className="text-yellow-500" /> {recipe.readyInMinutes || 0}m
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-2">
              <h3 className="text-lg font-black uppercase tracking-tighter text-white leading-tight drop-shadow-lg line-clamp-2">
                {recipe.title}
              </h3>
              <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap mask-fade-right">
                {(recipe.dishTypes || []).slice(0, 3).map((tag) => (
                  <span key={tag} className="shrink-0 text-[10px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-xl text-white shadow-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

/**
 * COMPONENT: BitesRecipeModal
 * Immersive full-screen detail view for a specific recipe.
 * Logic: Tab-based exploration of ingredients, process, and nutrition.
 */
const BitesRecipeModal = ({
  selectedRecipe,
  onClose,
  onSaveRecipe,
  onShareRecipe,
}: {
  selectedRecipe: BiteRecipe | null;
  onClose: () => void;
  onSaveRecipe: (recipe: BiteRecipe) => void;
  onShareRecipe: (recipe: BiteRecipe) => void;
}) => {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps' | 'nutrition'>('ingredients');
  const [successAction, setSuccessAction] = useState<'saved' | 'shared' | null>(null);
  if (!selectedRecipe) return null;

  const tabs = [
    { id: 'ingredients', label: 'Ingredients', icon: List },
    { id: 'steps', label: 'Steps', icon: ChefHat },
    { id: 'nutrition', label: 'Nutrition', icon: PieChart },
  ] as const;

  return (
    <div role="dialog" aria-modal="true" aria-label="Item details" className="fixed inset-0 z-[500] bg-stone-950/40 backdrop-blur-2xl flex items-center justify-center p-4 md:p-10 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative max-h-[90vh]"
      >
        <button
          onClick={onClose}
          aria-label="Close recipe details"
          className="absolute top-6 right-6 z-50 w-12 h-12 bg-stone-900/80 backdrop-blur-md text-white rounded-2xl flex items-center justify-center active:scale-90 transition-transform shadow-xl border border-stone-800"
        >
          <X size={24} />
        </button>

        {/* Top Side: Image */}
        <div className="w-full h-64 sm:h-80 overflow-hidden relative shrink-0">
          <img src={selectedRecipe.image} alt={selectedRecipe.title || 'Selected recipe'} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-8 right-8 text-white">
            <Badge color="yellow">Studio Pack #{selectedRecipe.id}</Badge>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter mt-2 leading-tight">{selectedRecipe.title}</h2>
          </div>
        </div>

        {/* Bottom Side: Content */}
        <div className="w-full flex-grow flex flex-col overflow-hidden bg-white relative">
          {/* Header Stats Bar */}
          <div className="px-8 pt-6 pb-0 space-y-4 shrink-0">
            <div className="flex flex-wrap gap-4 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-stone-400">
                <Clock size={16} className="text-yellow-500" /> {selectedRecipe.readyInMinutes} Mins
              </div>
              <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-stone-400">
                <User size={16} className="text-yellow-500" /> {selectedRecipe.servings} Serves
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="px-8 mt-4 shrink-0">
            <div className="flex bg-stone-50 p-1.5 rounded-2xl gap-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  <t.icon size={14} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-grow overflow-y-auto p-8 md:p-10 hide-scrollbar min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'ingredients' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 text-stone-900">
                      <List size={20} />
                      <h4 className="font-black uppercase text-xs tracking-widest">Fresh Ingredients</h4>
                    </div>
                    <ul className="grid grid-cols-1 gap-3">
                      {selectedRecipe.extendedIngredients?.map((ing) => (
                        <li key={String(ing.original)} className="group flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100/50 hover:bg-white hover:border-yellow-200 transition-all">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full group-hover:scale-125 transition-transform shrink-0" />
                          <span className="text-xs font-bold text-stone-600 leading-tight">{ing.original}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeTab === 'steps' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 text-stone-900">
                      <ChefHat size={20} />
                      <h4 className="font-black uppercase text-xs tracking-widest">Chef Instructions</h4>
                    </div>
                    <div className="space-y-3">
                      {selectedRecipe.analyzedInstructions && selectedRecipe.analyzedInstructions.length > 0
                        ? selectedRecipe.analyzedInstructions.map((step: any) => (
                          <div key={`analyzed-${step.number}`} className="flex gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100/50 hover:bg-white hover:border-yellow-200 transition-all">
                            <div className="flex items-center justify-center w-8 h-8 bg-yellow-400 text-stone-900 rounded-full font-black text-xs shrink-0">
                              {step.number}
                            </div>
                            <p className="text-sm font-bold text-stone-600 leading-relaxed pt-0.5">{step.step}</p>
                          </div>
                        ))
                        : selectedRecipe.instructions
                          ? (() => {
                            const steps = selectedRecipe.instructions
                              .split(/\n+|\.\s+(?=[A-Z])|(?:^\d+\.|^-|^\*)\s+/m)
                              .filter((line: string) => line.trim().length > 0);
                            return steps.map((step: string, idx: number) => (
                              <div key={`step-${idx}-${step.substring(0, 20)}`} className="flex gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100/50 hover:bg-white hover:border-yellow-200 transition-all">
                                <div className="flex items-center justify-center w-8 h-8 bg-yellow-400 text-stone-900 rounded-full font-black text-xs shrink-0">
                                  {idx + 1}
                                </div>
                                <p className="text-sm font-bold text-stone-600 leading-relaxed pt-0.5">{step.trim()}</p>
                              </div>
                            ));
                          })()
                          : (
                            <div className="p-4 text-stone-500 text-sm font-bold text-center">Consult Chef FUZO for detailed steps.</div>
                          )}
                    </div>
                  </div>
                )}

                {activeTab === 'nutrition' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 text-stone-900">
                      <PieChart size={20} />
                      <h4 className="font-black uppercase text-xs tracking-widest">Nutrition Pulse</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {getBiteKeyNutrients(selectedRecipe).map((n) => (
                        <div key={n.name} className="bg-stone-50 p-6 rounded-[2.5rem] border border-stone-100 flex flex-col justify-center hover:bg-white hover:shadow-md transition-all group">
                          <p className="text-2xl font-black text-stone-900 group-hover:text-yellow-600 transition-colors">
                            {Math.round(n.amount)} <span className="text-[12px] text-stone-400 font-bold uppercase tracking-widest ml-1">{n.unit}</span>
                          </p>
                          <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mt-1 truncate">{n.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sticky Footer */}
          <footer className="p-8 md:p-10 pt-4 bg-white/90 backdrop-blur-md border-t border-stone-50 flex gap-3 shrink-0 transition-all">
            <button
              onClick={() => {
                onSaveRecipe(selectedRecipe);
                setSuccessAction('saved');
              }}
              className="flex-1 py-4 md:py-5 bg-stone-900 text-white rounded-[1.5rem] md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl group"
            >
              <Bookmark size={18} className="md:size-[22px] group-hover:fill-white transition-all" />
              <span className="text-[11px] md:text-[12px] font-black uppercase tracking-widest">Save to Plate</span>
            </button>
            <button
              onClick={() => {
                onShareRecipe(selectedRecipe);
                setSuccessAction('shared');
              }}
              className="py-4 md:py-5 px-6 md:px-10 bg-yellow-400 text-stone-900 rounded-[1.5rem] md:rounded-2xl flex items-center justify-center hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
            >
              <Share2 size={18} className="md:size-[22px]" strokeWidth={3} />
            </button>
          </footer>
        </div>
      </motion.div>

      {/* Success Modal Overlay */}
      {successAction && (
        <div className="absolute inset-0 z-[600] bg-stone-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white p-10 w-full max-w-sm rounded-[3rem] shadow-2xl flex flex-col items-center">
            <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center text-stone-900 mb-6 shadow-xl">
              <Check size={48} strokeWidth={4} />
            </div>
            <h3 className="text-3xl font-black uppercase tracking-tighter text-stone-900 mb-2 leading-none">
              {successAction === 'saved' ? 'Saved to Plate' : 'Shared Successfully'}
            </h3>
            <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px] mb-10 leading-relaxed">
              {successAction === 'saved' ? 'Recipe is now in your personal collection' : 'Recipe sent to your active contacts'}
            </p>
            <button
              onClick={onClose}
              className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const BitesControls = ({
  loading,
  searchQuery,
  activeDiet,
  activeCuisine,
  showFilters,
  onSearchQueryChange,
  onSearchSubmit,
  onRefresh,
  onToggleFilters,
  onToggleDiet,
  onToggleCuisine,
}: {
  loading: boolean;
  searchQuery: string;
  activeDiet: string | null;
  activeCuisine: string | null;
  showFilters: boolean;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  onRefresh: () => void;
  onToggleFilters: () => void;
  onToggleDiet: (diet: string) => void;
  onToggleCuisine: (cuisine: string) => void;
}) => {
  return (
    <div className="space-y-6">
      <header className="hidden md:flex justify-between items-end">
        <div><Badge color="yellow">Daily Bites</Badge><h2 className="text-4xl font-black uppercase tracking-tighter mt-1">Recipe Packs</h2></div>
        <div className="flex gap-3">
          <button onClick={onRefresh} className="p-4 bg-white rounded-2xl shadow-sm hover:scale-105 transition-transform"><RefreshCw size={24} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <div className="flex flex-row gap-3 items-center">
        <div className="relative flex-grow">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300" size={20} />
          <input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSearchSubmit();
              }
            }}
            placeholder="Search specific tastes..."
            className="w-full bg-white pl-14 pr-16 py-5 rounded-[2rem] font-black text-xs uppercase outline-none focus:ring-4 focus:ring-yellow-400/10 transition-all shadow-sm border border-stone-100"
          />
          <button
            onClick={onSearchSubmit}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-stone-50 text-stone-900 hover:bg-stone-100 transition-all"
            aria-label="Search bites"
          >
            <Search size={20} strokeWidth={3} />
          </button>
        </div>
        <button
          onClick={onToggleFilters}
          className={`relative p-5 rounded-[2rem] flex items-center justify-center transition-all shrink-0 ${showFilters ? 'bg-stone-900 text-white shadow-xl' : 'bg-white text-stone-900 shadow-sm border'}`}
        >
          <SlidersHorizontal size={24} strokeWidth={3} />
          {(activeDiet || activeCuisine) && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 border-2 border-white" />}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-white space-y-8 animate-in slide-in-from-top-4 duration-500">
          <div className="space-y-4">
            <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-stone-300 px-2">Dietary Preferences</h4>
            <div className="flex flex-wrap gap-3">
              {BITE_DIETS.map((diet) => (
                <button
                  key={diet}
                  onClick={() => onToggleDiet(diet)}
                  className={`px-6 py-3 rounded-full text-[12px] font-black uppercase tracking-widest transition-all ${activeDiet === diet ? 'bg-yellow-400 text-stone-900 shadow-lg' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}
                >
                  {diet}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-stone-300 px-2">Global Cuisines</h4>
            <div className="flex flex-wrap gap-3">
              {BITE_CUISINES.map((cuisine) => (
                <button
                  key={cuisine}
                  onClick={() => onToggleCuisine(cuisine)}
                  className={`px-6 py-3 rounded-full text-[12px] font-black uppercase tracking-widest transition-all ${activeCuisine === cuisine ? 'bg-yellow-400 text-stone-900 shadow-lg' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// Standard Step Components for Bites Studio
// ---------------------------------------------------------------------------

const BitesSourceStep = ({ image, onUpload, onSkip }: { image: string | null, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, onSkip: () => void }) => {
  return (
    <div className="absolute inset-0 bg-stone-950 p-8 flex flex-col justify-center animate-in fade-in duration-500">
      <div className="max-w-xl mx-auto w-full space-y-12 text-center">
        <div className="space-y-4">
          <Badge color="yellow">Neural Vision</Badge>
          <h2 className="text-5xl font-black uppercase tracking-tighter italic text-white leading-none">The Plate</h2>
          <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Upload a dish image to seed the AI</p>
        </div>

        <div className="aspect-video bg-stone-900 rounded-[3rem] border-4 border-dashed border-stone-800 overflow-hidden group hover:border-yellow-400/50 transition-all relative">
          {image ? (
            <img src={image} alt="Recipe context" className="w-full h-full object-cover" />
          ) : (
            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
              <div className="w-20 h-20 bg-stone-800 rounded-2xl flex items-center justify-center text-stone-700 group-hover:text-yellow-400 transition-colors mb-4">
                <ImageIcon size={40} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">Choose Culinary Image</span>
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
          )}
        </div>

        <div className="flex justify-center gap-4">
          <button onClick={onSkip} className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] transition-all">Skip</button>
          {image && (
            <button onClick={onSkip} className="px-10 py-5 bg-white text-stone-950 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all">Next: Identity</button>
          )}
        </div>
      </div>
    </div>
  );
};

const BitesIdentityStep = ({ title, category, customCategory, onUpdate, onNext }: { title: string, category: string, customCategory: string, onUpdate: (data: any) => void, onNext: () => void }) => {
  return (
    <div className="absolute inset-0 bg-stone-950 p-8 flex flex-col justify-center animate-in slide-in-from-right duration-500">
      <div className="max-w-md mx-auto w-full space-y-12">
        <div className="space-y-4 text-center">
          <Badge color="yellow">Identity</Badge>
          <h2 className="text-5xl font-black uppercase tracking-tighter italic text-white leading-none">The Name</h2>
        </div>
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 ml-6">Dish Name</label>
            <input autoFocus value={title} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="e.g. Truffle Miso Ramen" className="w-full bg-stone-900/50 border-2 border-white/5 px-8 py-6 rounded-[2.5rem] font-black text-white text-xl uppercase tracking-tighter outline-none focus:border-yellow-400 focus:bg-stone-900 transition-all placeholder:text-stone-800" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 ml-6">Cuisine Category</label>
            <div className="grid grid-cols-2 gap-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
              {UGC_CUISINES.map((c) => (
                <button key={c} onClick={() => onUpdate({ category: c })} className={`py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${category === c ? 'bg-yellow-400 text-stone-950 border-yellow-400' : 'bg-stone-900 text-stone-400 border-white/5'}`}>{c}</button>
              ))}
            </div>
            {category === 'Custom' && (
              <div className="pt-3 animate-in fade-in slide-in-from-top-2">
                <input value={customCategory} onChange={(e) => onUpdate({ customCategory: e.target.value })} placeholder="Type custom category..." className="w-full bg-stone-900/50 border-2 border-white/5 px-6 py-4 rounded-2xl font-bold text-white text-sm outline-none focus:border-yellow-400 transition-all placeholder:text-stone-600" />
              </div>
            )}
          </div>
        </div>
        <button onClick={onNext} disabled={!title || !category || (category === 'Custom' && !customCategory)} className={`w-full py-7 rounded-[3rem] font-black uppercase tracking-widest text-sm shadow-2xl transition-all ${title && category && (category !== 'Custom' || customCategory) ? 'bg-white text-stone-950 hover:scale-[1.02] active:scale-95' : 'bg-stone-900 text-stone-700 cursor-not-allowed'}`}>
          Next: Assembly
        </button>
      </div>
    </div>
  );
};

const BitesStoryStep = ({ description, onUpdate, onNext }: { description: string, onUpdate: (data: any) => void, onNext: () => void }) => {
  return (
    <div className="absolute inset-0 bg-stone-950 p-8 flex flex-col justify-center animate-in slide-in-from-right duration-500">
      <div className="max-w-md mx-auto w-full space-y-12">
        <div className="space-y-4 text-center">
          <Badge color="yellow">Assemblage</Badge>
          <h2 className="text-5xl font-black uppercase tracking-tighter italic text-white leading-none">The Story</h2>
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 ml-6">Notes & Details</label>
            <textarea autoFocus value={description} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="Describe the textures, flavors, and key steps..." className="w-full bg-stone-900/50 border-2 border-white/5 px-8 py-6 rounded-[2.5rem] font-bold text-white text-lg outline-none focus:border-white/20 focus:bg-stone-900 transition-all h-64 resize-none placeholder:text-stone-800" />
          </div>
        </div>
        <button onClick={onNext} disabled={!description || description.length < 5} className={`w-full py-7 rounded-[3rem] font-black uppercase tracking-widest text-sm shadow-2xl transition-all ${description.length >= 5 ? 'bg-yellow-400 text-stone-950 hover:scale-[1.02] active:scale-95' : 'bg-stone-900 text-stone-700 cursor-not-allowed'}`}>
          Neural Synthesis
        </button>
      </div>
    </div>
  );
};

const BitesReviewStep = ({ image, data, onEdit, onLock, isUploading }: { image: string | null, data: any, onEdit: () => void, onLock: () => void, isUploading: boolean }) => {
  return (
    <div className="absolute inset-0 bg-stone-950 p-8 flex flex-col items-center justify-center space-y-12 animate-in zoom-in-95 duration-500 overflow-y-auto">
      <div className="space-y-4 text-center">
        <Badge color="yellow">Synced & Loaded</Badge>
        <h2 className="text-5xl font-black uppercase tracking-tighter italic text-white leading-none">Culinary Bite Card</h2>
      </div>
      <div className="max-w-xl w-full">
        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border-[12px] border-white">
          <div className="aspect-video relative">
            <img src={image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=400'} className="w-full h-full object-cover" />
            <div className="absolute top-6 left-6 flex gap-2">
              <Badge color="yellow">AI Verified</Badge>
              <Badge color="stone">{data.category}</Badge>
            </div>
          </div>
          <div className="p-10 space-y-6">
            <div className="space-y-1">
              <h3 className="text-3xl font-black uppercase tracking-tighter leading-tight text-stone-950">{data.title}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Created via Neural Synthesis</p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 p-4 bg-stone-50 rounded-2xl">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest text-center">Prot</p>
                <p className="text-lg font-black text-center text-stone-900">{data.nutrition?.protein}g</p>
              </div>
              <div className="flex-1 p-4 bg-stone-50 rounded-2xl">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest text-center">Cals</p>
                <p className="text-lg font-black text-center text-stone-900">{data.nutrition?.calories}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <button onClick={onEdit} className="px-8 py-5 bg-white/10 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs border border-white/5">Modify</button>
          <button onClick={onLock} disabled={isUploading} className="flex-grow py-5 bg-yellow-400 text-stone-900 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
            {isUploading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
            Confirm & Publish
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * COMPONENT: AIRecipeStudio
 * Fully immersive 7-step wizard for neural recipe creation.
 * Logic:
 * 1. Visuals: Capture food image.
 * 2. Identity: Name the dish/category.
 * 3. Story: Add context/notes.
 * 4. Synthesis: Gemini neural assembly.
 * 5. Review: View generated card.
 */
export const AIRecipeStudio = ({
  onSave,
  onShareRequest,
  onClose,
}: {
  onSave: (item: BiteActionItem) => void;
  onShareRequest: (item: BiteActionItem) => void;
  onClose: () => void;
}) => {
  type GeneratedRecipeCard = {
    title?: string;
    category?: string;
    readyInMinutes?: number;
    servings?: number;
    ingredients?: string[];
    instructions?: string;
    nutrition?: {
      calories?: number;
      protein?: number;
      fat?: number;
      carbs?: number;
    };
    aiTag?: BitesAiTag;
  };

  const STUDIO_STEPS = ['Visuals', 'Identity', 'Story', 'Synthesis', 'Review', 'Finish'];
  const [currentStep, setCurrentStep] = useState(0);
  const [image, setImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState('image/jpeg');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipeCard | null>(null);
  const [selectedTag, setSelectedTag] = useState<BitesAiTag>('Recipe Card');
  const [error, setError] = useState<string | null>(null);
  const [isPostingToFeed, setIsPostingToFeed] = useState(false);
  const [feedPostSuccess, setFeedPostSuccess] = useState(false);
  const studioMountedRef = useRef(true);
  const studioRequestSeqRef = useRef(0);

  useEffect(() => {
    studioMountedRef.current = true;
    return () => { studioMountedRef.current = false; };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imageData = await readImageFileAsDataUrl(file);
      if (!studioMountedRef.current) return;
      setImage(imageData);
      setImageMimeType(file.type || 'image/jpeg');
      setError(null);
      setCurrentStep(1);
    } catch {
      if (studioMountedRef.current) setError('Failed to read image.');
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;

    const requestSeq = ++studioRequestSeqRef.current;
    setCurrentStep(3); // Neural Synthesis Reveal
    setIsGenerating(true);
    setError(null);

    try {
      const text = await GeminiService.analyzeBite(title, category, description, image || undefined, imageMimeType);
      if (!shouldApplyLatestRequest(studioMountedRef, requestSeq, studioRequestSeqRef)) return;

      const parsed = parseAiJson(text);
      setGeneratedRecipe(parsed);
    } catch {
      if (shouldApplyLatestRequest(studioMountedRef, requestSeq, studioRequestSeqRef)) {
        setError('Neural Assembly failed.');
        setCurrentStep(2);
      }
    } finally {
      if (shouldApplyLatestRequest(studioMountedRef, requestSeq, studioRequestSeqRef)) {
        setIsGenerating(false);
      }
    }
  };

  const buildActionItem = (): BiteActionItem | null => {
    if (!generatedRecipe) return null;
    const finalTitle = generatedRecipe.title || title;
    const finalCat = (category === 'Custom' && customCategory) ? customCategory : (generatedRecipe.category || category);
    return {
      id: `recipe-ai-${Date.now()}`,
      name: finalTitle,
      cat: finalCat,
      img: image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=400',
      metadata: {
        title: finalTitle,
        name: finalTitle,
        cat: finalCat,
        image: image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=400',
        generatedRecipe,
        aiTag: selectedTag,
        tags: [selectedTag],
      },
    };
  };

  const handleFinish = async (action: 'save' | 'share' | 'feed') => {
    const item = buildActionItem();
    if (!item) return;

    if (action === 'save') {
      onSave(item);
      setCurrentStep(5); // Success step
    } else if (action === 'share') {
      onShareRequest(item);
    } else if (action === 'feed') {
      setIsPostingToFeed(true);
      try {
        const result = await FeedService.publishToFeed(item);
        if (result.success) setFeedPostSuccess(true);
      } finally {
        setIsPostingToFeed(false);
      }
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[200] text-white flex flex-col overflow-hidden">
      <header className="p-8 border-b border-white/5 bg-stone-950/50 backdrop-blur-xl shrink-0 flex items-center justify-between z-30">
        <StudioStepper steps={STUDIO_STEPS} currentStep={currentStep} className="flex-grow max-w-2xl mx-auto" />
        <button onClick={onClose} aria-label="Close Recipe Studio" className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-colors">
          <X size={24} />
        </button>
      </header>

      <div className="flex-grow relative overflow-hidden">
        {currentStep === 0 && (
          <BitesSourceStep image={image} onUpload={handleImageUpload} onSkip={() => setCurrentStep(1)} />
        )}

        {currentStep === 1 && (
          <BitesIdentityStep title={title} category={category} customCategory={customCategory} onUpdate={(d) => { if(d.title !== undefined) setTitle(d.title); if(d.category !== undefined) setCategory(d.category); if(d.customCategory !== undefined) setCustomCategory(d.customCategory); }} onNext={() => setCurrentStep(2)} />
        )}
        {currentStep === 2 && (
          <BitesStoryStep description={description} onUpdate={(d) => { if (d.description !== undefined) setDescription(d.description); }} onNext={() => { setCurrentStep(3); handleGenerate(); }} />
        )}
        {currentStep === 3 && (
          <NeuralReveal onNext={() => setCurrentStep(4)} />
        )}
        {currentStep === 4 && generatedRecipe && (
          <BitesReviewStep image={image} data={generatedRecipe} onEdit={() => setCurrentStep(1)} onLock={() => handleFinish('save')} isUploading={isGenerating} />
        )}
        {currentStep === 5 && (
          <div className="fixed inset-0 z-[250] bg-emerald-600 flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in duration-700">
            <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-2xl">
              <Check size={80} strokeWidth={4} />
            </div>
            <h2 className="text-6xl font-black uppercase tracking-tighter italic text-white leading-none">Bite Synced</h2>
            <div className="max-w-md w-full space-y-4 pt-12">
              <button onClick={() => handleFinish('feed')} disabled={isPostingToFeed || feedPostSuccess} className={`w-full py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-sm shadow-2xl flex items-center justify-center gap-4 border-4 transition-all ${feedPostSuccess ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-stone-900 text-white border-white/20'}`}>
                {isPostingToFeed ? <Loader2 className="animate-spin" /> : feedPostSuccess ? <Check size={20} /> : <Send size={20} />}
                {isPostingToFeed ? 'Syndicating...' : feedPostSuccess ? 'Posted' : 'Post to Feed'}
              </button>
              <button onClick={() => { onClose(); window.location.href = '?view=profile'; }} className="w-full py-6 bg-white text-emerald-700 rounded-[2.5rem] font-black uppercase tracking-widest text-sm">Done</button>
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 px-8 py-4 bg-red-500 text-white rounded-full font-black uppercase text-xs tracking-widest shadow-2xl animate-in slide-in-from-bottom-4">
          {error}
        </div>
      )}
    </div>
  );
};


/**
 * COMPONENT: BitesView
 * Top-level view orchestrator. Swaps between Feed and Studio modes.
 */
export const BitesView = ({ onSave, onShareRequest }: { onSave: (item: BiteActionItem) => void, onShareRequest: (item: BiteActionItem) => void }) => {
  const [selectedRecipe, setSelectedRecipe] = useState<BiteRecipe | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const {
    loading,
    serviceError,
    searchQuery,
    activeDiet,
    activeCuisine,
    filteredRecipes,
    matchingSuggestions,
    relevantDiets,
    relevantCuisines,
    setSearchQuery,
    setActiveDiet,
    setActiveCuisine,
    fetchBites,
    activePage,
    totalResults,
    setActivePage,
  } = useBitesFeed();


  const handleSearchSubmit = () => {
    fetchBites(true, searchQuery);
  };

  const handleResetGrid = () => {
    setSearchQuery('');
    fetchBites();
  };

  const { handleSaveRecipe, handleShareRecipe } = createBiteRecipeActions(onSave, onShareRequest);

  return (
    <div className="min-h-screen text-white p-8 md:p-12 pb-32">
      <header className="mb-8 space-y-4">
        <h2 className="text-5xl font-black uppercase tracking-tighter italic text-black">Bites Gallery</h2>
        <div className="flex items-center gap-4">
          <Badge color="yellow">Neural Recipes</Badge>
          <div className="h-0.5 flex-grow bg-white/5" />
        </div>
      </header>

      {/* Search Input with Autofill Overlay */}
      <div className="relative mb-8 max-w-2xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
        <input
          value={searchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search recipes, cuisines, or diets..."
          className="w-full bg-white/5 pl-14 pr-16 py-5 rounded-[2rem] font-bold text-sm outline-none focus:ring-4 focus:ring-yellow-400/20 text-white placeholder-stone-500 transition-all border border-white/5 focus:bg-stone-900 focus:border-yellow-400/30"
        />
        {searchQuery.trim().length > 0 && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}
        
        {/* Autofill suggestions overlay */}
        {searchFocused && matchingSuggestions.length > 0 && (
          <div className="absolute top-[105%] left-0 right-0 bg-stone-900 border border-white/10 rounded-[2rem] shadow-2xl p-4 z-[400] overflow-hidden space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 px-4 py-2 border-b border-white/5 mb-1">
              Suggestions
            </div>
            {matchingSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                onMouseDown={() => {
                  setSearchQuery(suggestion);
                  setSearchFocused(false);
                }}
                className="w-full text-left px-4 py-3 rounded-2xl text-[12px] font-black uppercase tracking-widest text-stone-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3 group"
              >
                <Search size={14} className="text-stone-500 group-hover:text-yellow-400 transition-colors" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inline Dynamically Relevant Filter Chips (Post-Search Only) */}
      {searchQuery.trim().length > 0 && (relevantDiets.length > 0 || relevantCuisines.length > 0) && (
        <div className="mb-12 space-y-4 animate-in fade-in slide-in-from-top-3 duration-500">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 px-1">
            Refine Search Matches:
          </div>
          <div className="flex flex-wrap gap-2.5">
            {relevantDiets.map((diet) => {
              const isActive = activeDiet === diet;
              return (
                <button
                  key={diet}
                  onClick={() => setActiveDiet(activeDiet === diet ? null : diet)}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-yellow-400 text-stone-900 shadow-lg scale-105' : 'bg-stone-900 text-stone-400 border border-white/5 hover:bg-stone-850 hover:text-white'}`}
                >
                  🌱 {diet}
                </button>
              );
            })}
            {relevantCuisines.map((cuisine) => {
              const isActive = activeCuisine === cuisine;
              return (
                <button
                  key={cuisine}
                  onClick={() => setActiveCuisine(activeCuisine === cuisine ? null : cuisine)}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-yellow-400 text-stone-900 shadow-lg scale-105' : 'bg-stone-900 text-stone-400 border border-white/5 hover:bg-stone-850 hover:text-white'}`}
                >
                  🌍 {cuisine}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {serviceError && (
        <div className="px-6 py-4 bg-stone-900 border border-white/5 rounded-2xl text-[11px] font-bold text-yellow-500 mb-8">
          {serviceError}
        </div>
      )}

      {loading && filteredRecipes.length === 0 ? (
        <div className="py-24 flex items-center justify-center"><Loader2 className="animate-spin text-white/20" size={48} /></div>
      ) : filteredRecipes.length === 0 ? (
        <div className="py-24 text-center space-y-4">
          <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">No recipes match these filters</p>
          <button onClick={() => { setActiveCuisine(null); setActiveDiet(null); }} className="px-8 py-3 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest">Clear Filters</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {filteredRecipes.map((recipe) => (
              <button
                type="button"
                key={recipe.id}
                onClick={() => setSelectedRecipe(recipe)}
                className="group cursor-pointer text-left w-full focus:outline-none"
              >
                <div className="relative rounded-[2rem] shadow-md overflow-hidden group-hover:scale-[1.02] group-focus:scale-[1.02] hover:shadow-2xl transition-all duration-500 aspect-[4/5] w-full border border-white/5 hover:border-yellow-400/20">
                  <img src={recipe.image} alt={recipe.title || 'Recipe'} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-900/40 to-transparent" />
                  
                  <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                    <div className="bg-stone-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl flex gap-1.5 items-center text-[10px] font-black uppercase tracking-widest text-stone-300 shadow-sm border border-white/5">
                      <PieChart size={12} className="text-yellow-400" /> {(() => {
                        const cal = recipe.nutrition?.nutrients?.find((n: any) => n.name === 'Calories');
                        return cal ? `${Math.round(cal.amount)} Kcal` : '0 Kcal';
                      })()}
                    </div>
                    <div className="bg-stone-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl flex gap-1.5 items-center text-[10px] font-black uppercase tracking-widest text-stone-300 shadow-sm border border-white/5">
                      <Clock size={12} className="text-yellow-400" /> {recipe.readyInMinutes || 0}m
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-2">
                    <h3 className="text-lg font-black uppercase tracking-tighter text-white leading-tight drop-shadow-lg line-clamp-2">
                      {recipe.title}
                    </h3>
                    <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap mask-fade-right">
                      {(recipe.dishTypes || []).slice(0, 3).map((tag) => (
                        <span key={tag} className="shrink-0 text-[9px] font-black uppercase tracking-widest bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-stone-200 shadow-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Premium Pagination Bar */}
          {!loading && totalResults > 12 && (
            <div className="flex justify-center items-center gap-6 mt-12 py-4 animate-in fade-in duration-300">
              <button
                disabled={activePage === 0}
                onClick={() => setActivePage(activePage - 1)}
                className="px-6 py-3.5 bg-stone-900 text-stone-300 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest disabled:opacity-30 disabled:pointer-events-none hover:scale-105 active:scale-95 transition-all shadow-md border border-white/5 cursor-pointer"
              >
                Prev
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                Page {activePage + 1} of {Math.ceil(totalResults / 12)}
              </span>
              <button
                disabled={activePage >= Math.ceil(totalResults / 12) - 1}
                onClick={() => setActivePage(activePage + 1)}
                className="px-6 py-3.5 bg-stone-900 text-stone-300 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest disabled:opacity-30 disabled:pointer-events-none hover:scale-105 active:scale-95 transition-all shadow-md border border-white/5 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <BitesRecipeModal
        selectedRecipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onSaveRecipe={handleSaveRecipe}
        onShareRecipe={handleShareRecipe}
      />
    </div>
  );
};