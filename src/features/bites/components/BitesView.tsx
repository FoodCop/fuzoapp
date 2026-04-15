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
import { UGC_CUISINES, normalizeTag, TAXONOMY_KEYWORD_MAP } from '../../../shared/utils/taxonomy';
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
import { SpoonacularService } from '../../../services/spoonacularService';
import { GeminiService } from '../../../services/geminiService';
import { shouldApplyLatestRequest } from '../../../shared/utils/async';
import type { AppItem } from '../../../shared/types/appItem';
import type { ChatInboxItem } from '../../chat/types/chatUi';
import type { IconComponent } from '../../../shared/types/ui';

// Lightweight motion shims (same as index.tsx)
type LightweightMotionProps = { children?: React.ReactNode; [key: string]: unknown; };
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

const filterFriendsByQuery = (friends: ChatInboxItem[], query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return friends;

  return friends.filter((friend) => {
    const username = 'username' in friend ? String(friend.username || '').toLowerCase() : '';
    const displayName = String(friend.name || '').toLowerCase();
    const email = 'email' in friend ? String(friend.email || '').toLowerCase() : '';
    return username.includes(normalized) || displayName.includes(normalized) || email.includes(normalized);
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
${hasYoutubeUrl ? 'Target: YouTube Content Extraction' : 'Target: Vertical Media Analysis'}
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

  if (/#mock\b/i.test(description) && !hasYoutubeUrl) {
    return buildMockTrimCard(description);
  }

  const oEmbedContext = await fetchYouTubeOEmbedContext(effectiveUrl);
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
    sourceUrl: parsed.sourceUrl || (hasYoutubeUrl ? effectiveUrl : undefined),
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
    <div role="dialog" aria-modal="true" aria-label="Share with friend" className="fixed inset-0 z-[120] bg-stone-900/60 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-10 animate-in fade-in duration-300">
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
              placeholder="Search username, name, or email"
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
              className="flex items-center justify-between p-4 rounded-[2rem] hover:bg-stone-50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-4">
                <img src={friend.avatar} alt={friend.name || 'Friend avatar'} className="w-12 h-12 rounded-full border-2 border-stone-100" />
                <div>
                  <span className="font-black uppercase text-xs tracking-widest block">{friend.name}</span>
                  {!!('username' in friend && friend.username) && <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">@{friend.username}</span>}
                </div>
              </div>
              {sentTo.includes(friend.id) ? (
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 size={24} strokeWidth={3} />
                </div>
              ) : (
                <div className="p-3 bg-stone-100 rounded-2xl group-hover:bg-yellow-400 transition-colors">
                  <Send size={18} />
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


const useBitesFeed = () => {
  const [recipes, setRecipes] = useState<BiteRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDiet, setActiveDiet] = useState<string | null>(null);
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);
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

  const fetchBites = useCallback(async (_isRefresh = false, queryOverride?: string) => {
    const requestSeq = ++bitesRequestSeqRef.current;
    setLoading(true);
    setServiceError('');
    const effectiveQuery = (queryOverride ?? searchQuery).trim();

    try {
      const response = await SpoonacularService.searchRecipes({
        query: effectiveQuery || undefined,
        diet: activeDiet || undefined,
        cuisine: activeCuisine || undefined,
        number: 12,
      });

      const payload = response.data;
      const resultList = (payload?.results || payload?.data?.results || []) as BiteRecipeInput[];
      const isLatestRequest = shouldApplyLatestRequest(bitesMountedRef, requestSeq, bitesRequestSeqRef);

      if (!response.success || !Array.isArray(resultList) || resultList.length === 0) {
        if (isLatestRequest) {
          setRecipes(BITE_FALLBACK_RECIPES);
          if (response.error) setServiceError(response.error);
        }
      } else {
        const normalized = normalizeRecipeList(resultList);
        if (isLatestRequest) {
          setRecipes(normalized);
        }
      }
    } catch {
      if (shouldApplyLatestRequest(bitesMountedRef, requestSeq, bitesRequestSeqRef)) {
        setRecipes(BITE_FALLBACK_RECIPES);
        setServiceError('Unable to load live bites. Showing curated fallback recipes.');
      }
    }

    if (shouldApplyLatestRequest(bitesMountedRef, requestSeq, bitesRequestSeqRef)) {
      setLoading(false);
    }
  }, [activeCuisine, activeDiet, searchQuery]);

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

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    return recipes.filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [recipes, searchQuery]);

  return {
    loading,
    serviceError,
    searchQuery,
    activeDiet,
    activeCuisine,
    filteredRecipes,
    setSearchQuery,
    setActiveDiet,
    setActiveCuisine,
    fetchBites,
  };
};

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
          className="group cursor-pointer text-left w-full"
        >
          <div className="relative aspect-[4/5] rounded-[1.75rem] border-4 border-white shadow-xl overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
            <img src={recipe.image} alt={recipe.title || 'Recipe'} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
            <div className="absolute bottom-10 left-10 right-10 text-white">
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 leading-none">{recipe.title}</h3>
              <div className="flex gap-2 items-center text-[12px] font-bold uppercase tracking-widest opacity-80">
                <Clock size={14} /> {recipe.readyInMinutes} Min
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

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
        className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative max-h-[90vh]"
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 z-50 w-12 h-12 bg-stone-900 text-white rounded-2xl flex items-center justify-center active:scale-90 transition-transform shadow-xl"
        >
          <X size={24} />
        </button>

        {/* Left Side: Image */}
        <div className="w-full md:w-1/2 h-64 md:h-auto overflow-hidden relative">
          <img src={selectedRecipe.image} alt={selectedRecipe.title || 'Selected recipe'} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden" />
          <div className="absolute bottom-6 left-8 md:hidden text-white">
             <Badge color="yellow">Studio Pack #{selectedRecipe.id}</Badge>
             <h2 className="text-3xl font-black uppercase tracking-tighter mt-2 leading-none">{selectedRecipe.title}</h2>
          </div>
        </div>

        {/* Right Side: Content */}
        <div className="w-full md:w-1/2 flex flex-col h-full bg-white relative">
          {/* Header (Desktop) */}
          <div className="hidden md:block p-10 pb-0 space-y-4">
            <Badge color="yellow">Studio Pack #{selectedRecipe.id}</Badge>
            <h2 className="text-4xl font-black uppercase tracking-tighter leading-none text-stone-900">{selectedRecipe.title}</h2>
            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-stone-400">
                <Clock size={16} /> {selectedRecipe.readyInMinutes} Mins
              </div>
              <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-stone-400">
                <User size={16} /> {selectedRecipe.servings} Serves
              </div>
            </div>
          </div>

          {/* Stats (Mobile) */}
          <div className="flex md:hidden px-8 py-6 gap-6 border-b border-stone-50">
              <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-stone-400">
                <Clock size={16} /> {selectedRecipe.readyInMinutes} Mins
              </div>
              <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-stone-400">
                <User size={16} /> {selectedRecipe.servings} Serves
              </div>
          </div>

          {/* Tab Bar */}
          <div className="px-8 mt-6">
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
                    <div 
                      className="text-sm font-medium text-stone-500 leading-relaxed whitespace-pre-wrap studio-instructions prose prose-stone max-w-none" 
                      dangerouslySetInnerHTML={{ __html: selectedRecipe.instructions || 'Consult Chef FUZO for detailed steps.' }} 
                    />
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
          <footer className="p-8 md:p-10 pt-4 bg-white/90 backdrop-blur-md border-t border-stone-50 flex gap-4 shrink-0 transition-all">
            <button
              onClick={() => onSaveRecipe(selectedRecipe)}
              className="flex-grow py-5 bg-stone-900 text-white rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl group"
            >
              <Bookmark size={22} className="group-hover:fill-white transition-all" />
              <span className="text-[12px] font-black uppercase tracking-widest">Save to Plate</span>
            </button>
            <button
              onClick={() => onShareRecipe(selectedRecipe)}
              className="py-5 px-10 bg-yellow-400 text-stone-900 rounded-2xl flex items-center justify-center hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
            >
              <Share2 size={22} strokeWidth={3} />
            </button>
          </footer>
        </div>
      </motion.div>
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
    <div className="fixed inset-0 z-[250] bg-stone-950 p-8 flex flex-col justify-center animate-in fade-in duration-500">
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

const BitesIdentityStep = ({ title, category, onUpdate, onNext }: { title: string, category: string, onUpdate: (data: any) => void, onNext: () => void }) => {
  return (
    <div className="fixed inset-0 z-[250] bg-stone-950 p-8 flex flex-col justify-center animate-in slide-in-from-right duration-500">
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
          </div>
        </div>
        <button onClick={onNext} disabled={!title || !category} className={`w-full py-7 rounded-[3rem] font-black uppercase tracking-widest text-sm shadow-2xl transition-all ${title && category ? 'bg-white text-stone-950 hover:scale-[1.02] active:scale-95' : 'bg-stone-900 text-stone-700 cursor-not-allowed'}`}>
          Next: Assembly
        </button>
      </div>
    </div>
  );
};

const BitesStoryStep = ({ description, onUpdate, onNext }: { description: string, onUpdate: (data: any) => void, onNext: () => void }) => {
  return (
    <div className="fixed inset-0 z-[250] bg-stone-950 p-8 flex flex-col justify-center animate-in slide-in-from-right duration-500">
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
    <div className="fixed inset-0 z-[250] bg-stone-950 p-8 flex flex-col items-center justify-center space-y-12 animate-in zoom-in-95 duration-500 overflow-y-auto">
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
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipeCard | null>(null);
  const [selectedTag, setSelectedTag] = useState<BitesAiTag>('Recipe Card');
  const [error, setError] = useState<string | null>(null);
  const [isPostingToFeed, setIsPostingToFeed] = useState(false);
  const [feedPostSuccess, setFeedPostSuccess] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imageData = await readImageFileAsDataUrl(file);
      setImage(imageData);
      setImageMimeType(file.type || 'image/jpeg');
      setError(null);
      setCurrentStep(1);
    } catch {
      setError('Failed to read image.');
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setCurrentStep(3); // Neural Synthesis Reveal
    setIsGenerating(true);
    setError(null);

    try {
      const text = await GeminiService.analyzeBite(title, category, description, image || undefined, imageMimeType);
      const parsed = parseAiJson(text);
      setGeneratedRecipe(parsed);
    } catch {
      setError('Neural Assembly failed.');
      setCurrentStep(2);
    } finally {
      setIsGenerating(false);
    }
  };

  const buildActionItem = (): BiteActionItem | null => {
    if (!generatedRecipe) return null;
    const finalTitle = generatedRecipe.title || title;
    const finalCat = generatedRecipe.category || category;
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
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[200] bg-black text-white flex flex-col overflow-hidden">
      <header className="p-8 border-b border-white/5 bg-stone-950/50 backdrop-blur-xl shrink-0 flex items-center justify-between z-30">
        <StudioStepper steps={STUDIO_STEPS} currentStep={currentStep} className="flex-grow max-w-2xl mx-auto" />
        <button onClick={onClose} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-colors">
          <X size={24} />
        </button>
      </header>

      <div className="flex-grow relative overflow-hidden">
        {currentStep === 0 && (
          <BitesSourceStep image={image} onUpload={handleImageUpload} onSkip={() => setCurrentStep(1)} />
        )}
        {currentStep === 1 && (
          <BitesIdentityStep title={title} category={category} onUpdate={(d) => { if(d.title !== undefined) setTitle(d.title); if(d.category !== undefined) setCategory(d.category); }} onNext={() => setCurrentStep(2)} />
        )}
        {currentStep === 2 && (
          <BitesStoryStep description={description} onUpdate={(d) => { if(d.description !== undefined) setDescription(d.description); }} onNext={() => { setCurrentStep(3); handleGenerate(); }} />
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
              <button onClick={onClose} className="w-full py-6 bg-white text-emerald-700 rounded-[2.5rem] font-black uppercase tracking-widest text-sm">Done</button>
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


export const BitesView = ({ onSave, onShareRequest }: { onSave: (item: BiteActionItem) => void, onShareRequest: (item: BiteActionItem) => void }) => {
  const [selectedRecipe, setSelectedRecipe] = useState<BiteRecipe | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const {
    loading,
    serviceError,
    searchQuery,
    activeDiet,
    activeCuisine,
    filteredRecipes,
    setSearchQuery,
    setActiveDiet,
    setActiveCuisine,
    fetchBites,
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
    <div className="min-h-screen bg-stone-950 text-white p-8 md:p-12 pb-32">
      <header className="mb-12 space-y-4">
        <h2 className="text-5xl font-black uppercase tracking-tighter italic">Bites Gallery</h2>
        <div className="flex items-center gap-4">
          <Badge color="yellow">Neural Recipes</Badge>
          <div className="h-0.5 flex-grow bg-white/5" />
        </div>
      </header>

      <UgcFilterBar 
        activeCuisine={activeCuisine} 
        onCuisineChange={setActiveCuisine}
        activeDiet={activeDiet}
        onDietChange={setActiveDiet}
        className="mb-12"
      />

      {serviceError && (
        <div className="px-6 py-4 bg-yellow-50 border border-yellow-100 rounded-2xl text-[11px] font-bold text-yellow-800">
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredRecipes.map((recipe) => (
            <button
              type="button"
              key={recipe.id}
              onClick={() => setSelectedRecipe(recipe)}
              className="group cursor-pointer text-left w-full"
            >
              <div className="relative aspect-[4/5] rounded-[1.75rem] border-4 border-white shadow-xl overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                <img src={recipe.image} alt={recipe.title || 'Recipe'} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
                <div className="absolute bottom-10 left-10 right-10 text-white">
                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 leading-none">{recipe.title}</h3>
                  <div className="flex gap-2 items-center text-[12px] font-bold uppercase tracking-widest opacity-80">
                    <Clock size={14} /> {recipe.readyInMinutes} Min
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
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