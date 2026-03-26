
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './src/styles/tailwind.css';
import { mountApp } from './src/app/bootstrap/mountApp';
import { 
  Search, ChefHat, MapPin, User, Heart, Star, Clock, Zap, MessageSquare, 
  ChevronRight, PlayCircle, Camera, X, Check, Flame, Share2, Loader2, Send, 
  Bookmark, ChevronLeft, RefreshCw, LayoutGrid, Sparkles, Bot,
  Info, List, PieChart, CheckCircle2, SlidersHorizontal, Music2, Eye,
  Mail, Phone, Bell, Shield, LogOut, Trophy, Gift, Image as ImageIcon, CheckCheck, AlertCircle,
  Plus,
  ArrowRight,
  Pin, Youtube, ExternalLink
} from 'lucide-react';
import { LeaderboardView } from './src/features/points/components/LeaderboardView';
import { ProfileView } from './src/features/profile/components/ProfileView';
import { PublicProfileView } from './src/features/profile/components/PublicProfileView';
import { SettingsView } from './src/features/settings/components/SettingsView';
import { NotificationsView } from './src/features/notifications/components/NotificationsView';
import { UnifiedCreationModal } from './src/features/creation/components/UnifiedCreationModal';
import { 
  getMetadataRecord, 
  getMetadataString, 
  getMetadataStringArray, 
  getMetadataNumber, 
  getNutritionRecord 
} from './src/shared/lib/metadata';
import { normalizeExternalUrl } from './src/shared/lib/urlHelpers';
import { Loader } from '@googlemaps/js-api-loader';
import { BOTTOM_NAV_ITEMS, DRAWER_NAV_ITEMS, resolveInitialTab, TAB_IDS } from './src/app/layout/navItems';
import { useAuthSessionSync } from './src/app/hooks/useAuthSessionSync';
import { useSavedItemsOnAuth } from './src/app/hooks/useSavedItemsOnAuth';
import { useTabUrlSync } from './src/app/hooks/useTabUrlSync';
import { areSavedItemsEquivalent } from './src/features/plate/lib/savedItems';
import { renderAppView } from './src/app/routes/renderAppView';
import { PlacesService } from './src/services/placesService';
import { SpoonacularService } from './src/services/spoonacularService';
import { YouTubeService } from './src/services/youtubeService';
import { PlateService } from './src/services/plateService';
import { FriendRequestService, type FriendRequestRelationship } from './src/services/friendRequestService';
import { hasSupabaseConfig, supabase } from './src/services/supabaseClient';
import { UserProfileService } from './src/services/userProfileService';
import { FEED_COMPARE_WITH_LOCAL, FEED_USE_SERVICE } from './src/features/feed/constants/config';
import { LOCAL_CURATED_FEED_ITEMS } from './src/features/feed/constants/curatedFeed';
import { ensureAdTriviaPresence, logFeedParity, normalizeFeedServiceToCards } from './src/features/feed/lib/feedNormalization';
import type { FeedUiItem } from './src/features/feed/types/feedUi';
import { getUserFeedLocation } from './src/features/feed/services/feedLocation';
import { FeedService } from './src/features/feed/services/feedService';
import { AUTH_ONBOARDING_DATA } from './src/features/auth/constants/onboardingData';
import OnboardingV2Flow from './src/features/auth/components/OnboardingV2Flow';
import { APP_PATH, HOME_ENTRY_URL, authDebugLog, getOAuthRedirectUrl, isAppPath, isAuthCallbackPath } from './src/features/auth/lib/oauthRedirect';
import type { AuthUser } from './src/features/auth/types/auth';
import type { OnboardingV2Payload } from './src/features/auth/types/onboarding';
import { BITE_CUISINES, BITE_DIETS } from './src/features/bites/constants/filters';
import { BITE_FALLBACK_RECIPES } from './src/features/bites/constants/fallbackRecipes';
import { createBiteRecipeActions, getBiteKeyNutrients, normalizeRecipeList } from './src/features/bites/lib/bitesHelpers';
import type { BiteActionItem, BiteRecipe, BiteRecipeInput } from './src/features/bites/types/bites';
import { DEFAULT_FRIENDS } from './src/features/chat/constants/chatSeeds';
import { ChatService } from './src/features/chat/services/chatService';
import type { ChatContact, ChatMessage } from './src/features/chat/services/chatService';
import type { ChatFriend, ChatUiMessage, ChatInboxItem } from './src/features/chat/types/chatUi';
import { FALLBACK_SAVED_ITEMS } from './src/features/plate/constants/fallbackSavedItems';
import { inferItemTypeFromId, normalizeItemForPlateSave, normalizeSavedItemForUI } from './src/features/plate/lib/savedItems';
import { PointsService } from './src/features/points/services/pointsService';
import type { LeaderboardEntry } from './src/features/points/services/pointsService';
import { buildPhotoUrl, deriveCategory, mapWeekdayTextToTimings } from './src/features/scout/lib/scoutUtils';
import { getGoogleMaps } from './src/features/scout/types/scoutUi';
import type { GooglePlacePhoto, GooglePlaceResult, GooglePlaceReview, MapLike, MarkerLike, ScoutMenuSection, ScoutPlace, ScoutTimings, ScoutUserReview } from './src/features/scout/types/scoutUi';
import { persistSnapData } from './src/features/snap/services/snapPersistence';
import { SettingsService } from './src/features/settings/services/settingsService';
import { TRIMS_FALLBACK_VIDEOS } from './src/features/trims/constants/fallbackVideos';
import { buildTrimQueries } from './src/features/trims/lib/buildTrimQueries';
import type { TrimVideo } from './src/features/trims/types/trimsUi';
import { API_KEYS } from './src/shared/constants/apiKeys';
import type { AppItem } from './src/shared/types/appItem';
import type { IconComponent } from './src/shared/types/ui';
import { NavIcon } from './src/shared/ui/navIcon';
import { SettingsItem, SettingsSection } from './src/shared/ui/settingsPrimitives';
import type { PublicUserProfile, SettingsProfile } from './src/features/settings/types/settings';
import { GeminiService } from './src/services/geminiService';

type LightweightMotionProps = {
  children?: React.ReactNode;
  [key: string]: unknown;
};

const MotionDiv = ({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  whileHover: _whileHover,
  whileTap: _whileTap,
  whileInView: _whileInView,
  viewport: _viewport,
  variants: _variants,
  custom: _custom,
  ...rest
}: LightweightMotionProps) => <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;

const motion = { div: MotionDiv };
const AnimatePresence = ({ children, mode: _mode }: { children?: React.ReactNode; mode?: string }) => <>{children}</>;

const readImageFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result as string);
  reader.onerror = () => reject(new Error('Failed to read file'));
  reader.readAsDataURL(file);
});

const loadUploadedImage = async (
  file: File,
  setCapturedImage: React.Dispatch<React.SetStateAction<string | null>>,
  onTagged: () => void,
) => {
  const imageData = await readImageFileAsDataUrl(file);
  setCapturedImage(imageData);
  onTagged();
};


const parseAiJson = (raw: string | undefined | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const extracted = /\{[\s\S]*\}/.exec(raw)?.[0];
    if (!extracted) return null;
    try {
      return JSON.parse(extracted);
    } catch {
      return null;
    }
  }
};

const BITES_AI_TAG_OPTIONS = ['Recipe Card', 'Food Hacks', 'Kitchen Tricks', 'Weird Combos'] as const;
type BitesAiTag = (typeof BITES_AI_TAG_OPTIONS)[number];

const CHEF_SUGGESTED_PROMPTS = [
  'Would you like a recipe?',
  'Show me food hacks',
  'Any kitchen tricks?',
  'Suggest weird food combos',
] as const;

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
}: {
  description: string;
  effectiveUrl: string;
  hasYoutubeUrl: boolean;
  oEmbedContext: string;
}) => {
  return `You are a culinary video editor assistant. Build one clean JSON object for a vertical trim card.
Required fields: title, author, caption, likes, summary, keyFoodItem, location, cuisineTags (array of strings), thumbnailUrl, sourceUrl, nutrition { calories, protein, fat, carbs }.
If YouTube URL is provided, prioritize extracting real metadata from the URL context.
Keep response as raw JSON only.
Context description: ${description || 'N/A'}
YouTube URL: ${hasYoutubeUrl ? effectiveUrl : 'N/A'}
${oEmbedContext}`;
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
}: {
  description: string;
  effectiveUrl: string;
  video: string | null;
  videoMimeType: string;
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

const toTimingsOr = (value: unknown, fallback: ScoutTimings): ScoutTimings => {
  return value && typeof value === 'object' ? (value as ScoutTimings) : fallback;
};

const toMenuOr = (value: unknown, fallback: ScoutMenuSection[]): ScoutMenuSection[] => {
  return Array.isArray(value) ? (value as ScoutMenuSection[]) : fallback;
};

const toUserReviewsOr = (value: unknown, fallback: ScoutUserReview[]): ScoutUserReview[] => {
  return Array.isArray(value) ? (value as ScoutUserReview[]) : fallback;
};

const toNonEmptyStringArrayOr = (value: unknown, fallback: string[]) => {
  const normalized = sanitizeStringArray(value);
  return normalized.length > 0 ? normalized : fallback;
};

type ScoutMapTab = 'main' | 'fuzo' | 'my';

const resolveScoutDisplayPlaces = (
  tab: ScoutMapTab,
  mainMapPlaces: ScoutPlace[],
  communitySnapPlaces: ScoutPlace[],
  myMapPlaces: ScoutPlace[],
) => {
  const byTab: Record<ScoutMapTab, ScoutPlace[]> = {
    main: mainMapPlaces,
    fuzo: communitySnapPlaces,
    my: myMapPlaces,
  };
  return byTab[tab];
};

const resolveScoutCopy = (tab: ScoutMapTab, count: number, isLoading: boolean) => {
  const headlineByTab: Record<ScoutMapTab, string> = {
    main: `${count} FUZO Curated Locations`,
    fuzo: `${count} Snap Locations`,
    my: `${count} Personal Locations`,
  };

  const listTitleByTab: Record<ScoutMapTab, string> = {
    main: 'Main FUZO Locations',
    fuzo: 'FUZO Snap Locations',
    my: 'My Saved + Snap Locations',
  };

  const emptyStateByTab: Record<ScoutMapTab, string> = {
    main: 'No FUZO curated locations found right now.',
    fuzo: 'No community Snap locations available yet.',
    my: 'Save from Google Map cards or add Snap discoveries to populate My Map.',
  };

  return {
    scoutHeadline: isLoading ? 'Refreshing FUZO Locations...' : headlineByTab[tab],
    listTitle: listTitleByTab[tab],
    emptyStateMessage: emptyStateByTab[tab],
  };
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceMeters = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) => {
  const earthRadius = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadius * arc;
};

const ONBOARDING_V2_ENABLED = String(import.meta.env.VITE_ONBOARDING_V2_ENABLED || '').toLowerCase() === 'true';

// --- SHARED UI COMPONENTS ---

type BadgeColor = 'yellow' | 'stone' | 'blue' | 'emerald' | 'indigo' | 'red';

const BADGE_COLOR_CLASSES: Record<BadgeColor, string> = {
  yellow: 'bg-yellow-100 text-yellow-800',
  stone: 'bg-stone-100 text-stone-800',
  blue: 'bg-blue-100 text-blue-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  red: 'bg-red-100 text-red-800',
};

const Badge = ({ children, color = 'yellow' }: { children: React.ReactNode; color?: BadgeColor }) => (
  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${BADGE_COLOR_CLASSES[color]}`}>
    {children}
  </span>
);

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

// --- TINDER SWIPE ENGINE ---

type SwipeDirection = 'left' | 'right' | 'up' | 'down';
type SwipePointerEvent = React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>;

type YouTubeSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
    };
  };
};

const SwipeCard = ({ children, onSwipe, active }: { children: React.ReactNode; onSwipe: (dir: SwipeDirection) => void; active: boolean }) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handleStart = (e: SwipePointerEvent) => {
    if (!active) return;
    const isTouch = e.type === 'touchstart';
    const clientX = isTouch ? (e as React.TouchEvent<HTMLButtonElement>).touches[0].clientX : (e as React.MouseEvent<HTMLButtonElement>).clientX;
    const clientY = isTouch ? (e as React.TouchEvent<HTMLButtonElement>).touches[0].clientY : (e as React.MouseEvent<HTMLButtonElement>).clientY;
    startPos.current = { x: clientX, y: clientY };
    setIsSwiping(true);
  };

  const handleMove = (e: SwipePointerEvent) => {
    if (!isSwiping || !active) return;
    const isTouch = e.type === 'touchmove';
    const clientX = isTouch ? (e as React.TouchEvent<HTMLButtonElement>).touches[0].clientX : (e as React.MouseEvent<HTMLButtonElement>).clientX;
    const clientY = isTouch ? (e as React.TouchEvent<HTMLButtonElement>).touches[0].clientY : (e as React.MouseEvent<HTMLButtonElement>).clientY;
    setOffset({ x: clientX - startPos.current.x, y: clientY - startPos.current.y });
  };

  const handleEnd = () => {
    if (!isSwiping || !active) return;
    const threshold = 120;
    if (Math.abs(offset.x) > threshold) onSwipe(offset.x > 0 ? 'right' : 'left');
    else if (Math.abs(offset.y) > threshold) onSwipe(offset.y > 0 ? 'down' : 'up');
    else setOffset({ x: 0, y: 0 });
    setIsSwiping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!active) return;
    if (e.key === 'ArrowRight') onSwipe('right');
    if (e.key === 'ArrowLeft') onSwipe('left');
    if (e.key === 'ArrowUp') onSwipe('up');
    if (e.key === 'ArrowDown') onSwipe('down');
  };

  const rotation = offset.x * 0.05;
  const opacity = Math.min(Math.max(Math.abs(offset.x), Math.abs(offset.y)) / 150, 0.6);

  return (
    <button
      type="button"
      className={`absolute inset-0 w-full h-full rounded-[3.5rem] border-4 border-white shadow-2xl overflow-hidden transition-transform duration-300 ${isSwiping ? 'ease-none' : 'ease-out'}`}
      style={{ 
        transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
        zIndex: active ? 10 : 1,
        touchAction: 'none'
      }}
      tabIndex={active ? 0 : -1}
      aria-label="Swipe discovery card"
      onKeyDown={handleKeyDown}
      onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
      onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
    >
      {offset.x > 50 && <div className="absolute inset-0 bg-emerald-500 z-20 flex items-center justify-center pointer-events-none" style={{ opacity }}><Check size={120} strokeWidth={4} className="text-white" /></div>}
      {offset.x < -50 && <div className="absolute inset-0 bg-red-500 z-20 flex items-center justify-center pointer-events-none" style={{ opacity }}><X size={120} strokeWidth={4} className="text-white" /></div>}
      {offset.y < -50 && <div className="absolute inset-0 bg-yellow-400 z-20 flex items-center justify-center pointer-events-none" style={{ opacity }}><Share2 size={120} strokeWidth={4} className="text-stone-900" /></div>}
      {offset.y > 50 && <div className="absolute inset-0 bg-blue-500 z-20 flex items-center justify-center pointer-events-none" style={{ opacity }}><Bookmark size={120} strokeWidth={4} className="text-white" /></div>}
      {children}
    </button>
  );
};

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
    <div className="fixed inset-0 z-[120] bg-stone-900/60 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-10 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-[4rem] md:rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-20 duration-500">
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
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mt-2">{item.cat}</p>
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
          <h5 className="px-2 text-[10px] font-black uppercase tracking-widest text-stone-300">Active Contacts</h5>
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
                  {!!('username' in friend && friend.username) && <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">@{friend.username}</span>}
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
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100 text-[10px] font-black uppercase tracking-widest text-stone-400 text-center">
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

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isDesktop;
};

const DealCard = ({ item, index, onAction, onAuthorClick }: { item: AppItem, index: number, onAction: (action: string, item: AppItem) => void, onAuthorClick?: (item: AppItem) => void }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEntered, setIsEntered] = useState(false);
  const isAdOrTrivia = item.itemType === 'ad' || item.itemType === 'trivia' || item.type === 'ad' || item.type === 'trivia';

  useEffect(() => {
    setIsEntered(false);
    const frameId = requestAnimationFrame(() => setIsEntered(true));
    return () => cancelAnimationFrame(frameId);
  }, [item.id, index]);

  const entryDelay = index * 80;
  const initialTilt = index % 2 === 0 ? -6 : 6;

  return (
    <div
      className="relative w-[300px] h-[500px] cursor-pointer"
      style={{
        opacity: isEntered ? 1 : 0,
        transform: `translateY(${isEntered ? 0 : -80}px) rotate(${isEntered ? 0 : initialTilt}deg) scale(1)`,
        transition: `opacity 500ms ease ${entryDelay}ms, transform 700ms cubic-bezier(0.22, 1, 0.36, 1) ${entryDelay}ms`,
      }}
    >
      <div
        className="w-full h-full relative transition-transform duration-500 ease-out hover:scale-[1.02]"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateY(${isFlipped ? 180 : 0}deg)`,
        }}
      >
        {/* Front */}
        <button
          type="button"
          onClick={() => setIsFlipped(true)}
          aria-label={`Reveal ${item.name}`}
          className="absolute inset-0 w-full h-full rounded-[3rem] border-8 border-white shadow-2xl bg-yellow-400 flex flex-col items-center justify-center gap-6"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-white">
            <Eye size={48} strokeWidth={3} />
          </div>
          <p className="font-black uppercase tracking-[0.3em] text-white text-xs">Reveal Bite</p>
        </button>

        {/* Back */}
        <div 
          className="absolute inset-0 w-full h-full rounded-[3rem] border-8 border-white shadow-2xl bg-white overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <img src={item.img} alt={item.name || 'Deal item'} className="w-full h-full object-cover" />

          {!isAdOrTrivia && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mb-2">{item.name}</h3>
                <Badge color="yellow">{item.cat}</Badge>

                <p className="text-xs font-bold text-white/80 leading-relaxed mt-4 mb-4">
                  Experience the finest {String(item.cat || 'discoveries').toLowerCase()} in the city. Hand-picked for your Studio collection.
                </p>

                {item.author && onAuthorClick && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAuthorClick(item);
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-yellow-300 hover:text-yellow-100 transition-colors"
                  >
                    By @{item.author}
                  </button>
                )}

                <div className="grid grid-cols-4 gap-2">
                  <button onClick={(e) => { e.stopPropagation(); onAction('pass', item); }} className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl text-red-200 hover:bg-red-500/20 transition-colors flex items-center justify-center"><X size={20} strokeWidth={3} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onAction('like', item); }} className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl text-emerald-200 hover:bg-emerald-500/20 transition-colors flex items-center justify-center"><Heart size={20} strokeWidth={3} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onAction('share', item); }} className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl text-yellow-200 hover:bg-yellow-500/20 transition-colors flex items-center justify-center"><Share2 size={20} strokeWidth={3} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onAction('save', item); }} className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl text-blue-200 hover:bg-blue-500/20 transition-colors flex items-center justify-center"><Bookmark size={20} strokeWidth={3} /></button>
                </div>
              </div>
            </>
          )}

          {isAdOrTrivia && (
            <div className="absolute inset-0" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
};

// --- VIEWS ---

const shouldApplyLatestRequest = (
  mountedRef: { current: boolean },
  requestSeq: number,
  sequenceRef: { current: number }
) => mountedRef.current && requestSeq === sequenceRef.current;

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
    return <div className="py-20 text-center animate-pulse font-black uppercase text-stone-200 tracking-widest">Compiling Pack...</div>;
  }

  if (filteredRecipes.length === 0) {
    return (
      <div className="py-20 text-center space-y-6">
        <Search size={48} className="mx-auto text-stone-200" />
        <p className="font-black uppercase text-xs tracking-widest text-stone-400">No matches in current pack</p>
        <button onClick={onReset} className="px-8 py-4 bg-stone-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Refresh Feed</button>
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
          <div className="relative aspect-[4/5] rounded-[3.5rem] border-4 border-white shadow-xl overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
            <img src={recipe.image} alt={recipe.title || 'Recipe'} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
            <div className="absolute bottom-10 left-10 right-10 text-white">
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 leading-none">{recipe.title}</h3>
              <div className="flex gap-2 items-center text-[10px] font-bold uppercase tracking-widest opacity-80">
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
    <div className="fixed inset-0 z-[500] bg-stone-950/40 backdrop-blur-2xl flex items-center justify-center p-4 md:p-10 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative max-h-[90vh]"
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
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-400">
                <Clock size={16} /> {selectedRecipe.readyInMinutes} Mins
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-400">
                <User size={16} /> {selectedRecipe.servings} Serves
              </div>
            </div>
          </div>

          {/* Stats (Mobile) */}
          <div className="flex md:hidden px-8 py-6 gap-6 border-b border-stone-50">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-400">
                <Clock size={16} /> {selectedRecipe.readyInMinutes} Mins
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-400">
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
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
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
                            {Math.round(n.amount)} <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest ml-1">{n.unit}</span>
                          </p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mt-1 truncate">{n.name}</p>
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
              <span className="text-[10px] font-black uppercase tracking-widest">Save to Plate</span>
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
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300 px-2">Dietary Preferences</h4>
            <div className="flex flex-wrap gap-3">
              {BITE_DIETS.map((diet) => (
                <button
                  key={diet}
                  onClick={() => onToggleDiet(diet)}
                  className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeDiet === diet ? 'bg-yellow-400 text-stone-900 shadow-lg' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}
                >
                  {diet}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300 px-2">Global Cuisines</h4>
            <div className="flex flex-wrap gap-3">
              {BITE_CUISINES.map((cuisine) => (
                <button
                  key={cuisine}
                  onClick={() => onToggleCuisine(cuisine)}
                  className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCuisine === cuisine ? 'bg-yellow-400 text-stone-900 shadow-lg' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}
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

const AIRecipeStudio = ({
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

  const [image, setImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState('image/jpeg');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipeCard | null>(null);
  const [selectedTag, setSelectedTag] = useState<BitesAiTag>('Recipe Card');
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imageData = await readImageFileAsDataUrl(file);
      setImage(imageData);
      setImageMimeType(file.type || 'image/jpeg');
      setError(null);
    } catch {
      setError('Failed to read image. Please try another file.');
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const prompt = `You are an expert chef and nutrition analyst. Build one clean JSON object for a recipe card.
    Fields required: title, category, readyInMinutes, servings, ingredients (array of strings), instructions (string), nutrition { calories, protein, fat, carbs }, aiTag.
    aiTag must be one of: ${BITES_AI_TAG_OPTIONS.join(', ')}.
Use the user description and optional image context. Keep response as raw JSON only.
User description: ${description}`;

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
      if (image?.includes(',')) {
        parts.push({
          inlineData: {
            mimeType: imageMimeType,
            data: image.split(',')[1],
          },
        });
      }

      const response = await GeminiService.generateContent({
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
              aiTag: {
                type: 'string',
                enum: [...BITES_AI_TAG_OPTIONS],
              },
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
            required: ['title', 'readyInMinutes', 'servings', 'ingredients', 'instructions', 'nutrition', 'aiTag'],
          },
        },
      });

      if (!response.success || !response.data?.text) {
        throw new Error(response.error || 'Gemini generation failed');
      }

      const parsed = parseAiJson(response.data.text);
      if (!parsed?.title) {
        throw new Error('Invalid AI response format');
      }

      const aiTag = BITES_AI_TAG_OPTIONS.includes(parsed.aiTag as BitesAiTag)
        ? (parsed.aiTag as BitesAiTag)
        : 'Recipe Card';

      setSelectedTag(aiTag);
      setGeneratedRecipe(parsed);
    } catch {
      setError('Failed to generate recipe card. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const buildActionItem = (): BiteActionItem | null => {
    if (!generatedRecipe) return null;
    return {
      id: `recipe-ai-${Date.now()}`,
      name: generatedRecipe.title || 'AI Recipe',
      cat: generatedRecipe.category || 'AI Recipe',
      img: image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=400',
      metadata: {
        title: generatedRecipe.title || 'AI Recipe',
        name: generatedRecipe.title || 'AI Recipe',
        cat: generatedRecipe.category || 'AI Recipe',
        image: image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=400',
        generatedRecipe,
        aiTag: selectedTag,
        tags: [selectedTag],
      },
    };
  };

  const handleSave = () => {
    const item = buildActionItem();
    if (!item) return;
    onSave(item);
    onClose();
  };

  const handleShare = () => {
    const item = buildActionItem();
    if (!item) return;
    onShareRequest(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-stone-950 text-white flex flex-col overflow-hidden">
      <button
        onClick={onClose}
        className="absolute top-8 right-8 z-30 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center transition-colors shadow-2xl"
      >
        <X size={24} />
      </button>

      <div className="flex-grow overflow-y-auto p-8 md:p-24 pt-24 md:pt-32">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <label htmlFor="ai-recipe-image" className="text-[10px] font-black uppercase tracking-widest text-stone-500">Upload Image (Optional)</label>
              <div className="relative aspect-video bg-stone-900 rounded-[2.5rem] border-4 border-dashed border-stone-800 overflow-hidden group hover:border-yellow-400/50 transition-all">
                {image ? (
                  <>
                    <img src={image} alt="Uploaded context" className="w-full h-full object-cover" />
                    <button onClick={() => setImage(null)} className="absolute top-4 right-4 p-2 bg-black/60 rounded-full hover:bg-red-500 transition-colors"><X size={16} /></button>
                  </>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                    <ImageIcon size={48} className="text-stone-700 group-hover:text-yellow-400 transition-colors mb-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">Upload Dish Image</span>
                    <input id="ai-recipe-image" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label htmlFor="ai-recipe-description" className="text-[10px] font-black uppercase tracking-widest text-stone-500">Recipe Description</label>
              <textarea
                id="ai-recipe-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your recipe in a few lines..."
                className="w-full h-64 bg-stone-900 border-4 border-stone-800 rounded-[2.5rem] p-8 font-bold text-sm outline-none focus:border-yellow-400 transition-all resize-none"
              />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Card Tag</p>
              <div className="flex flex-wrap gap-2">
                {BITES_AI_TAG_OPTIONS.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${selectedTag === tag ? 'bg-yellow-400 text-stone-900' : 'bg-stone-900 text-stone-300 border border-stone-700 hover:text-white'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !description.trim()}
              className="w-full py-6 bg-white text-stone-950 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-4"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={24} />}
              {isGenerating ? 'Generating...' : 'Generate Card'}
            </button>
            {error && <p className="text-red-500 text-center text-xs font-bold uppercase tracking-widest">{error}</p>}
          </div>

          <div className="relative">
            {generatedRecipe ? (
              <div className="bg-white text-stone-950 rounded-[3.5rem] p-10 shadow-2xl space-y-8 h-fit sticky top-0">
                <header className="space-y-2">
                  <Badge color="yellow">AI Generated</Badge>
                  <Badge color="stone">{selectedTag}</Badge>
                  <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">{generatedRecipe.title}</h3>
                  <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-stone-400">
                    <span>{generatedRecipe.readyInMinutes || 20} Mins</span>
                    <span>•</span>
                    <span>{generatedRecipe.servings || 2} Servings</span>
                  </div>
                </header>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">Ingredients</h4>
                  <ul className="space-y-2">
                    {(generatedRecipe.ingredients || []).slice(0, 6).map((ing: string) => (
                      <li key={ing} className="text-xs font-bold text-stone-600 flex gap-2">
                        <div className="w-1 h-1 bg-yellow-400 rounded-full mt-1.5 shrink-0" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleSave}
                    className="flex-grow py-5 bg-stone-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                  >
                    <Bookmark size={16} /> Save to Plate
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-5 bg-stone-100 text-stone-900 rounded-2xl hover:bg-yellow-400 transition-colors"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] bg-stone-900/50 rounded-[3.5rem] border-4 border-dashed border-stone-800 flex flex-col items-center justify-center text-center p-12 space-y-6">
                <div className="w-20 h-20 bg-stone-800 rounded-3xl flex items-center justify-center text-stone-700">
                  <ChefHat size={40} />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tighter text-stone-600">AI Recipe Studio</h4>
                  <p className="text-[10px] font-bold text-stone-700 uppercase tracking-widest mt-2">Generated recipe card appears here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const FeedView = ({ onSave, onShareRequest, onOpenUserProfile }: { onSave: (item: AppItem) => void, onShareRequest: (item: AppItem) => void, onOpenUserProfile: (userId: string) => void }) => {
  const [items, setItems] = useState<FeedUiItem[]>([...LOCAL_CURATED_FEED_ITEMS]);
  const [feedSource, setFeedSource] = useState<'local' | 'feedService'>('local');
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string>('');

  const [batchIndex, setBatchIndex] = useState(0);
  const [batchVisible, setBatchVisible] = useState(false);
  const isDesktop = useIsDesktop();
  const feedRequestSeqRef = useRef(0);
  const feedRetryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedMountedRef = useRef(true);
  const missingAuthorTelemetryRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      feedMountedRef.current = false;
      if (feedRetryDebounceRef.current) {
        clearTimeout(feedRetryDebounceRef.current);
      }
    };
  }, []);

  const fetchFromFeedService = async (isRetry = false) => {
    const shouldFetch = FEED_COMPARE_WITH_LOCAL || FEED_USE_SERVICE;
    if (!shouldFetch) return;

    if (FEED_USE_SERVICE || isRetry) {
      setFeedLoading(true);
      setFeedError('');
    }

    const requestSeq = ++feedRequestSeqRef.current;

    try {
      const userLocation = await getUserFeedLocation();
      const feedCards = await FeedService.generateFeed({
        pageSize: Math.max(LOCAL_CURATED_FEED_ITEMS.length, 12),
        userLocation,
      });

      const adaptedCards = ensureAdTriviaPresence(normalizeFeedServiceToCards(feedCards), LOCAL_CURATED_FEED_ITEMS);

      if (FEED_COMPARE_WITH_LOCAL) {
        logFeedParity(LOCAL_CURATED_FEED_ITEMS, adaptedCards);
      }

      const isLatestRequest = shouldApplyLatestRequest(feedMountedRef, requestSeq, feedRequestSeqRef);

      if ((FEED_USE_SERVICE || isRetry) && isLatestRequest) {
        if (adaptedCards.length > 0) {
          setItems(adaptedCards);
          setBatchIndex(0);
          setFeedSource('feedService');
          setFeedError('');
        } else {
          setItems([...LOCAL_CURATED_FEED_ITEMS]);
          setBatchIndex(0);
          setFeedSource('local');
          setFeedError('Feed returned no results. Using curated feed.');
        }
      }
    } catch (error) {
      console.error('FeedService fetch failed, falling back to curated feed:', error);
      const isLatestRequest = shouldApplyLatestRequest(feedMountedRef, requestSeq, feedRequestSeqRef);
      if ((FEED_USE_SERVICE || isRetry) && isLatestRequest) {
        setItems([...LOCAL_CURATED_FEED_ITEMS]);
        setBatchIndex(0);
        setFeedSource('local');
        setFeedError('Feed unavailable. Using curated feed.');
      }
    } finally {
      const isLatestRequest = shouldApplyLatestRequest(feedMountedRef, requestSeq, feedRequestSeqRef);
      if ((FEED_USE_SERVICE || isRetry) && isLatestRequest) {
        setFeedLoading(false);
      }
    }
  };

  const handleRetryFeed = () => {
    if (feedRetryDebounceRef.current) {
      clearTimeout(feedRetryDebounceRef.current);
    }
    feedRetryDebounceRef.current = setTimeout(() => {
      fetchFromFeedService(true);
    }, 300);
  };

  useEffect(() => {
    fetchFromFeedService();
  }, []);

  useEffect(() => {
    setBatchVisible(false);
    const frameId = requestAnimationFrame(() => setBatchVisible(true));
    return () => cancelAnimationFrame(frameId);
  }, [batchIndex]);

  const BATCH_SIZE = 3;

  const resolveItemUserId = useCallback((item: AppItem) => {
    const directAuthorUserId = typeof (item as { authorUserId?: unknown }).authorUserId === 'string'
      ? ((item as { authorUserId?: string }).authorUserId || '').trim()
      : '';
    if (directAuthorUserId) {
      return directAuthorUserId;
    }

    const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : null;
    const candidates = [
      metadata?.authorUserId,
      metadata?.userId,
      metadata?.user_id,
      metadata?.authorId,
      metadata?.author_id,
    ];
    const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
    return typeof value === 'string' ? value.trim() : '';
  }, []);

  const handleOpenFeedAuthor = useCallback((item: AppItem) => {
    const authorId = resolveItemUserId(item);
    if (!authorId) {
      const telemetryId = String(item.id || item.itemId || item.name || 'unknown-feed-item');
      if (!missingAuthorTelemetryRef.current.has(telemetryId)) {
        missingAuthorTelemetryRef.current.add(telemetryId);
        console.info('[FeedAuthorProfile] Missing author user id; skipping profile navigation', {
          telemetryId,
          itemType: item.itemType,
          itemId: item.itemId,
          author: item.author,
          metadataKeys: item.metadata && typeof item.metadata === 'object'
            ? Object.keys(item.metadata)
            : [],
        });
      }
      return;
    }
    onOpenUserProfile(authorId);
  }, [onOpenUserProfile, resolveItemUserId]);

  const currentBatch = useMemo(() => {
    if (items.length === 0) return [];
    const size = Math.min(BATCH_SIZE, items.length);
    return Array.from({ length: size }, (_, offset) => items[(batchIndex + offset) % items.length]);
  }, [items, batchIndex]);

  const renderDesktopFeedContent = () => {
    if (feedLoading) {
      return (
        <div className="min-h-[550px] w-full flex flex-col items-center justify-center gap-4 text-stone-400">
          <Loader2 size={40} className="animate-spin" />
          <p className="font-black uppercase tracking-widest text-xs">Loading Discovery Feed</p>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="min-h-[550px] w-full flex flex-col items-center justify-center gap-4 text-stone-300">
          <p className="font-black uppercase tracking-widest text-xs">No discovery cards available</p>
          <button onClick={handleRetryFeed} className="px-8 py-4 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px]">Retry Feed</button>
        </div>
      );
    }

    return (
      <div className="flex gap-8 items-center justify-center min-h-[550px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={batchIndex}
            className="flex gap-8"
            style={{
              opacity: batchVisible ? 1 : 0,
              transform: `translateY(${batchVisible ? 0 : 18}px) scale(${batchVisible ? 1 : 0.98})`,
              transition: 'opacity 280ms ease, transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {currentBatch.map((item, i) => (
              <div key={item.id}>
                <DealCard item={item} index={i} onAction={handleAction} onAuthorClick={handleOpenFeedAuthor} />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  const renderMobileFeedContent = () => {
    if (feedLoading) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-stone-300 gap-4">
          <Loader2 size={48} className="animate-spin" />
          <p className="font-black uppercase tracking-widest text-xs">Loading Discovery Feed</p>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-stone-200 gap-4">
           <RefreshCw size={48} className="animate-spin-slow opacity-20" />
           <p className="font-black uppercase tracking-widest text-xs">End of the discovery</p>
           <button onClick={handleRetryFeed} className="px-6 py-3 bg-stone-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Retry Feed</button>
        </div>
      );
    }

    return items.map((item, i) => {
      const isAdOrTrivia = item.itemType === 'ad' || item.itemType === 'trivia';

      return (
        <SwipeCard key={item.id} active={i === 0} onSwipe={handleSwipe}>
          <img src={item.img} alt={item.name || 'Feed item'} className="w-full h-full object-cover" />
          {!isAdOrTrivia && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent" />
              <div className="absolute bottom-10 left-10 right-10 text-white">
                <h3 className="text-4xl font-black uppercase tracking-tighter mb-2 leading-none">{item.name}</h3>
                <Badge color="yellow">{item.cat}</Badge>
              </div>
            </>
          )}
        </SwipeCard>
      );
    });
  };

  const handleAction = (action: string, item: AppItem) => {
    if (item?.itemType === 'ad' || item?.itemType === 'trivia') {
      return;
    }

    if (action === 'save') onSave(item);
    if (action === 'share') onShareRequest(item);
    if (action === 'like' || action === 'pass') {
      // For now, just a visual feedback or move to next
    }
  };

  const dealNext = () => {
    if (items.length === 0) return;
    setBatchIndex(prev => (prev + BATCH_SIZE) % items.length);
  };

  const handleSwipe = (dir: string) => {
    if (items.length === 0) return;
    const currentItem = items[0];
    if (dir === 'up') {
      if (currentItem?.itemType !== 'ad' && currentItem?.itemType !== 'trivia') {
        onShareRequest(currentItem);
      }
    } else if (dir === 'down') {
      if (currentItem?.itemType !== 'ad' && currentItem?.itemType !== 'trivia') {
        onSave(currentItem);
      }
    }
    setItems(prev => prev.slice(1));
  };

  if (isDesktop) {
    return (
      <div className="flex flex-col items-center gap-12 animate-in fade-in py-10 w-full max-w-6xl mx-auto">
        <header className="text-center space-y-2">
          <Badge color="yellow">Studio Dealer</Badge>
          <h2 className="text-6xl font-black uppercase tracking-tighter leading-none">Discovery Hand</h2>
          {feedSource === 'local' && FEED_USE_SERVICE && (
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Curated Feed Fallback Active</p>
          )}
        </header>

        {renderDesktopFeedContent()}

        <button 
          onClick={dealNext}
          disabled={items.length === 0 || feedLoading}
          className="px-12 py-6 bg-stone-900 text-white rounded-[2.5rem] font-black uppercase tracking-widest flex items-center gap-4 hover:scale-105 transition-transform shadow-2xl active:scale-95"
        >
          <RefreshCw size={24} /> Deal Next Hand
        </button>
        {!!feedError && (
          <div className="text-[10px] font-black uppercase tracking-widest text-red-500">{feedError}</div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 animate-in fade-in py-2">
      <div className="w-full max-w-sm px-4 hidden md:block">
        <Badge color="yellow">Studio Stack</Badge>
        <h2 className="text-4xl font-black uppercase tracking-tighter mt-1">Discovery</h2>
        {feedSource === 'local' && FEED_USE_SERVICE && (
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-300 mt-2">Curated Feed Fallback Active</p>
        )}
      </div>
      <div className="relative w-full max-w-[400px] aspect-[3/4.6]">
        {renderMobileFeedContent()}
      </div>
      {!!feedError && (
        <div className="text-[10px] font-black uppercase tracking-widest text-red-500 px-4 text-center">{feedError}</div>
      )}
    </div>
  );
};

const BitesView = ({ onSave, onShareRequest }: { onSave: (item: BiteActionItem) => void, onShareRequest: (item: BiteActionItem) => void }) => {
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
    <div className="space-y-8 animate-in fade-in pb-24 px-4">
      <BitesControls
        loading={loading}
        searchQuery={searchQuery}
        activeDiet={activeDiet}
        activeCuisine={activeCuisine}
        showFilters={showFilters}
        onSearchQueryChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onRefresh={() => fetchBites(true)}
        onToggleFilters={() => setShowFilters((prev) => !prev)}
        onToggleDiet={(diet) => setActiveDiet(activeDiet === diet ? null : diet)}
        onToggleCuisine={(cuisine) => setActiveCuisine(activeCuisine === cuisine ? null : cuisine)}
      />

      {serviceError && (
        <div className="px-6 py-4 bg-yellow-50 border border-yellow-100 rounded-2xl text-[11px] font-bold text-yellow-800">
          {serviceError}
        </div>
      )}
      <BitesGrid loading={loading} filteredRecipes={filteredRecipes} onSelectRecipe={setSelectedRecipe} onReset={handleResetGrid} />

      <BitesRecipeModal
        selectedRecipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onSaveRecipe={handleSaveRecipe}
        onShareRecipe={handleShareRecipe}
      />
    </div>
  );
};

const AITrimStudio = ({
  onSave,
  onShareRequest,
  onClose,
}: {
  onSave: (item: AppItem) => void;
  onShareRequest: (item: AppItem) => void;
  onClose: () => void;
}) => {
  const [video, setVideo] = useState<string | null>(null);
  const [videoMimeType, setVideoMimeType] = useState('video/mp4');
  const [linkURL, setLinkURL] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTrim, setGeneratedTrim] = useState<GeneratedTrimCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trimDraftIdRef = useRef<string | null>(null);
  const autoGeneratedLinkRef = useRef('');

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError('Video too large. Max 50MB.');
      return;
    }

    try {
      const videoData = await readImageFileAsDataUrl(file);
      setVideo(videoData);
      setVideoMimeType(file.type || 'video/mp4');
      setError(null);
    } catch {
      setError('Failed to read video file.');
    }
  };

  const handleGenerate = async (urlOverride?: string) => {
    const effectiveUrl = (urlOverride ?? linkURL).trim();
    const hasYoutubeUrl = isYouTubeUrl(effectiveUrl);
    if (!description.trim() && !hasYoutubeUrl) return;

    setIsGenerating(true);
    setError(null);

    try {
      const generated = await requestGeneratedTrimCard({
        description,
        effectiveUrl,
        video,
        videoMimeType,
      });

      trimDraftIdRef.current = String(Date.now());
      setGeneratedTrim(generated);
      if (hasYoutubeUrl) {
        autoGeneratedLinkRef.current = effectiveUrl;
      }
    } catch {
      setError('Failed to generate trim card. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const trimmed = linkURL.trim();
    if (!isYouTubeUrl(trimmed)) return;
    if (autoGeneratedLinkRef.current === trimmed) return;
    if (isGenerating) return;

    const timer = globalThis.setTimeout(() => {
      handleGenerate(trimmed).catch(() => {
        setError('Failed to analyze YouTube URL. You can still tap Generate Trim Card.');
      });
    }, 350);

    return () => globalThis.clearTimeout(timer);
  }, [linkURL, isGenerating]);

  const buildTrimItem = () => {
    if (!generatedTrim) return null;
    const draftId = trimDraftIdRef.current || String(Date.now());
    const fallbackImage = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=400';
    return {
      id: `video-ai-${draftId}`,
      itemType: 'video',
      itemId: `ai-${draftId}`,
      name: generatedTrim.title || 'AI Studio Trim',
      cat: 'Studio Trim',
      img: generatedTrim.thumbnailUrl || fallbackImage,
      video,
      metadata: {
        title: generatedTrim.title || 'AI Studio Trim',
        name: generatedTrim.title || 'AI Studio Trim',
        image: generatedTrim.thumbnailUrl || fallbackImage,
        cat: 'Studio Trim',
        caption: generatedTrim.caption || 'AI generated Studio trim card ready to post.',
        likes: generatedTrim.likes || '0',
        nutrition: generatedTrim.nutrition,
        channelTitle: generatedTrim.author || 'FUZO AI Studio',
        sourceUrl: generatedTrim.sourceUrl || linkURL.trim() || undefined,
        summary: generatedTrim.summary || '',
        keyFoodItem: generatedTrim.keyFoodItem || '',
        location: generatedTrim.location || '',
        cuisineTags: generatedTrim.cuisineTags || [],
        thumbnailUrl: generatedTrim.thumbnailUrl || '',
        generatedTrim,
      },
      ...generatedTrim,
    };
  };

  const handleSave = () => {
    const item = buildTrimItem();
    if (!item) return;
    onSave(item);
    onClose();
  };

  const handleShare = () => {
    const item = buildTrimItem();
    if (!item) return;
    onShareRequest(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-stone-950 text-white flex flex-col overflow-hidden">
      <button
        onClick={onClose}
        className="absolute top-8 right-8 z-30 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center transition-colors shadow-2xl"
      >
        <X size={24} />
      </button>

      <div className="flex-grow overflow-y-auto p-8 md:p-24 pt-24 md:pt-32">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <label htmlFor="ai-trim-video" className="text-[10px] font-black uppercase tracking-widest text-stone-500">Upload Video (Optional)</label>
              <div className="relative aspect-[9/16] bg-stone-900 rounded-[2.5rem] border-4 border-dashed border-stone-800 overflow-hidden group hover:border-emerald-400/50 transition-all">
                {video ? (
                  <>
                    <video src={video} className="w-full h-full object-cover" autoPlay loop muted />
                    <button onClick={() => setVideo(null)} className="absolute top-4 right-4 p-2 bg-black/60 rounded-full hover:bg-red-500 transition-colors"><X size={16} /></button>
                  </>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                    <PlayCircle size={48} className="text-stone-700 group-hover:text-emerald-400 transition-colors mb-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-600 px-8 text-center">Upload Vertical Trim</span>
                    <input id="ai-trim-video" type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label htmlFor="ai-trim-link-url" className="text-[10px] font-black uppercase tracking-widest text-stone-500">YouTube URL (Optional)</label>
              <input
                id="ai-trim-link-url"
                value={linkURL}
                onChange={(e) => {
                  setLinkURL(e.target.value);
                  setError(null);
                }}
                placeholder="Paste YouTube link to auto-generate card"
                className="w-full bg-stone-900 border-4 border-stone-800 rounded-[2rem] px-6 py-4 font-bold text-xs outline-none focus:border-emerald-400 transition-all"
              />
              {!!linkURL.trim() && !isYouTubeUrl(linkURL) && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Enter a valid YouTube URL.</p>
              )}
            </div>

            <div className="space-y-4">
              <label htmlFor="ai-trim-description" className="text-[10px] font-black uppercase tracking-widest text-stone-500">Trim Description</label>
              <textarea
                id="ai-trim-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the video and recipe context... Add #mock for local smoke test."
                className="w-full h-64 bg-stone-900 border-4 border-stone-800 rounded-[2.5rem] p-8 font-bold text-sm outline-none focus:border-emerald-400 transition-all resize-none"
              />
            </div>

            <button
              onClick={() => {
                handleGenerate().catch(() => {
                  setError('Failed to generate trim card. Please try again.');
                });
              }}
              disabled={isGenerating || (!description.trim() && !isYouTubeUrl(linkURL))}
              className="w-full py-6 bg-white text-stone-950 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-4"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={24} />}
              {isGenerating ? 'Generating...' : 'Generate Trim Card'}
            </button>
            {error && <p className="text-red-500 text-center text-xs font-bold uppercase tracking-widest">{error}</p>}
          </div>

          <div className="relative">
            {generatedTrim ? (
              <div className="h-fit sticky top-0 space-y-4">
                <div className="relative aspect-[9/16] rounded-[3.5rem] overflow-hidden bg-stone-900 shadow-2xl border-4 border-white">
                  {video ? (
                    <video src={video} className="w-full h-full object-cover" autoPlay loop muted />
                  ) : (
                    <img src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800" alt="AI trim preview" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                  <div className="absolute top-6 left-6 z-20">
                    <Badge color="yellow">AI Trim Ready</Badge>
                  </div>

                  <div className="absolute bottom-12 left-8 right-24 text-white space-y-3 z-20">
                    <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight">{generatedTrim.title}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/80">@{generatedTrim.author || 'FUZO AI Studio'}</p>
                    <p className="text-xs font-bold text-white/90 line-clamp-3">{generatedTrim.caption || 'AI generated Studio trim card ready to post.'}</p>
                  </div>

                  <div className="absolute right-6 bottom-28 flex flex-col gap-7 text-white items-center z-20">
                    <button onClick={handleSave} className="flex flex-col items-center gap-1 hover:scale-110 transition-transform">
                      <Heart size={28} className="fill-white" />
                      <span className="text-[10px] font-black">{generatedTrim.likes || '1k'}</span>
                    </button>
                    <button onClick={handleShare} className="flex flex-col items-center gap-1">
                      <Share2 size={28} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleSave}
                    className="flex-grow py-5 bg-stone-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                  >
                    <Bookmark size={16} /> Save to Plate
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-5 bg-stone-100 text-stone-900 rounded-2xl hover:bg-yellow-400 transition-colors"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] bg-stone-900/50 rounded-[3.5rem] border-4 border-dashed border-stone-800 flex flex-col items-center justify-center text-center p-12 space-y-6">
                <div className="w-20 h-20 bg-stone-800 rounded-3xl flex items-center justify-center text-stone-700">
                  <PlayCircle size={40} />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tighter text-stone-600">AI Trim Studio</h4>
                  <p className="text-[10px] font-bold text-stone-700 uppercase tracking-widest mt-2">Generated trim card appears here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TrimsView = ({ onSave, onShareRequest, authUser }: { onSave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void; authUser: AuthUser | null; }) => {
  const isEmbeddableYouTubeId = (videoId: string) => /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  const buildTrimEmbedUrl = (videoId: string, autoplay: boolean) => (
    `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&mute=1&playsinline=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1`
  );

  const resolveRegionCode = useCallback((): string | undefined => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneToRegion: Record<string, string> = {
      'Asia/Kolkata': 'IN',
      'Asia/Calcutta': 'IN',
      'Asia/Dubai': 'AE',
      'Europe/London': 'GB',
      'America/Toronto': 'CA',
      'America/New_York': 'US',
    };

    if (timezone && timezoneToRegion[timezone]) {
      return timezoneToRegion[timezone];
    }

    const localeCandidates = [
      ...(Array.isArray(globalThis.navigator.languages) ? globalThis.navigator.languages : []),
      globalThis.navigator.language,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);

    for (const locale of localeCandidates) {
      const parts = locale.split('-').map((entry) => entry.trim()).filter(Boolean);
      const reversedParts = [...parts].reverse();
      const region = reversedParts.find((part) => /^[A-Za-z]{2}$/.test(part));
      if (region) {
        return region.toUpperCase();
      }
    }

    return undefined;
  }, []);

  const [videos, setVideos] = useState<TrimVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState('');
  const [feedSource, setFeedSource] = useState<'live' | 'cache' | 'fallback'>('fallback');
  const [locationLabel, setLocationLabel] = useState('Localized');
  const trimsMountedRef = useRef(true);
  const trimsScrollRootRef = useRef<HTMLDivElement | null>(null);
  const trimCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeTrimId, setActiveTrimId] = useState('');

  const applyTrimsFallback = useCallback((message?: string) => {
    if (!trimsMountedRef.current) return;
    setVideos(TRIMS_FALLBACK_VIDEOS);
    setFeedSource('fallback');
    if (message) setServiceError(message);
  }, []);

  const normalizeTrimVideos = useCallback((items: YouTubeSearchItem[]): TrimVideo[] => {
    return items.map((video, index: number) => {
      const videoId = video?.id?.videoId || `video-${index + 1}`;
      const thumbnail = video?.snippet?.thumbnails?.high?.url
        || video?.snippet?.thumbnails?.medium?.url
        || TRIMS_FALLBACK_VIDEOS[index % TRIMS_FALLBACK_VIDEOS.length].img;

      return {
        id: videoId,
        videoId,
        title: video?.snippet?.title || `Studio Trim ${index + 1}`,
        author: video?.snippet?.channelTitle || 'FUZO Studio',
        likes: `${Math.max(1, 25 - index)}k`,
        img: thumbnail,
      };
    });
  }, []);

  const applyTrimsResponse = useCallback((response: Awaited<ReturnType<typeof YouTubeService.getLocalizedTrimsFeed>>) => {
    const items = response.data?.items || [];
    setFeedSource(response.data?.source || 'fallback');

    if (!response.success || !Array.isArray(items) || items.length === 0) {
      applyTrimsFallback(response.error);
      return;
    }

    const normalized = normalizeTrimVideos(items as YouTubeSearchItem[]);
    if (trimsMountedRef.current) {
      setVideos(normalized);
    }
  }, [applyTrimsFallback, normalizeTrimVideos]);

  useEffect(() => {
    return () => {
      trimsMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!videos.length) {
      setActiveTrimId('');
      return;
    }

    setActiveTrimId((prev) => {
      if (prev && videos.some((video) => video.id === prev)) {
        return prev;
      }
      return videos[0].id;
    });
  }, [videos]);

  useEffect(() => {
    const root = trimsScrollRootRef.current;
    if (!root || videos.length === 0) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      const next = visible[0];
      if (!next) return;

      const nextId = (next.target as HTMLElement).dataset.trimId;
      if (nextId) {
        setActiveTrimId(nextId);
      }
    }, {
      root,
      threshold: [0.6, 0.75, 0.9],
    });

    videos.forEach((video) => {
      const element = trimCardRefs.current[video.id];
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [videos]);

  useEffect(() => {
    const fetchTrims = async () => {
      setLoading(true);
      setServiceError('');

      try {
        const settings = await SettingsService.getUserSettings(authUser);
        const profileLocation = settings.success ? settings.data?.location : '';
        const profileCuisine = settings.success ? settings.data?.cuisine : '';
        const profileDiet = settings.success ? settings.data?.diet : '';

        const geo = await getUserFeedLocation();
        const locationText = geo
          ? `near ${geo.lat.toFixed(2)},${geo.lng.toFixed(2)}`
          : (profileLocation?.trim() || 'local');
        const regionCode = resolveRegionCode();

        setLocationLabel(locationText);

        const userHash = authUser?.id || authUser?.email || 'guest';
        const queries = buildTrimQueries({
          location: locationText,
          cuisine: profileCuisine,
          diet: profileDiet,
        });

        const response = await YouTubeService.getLocalizedTrimsFeed({
          userHash,
          location: locationText,
          cuisine: profileCuisine,
          diet: profileDiet,
          regionCode,
          queries,
          maxResultsPerQuery: 8,
        });
        applyTrimsResponse(response);
      } catch {
        applyTrimsFallback('Unable to load live trims. Showing curated fallback videos.');
      } finally {
        if (trimsMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchTrims();
  }, [authUser, applyTrimsFallback, applyTrimsResponse, resolveRegionCode]);

  const toTrimActionItem = (v: TrimVideo): AppItem => ({
      id: `video-${v.videoId || v.id}`,
      itemType: 'video',
      itemId: String(v.videoId || v.id),
      name: v.title,
      cat: 'Studio Trim',
      img: v.img,
      metadata: {
        title: v.title,
        name: v.title,
        image: v.img,
        cat: 'Studio Trim',
        videoId: String(v.videoId || v.id),
        likes: v.likes,
        channelTitle: v.author,
      },
    });

  const handleSaveVideo = (v: TrimVideo) => {
    onSave(toTrimActionItem(v));
  };

  const handleShareVideo = (v: TrimVideo) => {
    onShareRequest(toTrimActionItem(v));
  };

  let feedSourceLabel = 'Fallback';
  if (feedSource === 'live') {
    feedSourceLabel = 'Live';
  } else if (feedSource === 'cache') {
    feedSourceLabel = 'Cached';
  }

  if (loading) {
    return (
      <div className="h-[80vh] w-full max-w-md mx-auto rounded-[3.5rem] bg-stone-900 shadow-2xl border-4 border-white flex items-center justify-center text-white font-black uppercase tracking-widest text-xs">
        Loading Trims...
      </div>
    );
  }

  return (
    <div className="h-[80vh] w-full max-w-md mx-auto relative">
      <div className="absolute top-6 right-6 z-30 px-4 py-2 bg-black/35 border border-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
        {feedSourceLabel} · {locationLabel}
      </div>

      <div ref={trimsScrollRootRef} className="h-full w-full relative snap-y snap-mandatory overflow-y-auto hide-scrollbar rounded-[3.5rem] bg-stone-900 shadow-2xl border-4 border-white">
      {serviceError && (
        <div className="absolute top-4 left-4 right-4 z-30 px-4 py-3 bg-yellow-50/95 border border-yellow-100 rounded-2xl text-[10px] font-bold text-yellow-800 backdrop-blur-sm">
          {serviceError}
        </div>
      )}
      {videos.map(v => (
        <div
          key={v.id}
          data-trim-id={v.id}
          ref={(element) => {
            trimCardRefs.current[v.id] = element;
          }}
          className="h-full w-full snap-start relative"
        >
          {(() => {
            const videoId = String(v.videoId || '');
            const isActiveTrim = activeTrimId === v.id;
            const canEmbed = isEmbeddableYouTubeId(videoId);

            if (canEmbed && isActiveTrim) {
              return (
                <iframe
                  src={buildTrimEmbedUrl(videoId, true)}
                  title={v.title || 'Trim video'}
                  className="w-full h-full object-cover"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              );
            }

            return <img src={v.img} alt={v.title || 'Trim video'} className="w-full h-full object-cover opacity-80" />;
          })()}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent" />
          <div className="absolute bottom-12 left-8 right-8 text-white space-y-4">
             <Badge color="yellow">Studio Trim #{v.id}</Badge>
             <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight">{v.title}</h3>
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md" />
                <p className="text-[10px] font-black uppercase tracking-widest">@{v.author}</p>
             </div>
          </div>
          <div className="absolute right-6 bottom-32 flex flex-col gap-8 text-white items-center">
            <button onClick={() => handleSaveVideo(v)} className="flex flex-col items-center gap-1 hover:scale-110 transition-transform">
              <Heart size={28} className="fill-white" />
              <span className="text-[10px] font-black">{v.likes}</span>
            </button>
            <button className="flex flex-col items-center gap-1"><MessageSquare size={28} /><span className="text-[10px] font-black">2k</span></button>
            <button onClick={() => handleShareVideo(v)} className="flex flex-col items-center gap-1"><Share2 size={28} /></button>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center animate-spin-slow"><Music2 size={20} /></div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};

const ChefAIView = () => {
  const [messages, setMessages] = useState([{ role: 'ai', text: 'Chef FUZO here. What culinary secrets shall we unlock?' }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (overrideText?: string) => {
    const outgoing = (overrideText ?? input).trim();
    if (!outgoing) return;
    const txt = outgoing;
    if (!overrideText) {
      setInput("");
    }
    setMessages(prev => [...prev, { role: 'user', text: txt }]);
    setLoading(true);
    
    try {
      const res = await GeminiService.generateContent({
        model: 'gemini-3-flash-preview',
        contents: txt,
        config: { systemInstruction: "You are Chef FUZO, an elite AAA culinary expert. Be bold, concise, and professional." },
      });

      if (res.success && res.data?.text) {
        setMessages(prev => [...prev, { role: 'ai', text: res.data?.text || 'Chef FUZO is thinking. Try again.' }]);
      } else {
        throw new Error(res.error || 'Gemini unavailable');
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Studio signal weak. Check connection.' }]);
    }
    finally { setLoading(false); }
  };

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const handleSuggestedPrompt = useCallback((prompt: string) => {
    sendMessage(prompt).catch(() => {
      setMessages(prev => [...prev, { role: 'ai', text: 'Studio signal weak. Check connection.' }]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto h-[75vh] flex flex-col bg-white rounded-[3.5rem] shadow-2xl border-4 border-white overflow-hidden">
      <header className="p-8 border-b bg-stone-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center text-yellow-400 shadow-xl"><Bot size={24} /></div>
          <div><h4 className="font-black text-xs uppercase tracking-widest">Chef FUZO AI</h4><p className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">Online</p></div>
        </div>
      </header>
      <div className="flex-grow p-8 overflow-y-auto hide-scrollbar space-y-6">
        <div className="flex flex-wrap gap-2">
          {CHEF_SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSuggestedPrompt(prompt)}
              className="px-4 py-2 rounded-full bg-stone-100 hover:bg-yellow-400 text-stone-900 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
        {messages.map((m) => (
          <div key={`${m.role}-${m.text}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-6 rounded-[2.5rem] font-bold text-sm shadow-sm ${m.role === 'user' ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-900'}`}>{m.text}</div>
          </div>
        ))}
        {loading && <div className="flex gap-2 p-6"><div className="w-2 h-2 bg-stone-200 rounded-full animate-bounce" /><div className="w-2 h-2 bg-stone-200 rounded-full animate-bounce delay-100" /></div>}
        <div ref={endRef} />
      </div>
      <footer className="p-6 border-t flex gap-3 bg-white">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Consult the Chef..." className="flex-grow bg-stone-50 px-8 py-5 rounded-[2rem] font-black text-xs uppercase outline-none focus:ring-4 focus:ring-yellow-400/10 transition-all" />
        <button onClick={() => { sendMessage().catch(() => undefined); }} className="w-16 h-16 bg-yellow-400 rounded-3xl flex items-center justify-center shadow-xl active:scale-95 transition-transform"><Send size={24} /></button>
      </footer>
    </div>
  );
};

const ChatView = ({
  friends,
  authUser,
  onSave,
  onShareRequest,
  setTab,
  onConversationOpened,
  onOpenUserProfile,
}: {
  friends: ChatInboxItem[];
  authUser: AuthUser | null;
  onSave: (item: AppItem) => void;
  onShareRequest: (item: AppItem) => void;
  setTab: (tab: string) => void;
  onConversationOpened: (friendId: string) => void;
  onOpenUserProfile: (userId: string) => void;
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'dm' | 'group' | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [friendSearch, setFriendSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const active = friends.find(f => String(f.id) === activeId);
  const filteredFriends = useMemo(() => filterFriendsByQuery(friends, friendSearch), [friends, friendSearch]);

  const mapMessageToUi = useCallback((message: ChatMessage): ChatUiMessage => ({
    id: message.id,
    role: message.senderId === authUser?.id ? 'user' : 'ai',
    type: message.sharedItem ? 'share' : 'text',
    text: message.content,
    item: message.sharedItem,
  }), [authUser?.id]);

  const appendIncomingMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      if (prev.some((entry) => entry.id === message.id)) return prev;
      return [...prev, mapMessageToUi(message)];
    });
    if (message.senderId !== authUser?.id && activeId) {
      onConversationOpened(activeId);
    }
  }, [activeId, authUser?.id, mapMessageToUi, onConversationOpened]);

  useEffect(() => {
    setActiveId(null);
    setConversationId(null);
    setMessages([]);
  }, [authUser?.id]);

  useEffect(() => {
    if (!activeId || !activeType) return;

    if (activeType === 'dm' && conversationId) {
      const unsubscribe = ChatService.subscribeToConversationMessages(conversationId, (message) => {
        appendIncomingMessage(message);
      });
      return () => unsubscribe();
    } else if (activeType === 'group' && activeId) {
      const unsubscribe = ChatService.subscribeToGroupMessages(activeId, (message) => {
        appendIncomingMessage(message);
      });
      return () => unsubscribe();
    }
  }, [activeId, activeType, conversationId, appendIncomingMessage]);

  useEffect(() => {
    if (!activeId) return;
    const typingStartTimer = setTimeout(() => setIsTyping(true), 1200);
    const typingStopTimer = setTimeout(() => setIsTyping(false), 3200);
    return () => {
      clearTimeout(typingStartTimer);
      clearTimeout(typingStopTimer);
    };
  }, [activeId, messages.length]);

  const formatFriendTime = (item: ChatInboxItem) => {
    if ('time' in item && item.time) return item.time;
    if ('online' in item && item.online) return 'now';
    if ('lastSeen' in item && item.lastSeen) return 'recent';
    return '—';
  };

  const getMessageStatusIcon = (status?: string) => {
    if (!status || status === 'sent') return <Check size={10} className="text-stone-400" />;
    if (status === 'sending') return <Clock size={10} className="text-stone-400 animate-pulse" />;
    if (status === 'read') return <CheckCheck size={10} className="text-yellow-500" />;
    if (status === 'error') return <AlertCircle size={10} className="text-red-500" />;
    return <Check size={10} className="text-stone-400" />;
  };

  const openConversation = async (participantId: string, type: 'dm' | 'group' = 'dm') => {
    if (!authUser?.id || !hasSupabaseConfig) {
      setActiveId(participantId);
      setActiveType(type);
      setMessages([]);
      return;
    }

    setActiveId(participantId);
    setActiveType(type);
    onConversationOpened(participantId);

    if (type === 'dm') {
      const conversation = await ChatService.getOrCreateConversation(authUser.id, participantId);
      if (!conversation.success || !conversation.data) {
        return;
      }

      setConversationId(conversation.data.id);
      const result = await ChatService.listMessages(conversation.data.id);
      if (!result.success || !result.data) {
        setMessages([]);
        return;
      }

      setMessages(result.data.map((message) => ({
        id: message.id,
        role: message.senderId === authUser?.id ? 'user' : 'ai',
        type: message.sharedItem ? 'share' : 'text',
        text: message.content,
        item: message.sharedItem,
        status: message.senderId === authUser?.id ? 'sent' : undefined,
      })));
    } else {
      // Group Chat
      setConversationId(null);
      const result = await ChatService.listGroupMessages(participantId);
      if (!result.success || !result.data) {
        setMessages([]);
        return;
      }

      setMessages(result.data.map((message) => ({
        id: message.id,
        role: message.senderId === authUser?.id ? 'user' : 'ai',
        type: message.sharedItem ? 'share' : 'text',
        text: message.content,
        item: message.sharedItem,
        status: message.senderId === authUser?.id ? 'sent' : undefined,
      })));
    }
  };

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || !activeId || !authUser?.id) return;

    setDraft('');
    const optimisticId = `local-${Date.now()}`;
    setMessages(prev => ([...prev, {
      id: optimisticId,
      role: 'user',
      type: 'text',
      text: content,
      status: 'sending',
    }]));

    let sent;
    if (activeType === 'dm' && conversationId) {
      sent = await ChatService.sendTextMessage({
        conversationId,
        senderId: authUser.id,
        content,
      });
    } else if (activeType === 'group') {
      sent = await ChatService.sendGroupTextMessage({
        groupId: activeId,
        senderId: authUser.id,
        content,
      });
    }

    if (!sent || !sent.success || !sent.data) {
      setMessages(prev => prev.map((message) => message.id === optimisticId ? { ...message, status: 'error' } : message));
      setDraft(content);
      return;
    }

    const sentMessage = sent.data;
    setMessages(prev => prev
      .filter((message) => message.id !== optimisticId)
      .concat([{ ...mapMessageToUi(sentMessage), status: 'sent', senderName: (authUser.user_metadata?.full_name as string) || (authUser.user_metadata?.name as string) || 'You' }]));
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedMemberIds.length === 0 || !authUser?.id) return;

    const result = await ChatService.createGroup({
      name: newGroupName,
      memberIds: [authUser.id, ...selectedMemberIds],
      createdBy: authUser.id,
    });

    if (result.success && result.data) {
      setIsCreatingGroup(false);
      setNewGroupName('');
      setSelectedMemberIds([]);
      openConversation(result.data.id, 'group');
    }
  };

  if (activeId && active) return (
    <div className="max-w-2xl mx-auto h-[75vh] flex flex-col bg-white rounded-[3.5rem] shadow-2xl border-4 border-white overflow-hidden animate-in slide-in-from-right duration-300">
      <header className="p-8 border-b flex items-center justify-between bg-stone-50/50">
        <button onClick={() => setActiveId(null)} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><ChevronLeft size={28} /></button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => active.type === 'dm' && onOpenUserProfile(String(active.id))}
            className="relative"
          >
            <img src={active.avatar} alt={active.name || 'Chat'} className="w-10 h-10 rounded-full border-2 border-yellow-400" />
            {active.type === 'dm' && 'online' in active && active.online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            )}
            {active.type === 'group' && (
              <div className="absolute -bottom-1 -right-1 bg-stone-900 text-white p-0.5 rounded shadow-sm">
                <LayoutGrid size={8} />
              </div>
            )}
          </button>
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest">{active.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${active.type === 'group' ? 'bg-stone-400' : (('online' in active && active.online) ? 'bg-emerald-500' : 'bg-stone-300')}`} />
              <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest">
                {active.type === 'group' ? 'Studio Group' : (('online' in active && active.online) ? 'Online' : 'Offline')}
              </p>
            </div>
          </div>
        </div>
        <div className="w-10" />
      </header>

      {active.type === 'dm' && 'requestStatus' in active && active.requestStatus === 'pending' && (
        <div className="p-6 bg-yellow-50 border-b flex flex-col items-center gap-4 text-center">
          <p className="text-xs font-bold text-stone-600 uppercase tracking-widest">Message Request</p>
          <p className="text-sm font-bold text-stone-900">{active.name} wants to connect with you.</p>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => {}}
              className="flex-grow py-3 bg-stone-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"
            >
              Accept
            </button>
            <button
              onClick={() => setActiveId(null)}
              className="flex-grow py-3 bg-stone-100 text-stone-900 rounded-2xl font-black uppercase text-[10px] tracking-widest"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      <div className="flex-grow p-10 space-y-6 overflow-y-auto hide-scrollbar">
        {messages.map((m) => (
          <div key={`${m.id || ''}-${m.role}-${m.type || 'text'}-${m.text || ''}-${m.item?.id || ''}`} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            {activeType === 'group' && m.role !== 'user' && m.senderName && (
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1 ml-4">{m.senderName}</span>
            )}
            <div className={`max-w-[85%] p-6 rounded-[2.5rem] font-bold text-sm shadow-sm ${m.role === 'user' ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-900'}`}>
              {m.type === 'share' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="opacity-60 text-[10px] uppercase font-black tracking-widest">Shared Studio Item</p>
                    <Badge color="yellow">{m.item?.cat || 'Item'}</Badge>
                  </div>
                  <div className="rounded-2xl overflow-hidden shadow-md aspect-video relative group">
                    <img src={m.item?.img} alt={m.item?.name || 'Shared item'} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => {
                          if (m.item?.id?.startsWith('recipe')) setTab('bites');
                          else if (m.item?.id?.startsWith('video')) setTab('trims');
                          else setTab('scout');
                        }}
                        className="p-3 bg-white text-stone-900 rounded-full shadow-xl hover:scale-110 transition-transform"
                      >
                        <Eye size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-black uppercase tracking-tighter text-lg">{m.item?.name}</p>
                    <p className="text-[10px] opacity-50 font-bold uppercase tracking-widest">Sent via FUZO Studio</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={() => {
                        if (m.item?.id?.startsWith('recipe')) setTab('bites');
                        else if (m.item?.id?.startsWith('video')) setTab('trims');
                        else setTab('scout');
                      }}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-stone-100 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600"><Eye size={16} /></div>
                      <span className="text-[8px] font-black uppercase tracking-widest">View</span>
                    </button>
                    <button
                      onClick={() => {
                        if (m.item) onSave(m.item);
                      }}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-stone-100 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600"><Bookmark size={16} /></div>
                      <span className="text-[8px] font-black uppercase tracking-widest">Save</span>
                    </button>
                    <button
                      onClick={() => {
                        if (m.item) onShareRequest(m.item);
                      }}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-stone-100 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600"><Share2 size={16} /></div>
                      <span className="text-[8px] font-black uppercase tracking-widest">Share</span>
                    </button>
                  </div>
                </div>
              ) : m.text}
            </div>
            {m.role === 'user' && (
              <div className="flex items-center gap-1 mt-2 px-4">
                {getMessageStatusIcon(m.status)}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 bg-stone-50 p-4 rounded-2xl w-fit">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Typing...</span>
          </div>
        )}
      </div>
      <footer className="p-6 border-t flex gap-3 bg-white">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={(active.type === 'dm' && 'requestStatus' in active && active.requestStatus === 'pending') ? 'Accept request to reply' : 'Message...'}
          disabled={active.type === 'dm' && 'requestStatus' in active && active.requestStatus === 'pending'}
          className="flex-grow bg-stone-50 px-8 py-5 rounded-[2rem] font-bold outline-none focus:bg-stone-100 transition-colors disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={(active.type === 'dm' && 'requestStatus' in active && active.requestStatus === 'pending') || !draft.trim()}
          className="w-16 h-16 bg-yellow-400 text-stone-900 rounded-3xl flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
        >
          <Send size={24} />
        </button>
      </footer>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 animate-in fade-in">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter">Studio Inbox</h2>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Find Friends</p>
            <button
              onClick={() => setIsCreatingGroup(true)}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-yellow-600 hover:text-yellow-700 transition-colors"
            >
              <LayoutGrid size={12} />
              Create Group
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-400 rounded-full">
          <div className="w-2 h-2 bg-stone-900 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
        </div>
      </header>

      {isCreatingGroup && (
        <div className="bg-stone-50 p-8 rounded-[3rem] border-2 border-dashed border-stone-200 space-y-6 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black uppercase tracking-tighter">New Chat Group</h3>
            <button onClick={() => setIsCreatingGroup(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group Name..."
              className="w-full bg-white px-6 py-4 rounded-2xl font-bold outline-none border focus:border-yellow-400"
            />
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 px-2">Select Members</p>
              <div className="flex flex-wrap gap-2">
                {friends.filter(f => f.type !== 'group').map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedMemberIds(prev =>
                        prev.includes(String(f.id))
                          ? prev.filter(mid => mid !== String(f.id))
                          : [...prev, String(f.id)]
                      );
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedMemberIds.includes(String(f.id))
                        ? 'bg-stone-900 text-white shadow-lg'
                        : 'bg-white text-stone-500 border hover:border-stone-300'
                    }`}
                  >
                    <img src={f.avatar} className="w-4 h-4 rounded-full" />
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={createGroup}
            disabled={!newGroupName.trim() || selectedMemberIds.length === 0}
            className="w-full py-4 bg-yellow-400 text-stone-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
          >
            Create Studio Group
          </button>
        </div>
      )}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
        <input
          value={friendSearch}
          onChange={(e) => setFriendSearch(e.target.value)}
          placeholder="Search username, name, or email"
          className="w-full bg-white border border-stone-100 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-yellow-400/10"
        />
      </div>
      <div className="space-y-4">
        {filteredFriends.map(c => (
          <div key={c.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                openConversation(String(c.id), c.type || 'dm').catch((error) => {
                  console.warn('Failed to open conversation:', error);
                });
              }}
              className="w-full bg-white p-6 rounded-[3rem] flex items-center gap-5 border shadow-sm cursor-pointer hover:bg-stone-50 transition-all hover:scale-[1.01] relative group text-left"
            >
              <div className="relative">
                <img src={c.avatar} alt={c.name || 'Chat'} className="w-16 h-16 rounded-3xl border-2 border-yellow-400 shadow-md" />
                {c.type === 'dm' && 'online' in c && c.online && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                )}
                {c.type === 'group' && (
                  <div className="absolute -bottom-2 -right-2 bg-stone-900 text-white p-1 rounded-lg border-2 border-white shadow-sm">
                    <LayoutGrid size={12} />
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm uppercase tracking-widest">{c.name}</h4>
                    {c.type === 'group' && (
                      <span className="bg-stone-100 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest text-stone-500">
                        Group
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-stone-300 font-bold">
                    {formatFriendTime(c)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold truncate ${(c.unreadCount ?? 0) > 0 ? 'text-stone-900' : 'text-stone-400'}`}>
                    {c.type === 'dm' && 'requestStatus' in c && c.requestStatus === 'pending' 
                      ? 'New Message Request' 
                      : 'Open to chat...'}
                  </p>
                  {(c.unreadCount ?? 0) > 0 && (
                    <div className="bg-yellow-400 text-stone-900 text-[10px] font-black px-2 py-1 rounded-full shadow-sm">
                      {c.unreadCount}
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight className="text-stone-200 group-hover:text-stone-400 transition-colors" />
            </button>
            {c.type === 'dm' && (
              <button
                type="button"
                onClick={() => onOpenUserProfile(String(c.id))}
                className="px-3 py-2 rounded-xl bg-stone-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-stone-800 transition-colors"
              >
                Profile
              </button>
            )}
          </div>
        ))}
        {filteredFriends.length === 0 && (
          <div className="p-8 text-center bg-stone-50 rounded-[2rem] border border-stone-100 text-[10px] font-black uppercase tracking-widest text-stone-400">
            No contacts or groups found.
          </div>
        )}
      </div>
    </div>
  );
};

const ScoutView = ({ onSave, onShareRequest, savedItems }: { onSave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void; savedItems: AppItem[] }) => {
  const [coords, setCoords] = useState({ lat: 43.65, lng: -79.38 });
  const [selectedPlace, setSelectedPlace] = useState<ScoutPlace | null>(null);
  const [modalTab, setModalTab] = useState('overview');
  const [scoutTab, setScoutTab] = useState<ScoutMapTab>('main');
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scoutPlacesRequestSeqRef = useRef(0);
  const scoutDetailsRequestSeqRef = useRef(0);
  const scoutMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      scoutMountedRef.current = false;
    };
  }, []);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [placesError, setPlacesError] = useState('');
  const [mapError, setMapError] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLike | null>(null);
  const mapMarkersRef = useRef<MarkerLike[]>([]);
  const userMarkerRef = useRef<MarkerLike | null>(null);
  
  const fallbackPlaces: ScoutPlace[] = [
    { 
      id: 'p1', 
      name: "Oretta Toronto", 
      cat: "High Italian", 
      rating: 4.8, 
      reviews: 1240,
      address: "633 King St W, Toronto, ON",
      phone: "+1 416-944-1932",
      website: "oretta.to",
      vibe: ["Chic", "Lively", "Art Deco"],
      img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
      lat: 43.644, lng: -79.4,
      timings: {
        mon: "11:30 AM - 10:00 PM",
        tue: "11:30 AM - 10:00 PM",
        wed: "11:30 AM - 10:00 PM",
        thu: "11:30 AM - 11:00 PM",
        fri: "11:30 AM - 11:00 PM",
        sat: "10:00 AM - 11:00 PM",
        sun: "10:00 AM - 10:00 PM"
      },
      menu: [
        { section: "Antipasti", items: ["Burrata - $22", "Calamari Fritti - $19", "Polpette - $18"] },
        { section: "Primi", items: ["Rigatoni alla Norma - $26", "Spaghetti Carbonara - $28", "Lasagna Bianca - $30"] }
      ],
      userReviews: [
        { user: "Alex R.", rating: 5, text: "Incredible atmosphere and even better food. The rigatoni is a must-try!" },
        { user: "Jamie L.", rating: 4, text: "Great for a night out. A bit loud but the service was top-notch." }
      ],
      photos: [
        "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=400",
        "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400",
        "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=400"
      ]
    },
    { 
      id: 'p2', 
      name: "Kōjin Steak", 
      cat: "Fire Hearth", 
      rating: 4.6, 
      reviews: 850,
      address: "190 University Ave, Toronto, ON",
      phone: "+1 647-253-8000",
      website: "kojin.momofuku.com",
      vibe: ["Rustic", "Upscale", "Smoky"],
      img: "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=800&q=80",
      lat: 43.649, lng: -79.385,
      timings: {
        mon: "5:00 PM - 10:00 PM",
        tue: "5:00 PM - 10:00 PM",
        wed: "5:00 PM - 10:00 PM",
        thu: "5:00 PM - 11:00 PM",
        fri: "5:00 PM - 11:00 PM",
        sat: "5:00 PM - 11:00 PM",
        sun: "Closed"
      },
      menu: [
        { section: "From the Hearth", items: ["Prime Rib - $65", "Whole Trout - $48", "Roasted Squash - $24"] }
      ],
      userReviews: [
        { user: "Sarah M.", rating: 5, text: "The smoky flavor in everything is just perfect. Best steak in the city." }
      ],
      photos: [
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400",
        "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=400"
      ]
    },
    { 
      id: 'p3', 
      name: "Zen Garden", 
      cat: "Botanical Bar", 
      rating: 4.9, 
      reviews: 2100,
      address: "123 Queen St W, Toronto, ON",
      phone: "+1 416-555-0199",
      website: "zengarden.to",
      vibe: ["Serene", "Organic", "Minimalist"],
      img: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
      lat: 43.651, lng: -79.383,
      timings: {
        mon: "10:00 AM - 8:00 PM",
        tue: "10:00 AM - 8:00 PM",
        wed: "10:00 AM - 8:00 PM",
        thu: "10:00 AM - 10:00 PM",
        fri: "10:00 AM - 10:00 PM",
        sat: "9:00 AM - 10:00 PM",
        sun: "9:00 AM - 8:00 PM"
      },
      menu: [
        { section: "Botanical Cocktails", items: ["Lavender Gin Fizz - $16", "Rosemary Old Fashioned - $18"] },
        { section: "Small Plates", items: ["Truffle Edamame - $12", "Miso Glazed Carrots - $14"] }
      ],
      userReviews: [
        { user: "Michael K.", rating: 5, text: "A literal oasis in the middle of downtown. The cocktails are works of art." }
      ],
      photos: [
        "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400"
      ]
    },
  ];

  const [places, setPlaces] = useState<ScoutPlace[]>(fallbackPlaces);
  const [communitySnapPlaces, setCommunitySnapPlaces] = useState<ScoutPlace[]>([]);

  const toSavedScoutPlace = useCallback((item: AppItem, index: number): ScoutPlace => {
    const fallback = fallbackPlaces[index % fallbackPlaces.length];
    const timings = toTimingsOr(item.timings, fallback.timings);
    const menu = toMenuOr(item.menu, fallback.menu);
    const userReviews = toUserReviewsOr(item.userReviews, fallback.userReviews);
    const itemMetadata = (item.metadata && typeof item.metadata === 'object') ? item.metadata : {};
    const metadataSource = typeof itemMetadata.source === 'string' ? itemMetadata.source : '';
    const markerSource: 'fuzo' | 'google' = item.placeId || metadataSource === 'google_places' ? 'google' : 'fuzo';

    return {
      id: toStringOr(item.id, `saved-place-${index}`),
      placeId: toOptionalString(item.placeId),
      markerSource,
      name: toStringOr(item.name, fallback.name),
      cat: toStringOr(item.cat, 'Saved Place'),
      rating: toNumberOr(item.rating, fallback.rating),
      reviews: toNumberOr(item.reviews, fallback.reviews),
      address: toStringOr(item.address, fallback.address),
      phone: toStringOr(item.phone, fallback.phone),
      website: toStringOr(item.website, fallback.website),
      vibe: toNonEmptyStringArrayOr(item.vibe, fallback.vibe),
      img: toStringOr(item.img, fallback.img),
      lat: Number(item.lat),
      lng: Number(item.lng),
      timings,
      menu,
      userReviews,
      photos: toNonEmptyStringArrayOr(item.photos, fallback.photos),
    };
  }, [fallbackPlaces]);

  useEffect(() => {
    let cancelled = false;

    const loadCommunitySnaps = async () => {
      if (!hasSupabaseConfig || !supabase) {
        setCommunitySnapPlaces([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('fuzo_locations')
          .select('id, location_name, restaurant_name, cuisine, latitude, longitude, address, photos, notes, tags, created_at')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('created_at', { ascending: false })
          .limit(150);

        if (cancelled || error) return;

        const base = fallbackPlaces[0];
        const mapped = (data || [])
          .filter((row: Record<string, unknown>) => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)))
          .map((row: Record<string, unknown>, index: number): ScoutPlace => {
            const photos = Array.isArray(row.photos)
              ? row.photos.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
              : [];
            const name = typeof row.location_name === 'string' && row.location_name.trim().length > 0
              ? row.location_name
              : (typeof row.restaurant_name === 'string' && row.restaurant_name.trim().length > 0
                ? row.restaurant_name
                : `FUZO Location ${index + 1}`);
            const cuisine = typeof row.cuisine === 'string' && row.cuisine.trim().length > 0
              ? row.cuisine
              : 'Snap Discovery';

            return {
              id: `snap-community-${String(row.id || index)}`,
              markerSource: 'fuzo',
              name,
              cat: cuisine,
              rating: base.rating,
              reviews: base.reviews,
              address: typeof row.address === 'string' && row.address.trim().length > 0 ? row.address : 'FUZO location',
              phone: base.phone,
              website: base.website,
              vibe: ['Community', 'Snap'],
              img: photos[0] || base.img,
              lat: Number(row.latitude),
              lng: Number(row.longitude),
              timings: base.timings,
              menu: base.menu,
              userReviews: base.userReviews,
              photos: photos.length > 0 ? photos : base.photos,
            };
          });

        setCommunitySnapPlaces(mapped);
      } catch {
        if (!cancelled) setCommunitySnapPlaces([]);
      }
    };

    loadCommunitySnaps();
    return () => {
      cancelled = true;
    };
  }, []);

  const myMapPlaces = useMemo<ScoutPlace[]>(() => {
    return savedItems
      .filter((item) => Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lng)))
      .filter((item) => {
        const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
        const source = typeof metadata.source === 'string' ? metadata.source : '';
        const isSnap = item.itemType === 'photo' || source === 'snap_feature';
        const isGoogleSaved = item.itemType === 'restaurant' || Boolean(item.placeId) || source === 'google_places';
        return isSnap || isGoogleSaved;
      })
      .map((item, index) => toSavedScoutPlace(item, index));
  }, [savedItems, toSavedScoutPlace]);

  const mainMapPlaces = useMemo<ScoutPlace[]>(() => {
    const center = { lat: Number(coords.lat), lng: Number(coords.lng) };
    const nearbyFuzoLocations = communitySnapPlaces.filter((place) => {
      const placeLat = Number(place.lat);
      const placeLng = Number(place.lng);
      if (!Number.isFinite(placeLat) || !Number.isFinite(placeLng)) return false;
      return getDistanceMeters(center, { lat: placeLat, lng: placeLng }) <= 5000;
    });

    const merged = [...places, ...nearbyFuzoLocations];
    const deduped = new Map<string, ScoutPlace>();
    merged.forEach((place) => {
      if (!deduped.has(place.id)) deduped.set(place.id, place);
    });
    return Array.from(deduped.values());
  }, [communitySnapPlaces, coords.lat, coords.lng, places]);

  const displayPlaces = resolveScoutDisplayPlaces(scoutTab, mainMapPlaces, communitySnapPlaces, myMapPlaces);

  const clearMapMarkers = () => {
    mapMarkersRef.current.forEach((marker) => marker.setMap(null));
    mapMarkersRef.current = [];
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }
  };

  const syncMapMarkers = () => {
    const googleMaps = getGoogleMaps();
    if (!mapInstanceRef.current || !googleMaps) return;
    const map = mapInstanceRef.current;
    clearMapMarkers();

    const bounds = new googleMaps.LatLngBounds();

    displayPlaces.forEach((place) => {
      const lat = Number(place.lat);
      const lng = Number(place.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const markerIcon = place.markerSource === 'fuzo'
        ? {
            path: googleMaps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#facc15',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          }
        : undefined;

      const marker = new googleMaps.Marker({
        map,
        position: { lat, lng },
        title: place.name,
        icon: markerIcon,
      });

      marker.addListener('click', () => {
        openPlace(place);
      });

      mapMarkersRef.current.push(marker);
      bounds.extend({ lat, lng });
    });

    const userPosition = { lat: Number(coords.lat), lng: Number(coords.lng) };
    if (Number.isFinite(userPosition.lat) && Number.isFinite(userPosition.lng)) {
      userMarkerRef.current = new googleMaps.Marker({
        map,
        position: userPosition,
        title: 'You are here',
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      });
      bounds.extend(userPosition);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 60);
    }
  };

  const toScoutPlace = (place: GooglePlaceResult, index: number): ScoutPlace => {
    const fallback = fallbackPlaces[index % fallbackPlaces.length];
    const coverImage = buildPhotoUrl(API_KEYS.MAPS, place.photos?.[0]?.photo_reference) || fallback.img;
    const photoUrls = (place.photos || [])
      .slice(0, 6)
      .map((photo: GooglePlacePhoto) => buildPhotoUrl(API_KEYS.MAPS, photo.photo_reference))
      .filter(Boolean);

    return {
      id: place.place_id || fallback.id,
      placeId: place.place_id,
      markerSource: 'google',
      name: place.name || fallback.name,
      cat: deriveCategory(place.types) || fallback.cat,
      rating: place.rating ?? fallback.rating,
      reviews: place.user_ratings_total ?? fallback.reviews,
      address: place.vicinity || place.formatted_address || fallback.address,
      phone: place.formatted_phone_number || place.international_phone_number || fallback.phone,
      website: place.website || fallback.website,
      vibe: (place.types || []).slice(0, 3).map((type: string) => type.replaceAll('_', ' ')) || fallback.vibe,
      img: coverImage,
      lat: place.geometry?.location?.lat ?? fallback.lat,
      lng: place.geometry?.location?.lng ?? fallback.lng,
      timings: mapWeekdayTextToTimings(place.opening_hours?.weekday_text) || fallback.timings,
      menu: fallback.menu,
      userReviews: (place.reviews || []).slice(0, 5).map((review: GooglePlaceReview) => ({
        user: review.author_name || 'Guest',
        rating: review.rating || 5,
        text: review.text || 'Great spot.',
      })) || fallback.userReviews,
      photos: photoUrls.length > 0 ? photoUrls : fallback.photos,
    };
  };

  const canApplyScoutRequest = (requestSeq: number) => {
    return shouldApplyLatestRequest(scoutMountedRef, requestSeq, scoutPlacesRequestSeqRef);
  };

  const setScoutLoadingState = (manualRefresh: boolean, loading: boolean) => {
    setIsLoadingPlaces(loading);
    if (manualRefresh) setIsRefreshing(loading);
  };

  const setScoutFallbackState = (errorMessage?: string) => {
    setPlaces(fallbackPlaces);
    if (errorMessage) setPlacesError(errorMessage);
  };

  const fetchNearbyPlaces = async (targetCoords = coords, manualRefresh = false) => {
    const requestSeq = ++scoutPlacesRequestSeqRef.current;
    setScoutLoadingState(manualRefresh, true);
    setPlacesError('');

    try {
      const nearby = await PlacesService.searchNearby(targetCoords.lat, targetCoords.lng, 5000);
      const results = nearby.data?.results || [];
      const canApply = canApplyScoutRequest(requestSeq);

      if (!nearby.success || results.length === 0) {
        if (canApply) setScoutFallbackState(nearby.error);
        return;
      }

      const normalized: ScoutPlace[] = (results as GooglePlaceResult[]).slice(0, 12).map((place, index: number) => toScoutPlace(place, index));
      if (canApply) {
        setPlaces(normalized);
      }
    } catch {
      if (canApplyScoutRequest(requestSeq)) {
        setScoutFallbackState('Unable to load live places right now.');
      }
    } finally {
      if (canApplyScoutRequest(requestSeq)) {
        setScoutLoadingState(manualRefresh, false);
      }
    }
  };

  useEffect(() => {
    let disposed = false;

    const bootMap = async () => {
      if (!API_KEYS.MAPS) {
        setMapError('Google Maps API key missing. Showing fallback map view.');
        setIsMapReady(false);
        return;
      }

      if (!mapContainerRef.current) return;

      try {
        const loader = new Loader({
          apiKey: API_KEYS.MAPS,
          version: 'weekly',
        });
        await loader.importLibrary('maps');

        if (disposed || !mapContainerRef.current) return;

        const googleMaps = getGoogleMaps();
        if (!googleMaps) throw new Error('Google Maps runtime not available');
        mapInstanceRef.current = new googleMaps.Map(mapContainerRef.current, {
          center: { lat: coords.lat, lng: coords.lng },
          zoom: 13,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });

        setMapError('');
        setIsMapReady(true);
      } catch {
        setMapError('Unable to load Google Maps. Showing fallback map view.');
        setIsMapReady(false);
      }
    };

    bootMap();

    return () => {
      disposed = true;
      clearMapMarkers();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;
    mapInstanceRef.current.setCenter({ lat: coords.lat, lng: coords.lng });
    syncMapMarkers();
  }, [coords, displayPlaces, isMapReady]);

  const openPlace = async (place: ScoutPlace) => {
    setSelectedPlace(place);
    setModalTab('overview');
    if (!place.placeId) return;

    const requestSeq = ++scoutDetailsRequestSeqRef.current;
    setIsLoadingDetails(true);
    try {
      const details = await PlacesService.getPlaceDetails(place.placeId);
      const placeDetails = details.data?.result;

      if (scoutMountedRef.current && requestSeq === scoutDetailsRequestSeqRef.current && details.success && placeDetails) {
        const merged = {
          ...place,
          ...toScoutPlace(placeDetails, 0),
          id: place.id,
          placeId: place.placeId,
        };
        setSelectedPlace(merged);
        setPlaces((prev) => prev.map((p) => (p.id === place.id ? { ...p, ...merged } : p)));
      }
    } catch {
      if (scoutMountedRef.current && requestSeq === scoutDetailsRequestSeqRef.current) {
        setPlacesError('Unable to load place details right now.');
      }
    } finally {
      if (scoutMountedRef.current && requestSeq === scoutDetailsRequestSeqRef.current) {
        setIsLoadingDetails(false);
      }
    }
  };

  useEffect(() => { 
    let disposed = false;
    navigator.geolocation.getCurrentPosition(
      p => {
        if (disposed) return;
        const nextCoords = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (!Number.isFinite(nextCoords.lat) || !Number.isFinite(nextCoords.lng)) {
          fetchNearbyPlaces(coords);
          return;
        }
        setCoords(nextCoords);
        fetchNearbyPlaces(nextCoords);
      },
      () => {
        if (disposed) return;
        fetchNearbyPlaces(coords);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    ); 

    return () => {
      disposed = true;
    };
  }, []);

  const handlePlaceAction = (place: ScoutPlace, action: 'save' | 'share') => {
    const formattedItem = {
      id: place.id,
      name: place.name,
      cat: place.cat,
      img: place.img,
      lat: place.lat,
      lng: place.lng,
    };
    if (action === 'save') onSave(formattedItem);
    else onShareRequest(formattedItem);
  };

  const handleCloseModal = () => {
    setSelectedPlace(null);
    setModalTab('overview');
  };

  const {
    scoutHeadline,
    listTitle,
    emptyStateMessage,
  } = resolveScoutCopy(scoutTab, displayPlaces.length, isLoadingPlaces);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-auto space-y-0 md:space-y-8 md:px-4 animate-in fade-in pb-24 md:pb-24 -mx-6 md:mx-0">
      <header className="hidden md:flex justify-between items-end px-4">
        <div>
          <Badge color="emerald">Scout v2.5</Badge>
          <h2 className="text-4xl font-black uppercase tracking-tighter mt-1">FUZO Map Discovery</h2>
        </div>
        <div className="flex bg-stone-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setScoutTab('main')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${scoutTab === 'main' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Main Map
          </button>
          <button 
            onClick={() => setScoutTab('fuzo')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${scoutTab === 'fuzo' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
          >
            FUZO Locations
          </button>
          <button 
            onClick={() => setScoutTab('my')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${scoutTab === 'my' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
          >
            My Map
          </button>
        </div>
      </header>

      <div className="flex md:hidden bg-white border-b border-stone-100 sticky top-0 z-30">
        <button 
          onClick={() => setScoutTab('main')}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${scoutTab === 'main' ? 'border-yellow-400 text-stone-900' : 'border-transparent text-stone-400'}`}
        >
          Main
        </button>
        <button 
          onClick={() => setScoutTab('fuzo')}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${scoutTab === 'fuzo' ? 'border-yellow-400 text-stone-900' : 'border-transparent text-stone-400'}`}
        >
          FUZO
        </button>
        <button 
          onClick={() => setScoutTab('my')}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${scoutTab === 'my' ? 'border-yellow-400 text-stone-900' : 'border-transparent text-stone-400'}`}
        >
          My Map
        </button>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-0 md:gap-8 flex-grow">
        {/* Map Area */}
        <div className="lg:col-span-2 h-[60vh] md:h-[50vh] lg:h-[75vh] rounded-none md:rounded-[3.5rem] overflow-hidden border-0 md:border-[12px] border-white shadow-2xl bg-stone-100 relative group">
          <div ref={mapContainerRef} className="absolute inset-0" />
          {!isMapReady && (
            <div className="absolute inset-0 bg-[#f8f5f0]">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
              {displayPlaces.map(place => {
                const latOffset = place.lat - coords.lat;
                const lngOffset = place.lng - coords.lng;
                const left = Math.min(92, Math.max(8, 50 + (lngOffset / 0.06) * 100));
                const top = Math.min(92, Math.max(8, 50 - (latOffset / 0.06) * 100));

                return (
                <button 
                  key={place.id}
                  onClick={() => openPlace(place)}
                  className="absolute transition-transform hover:scale-110 active:scale-95 z-10"
                  style={{ 
                    left: `${left}%`, 
                    top: `${top}%` 
                  }}
                >
                  <div className="relative group/marker">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shadow-xl border-2 border-white transform -rotate-12 group-hover/marker:rotate-0 transition-transform ${scoutTab === 'my' ? 'bg-emerald-500 text-white' : 'bg-stone-900 text-yellow-400'}`}>
                      <MapPin size={20} />
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white px-3 py-1 rounded-full shadow-lg border border-stone-100 opacity-0 group-hover/marker:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      <span className="text-[8px] font-black uppercase tracking-widest">{place.name}</span>
                    </div>
                  </div>
                </button>
                );
              })}

              <div 
                className="absolute w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg animate-pulse z-0"
                style={{ left: '50%', top: '50%' }}
              />
            </div>
          )}

          {/* Map Controls Overlay */}
          <div className="absolute top-6 left-6 md:top-8 md:left-8 bg-white/90 backdrop-blur-md rounded-2xl border border-white/50 shadow-lg px-3 py-2.5">
            <div className="flex items-center gap-4 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-stone-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-white"></span>
                <span>FUZO Saved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-900 border border-white"></span>
                <span>Community / Curated</span>
              </div>
            </div>
          </div>

          <div className="absolute top-6 right-6 md:top-8 md:right-8 flex flex-col gap-3">
            <button onClick={() => fetchNearbyPlaces(coords, true)} className="p-3 md:p-4 bg-white rounded-2xl shadow-xl hover:bg-stone-50 transition-colors"><RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} /></button>
            <button className="p-3 md:p-4 bg-white rounded-2xl shadow-xl hover:bg-stone-50 transition-colors"><LayoutGrid size={20} /></button>
          </div>
          
          <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 bg-white/90 backdrop-blur-md p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-white/50 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600"><Sparkles size={18} className="md:hidden" /><Sparkles size={20} className="hidden md:block" /></div>
              <div>
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-stone-400 leading-none">Scout Active</p>
                <h4 className="font-black uppercase text-xs md:text-sm tracking-tighter mt-1">{scoutHeadline}</h4>
              </div>
            </div>
            <button className="px-4 py-2 md:px-6 md:py-3 bg-stone-900 text-white rounded-xl md:rounded-2xl font-black uppercase text-[8px] md:text-[10px] tracking-widest">Expand</button>
          </div>
        </div>

        {/* List Sidebar */}
        <div className="space-y-6 p-6 md:p-0 bg-white md:bg-transparent rounded-t-[3rem] -mt-12 md:mt-0 relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] md:shadow-none">
          <div className="w-12 h-1.5 bg-stone-100 rounded-full mx-auto mb-6 md:hidden" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-300 px-4">{listTitle}</h3>
          <div className="space-y-4 max-h-[40vh] md:max-h-none overflow-y-auto hide-scrollbar">
            {displayPlaces.map(place => (
              <button 
                key={place.id} 
                onClick={() => openPlace(place)}
                className="w-full bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-stone-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-center gap-4 md:gap-5 text-left"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl overflow-hidden shadow-lg shrink-0 group-hover:scale-105 transition-transform">
                  <img src={place.img} alt={place.name || 'Place'} className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <h4 className="font-black uppercase text-xs md:text-sm tracking-tighter leading-tight">{place.name}</h4>
                    <div className="flex items-center gap-1 text-yellow-500 font-black text-[10px]">
                      <Star size={12} fill="currentColor" /> {place.rating}
                    </div>
                  </div>
                  <p className="text-[8px] md:text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">{place.cat}</p>
                </div>
              </button>
            ))}
            {displayPlaces.length === 0 && (
              <div className="p-8 text-center bg-stone-50 rounded-[2rem] border border-stone-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                  {emptyStateMessage}
                </p>
              </div>
            )}
          </div>
          {mapError && <p className="text-[10px] px-4 font-bold text-amber-600 uppercase tracking-widest">{mapError}</p>}
          {placesError && <p className="text-[10px] px-4 font-bold text-amber-600 uppercase tracking-widest">{placesError}</p>}
        </div>
      </div>

      {/* Place Details Modal */}
      {selectedPlace && (
        <div className="fixed inset-0 z-[110] bg-stone-900/60 backdrop-blur-xl flex items-start justify-center p-4 md:p-10 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in duration-300">
            <button 
              onClick={handleCloseModal} 
              className="absolute top-6 right-6 z-20 p-4 bg-stone-900 text-white rounded-3xl active:scale-90 transition-transform"
            >
              <X size={24} />
            </button>
            
            <div className="w-full md:w-1/2 h-64 md:h-auto overflow-hidden relative">
              <img src={selectedPlace.img} alt={selectedPlace.name || 'Selected place'} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent md:hidden" />
              <div className="absolute bottom-6 left-8 md:hidden text-white">
                <Badge color="yellow">{selectedPlace.cat}</Badge>
                <h2 className="text-3xl font-black uppercase tracking-tighter mt-2">{selectedPlace.name}</h2>
              </div>
            </div>

            <div className="w-full md:w-1/2 p-8 md:p-14 overflow-y-auto hide-scrollbar flex flex-col gap-6">
              <header className="space-y-4">
                <div className="hidden md:block">
                  <Badge color="yellow">{selectedPlace.cat}</Badge>
                  <h2 className="text-4xl font-black uppercase tracking-tighter mt-2 leading-none">{selectedPlace.name}</h2>
                </div>
                {isLoadingDetails && <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Loading live details...</p>}
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="flex text-yellow-400">
                      {[1,2,3,4,5].map(i => <Star key={i} size={16} fill={i <= Math.floor(selectedPlace.rating) ? "currentColor" : "none"} />)}
                    </div>
                    <span className="text-xs font-black">{selectedPlace.rating}</span>
                    <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">({selectedPlace.reviews} Reviews)</span>
                  </div>
                </div>
              </header>

              {/* Tabs Bar */}
              <div className="flex border-b border-stone-100 overflow-x-auto hide-scrollbar">
                {[
                  { id: 'overview', icon: Info },
                  { id: 'timings', icon: Clock },
                  { id: 'menu', icon: List },
                  { id: 'reviews', icon: Star },
                  { id: 'photos', icon: LayoutGrid }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setModalTab(t.id)}
                    className={`flex-1 min-w-[60px] flex items-center justify-center py-5 transition-all border-b-2 ${modalTab === t.id ? 'border-yellow-400 text-stone-900' : 'border-transparent text-stone-300 hover:text-stone-500'}`}
                  >
                    <t.icon size={20} strokeWidth={modalTab === t.id ? 3 : 2} />
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-grow">
                {modalTab === 'overview' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 text-stone-600">
                        <MapPin size={20} className="shrink-0 mt-0.5 text-stone-400" />
                        <p className="text-sm font-bold leading-relaxed">{selectedPlace.address}</p>
                      </div>
                      <div className="flex items-center gap-4 text-stone-600">
                        <Clock size={20} className="shrink-0 text-stone-400" />
                        <p className="text-sm font-bold">Open now: {selectedPlace.timings[new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase()]}</p>
                      </div>
                      <div className="flex items-center gap-4 text-stone-600">
                        <Zap size={20} className="shrink-0 text-stone-400" />
                        <p className="text-sm font-bold">{selectedPlace.phone}</p>
                      </div>
                      <div className="flex items-center gap-4 text-stone-600">
                        <PlayCircle size={20} className="shrink-0 text-stone-400" />
                        <a href={selectedPlace.website?.startsWith('http') ? selectedPlace.website : `https://${selectedPlace.website}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-500 hover:underline">{selectedPlace.website}</a>
                      </div>
                    </div>

                    <section className="space-y-4">
                      <h4 className="font-black uppercase text-[10px] tracking-[0.2em] text-stone-300 px-2">The Vibe</h4>
                      <div className="flex flex-wrap gap-3">
                        {(selectedPlace.vibe || []).map((v: string) => (
                          <div key={v} className="px-6 py-3 bg-stone-50 rounded-full text-[10px] font-black uppercase tracking-widest text-stone-900 border border-stone-100">
                            {v}
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {modalTab === 'timings' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <h4 className="font-black uppercase text-[10px] tracking-[0.2em] text-stone-300 px-2">Opening Hours</h4>
                    <div className="bg-stone-50 p-8 rounded-[3rem] border border-stone-100 space-y-3">
                      {Object.entries(selectedPlace.timings || {}).map(([day, hours]: [string, string]) => (
                        <div key={day} className="flex justify-between items-center">
                          <span className="text-xs font-black uppercase tracking-widest text-stone-400">{day}</span>
                          <span className="text-xs font-bold text-stone-900">{hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {modalTab === 'menu' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    {(selectedPlace.menu || []).map((section) => (
                      <div key={String(section.section)} className="space-y-4">
                        <h4 className="font-black uppercase text-[10px] tracking-[0.2em] text-stone-300 px-2">{section.section}</h4>
                        <div className="bg-stone-50 p-8 rounded-[3rem] border border-stone-100 space-y-3">
                          {section.items.map((item: string) => (
                            <div key={`${section.section}-${item}`} className="flex justify-between items-center border-b border-stone-100/50 pb-2 last:border-0 last:pb-0">
                              <span className="text-xs font-bold text-stone-900">{item.split(' - ')[0]}</span>
                              <span className="text-xs font-black text-stone-400">{item.split(' - ')[1]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-5 border-4 border-stone-100 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-stone-400 hover:bg-stone-50 transition-colors">View Full Menu</button>
                  </div>
                )}

                {modalTab === 'reviews' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between px-2">
                      <h4 className="font-black uppercase text-[10px] tracking-[0.2em] text-stone-300">User Reviews</h4>
                      <button className="text-[10px] font-black uppercase tracking-widest text-blue-500">Write Review</button>
                    </div>
                    {(selectedPlace.userReviews || []).map((review) => (
                      <div key={`${review.user}-${review.text}`} className="bg-stone-50 p-8 rounded-[3rem] border border-stone-100 space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-stone-200 rounded-full" />
                            <span className="text-xs font-black uppercase tracking-widest">{review.user}</span>
                          </div>
                          <div className="flex text-yellow-400">
                            {[1,2,3,4,5].map(star => <Star key={star} size={12} fill={star <= review.rating ? "currentColor" : "none"} />)}
                          </div>
                        </div>
                        <p className="text-sm font-bold text-stone-500 leading-relaxed italic">"{review.text}"</p>
                      </div>
                    ))}
                  </div>
                )}

                {modalTab === 'photos' && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                    {(selectedPlace.photos || []).map((photo: string) => (
                      <div key={photo} className="aspect-square rounded-[2.5rem] overflow-hidden border-4 border-stone-50 shadow-sm">
                        <img src={photo} alt={selectedPlace.name || 'Place'} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <footer className="pt-4 flex gap-4 sticky bottom-0 bg-white/90 backdrop-blur-md pb-2">
                <button 
                  onClick={() => handlePlaceAction(selectedPlace, 'save')}
                  className="flex-grow py-5 bg-stone-900 text-white rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
                >
                  <Bookmark size={22} />
                </button>
                <button 
                  onClick={() => handlePlaceAction(selectedPlace, 'share')}
                  className="py-5 px-10 bg-yellow-400 text-stone-900 rounded-[2rem] flex items-center justify-center active:scale-95 transition-all shadow-xl"
                >
                  <Share2 size={22} />
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



const PhoneMockup = ({ image, className = "" }: { image: string, className?: string }) => (
  <div className={`relative w-64 h-[520px] bg-stone-950 rounded-[3rem] p-3 shadow-2xl border-4 border-stone-800/50 overflow-hidden ${className}`}>
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-stone-950 rounded-b-3xl z-20" />
    <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-stone-900">
      <img src={image} alt="Phone mockup" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    </div>
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/20 rounded-full" />
  </div>
);

const FeatureFold = ({
  title,
  subtitle,
  description,
  microline,
  image,
  reverse = false,
  color = "stone",
  icon: Icon
}: {
  title: string,
  subtitle: string,
  description: string,
  microline?: string,
  image: string,
  reverse?: boolean,
  color?: string,
  icon: IconComponent
}) => (
  <section className={`py-32 px-6 ${reverse ? 'bg-white' : 'bg-[#fbd556]'} overflow-hidden`}>
    <div className={`max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center ${reverse ? 'lg:flex-row-reverse' : ''}`}>
      <motion.div
        initial={{ opacity: 0, x: reverse ? 50 : -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className={`space-y-8 ${reverse ? 'lg:order-2' : ''}`}
      >
        <div className="space-y-4">
          <div className={`inline-flex items-center gap-3 px-4 py-2 ${reverse ? 'bg-stone-100 text-stone-900' : 'bg-stone-900 text-yellow-400'} rounded-full`}>
            <Icon size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">{subtitle}</span>
          </div>
          <h2 className="text-6xl md:text-7xl font-black uppercase tracking-tighter leading-[0.85] text-stone-900">
            {(() => {
              const seenWords: Record<string, number> = {};
              return title.split(' ').map((word, i) => {
                seenWords[word] = (seenWords[word] || 0) + 1;
                return (
                  <span key={`${title}-${word}-${seenWords[word]}`} className={i === 1 ? 'italic opacity-70' : ''}>
                    {word}{' '}
                    {i === 1 && <br />}
                  </span>
                );
              });
            })()}
          </h2>
        </div>
        <p className={`text-xl font-bold leading-relaxed max-w-xl ${reverse ? 'text-stone-500' : 'text-stone-800'}`}>
          {description}
        </p>
        {microline && (
          <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${reverse ? 'text-stone-400' : 'text-stone-900/50'}`}>
            {microline}
          </p>
        )}
        <div className="flex items-center gap-6 pt-4">
          <div className="flex -space-x-3">
            {[1, 2, 3].map(i => (
              <div key={i} className={`w-10 h-10 rounded-full border-2 ${reverse ? 'border-white' : 'border-[#fbd556]'} overflow-hidden`}>
                <img src={`https://i.pravatar.cc/100?u=${title}${i}`} alt="Community member avatar" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${reverse ? 'text-stone-400' : 'text-stone-900/60'}`}>Joined by 12k+ members</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotate: reverse ? -5 : 5 }}
        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
        viewport={{ once: true }}
        className={`relative flex justify-center ${reverse ? 'lg:order-1' : ''}`}
      >
        <div className={`absolute inset-0 ${reverse ? 'bg-stone-200' : 'bg-stone-900/10'} blur-[120px] rounded-full opacity-30`} />
        <PhoneMockup image={image} className="relative z-10 border-stone-900/10 shadow-2xl" />
        <div className="hidden">
        <div className={`absolute -bottom-10 ${reverse ? '-right-10' : '-left-10'} p-8 bg-stone-900 text-white rounded-[3rem] shadow-2xl hidden md:block max-w-[200px] rotate-6`}>
          <p className="font-black uppercase text-xs tracking-widest leading-tight">
            "The most intuitive culinary interface I've ever used."
          </p>
          <p className="text-[8px] font-bold text-stone-400 mt-4 uppercase tracking-widest">— Chef Marcus</p>
        </div>
        </div>
      </motion.div>
    </div>
  </section>
);

const LandingPage = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="min-h-screen bg-[#fbd556] text-stone-900 overflow-x-hidden selection:bg-stone-900 selection:text-white">
      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#fff_0%,transparent_70%)]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 space-y-12 max-w-6xl w-full mx-auto"
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-20 h-20 bg-stone-900 rounded-[2.5rem] flex items-center justify-center text-yellow-400 shadow-2xl rotate-6">
              <ChefHat size={44} strokeWidth={2.5} />
            </div>
          </div>

          <h1 className="landing-hero-title text-[14vw] md:text-[10vw] font-black uppercase tracking-tighter leading-[0.8] italic text-stone-900 text-center mx-auto w-full">
            THE <br /> <span className="not-italic">UNDISCOVERED</span> <br /> GASTRONOMY
          </h1>

          <p className="text-xl md:text-3xl font-bold text-stone-800 max-w-3xl mx-auto leading-tight">
            The world's first AI-native discovery engine for fine dining, recipe architecture, and culinary networks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-12">
            <button
              onClick={onStart}
              className="group relative px-16 py-8 bg-stone-900 text-white rounded-[3rem] font-black uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl"
            >
              <span className="relative z-10 flex items-center gap-3 text-lg">Enter FUZO <ChevronRight size={24} /></span>
              <div className="absolute inset-0 bg-stone-800 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </div>
        </motion.div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-20">
          <ChevronRight size={32} className="rotate-90" />
        </div>
      </section>

      {/* Feature Folds */}
      <FeatureFold
        subtitle="Discovery"
        title="YOUR PERSONALIZED FOOD GRAPH"
        description="Your feed adapts in real time, with recipes, short-form videos, and places curated to your taste, location, and behavior."
        microline="Discover → Save → Share → Refine"
        image="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80"
        icon={Sparkles}
        color="stone"
      />

      <FeatureFold
        subtitle="Studio Bites"
        title="RECIPES, REWIRED"
        description="Break dishes into structured components: ingredients, techniques, and logic, so you don't just follow recipes, you understand them."
        microline="From consumption → comprehension"
        image="https://images.unsplash.com/photo-1550317138-10000687ad32?auto=format&fit=crop&w=800&q=80"
        icon={ChefHat}
        color="stone"
        reverse
      />

      <FeatureFold
        subtitle="Scout Maps"
        title="DISCOVER WHAT'S AROUND YOU, INTELLIGENTLY"
        description="Explore nearby restaurants through live data, menus, reviews, and geo-aware recommendations tuned to your taste profile."
        microline="Map + Memory + Taste Graph"
        image="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80"
        icon={MapPin}
        color="stone"
      />

      <FeatureFold
        subtitle="Fuzo Trims"
        title="SHORT-FORM FOOD. CONTEXTUALIZED."
        description="A localized video feed that understands where you are and what you like, delivering relevant culinary content instead of random noise."
        microline="Signal > Scroll"
        image="https://images.unsplash.com/photo-1577308856961-8e9ec50d0c67?auto=format&fit=crop&w=800&q=80"
        icon={PlayCircle}
        color="stone"
        reverse
      />

      <FeatureFold
        subtitle="Fuzo Elite"
        title="TURN ACTION INTO PROGRESSION"
        description="Every save, share, and post earns points. Climb the leaderboard, unlock rewards, and build your culinary identity."
        microline="Engagement → Status → Access"
        image="https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80"
        icon={Trophy}
        color="stone"
      />

      <FeatureFold
        subtitle="Studio Rewards"
        title="REWARDS THAT ACTUALLY MATTER"
        description="Redeem points for curated experiences, from chef access to premium content and insider opportunities."
        microline="Not discounts. Access."
        image="https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80"
        icon={Gift}
        color="stone"
        reverse
      />

      <FeatureFold
        subtitle="Chef AI"
        title="YOUR AI CULINARY PARTNER"
        description="Generate recipes, analyze dishes, and create content ideas, powered by AI trained for food workflows."
        microline="Think less. Create more."
        image="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
        icon={Bot}
        color="stone"
      />

      {/* Final CTA */}
      <section className="py-40 bg-stone-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          <h2 className="text-7xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] italic">READY TO BUILD YOUR <br /> <span className="not-italic text-yellow-400">TASTE PROFILE?</span></h2>
          <p className="text-2xl font-bold text-stone-400 max-w-2xl mx-auto">
            Join a system designed to evolve how you discover, cook, and experience food.
          </p>
          <button
            onClick={onStart}
            className="px-16 py-8 bg-yellow-400 text-stone-900 rounded-[3rem] font-black uppercase tracking-widest text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl"
          >
            Start Exploring →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-stone-900/10 text-center space-y-8 bg-[#fbd556]">
        <div className="flex items-center justify-center gap-4">
          <div className="w-10 h-10 bg-stone-900 rounded-2xl flex items-center justify-center text-yellow-400"><ChefHat size={20} /></div>
          <h1 className="text-xl font-black uppercase tracking-[0.4em]">FUZO</h1>
        </div>
        <div className="flex justify-center gap-8 text-[10px] font-black uppercase tracking-widest text-stone-500">
          <a href="#" className="hover:text-stone-900 transition-colors">Privacy</a>
          <a href="#" className="hover:text-stone-900 transition-colors">Terms</a>
          <a href="#" className="hover:text-stone-900 transition-colors">Contact</a>
        </div>
        <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">© 2026 FUZO. All rights reserved.</p>
      </footer>
    </div>
  );
};

const AuthView = ({
  onComplete,
  initialStep = 'signin',
  useOnboardingV2 = false,
}: {
  onComplete: (payload?: OnboardingV2Payload) => void;
  initialStep?: 'signin' | 'signup' | 'onboarding';
  useOnboardingV2?: boolean;
}) => {
  const [step, setStep] = useState<'signin' | 'signup' | 'onboarding'>(initialStep);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  const userNeedsOnboarding = (user: { user_metadata?: Record<string, unknown> } | null | undefined): boolean => {
    const metadata = user?.user_metadata;
    if (!metadata || typeof metadata !== 'object') {
      return true;
    }

    const isCompleted = Boolean(metadata.onboarding_completed || metadata.has_completed_onboarding);
    return !isCompleted;
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setAuthError('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setAuthError('');
    setAuthMessage('');
    setAuthLoading(true);

    const redirectTo = getOAuthRedirectUrl();
    authDebugLog('google_signin_start', {
      path: globalThis.location.pathname,
      search: globalThis.location.search,
      redirectTo,
    });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
    }
  };

  const completeSignin = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      return;
    }

    if (data.session) {
      if (userNeedsOnboarding(data.session.user as { user_metadata?: Record<string, unknown> })) {
        setStep('onboarding');
      } else {
        onComplete();
      }
    }
  };

  const completeSignup = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name.trim(),
          full_name: name.trim(),
        },
      },
    });

    if (error) {
      setAuthError(error.message);
      return;
    }

    if (data.session) {
      setStep('onboarding');
      return;
    }

    setAuthMessage('Account created. Please verify your email, then sign in.');
    setStep('signin');
  };

  const handleEmailAuth = async () => {
    if (!supabase) {
      setAuthError('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    if (!email || !password) {
      setAuthError('Please enter email and password.');
      return;
    }

    if (step === 'signup' && !name.trim()) {
      setAuthError('Please enter your display name.');
      return;
    }

    setAuthError('');
    setAuthMessage('');
    setAuthLoading(true);

    try {
      if (step === 'signin') {
        await completeSignin();
      } else {
        await completeSignup();
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!supabase) {
      setAuthError('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    if (!email.trim()) {
      setAuthError('Enter your email to receive a password reset link.');
      return;
    }

    setAuthError('');
    setAuthMessage('');
    setAuthLoading(true);

    try {
      const redirectTo = getOAuthRedirectUrl();
      authDebugLog('forgot_password_start', {
        email: email.trim(),
        redirectTo,
        path: globalThis.location.pathname,
        search: globalThis.location.search,
      });

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        setAuthError(error.message);
      } else {
        setAuthMessage('Password reset link sent. Check your inbox.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  if (step === 'onboarding') {
    if (useOnboardingV2) {
      return <OnboardingV2Flow onComplete={onComplete} />;
    }

    const current = AUTH_ONBOARDING_DATA[onboardingStep];
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <motion.div 
          key={onboardingStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-xl bg-white p-12 md:p-16 rounded-[4rem] shadow-2xl border-4 border-white space-y-10"
        >
          <div className="flex justify-between items-center">
            <Badge color="yellow">Step {onboardingStep + 1} of 3</Badge>
            <div className="flex gap-1">
              {[0,1,2].map(i => <div key={i} className={`w-8 h-1.5 rounded-full ${i <= onboardingStep ? 'bg-yellow-400' : 'bg-stone-100'}`} />)}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{current.title}</h2>
            <p className="text-stone-400 font-bold text-lg">{current.desc}</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {current.options.map(opt => (
              <button 
                key={opt}
                onClick={() => {
                  if (onboardingStep < 2) setOnboardingStep(onboardingStep + 1);
                  else onComplete();
                }}
                className="p-8 bg-stone-50 rounded-[2.5rem] border-2 border-transparent hover:border-yellow-400 hover:bg-white transition-all text-left group"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black uppercase tracking-widest text-sm">{opt}</span>
                  <ChevronRight size={20} className="text-stone-200 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#facc15_0%,transparent_70%)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-12 rounded-[4rem] shadow-2xl relative z-10 space-y-10"
      >
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-stone-900 rounded-3xl flex items-center justify-center text-yellow-400 shadow-xl mx-auto mb-8 rotate-3">
            <ChefHat size={40} />
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">
            {step === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-stone-400 font-bold">Access your neural culinary studio.</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleGoogleSignIn}
            disabled={authLoading}
            className="w-full py-5 bg-white border-2 border-stone-100 rounded-[2rem] flex items-center justify-center gap-4 hover:bg-stone-50 transition-colors group"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="font-black uppercase tracking-widest text-xs">Sign in with Google</span>
          </button>

          <div className="flex items-center gap-4 py-4">
            <div className="flex-grow h-px bg-stone-100" />
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-300">or</span>
            <div className="flex-grow h-px bg-stone-100" />
          </div>

          <div className="space-y-4">
            {step === 'signup' && (
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Display Name"
                className="w-full bg-stone-50 px-8 py-5 rounded-[2rem] font-bold outline-none border-2 border-transparent focus:border-yellow-400 transition-all"
              />
            )}
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email Address" 
              className="w-full bg-stone-50 px-8 py-5 rounded-[2rem] font-bold outline-none border-2 border-transparent focus:border-yellow-400 transition-all" 
            />
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password" 
              className="w-full bg-stone-50 px-8 py-5 rounded-[2rem] font-bold outline-none border-2 border-transparent focus:border-yellow-400 transition-all" 
            />
          </div>

          {authError && (
            <div className="px-6 py-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-700">
              {authError}
            </div>
          )}

          {authMessage && (
            <div className="px-6 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs font-bold text-emerald-700">
              {authMessage}
            </div>
          )}

          <button 
            onClick={handleEmailAuth}
            disabled={authLoading}
            className="w-full py-6 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            {(() => {
              if (authLoading) return 'Processing...';
              if (step === 'signin') return 'Sign In';
              return 'Sign Up';
            })()}
          </button>

          {step === 'signin' && (
            <button
              onClick={() => {
                handleForgotPassword().catch((error) => {
                  console.warn('Password reset request failed:', error);
                  setAuthError('Unable to send password reset right now.');
                });
              }}
              disabled={authLoading}
              className="w-full text-center text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors disabled:opacity-50"
            >
              Forgot Password?
            </button>
          )}
        </div>

        <div className="text-center">
          <button 
            onClick={() => {
              setStep(step === 'signin' ? 'signup' : 'signin');
              setAuthError('');
              setAuthMessage('');
            }}
            className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors"
          >
            {step === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};



const RewardsView = () => {
  type RewardColor = 'yellow' | 'indigo' | 'emerald' | 'blue';
  const REWARD_COLOR_CLASSES: Record<RewardColor, string> = {
    yellow: 'bg-yellow-100 text-yellow-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  const rewards = [
    { id: 1, title: "Studio Pro Badge", desc: "Unlock exclusive profile flair", cost: 5000, icon: Star, color: "yellow" },
    { id: 2, title: "Neural Filter Pack", desc: "New AI styles for your snaps", cost: 12000, icon: Sparkles, color: "indigo" },
    { id: 3, title: "Chef Consultation", desc: "1-on-1 session with Chef AI Pro", cost: 25000, icon: Bot, color: "emerald" },
    { id: 4, title: "Priority Scouting", desc: "Early access to hidden gems", cost: 40000, icon: MapPin, color: "blue" },
  ] as const satisfies ReadonlyArray<{
    id: number;
    title: string;
    desc: string;
    cost: number;
    icon: IconComponent;
    color: RewardColor;
  }>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in pb-32">
      <header className="text-center space-y-4 py-8">
        <div className="inline-flex p-4 bg-emerald-500 rounded-3xl text-white shadow-2xl -rotate-3 mb-4">
          <Gift size={32} strokeWidth={2.5} />
        </div>
        <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">Studio Rewards</h2>
        <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Redeem your culinary points</p>
      </header>

      <div className="grid grid-cols-1 gap-6 px-4">
        {rewards.map((reward) => (
          <div key={reward.id} className="bg-white rounded-[3rem] p-8 border-4 border-white shadow-xl flex items-center justify-between group hover:shadow-2xl transition-all">
            <div className="flex items-center gap-6">
              <div className={`p-5 rounded-[2rem] group-hover:scale-110 transition-transform ${REWARD_COLOR_CLASSES[reward.color]}`}>
                <reward.icon size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-stone-900">{reward.title}</h3>
                <p className="text-stone-400 font-bold text-sm">{reward.desc}</p>
              </div>
            </div>
            <button className="px-8 py-4 bg-stone-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-stone-800 transition-colors">
              {reward.cost.toLocaleString()} Pts
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const TaggingForm = ({
  image,
  location,
  onBack,
  onClose,
  onSave,
  isUploading
}: {
  image: string;
  location?: { lat: number; lng: number } | null;
  onBack: () => void;
  onClose: () => void;
  onSave: (data: {
    restaurant: string;
    cuisine: string;
    rating: number;
    description: string;
    locationName: string;
    address: string;
    tags: string[];
  }) => void;
  isUploading: boolean;
}) => {
  const [restaurant, setRestaurant] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [rating, setRating] = useState(5);
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const hasGps = Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng));
  const isValid = restaurant.trim() !== '' && cuisine.trim() !== '' && locationName.trim() !== '' && address.trim() !== '' && hasGps;

  return (
    <div className="fixed inset-0 z-[200] bg-stone-50 flex flex-col md:flex-row overflow-hidden">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close snap tagging"
        className="absolute top-6 right-6 z-30 w-12 h-12 bg-stone-900 text-white rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-transform"
      >
        <X size={22} />
      </button>
      <div className="h-1/2 md:h-full md:w-1/2 relative bg-black">
        <img src={image} alt="Snap preview" className="w-full h-full object-cover" />
        <button onClick={onBack} className="absolute top-8 left-8 w-14 h-14 bg-black/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white"><X size={28} /></button>
        {location && (
          <div className="absolute bottom-8 left-8 flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full text-white text-[10px] font-black uppercase tracking-widest">
            <MapPin size={12} /> {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </div>
        )}
      </div>

      <div className="flex-grow p-8 md:p-16 overflow-y-auto bg-white">
        <div className="max-w-md mx-auto space-y-10">
          <header>
            <h2 className="text-4xl font-black uppercase tracking-tighter italic">Tag Your Snap</h2>
            <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Neural Metadata Entry</p>
          </header>

          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="snap-restaurant" className="text-[10px] font-black uppercase tracking-widest text-stone-400">Restaurant Name *</label>
              <input
                id="snap-restaurant"
                value={restaurant}
                onChange={(e) => setRestaurant(e.target.value)}
                placeholder="Where are you?"
                className="w-full bg-stone-50 px-8 py-5 rounded-[2rem] font-bold outline-none border-2 border-transparent focus:border-yellow-400 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="snap-location-name" className="text-[10px] font-black uppercase tracking-widest text-stone-400">Location Name *</label>
              <input
                id="snap-location-name"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Queen St Food Market"
                className="w-full bg-stone-50 px-8 py-5 rounded-[2rem] font-bold outline-none border-2 border-transparent focus:border-yellow-400 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="snap-address" className="text-[10px] font-black uppercase tracking-widest text-stone-400">Address *</label>
              <input
                id="snap-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, city"
                className="w-full bg-stone-50 px-8 py-5 rounded-[2rem] font-bold outline-none border-2 border-transparent focus:border-yellow-400 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="snap-cuisine" className="text-[10px] font-black uppercase tracking-widest text-stone-400">Cuisine Type *</label>
              <input
                id="snap-cuisine"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                placeholder="e.g. Modern Italian"
                className="w-full bg-stone-50 px-8 py-5 rounded-[2rem] font-bold outline-none border-2 border-transparent focus:border-yellow-400 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="snap-rating" className="text-[10px] font-black uppercase tracking-widest text-stone-400">Rating</label>
              <div id="snap-rating" className="sr-only">Snap rating controls</div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${rating >= star ? 'bg-yellow-400 text-stone-900 shadow-lg' : 'bg-stone-50 text-stone-300'}`}
                  >
                    <Star size={20} fill={rating >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="snap-description" className="text-[10px] font-black uppercase tracking-widest text-stone-400">Description</label>
              <textarea
                id="snap-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Neural impressions..."
                rows={3}
                className="w-full bg-stone-50 px-8 py-5 rounded-[2rem] font-bold outline-none border-2 border-transparent focus:border-yellow-400 transition-all resize-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="snap-tags" className="text-[10px] font-black uppercase tracking-widest text-stone-400">Tags</label>
              <input
                id="snap-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="comma-separated tags"
                className="w-full bg-stone-50 px-8 py-5 rounded-[2rem] font-bold outline-none border-2 border-transparent focus:border-yellow-400 transition-all"
              />
            </div>
          </div>
          {!hasGps && (
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
              GPS coordinates required. Enable location to save this Snap.
            </p>
          )}

          <button
            disabled={!isValid || isUploading}
            onClick={() => {
              const tags = tagsInput
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);

              onSave({ restaurant, cuisine, rating, description, locationName, address, tags });
            }}
            className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-4 transition-all ${isValid && !isUploading ? 'bg-stone-900 text-white hover:scale-105 active:scale-95' : 'bg-stone-100 text-stone-300 cursor-not-allowed'}`}
          >
            {isUploading ? <Loader2 className="animate-spin" /> : <Check size={24} />}
            {isUploading ? 'Processing...' : 'Save to Studio'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SnapMobile = ({ onPost, onClose }: { onPost: (item: AppItem) => void, onClose: () => void }) => {
  const [step, setStep] = useState<'disclaimer' | 'capture' | 'tagging' | 'success'>('disclaimer');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1920 } }
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (step === 'capture') {
      startCamera();
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Location error:', err),
        { enableHighAccuracy: true }
      );
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.85));
      setStep('tagging');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await loadUploadedImage(file, setCapturedImage, () => setStep('tagging'));
      } catch (error) {
        console.warn('Failed to read uploaded image', error);
      }
    }
  };

  if (step === 'disclaimer') {
    return (
      <div className="fixed inset-0 z-[200] bg-stone-950 text-white p-10 flex flex-col justify-center items-center text-center space-y-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close snap modal"
          className="absolute top-8 right-8 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center transition-colors"
        >
          <X size={24} />
        </button>
        <div className="w-24 h-24 bg-yellow-400 rounded-[2rem] flex items-center justify-center text-stone-950 shadow-2xl rotate-6">
          <Info size={48} strokeWidth={2.5} />
        </div>
        <h2 className="text-4xl font-black uppercase tracking-tighter italic">Studio Protocol</h2>
        <p className="text-stone-400 font-bold leading-relaxed max-w-xs">
          By entering the capture studio, you agree to share high-fidelity culinary data with the FUZO network.
        </p>
        <button
          onClick={() => setStep('capture')}
          className="w-full py-6 bg-white text-stone-900 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          I Understand
        </button>
        <button onClick={onClose} className="text-stone-500 font-bold uppercase tracking-widest text-xs">Cancel</button>
      </div>
    );
  }

  if (step === 'tagging' && capturedImage) {
    return (
      <TaggingForm
        image={capturedImage}
        location={location}
        onBack={() => setStep('capture')}
        onClose={onClose}
        onSave={async (data) => {
          setIsUploading(true);
          const snapId = `snap-${Date.now()}`;
          const snapItem = await persistSnapData({
            snapId,
            imageData: capturedImage,
            restaurant: data.restaurant,
            cuisine: data.cuisine,
            rating: data.rating,
            description: data.description,
            locationName: data.locationName,
            address: data.address,
            tags: data.tags,
            location,
          });
          onPost(snapItem);
          setStep('success');
          setIsUploading(false);
        }}
        isUploading={isUploading}
      />
    );
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-[200] bg-emerald-500 text-white flex flex-col items-center justify-center p-10 text-center space-y-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close snap success modal"
          className="absolute top-8 right-8 w-12 h-12 bg-white/15 hover:bg-white/25 backdrop-blur-xl rounded-2xl flex items-center justify-center transition-colors"
        >
          <X size={24} />
        </button>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-2xl"
        >
          <Check size={64} strokeWidth={4} />
        </motion.div>
        <h2 className="text-5xl font-black uppercase tracking-tighter italic">Snap Saved</h2>
        <p className="text-emerald-100 font-bold uppercase tracking-widest text-xs">Data Persisted</p>
        <button
          onClick={onClose}
          className="w-full py-6 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl"
        >
          Return to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col overflow-hidden">
      <header className="absolute top-0 inset-x-0 p-8 flex justify-between items-center z-20">
        <button onClick={onClose} className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white"><X size={28} /></button>
        <button className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white"><Zap size={24} /></button>
      </header>

      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover">
        <track kind="captions" />
      </video>

      <footer className="absolute bottom-12 inset-x-0 flex justify-around items-center z-20 px-8">
        <label className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white cursor-pointer">
          <ImageIcon size={24} />
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>

        <button
          onClick={handleCapture}
          className="w-28 h-28 rounded-full border-[8px] border-white bg-white/20 shadow-2xl backdrop-blur-sm active:scale-90 transition-transform flex items-center justify-center"
        >
          <div className="w-20 h-20 bg-white rounded-full" />
        </button>

        <button className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white"><RefreshCw size={24} /></button>
      </footer>
    </div>
  );
};

const SnapDesktop = ({ onPost, onClose }: { onPost: (item: AppItem) => void, onClose: () => void }) => {
  const [step, setStep] = useState<'upload' | 'tagging' | 'success'>('upload');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation(null),
      { enableHighAccuracy: true }
    );
  }, []);

  if (step === 'tagging' && capturedImage) {
    return (
      <TaggingForm
        image={capturedImage}
        location={location}
        onBack={() => setStep('upload')}
        onClose={onClose}
        onSave={async (data) => {
          setIsUploading(true);
          const snapId = `snap-${Date.now()}`;
          const snapItem = await persistSnapData({
            snapId,
            imageData: capturedImage,
            restaurant: data.restaurant,
            cuisine: data.cuisine,
            rating: data.rating,
            description: data.description,
            locationName: data.locationName,
            address: data.address,
            tags: data.tags,
            location,
          });
          onPost(snapItem);
          setStep('success');
          setIsUploading(false);
        }}
        isUploading={isUploading}
      />
    );
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-[200] bg-emerald-500 text-white flex flex-col items-center justify-center p-10 text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close snap success modal"
          className="absolute top-8 right-8 w-12 h-12 bg-white/15 hover:bg-white/25 backdrop-blur-xl rounded-2xl flex items-center justify-center transition-colors"
        >
          <X size={24} />
        </button>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-2xl mb-8">
          <Check size={64} strokeWidth={4} />
        </motion.div>
        <h2 className="text-5xl font-black uppercase tracking-tighter italic mb-4">Snap Saved</h2>
        <button onClick={onClose} className="px-12 py-6 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl">Return to Feed</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-stone-950 flex items-center justify-center p-10">
      <button onClick={onClose} className="absolute top-10 right-10 w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-white hover:bg-white/20 transition-colors"><X size={32} /></button>

      <div className="max-w-2xl w-full aspect-video bg-stone-900 rounded-[3rem] border-4 border-dashed border-stone-800 flex flex-col items-center justify-center space-y-6 text-center p-12 group hover:border-yellow-400/50 transition-colors relative">
        <div className="w-24 h-24 bg-stone-800 rounded-3xl flex items-center justify-center text-stone-600 group-hover:text-yellow-400 transition-colors">
          <ImageIcon size={48} />
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Upload Culinary Data</h3>
          <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px] mt-2">Max file size: 10MB (JPEG, PNG)</p>
        </div>
        <label className="px-10 py-5 bg-white text-stone-900 rounded-[2rem] font-black uppercase tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-2xl">
          <span>Choose File</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                await loadUploadedImage(file, setCapturedImage, () => setStep('tagging'));
              } catch (error) {
                console.warn('Failed to read uploaded image', error);
              }
            }}
          />
        </label>
      </div>
    </div>
  );
};

const SnapView = ({ onPost, onClose }: { onPost: (item: AppItem) => void, onClose: () => void }) => {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return <SnapDesktop onPost={onPost} onClose={onClose} />;
  }
  return <SnapMobile onPost={onPost} onClose={onClose} />;
};

// --- MAIN APP ---

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authBooting, setAuthBooting] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardEntry[]>([]);

  const tabIds = useMemo(() => new Set(TAB_IDS), []);
  const [tab, setTab] = useState(() => resolveInitialTab(globalThis.location.search, tabIds));
  const [publicProfileUserId, setPublicProfileUserId] = useState(() => new URLSearchParams(globalThis.location.search).get('userId') || '');
  const [showSnap, setShowSnap] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUnifiedCreation, setShowUnifiedCreation] = useState(false);
  const [showAIBitesStudio, setShowAIBitesStudio] = useState(false);
  const [showAITrimStudio, setShowAITrimStudio] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedItems, setSavedItems] = useState<AppItem[]>(FALLBACK_SAVED_ITEMS);
  const [activeShareItem, setActiveShareItem] = useState<AppItem | null>(null);

  const [friends, setFriends] = useState<ChatInboxItem[]>(DEFAULT_FRIENDS);
  const totalUnread = useMemo(() => friends.reduce((sum, friend) => sum + (friend.unreadCount || 0), 0), [friends]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (globalThis.Notification === undefined) {
      return 'unsupported';
    }

    return globalThis.Notification.permission;
  });
  const notificationPromptedRef = useRef(false);
  const pathname = globalThis.location.pathname;
  const viewParam = new URLSearchParams(globalThis.location.search).get('view');
  const homeRoute = (pathname === '/' || pathname === APP_PATH) && (viewParam === null || viewParam === 'home');
  const isOnboardingDemoView = viewParam === 'onboarding-demo';
  const [onboardingDemoPayload, setOnboardingDemoPayload] = useState<OnboardingV2Payload | null>(null);
  const appRoute = isAppPath(pathname);
  const authCallbackRoute = isAuthCallbackPath(pathname);

  const requestNotificationPermission = useCallback(async () => {
    if (globalThis.Notification === undefined) {
      setNotificationPermission('unsupported');
      return;
    }

    if (globalThis.Notification.permission !== 'default') {
      setNotificationPermission(globalThis.Notification.permission);
      return;
    }

    try {
      const permission = await globalThis.Notification.requestPermission();
      setNotificationPermission(permission);
    } catch (error) {
      console.warn('Notification permission request failed:', error);
    }
  }, []);

  const getFriendDisplayName = useCallback((friendId: string) => {
    const match = friends.find((friend) => String(friend.id) === String(friendId));
    if (!match) return 'Studio Contact';
    return match.name || ('username' in match ? match.username : '') || 'Studio Contact';
  }, [friends]);

  const incrementUnreadForFriend = useCallback((friendId: string) => {
    setFriends((prev) => prev.map((friend) => {
      if (String(friend.id) !== String(friendId)) return friend;
      return {
        ...friend,
        unreadCount: (friend.unreadCount || 0) + 1,
        ...('type' in friend && friend.type === 'group' ? {} : { time: 'now' }),
      };
    }));
  }, []);

  useAuthSessionSync({
    setAuthBooting,
    setIsAuthenticated,
    setAuthUser,
    setShowAuth,
    setHasCompletedOnboarding,
  });

  useSavedItemsOnAuth({
    isAuthenticated,
    setSavedItems,
    fallbackSavedItems: FALLBACK_SAVED_ITEMS,
    normalizeSavedItemForUI,
  });

  useTabUrlSync(tab, appRoute && !homeRoute, publicProfileUserId);

  const handleOpenUserProfile = useCallback((userId: string) => {
    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      return;
    }

    if (authUser?.id && trimmedUserId === authUser.id) {
      setPublicProfileUserId('');
      setTab('profile');
      return;
    }

    setPublicProfileUserId(trimmedUserId);
    setTab('user-profile');
  }, [authUser?.id]);

  const handleBackToOwnProfile = useCallback(() => {
    setPublicProfileUserId('');
    setTab('profile');
  }, []);

  useEffect(() => {
    if (tab !== 'user-profile') {
      return;
    }

    if (!publicProfileUserId && authUser?.id) {
      setTab('profile');
      return;
    }

    if (authUser?.id && publicProfileUserId === authUser.id) {
      setPublicProfileUserId('');
      setTab('profile');
    }
  }, [authUser?.id, publicProfileUserId, tab]);

  useEffect(() => {
    const currentPath = globalThis.location.pathname;
    const currentSearch = globalThis.location.search;
    const currentHash = globalThis.location.hash;
    authDebugLog('path_normalization_start', { currentPath, currentSearch, currentHash });

    if (currentPath === '/') {
      const params = new URLSearchParams(currentSearch);
      const legacyView = params.get('view');

      if (!legacyView) {
        const nextUrl = `${HOME_ENTRY_URL}${currentHash}`;
        authDebugLog('path_normalization_redirect', {
          reason: 'root_without_view',
          to: nextUrl,
        });
        globalThis.history.replaceState(null, '', nextUrl);
        return;
      }

      if (legacyView === 'home') {
        authDebugLog('path_normalization_noop', {
          reason: 'root_home_view',
          currentPath,
          currentSearch,
        });
        return;
      }

      params.set('view', legacyView);
      const nextQuery = params.toString();
      const queryPart = nextQuery ? ('?' + nextQuery) : '';
      const nextUrl = `${APP_PATH}${queryPart}${currentHash}`;
      authDebugLog('path_normalization_redirect', {
        reason: 'root_with_legacy_view',
        legacyView,
        to: nextUrl,
      });
      globalThis.history.replaceState(null, '', nextUrl);
      return;
    }

    if (currentPath === '/landing' || currentPath === '/landing/' || currentPath === '/home' || currentPath.startsWith('/home/')) {
      const nextUrl = `${HOME_ENTRY_URL}${currentHash}`;
      authDebugLog('path_normalization_redirect', {
        reason: 'legacy_home_or_landing_path',
        from: currentPath,
        to: nextUrl,
      });
      globalThis.history.replaceState(null, '', nextUrl);
      return;
    }

    if (currentPath !== APP_PATH && !currentPath.startsWith('/api/') && !isAuthCallbackPath(currentPath)) {
      authDebugLog('path_normalization_redirect', {
        reason: 'non_app_non_api_path',
        from: currentPath,
        to: `${HOME_ENTRY_URL}${currentHash}`,
      });
      globalThis.history.replaceState(null, '', `${HOME_ENTRY_URL}${currentHash}`);
      return;
    }

    authDebugLog('path_normalization_noop', { currentPath });
  }, []);

  useEffect(() => {
    if (isAuthenticated || !appRoute || showAuth || homeRoute) {
      return;
    }

    setShowAuth(true);
  }, [appRoute, homeRoute, isAuthenticated, showAuth]);

  useEffect(() => {
    if (authBooting || !authCallbackRoute) {
      return;
    }

    authDebugLog('auth_callback_route_detected', {
      isAuthenticated,
      authCallbackRoute,
      path: globalThis.location.pathname,
      search: globalThis.location.search,
    });

    if (isAuthenticated) {
      setTab('feed');
      authDebugLog('auth_callback_route_authenticated_redirect', {
        to: `${APP_PATH}?view=feed`,
      });
      globalThis.history.replaceState(null, '', `${APP_PATH}?view=feed`);
      return;
    }

    setShowAuth(true);
    authDebugLog('auth_callback_route_unauthenticated_redirect', { to: HOME_ENTRY_URL });
    globalThis.history.replaceState(null, '', HOME_ENTRY_URL);
  }, [authBooting, authCallbackRoute, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    const ensureProfile = async () => {
      if (!isAuthenticated || !authUser?.id || !hasSupabaseConfig) {
        setProfileReady(true);
        return;
      }

      setProfileReady(false);

      const result = await UserProfileService.ensureCurrentUserProfile(authUser);
      if (!cancelled && !result.success) {
        console.warn('Failed to ensure user profile row:', result.error);
      }

      if (!cancelled) {
        setProfileReady(true);
      }
    };

    ensureProfile();

    return () => {
      cancelled = true;
    };
  }, [authUser, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    const loadContacts = async () => {
      if (!profileReady) {
        return;
      }

      if (!authUser?.id || !hasSupabaseConfig) {
        setFriends(DEFAULT_FRIENDS);
        return;
      }

      const [contacts, groups] = await Promise.all([
        ChatService.listContacts(authUser.id),
        ChatService.listGroups(authUser.id),
      ]);

      if (cancelled) return;

      const contactItems: ChatInboxItem[] = (contacts.success && contacts.data)
        ? contacts.data.map((contact: ChatContact) => ({
            ...contact,
            email: contact.email,
            online: contact.isOnline,
            time: contact.isOnline ? 'now' : 'recent',
            unreadCount: 0,
            requestStatus: 'accepted',
            type: 'dm' as const,
          }))
        : [];

      const groupItems: ChatInboxItem[] = (groups.success && groups.data)
        ? groups.data.map((g) => ({
            id: g.id,
            name: g.name,
            avatar: g.avatarUrl || `https://i.pravatar.cc/150?u=${g.id}`,
            type: 'group' as const,
            unreadCount: 0,
            time: g.lastMessageAt ? 'recent' : 'new',
          }))
        : [];

      setFriends([...groupItems, ...contactItems]);
    };

    loadContacts();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id, profileReady]);

  useEffect(() => {
    if (globalThis.Notification === undefined) {
      setNotificationPermission('unsupported');
      return;
    }

    const syncPermission = () => {
      setNotificationPermission(globalThis.Notification.permission);
    };

    syncPermission();
    globalThis.document.addEventListener('visibilitychange', syncPermission);

    return () => {
      globalThis.document.removeEventListener('visibilitychange', syncPermission);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || notificationPermission !== 'default' || notificationPromptedRef.current) {
      return;
    }

    notificationPromptedRef.current = true;
    requestNotificationPermission().catch((error) => {
      console.warn('Notification permission bootstrap failed:', error);
    });
  }, [isAuthenticated, notificationPermission, requestNotificationPermission]);

  useEffect(() => {
    if (!authUser?.id || !hasSupabaseConfig) {
      return;
    }

    const unsubscribe = ChatService.subscribeToIncomingMessages(authUser.id, ({ otherUserId, message }) => {
      const senderName = getFriendDisplayName(otherUserId);
      incrementUnreadForFriend(otherUserId);

      if (notificationPermission !== 'granted' || globalThis.Notification === undefined) {
        return;
      }

      const isHidden = globalThis.document.visibilityState !== 'visible' || !globalThis.document.hasFocus();
      if (!isHidden) {
        return;
      }

      const body = message.sharedItem
        ? `Shared: ${message.sharedItem?.name || 'an item'}`
        : (message.content || 'You received a new message.');

      const toast = new globalThis.Notification(`${senderName} sent a message`, {
        body,
        icon: '/favicon.png',
        tag: `fuzo-chat-${otherUserId}`,
      });

      toast.onclick = () => {
        globalThis.focus();
        setTab('chat');
        toast.close();
      };
    });

    return () => {
      unsubscribe();
    };
  }, [authUser?.id, getFriendDisplayName, incrementUnreadForFriend, notificationPermission]);

  const handleConversationOpened = useCallback((friendId: string) => {
    setFriends(prev => prev.map((friend) => (
      String(friend.id) === String(friendId)
        ? { ...friend, unreadCount: 0 }
        : friend
    )));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPoints = async () => {
      if (!profileReady) {
        return;
      }

      if (!isAuthenticated || !hasSupabaseConfig) {
        setPoints(0);
        setLevel(1);
        return;
      }

      const result = await PointsService.getCurrentUserPoints();
      if (cancelled || !result.success || !result.data) return;

      setPoints(result.data.total);
      setLevel(result.data.level);
    };

    loadPoints();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id, isAuthenticated, profileReady]);

  useEffect(() => {
    let cancelled = false;

    const loadLeaderboard = async () => {
      if (!profileReady) {
        return;
      }

      if (!hasSupabaseConfig) {
        setLeaderboardUsers([]);
        return;
      }

      const result = await PointsService.getLeaderboard(50);
      if (cancelled || !result.success || !result.data) return;
      setLeaderboardUsers(result.data);
    };

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id, points, profileReady]);

  const awardPointsForAction = useCallback(async (
    actionType: 'save_item' | 'share_item' | 'snap_post',
    sourceEntityType: string,
    sourceEntityId: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!isAuthenticated || !hasSupabaseConfig) {
      setPoints(prev => prev + 50);
      return;
    }

    const result = await PointsService.awardActionPoints({
      actionType,
      sourceEntityType,
      sourceEntityId,
      metadata,
    });

    if (!result.success || !result.data) {
      console.warn('Points award failed:', result.error);
      return;
    }

    const awardedPoints = result.data;

    setPoints(awardedPoints.total);
    setLevel(awardedPoints.level);
    setLeaderboardUsers(prev => {
      const currentUserId = authUser?.id;
      if (!currentUserId) return prev;
      const rest = prev.filter(entry => entry.id !== currentUserId);
      const metadata = authUser?.user_metadata;
      const displayName = getMetadataString(metadata, 'full_name', 'name') || 'Chef Studio';
      const username = getMetadataString(metadata, 'username', 'user_name') || (authUser?.email?.split('@')[0] ?? 'fuzo_user');
      const updated: LeaderboardEntry = {
        id: currentUserId,
        displayName,
        username,
        pointsTotal: awardedPoints.total,
        pointsLevel: awardedPoints.level,
      };

      return [updated, ...rest]
        .sort((a, b) => (b.pointsTotal - a.pointsTotal) || (b.pointsLevel - a.pointsLevel));
    });
  }, [isAuthenticated]);

  const handleSave = async (item: AppItem) => {
    const normalized = normalizeItemForPlateSave(item);
    let isNewSave = false;

    setSavedItems(prev => {
      if (prev.some(i => i.id === normalized.id)) return prev;
      isNewSave = true;
      return [normalized, ...prev];
    });

    if (isNewSave) {
      await awardPointsForAction('save_item', normalized.itemType, normalized.itemId, {
        source: 'handleSave',
      });
    }

    if (!hasSupabaseConfig) return;

    const result = await PlateService.saveToPlate({
      itemId: normalized.itemId,
      itemType: normalized.itemType,
      metadata: normalized.metadata,
    });

    if (!result.success) {
      console.warn('Plate save failed:', result.error);
    }
  };

  const handleUnsave = async (item: AppItem) => {
    const normalized = normalizeItemForPlateSave(item);

    setSavedItems(prev => prev.filter((savedItem) => !areSavedItemsEquivalent(savedItem, normalized)));

    if (!hasSupabaseConfig) {
      return;
    }

    const result = await PlateService.removeFromPlate({
      itemId: normalized.itemId,
      itemType: normalized.itemType,
    });

    if (!result.success) {
      console.warn('Plate unsave failed:', result.error);
      setSavedItems(prev => {
        if (prev.some((savedItem) => areSavedItemsEquivalent(savedItem, normalized))) {
          return prev;
        }
        return [normalized, ...prev];
      });
    }
  };

  const handleSnap = (item: AppItem) => {
    const itemId = String(item.id || '');
    setSavedItems(prev => [item, ...prev]);
    awardPointsForAction('snap_post', inferItemTypeFromId(itemId), itemId, {
      source: 'handleSnap',
    }).catch((error) => {
      console.warn('Snap points award failed:', error);
    });
  };

  const handleShare = async (friendId: string | number, item: AppItem) => {
    const targetFriendId = String(friendId);
    const itemId = String(item.id || '');

    if (authUser?.id && hasSupabaseConfig) {
      const conversation = await ChatService.getOrCreateConversation(authUser.id, targetFriendId);
      if (conversation.success && conversation.data) {
        const sent = await ChatService.sendSharedItemMessage({
          conversationId: conversation.data.id,
          senderId: authUser.id,
          item,
        });

        if (!sent.success) {
          console.warn('Share message send failed:', sent.error);
        }
      }
    }

    awardPointsForAction('share_item', inferItemTypeFromId(itemId), itemId, {
      source: 'handleShare',
      friendId: targetFriendId,
    }).catch((error) => {
      console.warn('Share points award failed:', error);
    });
  };

  const handleSignOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      setIsAuthenticated(false);
      setAuthUser(null);
      setShowAuth(false);
      setPoints(0);
      setLevel(1);
      setTab('feed');
      setPublicProfileUserId('');
      setSidebarOpen(false);
      setShowSnap(false);
      setActiveShareItem(null);
      setSavedItems(FALLBACK_SAVED_ITEMS);
      globalThis.history.replaceState(null, '', HOME_ENTRY_URL);
    }
  };

  const handleOnboardingComplete = async (payload?: OnboardingV2Payload) => {
    if (supabase) {
      const metadataUpdate: Record<string, unknown> = {
        onboarding_completed: true,
        has_completed_onboarding: true,
      };

      if (payload) {
        metadataUpdate.onboarding_v2 = true;
        metadataUpdate.onboarding_v2_answers = payload.answers;
        metadataUpdate.phone = payload.phone || null;
        metadataUpdate.location = payload.locationLabel || null;
        metadataUpdate.onboarding_location = payload.location;
      }

      const { data, error } = await supabase.auth.updateUser({
        data: metadataUpdate,
      });

      if (error) {
        console.warn('Failed to persist onboarding completion:', error.message);
      } else if (data.user) {
        setAuthUser(data.user as AuthUser);
      }
    }

    setIsAuthenticated(true);
    setHasCompletedOnboarding(true);
    setShowAuth(false);
    setTab('feed');
    globalThis.history.replaceState(null, '', `${APP_PATH}?view=feed`);
  };

  const renderView = () => renderAppView({
    tab,
    setTab,
    handleSave: (item: AppItem) => {
      handleSave(item).catch((error) => {
        console.warn('Save failed:', error);
      });
    },
    handleUnsave: (item: AppItem) => {
      handleUnsave(item).catch((error) => {
        console.warn('Unsave failed:', error);
      });
    },
    setActiveShareItem,
    friends,
    savedItems,
    authUser,
    points,
    level,
    leaderboardUsers,
    profileUserId: publicProfileUserId,
    handleSignOut,
    handleConversationOpened,
    handleOpenUserProfile,
    handleBackToOwnProfile,
    components: {
      FeedView,
      BitesView,
      TrimsView,
      ChefAIView,
      ChatView,
      ScoutView,
      ProfileView,
      PublicProfileView,
      LeaderboardView,
      RewardsView,
      SettingsView,
    },
  });

  if (authBooting) {
    return (
      <div className="min-h-screen bg-stone-900 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-white/10 border border-white/20 animate-pulse" />
          <p className="font-black uppercase tracking-widest text-xs text-white/60">Initializing Auth...</p>
        </div>
      </div>
    );
  }

  if (isOnboardingDemoView) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-6xl mx-auto px-6 pt-10 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Client Preview</p>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-stone-900">Onboarding V2 Demo</h1>
            </div>
            <button
              type="button"
              onClick={() => {
                setOnboardingDemoPayload(null);
                setTab('feed');
                globalThis.history.replaceState(null, '', `${APP_PATH}?view=feed`);
              }}
              className="px-4 py-2 rounded-2xl bg-stone-900 text-white text-[10px] font-black uppercase tracking-widest"
            >
              Exit Demo
            </button>
          </div>
        </div>

        <OnboardingV2Flow
          mode="demo"
          onComplete={(payload) => {
            setOnboardingDemoPayload(payload);
          }}
        />

        {onboardingDemoPayload && (
          <div className="max-w-3xl mx-auto px-6 pb-12">
            <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Latest Demo Submission</p>
              <pre className="text-xs text-stone-700 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(onboardingDemoPayload, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (homeRoute && !showAuth) {
    return <LandingPage onStart={() => setShowAuth(true)} />;
  }

  if (!appRoute && !authCallbackRoute && !isOnboardingDemoView && !homeRoute) {
    return null;
  }

  if (showAuth && !hasCompletedOnboarding) {
    return (
      <AuthView
        initialStep={isAuthenticated ? 'onboarding' : 'signin'}
        useOnboardingV2={ONBOARDING_V2_ENABLED}
        onComplete={(payload) => {
          handleOnboardingComplete(payload).catch((error) => {
            console.warn('Onboarding completion failed:', error);
            setIsAuthenticated(true);
            setHasCompletedOnboarding(true);
            setShowAuth(false);
            setTab('feed');
            globalThis.history.replaceState(null, '', `${APP_PATH}?view=feed`);
          });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row pb-[env(safe-area-inset-bottom)] overflow-x-hidden">
      {showSnap && <SnapView onPost={handleSnap} onClose={() => setShowSnap(false)} />}
      <NotificationsView isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      <UnifiedCreationModal 
        isOpen={showUnifiedCreation} 
        onClose={() => setShowUnifiedCreation(false)}
        onSelectOption={(option) => {
          if (option === 'snap') setShowSnap(true);
          else if (option === 'bites-ai') setShowAIBitesStudio(true);
          else if (option === 'trim-ai') setShowAITrimStudio(true);
        }}
      />
      
      {showAIBitesStudio && (
        <AIRecipeStudio 
          onSave={(item) => handleSave(item as any)} 
          onShareRequest={setActiveShareItem} 
          onClose={() => setShowAIBitesStudio(false)} 
        />
      )}

      {showAITrimStudio && (
        <AITrimStudio 
          onSave={handleSave} 
          onShareRequest={setActiveShareItem} 
          onClose={() => setShowAITrimStudio(false)} 
        />
      )}
      
      {activeShareItem && (
        <ShareModal 
          item={activeShareItem} 
          friends={friends} 
          onShare={handleShare} 
          onClose={() => setActiveShareItem(null)} 
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-[200] w-28 bg-white border-r border-stone-100 transform ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} md:translate-x-0 md:static transition-all duration-500 ease-in-out`}>
        <div className="flex flex-col h-full p-4 overflow-y-auto hide-scrollbar items-center">
          <header className="flex flex-col items-center justify-center mb-12 md:mb-16 mt-4 gap-6">
            <div className="w-14 h-14 bg-stone-900 rounded-3xl items-center justify-center text-yellow-400 shadow-2xl rotate-3 shrink-0 hidden md:flex"><ChefHat size={32} /></div>
            
            <button 
              onClick={() => setShowUnifiedCreation(true)}
              className="w-12 h-12 bg-white border-2 border-stone-100 rounded-2xl flex items-center justify-center text-stone-900 shadow-sm hover:scale-105 active:scale-95 transition-all group"
            >
              <Plus size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
            </button>

            <button 
              onClick={() => { setTab('leaderboard'); setSidebarOpen(false); }}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="px-3 py-1 bg-yellow-400 rounded-full text-[10px] font-black text-stone-900 shadow-lg group-hover:scale-110 transition-transform">
                {points.toLocaleString()}
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-stone-300">Pts</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-4 bg-stone-50 rounded-2xl"><X size={20} /></button>
          </header>
          
          <nav className="space-y-4 flex-grow w-full">
            {BOTTOM_NAV_ITEMS.filter(item => item.id !== 'snap').map(item => (
              <button 
                key={item.id}
                onClick={() => { setTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center justify-center py-5 rounded-[1.5rem] transition-all ${tab === item.id ? 'bg-yellow-400 text-stone-900 shadow-xl' : 'text-stone-300 hover:bg-stone-50'}`}
              >
                <item.icon size={28} strokeWidth={tab === item.id ? 3 : 2} />
              </button>
            ))}

            <div className="my-8 h-px bg-stone-50 w-1/2 mx-auto" />
            
            {DRAWER_NAV_ITEMS.map(item => (
              <button 
                key={item.id}
                onClick={() => {
                  if (item.id === 'chat') {
                    requestNotificationPermission().catch((error) => {
                      console.warn('Notification permission request failed:', error);
                    });
                  }
                  if (item.id === 'notifications') {
                    setShowNotifications(true);
                  } else {
                    setTab(item.id);
                  }
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-center py-5 rounded-[1.5rem] transition-all ${tab === item.id ? 'bg-stone-900 text-white shadow-xl' : 'text-stone-300 hover:bg-stone-50'}`}
              >
                <div className="relative">
                  <item.icon size={28} strokeWidth={tab === item.id ? 3 : 2} />
                  {item.id === 'chat' && totalUnread > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-yellow-400 text-stone-900 text-[10px] font-black flex items-center justify-center">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-grow max-w-6xl mx-auto w-full px-6 md:px-12 relative pt-8 pb-32 md:pb-12">
        <header className="flex items-center justify-between mb-8 md:hidden px-2">
          <button onClick={() => setSidebarOpen(true)} className="p-2 bg-stone-900 text-yellow-400 rounded-2xl shadow-lg active:scale-90 transition-transform rotate-3">
            <ChefHat size={24} strokeWidth={2.5} />
          </button>
          
          <button 
            onClick={() => setShowNotifications(true)}
            className="p-2 bg-white text-stone-400 rounded-2xl shadow-sm border border-stone-100 active:scale-90 transition-transform relative"
          >
            <Bell size={24} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </button>

          <button 
            onClick={() => setTab('leaderboard')}
            className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-stone-100 active:scale-95 transition-all"
          >
            <Trophy size={16} className="text-yellow-500" />
            <span className="text-xs font-black tracking-tighter">{points.toLocaleString()}</span>
          </button>
        </header>

        {renderView()}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-2xl border-t border-stone-100 px-8 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex justify-between items-center md:hidden z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <NavIcon icon={LayoutGrid} active={tab === 'feed'} onClick={() => setTab('feed')} label="Feed" />
        <NavIcon icon={ChefHat} active={tab === 'bites'} onClick={() => setTab('bites')} label="Bites" />
        
        <button 
          onClick={() => setShowUnifiedCreation(true)} 
          className="w-[72px] h-[72px] -mt-14 bg-stone-900 rounded-[2.5rem] flex items-center justify-center text-yellow-400 shadow-[0_20px_40px_rgba(0,0,0,0.3)] border-4 border-white active:scale-90 transition-transform"
        >
          <Camera size={29} strokeWidth={3} />
        </button>

        <NavIcon icon={PlayCircle} active={tab === 'trims'} onClick={() => setTab('trims')} label="Trims" />
        <NavIcon icon={MapPin} active={tab === 'scout'} onClick={() => setTab('scout')} label="Scout" />
      </nav>

      {sidebarOpen && <button type="button" aria-label="Close sidebar" className="fixed inset-0 bg-stone-900/40 backdrop-blur-xl z-[190] md:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
};

mountApp(App);
