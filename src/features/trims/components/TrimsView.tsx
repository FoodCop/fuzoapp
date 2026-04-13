/**
 * ============================================================================
 * TRIMS FEATURE â€” AI Video Card Studio + Video Discovery
 * ============================================================================
 * 
 * Extracted from index.tsx for modular maintainability.
 * Contains: AITrimStudio, TrimsView
 * 
 * @see docs/GUIDES/TRIMS_STUDIO_READY_RECKONER.md
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Star, Loader2, MapPin, Send, RefreshCw, Sparkles,
  Image as ImageIcon, Play, Youtube, ExternalLink, Music2, Eye,
} from 'lucide-react';
import { UGC_CUISINES, UGC_VIBES, normalizeTag } from '../../../shared/utils/taxonomy';
import { Badge } from '../../../shared/ui/Badge';
import { StudioStepper } from '../../../shared/ui/StudioStepper';
import { readImageFileAsDataUrl, parseAiJson } from '../../../shared/lib/studioHelpers';
import { normalizeExternalUrl } from '../../../shared/lib/urlHelpers';
import { GeminiService } from '../../../services/geminiService';
import { YouTubeService } from '../../../services/youtubeService';
import { TRIMS_FALLBACK_VIDEOS } from '../constants/fallbackVideos';
import { buildTrimQueries } from '../lib/buildTrimQueries';
import type { TrimVideo, YouTubeSearchItem } from '../types/trimsUi';
import type { AppItem } from '../../../shared/types/appItem';
import type { AuthUser } from '../../auth/types/auth';
import { API_KEYS } from '../../../shared/constants/apiKeys';

// Lightweight motion shims
type LightweightMotionProps = { children?: React.ReactNode; [key: string]: unknown; };
const MotionDiv = ({ children, initial: _i, animate: _a, exit: _e, transition: _t, whileHover: _wh, whileTap: _wt, ...rest }: LightweightMotionProps) => <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
const motion = { div: MotionDiv };
const AnimatePresence = ({ children }: { children?: React.ReactNode; mode?: string; initial?: boolean }) => <>{children}</>;
const isYouTubeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(trimmed);
};

// filterFriendsByQuery moved to src/features/chat/lib/chatHelpers.ts

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

export const AITrimStudio = ({
  onSave,
  onShareRequest,
  onClose,
}: {
  onSave: (item: AppItem) => void;
  onShareRequest: (item: AppItem) => void;
  onClose: () => void;
}) => {
  const STUDIO_STEPS = ['Media', 'Context', 'Assembly', 'Success'];
  const [currentStep, setCurrentStep] = useState(0);
  const [video, setVideo] = useState<string | null>(null);
  const [videoMimeType, setVideoMimeType] = useState('video/mp4');
  const [linkURL, setLinkURL] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTrim, setGeneratedTrim] = useState<GeneratedTrimCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPostingToFeed, setIsPostingToFeed] = useState(false);
  const [feedPostSuccess, setFeedPostSuccess] = useState(false);
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
      setCurrentStep(1); // Auto-advance to context
    } catch {
      setError('Failed to read video file.');
    }
  };

  const handleGenerate = async (urlOverride?: string) => {
    const effectiveUrl = (urlOverride ?? linkURL).trim();
    const hasYoutubeUrl = isYouTubeUrl(effectiveUrl);
    if (!description.trim() && !hasYoutubeUrl) return;

    setCurrentStep(2); // Move to Assembly step
    setIsGenerating(true);
    setError(null);

    try {
      const generated = await requestGeneratedTrimCard({
        description,
        effectiveUrl,
        video,
        videoMimeType,
        taxonomy: {
          cuisines: UGC_CUISINES,
          categories: UGC_CATEGORIES,
          vibes: UGC_VIBES
        }
      });

      trimDraftIdRef.current = String(Date.now());
      setGeneratedTrim(generated);
      if (hasYoutubeUrl) {
        autoGeneratedLinkRef.current = effectiveUrl;
      }
    } catch {
      setError('Failed to generate trim card. Please try again.');
      setCurrentStep(1); // Go back on error
    } finally {
      setIsGenerating(false);
    }
  };

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

  const handleFinish = async (action: 'save' | 'share' | 'feed') => {
    const item = buildTrimItem();
    if (!item) return;

    if (action === 'save') {
      onSave(item);
      setCurrentStep(3); // Success step
    } else if (action === 'share') {
      onShareRequest(item);
    } else if (action === 'feed') {
      setIsPostingToFeed(true);
      try {
        const result = await FeedService.publishToFeed(item);
        if (result.success) {
          setFeedPostSuccess(true);
        }
      } finally {
        setIsPostingToFeed(false);
      }
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Create trim with AI" className="fixed inset-0 z-[200] bg-stone-950 text-white flex flex-col overflow-hidden">
      {/* Header with Stepper */}
      <header className="p-8 md:p-12 border-b border-stone-900 bg-stone-950/50 backdrop-blur-xl shrink-0 flex items-center justify-between">
        <div className="hidden md:block w-32" />
        <StudioStepper steps={STUDIO_STEPS} currentStep={currentStep} className="flex-grow" />
        <button
          onClick={onClose}
          className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-colors shadow-2xl"
        >
          <X size={24} />
        </button>
      </header>

      <div className="flex-grow overflow-y-auto p-8 md:p-24">
        <div className="max-w-4xl mx-auto">
          {/* STEP 1: MEDIA SOURCE */}
          {currentStep === 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-12 text-center">
              <div className="space-y-4">
                <Badge color="yellow">Step 1</Badge>
                <h2 className="text-5xl font-black uppercase tracking-tighter italic">Neural Feed</h2>
                <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Upload vertical video or paste YouTube URL</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Video Upload */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Vertical Trim</label>
                  <div className="relative aspect-[9/16] bg-stone-900 rounded-[3rem] border-4 border-dashed border-stone-800 overflow-hidden group hover:border-emerald-400/50 transition-all">
                    {video ? (
                      <>
                        <video src={video} className="w-full h-full object-cover" autoPlay loop muted />
                        <button onClick={() => setVideo(null)} className="absolute top-4 right-4 p-2 bg-black/60 rounded-full hover:bg-red-500 transition-colors"><X size={16} /></button>
                      </>
                    ) : (
                      <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                        <PlayCircle size={48} className="text-stone-700 group-hover:text-emerald-400 transition-colors mb-4" />
                        <span className="text-[12px] font-black uppercase tracking-widest text-stone-600 px-8">Upload Trim</span>
                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                      </label>
                    )}
                  </div>
                </div>

                {/* YouTube Link */}
                <div className="space-y-8 flex flex-col justify-center">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">YouTube Intelligence</label>
                    <input
                      value={linkURL}
                      onChange={(e) => {
                        setLinkURL(e.target.value);
                        setError(null);
                      }}
                      placeholder="Paste YouTube link..."
                      className="w-full bg-stone-900 border-4 border-stone-800 rounded-[2rem] px-8 py-6 font-bold text-sm outline-none focus:border-emerald-400 transition-all shadow-inner"
                    />
                    {!!linkURL.trim() && !isYouTubeUrl(linkURL) && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Invalid YouTube URL</p>
                    )}
                  </div>

                  <div className="p-8 bg-stone-900/50 rounded-[2.5rem] border-2 border-stone-800 text-left space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Neural Capability</p>
                    <p className="text-xs font-bold text-stone-400 leading-relaxed">
                      AI can analyze YouTube videos to extract culinary data, nutrition info, and key ingredients automatically.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4 pt-8">
                <button
                  disabled={!video && !isYouTubeUrl(linkURL)}
                  onClick={() => setCurrentStep(1)}
                  className="px-12 py-6 bg-white text-stone-900 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  Configure Context
                </button>
              </div>
              {error && <p className="text-red-500 text-xs font-bold uppercase tracking-widest">{error}</p>}
            </div>
          )}

          {/* STEP 2: CONTEXT */}
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-12">
              <div className="space-y-4 text-center">
                <Badge color="yellow">Step 2</Badge>
                <h2 className="text-5xl font-black uppercase tracking-tighter italic">Trim Context</h2>
                <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Describe the video and culinary context</p>
              </div>

              <div className="max-w-2xl mx-auto space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-6">Neural Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what's happening in this trim..."
                    className="w-full h-64 bg-stone-900 border-4 border-stone-800 rounded-[3rem] p-8 font-bold text-sm outline-none focus:border-emerald-400 transition-all resize-none shadow-inner"
                  />
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button onClick={() => setCurrentStep(0)} className="px-12 py-6 bg-white/5 rounded-[2rem] font-black uppercase tracking-widest text-xs">Back</button>
                <button
                  onClick={() => handleGenerate()}
                  disabled={!description.trim() && !isYouTubeUrl(linkURL)}
                  className="px-12 py-6 bg-white text-stone-900 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                >
                  <Sparkles size={20} />
                  Assemble Trim
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ASSEMBLY */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-12">
              <div className="space-y-4 text-center">
                <Badge color="yellow">Step 3</Badge>
                <h2 className="text-5xl font-black uppercase tracking-tighter italic">Neural Assembly</h2>
                <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Review your generated Trim Card</p>
              </div>

              <div className="max-w-xl mx-auto">
                {isGenerating ? (
                  <div className="py-24 flex flex-col items-center justify-center space-y-8 text-center">
                    <div className="relative">
                      <div className="w-32 h-32 border-8 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                      <PlayCircle size={48} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                       <p className="font-black uppercase tracking-[0.3em] text-emerald-400 animate-pulse">Analyzing Frames</p>
                       <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Generating Metadata & Thumbnails...</p>
                    </div>
                  </div>
                ) : generatedTrim ? (
                  <div className="space-y-8">
                    <div className="relative aspect-[9/16] rounded-[2rem] overflow-hidden bg-stone-900 shadow-2xl border-[12px] border-white group">
                      {video ? (
                        <video src={video} className="w-full h-full object-cover" autoPlay loop muted />
                      ) : (
                        <img src={generatedTrim.thumbnailUrl || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800'} alt="Trim preview" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                      <div className="absolute top-8 left-8">
                        <Badge color="yellow">AI Trim Ready</Badge>
                      </div>

                      <div className="absolute bottom-12 left-10 right-24 text-white space-y-4">
                        <h3 className="text-3xl font-black uppercase tracking-tighter leading-tight">{generatedTrim.title}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/70">@{generatedTrim.author || 'FUZO AI Studio'}</p>
                        <p className="text-xs font-bold text-white/80 line-clamp-2">{generatedTrim.caption}</p>
                      </div>

                      <div className="absolute right-8 bottom-32 flex flex-col gap-8 text-white items-center">
                        <div className="flex flex-col items-center gap-1">
                          <Heart size={32} className="fill-white" />
                          <span className="text-[10px] font-black">{generatedTrim.likes || '1.2k'}</span>
                        </div>
                        <Share2 size={32} />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => handleFinish('save')}
                        className="flex-grow py-6 bg-stone-900 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl"
                      >
                        <Bookmark size={20} /> Save to Plate
                      </button>
                      <button
                        onClick={() => handleFinish('share')}
                        className="p-6 bg-stone-100 text-stone-900 rounded-[2.5rem] hover:bg-emerald-400 transition-all"
                      >
                        <Share2 size={24} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-12 text-center py-12">
              <div className="w-40 h-40 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-[0_0_60px_rgba(16,185,129,0.3)] mx-auto mb-12">
                <Check size={80} strokeWidth={4} />
              </div>

              <div className="space-y-4">
                <h2 className="text-6xl font-black uppercase tracking-tighter italic">Trim Sync Complete</h2>
                <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Your AI Trim Card has been locked in</p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <button
                  onClick={() => !isPostingToFeed && !feedPostSuccess && handleFinish('feed')}
                  disabled={isPostingToFeed || feedPostSuccess}
                  className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl flex items-center justify-center gap-4 border-4 transition-all ${
                    feedPostSuccess 
                      ? 'bg-emerald-500 text-white border-emerald-400' 
                      : 'bg-stone-900 text-white border-emerald-500/20'
                  } ${isPostingToFeed ? 'opacity-80' : 'hover:scale-[1.02]'}`}
                >
                  {isPostingToFeed ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : feedPostSuccess ? (
                    <Check size={20} />
                  ) : (
                    <Send size={20} />
                  )}
                  {isPostingToFeed ? 'Syndicating...' : feedPostSuccess ? 'Posted to Feed' : 'Post to Fuzo Feed'}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-6 bg-white text-stone-900 rounded-[2rem] font-black uppercase tracking-widest text-xs"
                >
                  Back to Studio
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const TrimsView = ({ onSave, onShareRequest, authUser }: { onSave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void; authUser: AuthUser | null; }) => {
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);
  const [activeVibe, setActiveVibe] = useState<string | null>(null);
  const [items, setItems] = useState<AppItem[]>([]);
  const isEmbeddableYouTubeId = (videoId: string) => /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  const buildTrimEmbedUrl = (videoId: string, autoplay: boolean) => (
    `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&mute=1&playsinline=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1`
  );

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (activeCuisine && item.cat !== activeCuisine) return false;
      if (activeVibe) {
        const itemTags = Array.isArray(item.metadata?.tags) ? item.metadata.tags : [];
        if (!itemTags.includes(activeVibe)) return false;
      }
      return true;
    });
  }, [items, activeCuisine, activeVibe]);

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
      <div className="h-[80vh] w-full max-w-md mx-auto rounded-[1.75rem] bg-stone-900 shadow-2xl border-4 border-white flex items-center justify-center text-white font-black uppercase tracking-widest text-xs">
        Loading Trims...
      </div>
    );
  }

  return (
    <div className="h-[80vh] w-full max-w-md mx-auto relative">
      <div className="absolute top-6 right-6 z-30 px-4 py-2 bg-black/35 border border-white/20 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest backdrop-blur-md">
        {feedSourceLabel} • {locationLabel}
      </div>

      <div ref={trimsScrollRootRef} className="h-full w-full relative snap-y snap-mandatory overflow-y-auto hide-scrollbar rounded-[1.75rem] bg-stone-900 shadow-2xl border-4 border-white">
      {serviceError && (
        <div className="absolute top-4 left-4 right-4 z-30 px-4 py-3 bg-yellow-50/95 border border-yellow-100 rounded-2xl text-[12px] font-bold text-yellow-800 backdrop-blur-sm">
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
                <>
                  <iframe
                    src={buildTrimEmbedUrl(videoId, true)}
                    title={v.title || 'Trim video'}
                    className="w-full h-full object-cover"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                  {/* Video Progress Indicator */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 overflow-hidden z-20">
                    <div className="h-full bg-yellow-400 animate-progress-fill origin-left" style={{ width: '100%' }} />
                  </div>
                </>
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
                <p className="text-[12px] font-black uppercase tracking-widest">@{v.author}</p>
             </div>
          </div>
          <div className="absolute right-6 bottom-32 flex flex-col gap-8 text-white items-center">
            <button onClick={() => handleSaveVideo(v)} className="flex flex-col items-center gap-1 hover:scale-110 transition-transform">
              <Heart size={28} className="fill-white" />
              <span className="text-[12px] font-black">{v.likes}</span>
            </button>
            <button className="flex flex-col items-center gap-1"><MessageSquare size={28} /><span className="text-[12px] font-black">2k</span></button>
            <button onClick={() => handleShareVideo(v)} className="flex flex-col items-center gap-1"><Share2 size={28} /></button>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center animate-spin-slow"><Music2 size={20} /></div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};