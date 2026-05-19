/**
 * ============================================================================
 * FEED VIEW — AI Discovery Engine
 * ============================================================================
 * 
 * Architecture:
 * - Local-First Discovery: Attempts to fetch real-time personalized content 
 *   via FeedService, but falls back to 'LOCAL_CURATED_FEED_ITEMS' if offline 
 *   or service is disabled.
 * - Multi-Persona Personalization: Fetches user metadata from Supabase 
 *   (Cuisine DNA) to tailor the feed.
 * - Dual Experience Engine:
 *   1. Desktop: "The Dealer" — Batch-based card dealing.
 *   2. Mobile: "The Shuffler" — Stacked swipe interaction.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, X, Heart, Share2, Bookmark } from 'lucide-react';
import { useIsDesktop } from '../../../app/hooks/useIsDesktop';
import { FeedService } from '../services/feedService';
import { getUserFeedLocation } from '../services/feedLocation';
import { supabase } from '../../../services/supabaseClient';
import { 
  normalizeFeedServiceToCards, 
  logFeedParity 
} from '../lib/feedNormalization';
import { FEED_USE_SERVICE } from '../constants/config';
import { LOCAL_CURATED_FEED_ITEMS } from '../constants/curatedFeed';
import { shouldApplyLatestRequest } from '../../../shared/utils/async';
import { Badge } from '../../../shared/ui/Badge';
import { AppItem } from '../../../shared/types/appItem';
import { FeedUiItem } from '../types/feedUi';
import { DealCard } from './DealCard';
import { SwipeCard, SwipeCardRef } from './SwipeCard';
import { SavedItemDetailModal } from '../../profile/components/SavedItemDetailModal';

export const FeedView = ({ 
  onSave, 
  onShareRequest, 
  onOpenUserProfile 
}: { 
  onSave: (item: AppItem) => void, 
  onShareRequest: (item: AppItem) => void, 
  onOpenUserProfile: (userId: string) => void 
}) => {
  // --- STATE: Discovery Logic ---
  const [items, setItems] = useState<FeedUiItem[]>([]);
  const [feedSource, setFeedSource] = useState<'local' | 'feedService'>('feedService');
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string>('');

  // --- STATE: UI Orchestration ---
  const [batchIndex, setBatchIndex] = useState(0); // For desktop dealing
  const [batchVisible, setBatchVisible] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<AppItem | null>(null);
  const [userPreferences, setUserPreferences] = useState<{ cuisines?: string[], dietary?: string[], profileType?: string } | null>(null);

  // --- REFS: Performance & Safety ---
  const isDesktop = useIsDesktop();
  const feedRequestSeqRef = useRef(0);
  const feedRetryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedMountedRef = useRef(true);
  const missingAuthorTelemetryRef = useRef<Set<string>>(new Set());
  const activeCardRef = useRef<SwipeCardRef | null>(null);

  const triggerSwipe = (dir: 'left' | 'right' | 'up' | 'down') => {
    if (activeCardRef.current) {
      activeCardRef.current.swipe(dir);
    } else {
      handleSwipe(dir);
    }
  };

  useEffect(() => {
    return () => {
      feedMountedRef.current = false;
      if (feedRetryDebounceRef.current) {
        clearTimeout(feedRetryDebounceRef.current);
      }
    };
  }, []);

  /**
   * SECTION: Feed Generation Engine
   * Orchestrates location, user persona, and remote service calls.
   * 
   * @param isRetry - Force a remote fetch even if local fallback was previously used.
   */
  const fetchFromFeedService = async (isRetry = false) => {
    // 0. Fallback Strategy: Immediate resolution for development/fallback modes
    if (!FEED_USE_SERVICE && !isRetry) {
      console.log('🍽️ [FeedView] Service disabled by config, loading local curated items');
      setItems(LOCAL_CURATED_FEED_ITEMS);
      setFeedSource('local');
      setFeedLoading(false);
      return;
    }

    setFeedLoading(true);
    setFeedError('');
    const requestSeq = ++feedRequestSeqRef.current;
    console.log(`🍽️ [FeedView] Request #${requestSeq} started (isRetry: ${isRetry})`);

    try {
      // 1. Contextual Signals: Geolocation for proximity-based food.
      const userLocation = await getUserFeedLocation();
      
      // 2. Persona Resolution: Only hydyrate preferences once per session for performance.
      let prefs = userPreferences;
      if (!prefs && !isRetry) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('users')
              .select('cuisine_preferences, dietary_preferences, profile_type')
              .eq('id', user.id)
              .single();
            
            if (profile) {
              prefs = {
                cuisines: profile.cuisine_preferences || [],
                dietary: profile.dietary_preferences || [],
                profileType: profile.profile_type
              };
              setUserPreferences(prefs);
            }
          }
        } catch (e) {
          console.warn('[FeedView] Preference resolution failed; proceed with generic feed', e);
        }
      }

      // 3. Synthesis: Call the edge function / service for personalized cards.
      const feedCards = await FeedService.generateFeed({
        userLocation,
        preferences: prefs || undefined,
        pageSize: 12
      });

      console.log(`🍽️ [FeedView] Service returned ${feedCards.length} candidates.`);
      // 4. Normalization: Streamline raw AI output into FUZO-standard Card models.
      const adaptedCards = normalizeFeedServiceToCards(feedCards);
      console.log(`🍽️ [FeedView] Normalization Result: ${adaptedCards.length} UI cards.`);

      const isLatestRequest = shouldApplyLatestRequest(feedMountedRef, requestSeq, feedRequestSeqRef);

      if (isLatestRequest) {
        if (adaptedCards.length > 0) {
          setItems(adaptedCards);
          setBatchIndex(0);
          setFeedSource('feedService');
          setFeedError('');
        } else {
          // Empty result handling
          if (!isRetry) {
            console.log('🍽️ [FeedView] No results from normalization, using local fallback');
            setItems(LOCAL_CURATED_FEED_ITEMS);
            setFeedSource('local');
            setFeedError('');
          } else {
            setItems([]);
            setBatchIndex(0);
            setFeedSource('feedService');
            setFeedError('Feed returned no results.');
          }
        }
      }
    } catch (error) {
      // Error Recovery: Pivot to curated data instantly to maintain UI engagement.
      console.error('FeedService fetch failed:', error);
      const isLatestRequest = shouldApplyLatestRequest(feedMountedRef, requestSeq, feedRequestSeqRef);
      if (isLatestRequest) {
        if (!isRetry) {
          setItems(LOCAL_CURATED_FEED_ITEMS);
          setFeedSource('local');
          setFeedError('');
        } else {
          setItems([]);
          setBatchIndex(0);
          setFeedSource('feedService');
          setFeedError('Feed service connection failed.');
        }
      }
    } finally {
      const isLatestRequest = shouldApplyLatestRequest(feedMountedRef, requestSeq, feedRequestSeqRef);
      if (isLatestRequest) {
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

  // Visual Animation Sync
  useEffect(() => {
    setBatchVisible(false);
    const frameId = requestAnimationFrame(() => setBatchVisible(true));
    return () => cancelAnimationFrame(frameId);
  }, [batchIndex]);

  const BATCH_SIZE = 3;

  /**
   * SECTION: Identity Logic
   * Resolves the Supabase User ID from various metadata schemas used by different item types.
   */
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

  // Profile Handoff: Triggers transition to an author's profile view.
  const handleOpenFeedAuthor = useCallback((item: AppItem) => {
    const authorId = resolveItemUserId(item);
    if (!authorId) {
      return; // Silently skip if no ID (bot/generic content)
    }
    onOpenUserProfile(authorId);
  }, [onOpenUserProfile, resolveItemUserId]);

  // Desktop Batch Logic
  const currentBatch = useMemo(() => {
    if (items.length === 0) return [];
    const size = Math.min(BATCH_SIZE, items.length);
    return Array.from({ length: size }, (_, offset) => items[(batchIndex + offset) % items.length]);
  }, [items, batchIndex]);

  const handleAction = (action: string, item: AppItem) => {
    if (item?.itemType === 'ad' || item?.itemType === 'trivia') return;

    if (action === 'save') onSave(item);
    if (action === 'share') onShareRequest(item);
    if (action === 'expand') setSelectedItemForDetail(item);
  };

  /**
   * SECTION: Interaction Engines
   */

  // Mobile Swipe Logic: Pops items off the stack.
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

  // Desktop Dealing Logic: Cycles through batches.
  const dealNext = () => {
    if (items.length === 0) return;
    setBatchIndex(prev => (prev + BATCH_SIZE) % items.length);
  };

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
          <button onClick={handleRetryFeed} className="px-8 py-4 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[12px]">Retry Feed</button>
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
           <button onClick={handleRetryFeed} className="px-6 py-3 bg-stone-900 text-white rounded-2xl font-black uppercase text-[12px] tracking-widest">Retry Feed</button>
        </div>
      );
    }

    return (
      <div className="h-full w-full flex flex-col">
        <div className="relative flex-grow h-full">
          {items.map((item, i) => {
            const isAdOrTrivia = item.itemType === 'ad' || item.itemType === 'trivia';
            return (
              <SwipeCard 
                key={item.id} 
                ref={i === 0 ? activeCardRef : undefined} 
                active={i === 0} 
                onSwipe={handleSwipe}
              >
                <div 
                  className="w-full h-full relative"
                  onClick={() => i === 0 && !isAdOrTrivia && handleAction('expand', item)}
                >
                  <img
                    src={item.img}
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800';
                    }}
                  />
                {!isAdOrTrivia && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent" />
                    
                    {/* Floating Profile Context */}
                    <div className="absolute top-6 left-6 flex items-center gap-3 text-white z-20">
                      <div className="w-12 h-12 rounded-full border-2 border-white/50 overflow-hidden bg-stone-800 shadow-xl flex-shrink-0">
                        <img 
                          src={item.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author || 'U')}&background=EAB308&color=fff&bold=true`} 
                          alt={item.author} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-lg tracking-tight leading-none mb-1 truncate">{item.author || 'Anonymous'}</h4>
                        <p className="text-[8px] uppercase font-black tracking-[0.2em] text-white/60">Food reviewer</p>
                      </div>
                    </div>

                    <div className="absolute bottom-10 left-10 right-10 text-white">
                      <h3 className="text-4xl font-black uppercase tracking-tighter mb-2 leading-none">{item.name}</h3>
                      <Badge color="yellow">{item.cat}</Badge>
                    </div>
                  </>
                )}
                </div>
              </SwipeCard>
            );
          })}
        </div>
        
      </div>
    );
  };

  /**
   * SECTION: Final Render (Responsive Split)
   */

  if (isDesktop) {
    return (
      <div className="flex flex-col items-center gap-12 animate-in fade-in py-10 w-full max-w-6xl mx-auto">
        {renderDesktopFeedContent()}
        
        <button 
          onClick={dealNext}
          disabled={items.length === 0 || feedLoading}
          className="px-8 py-4 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-transform shadow-2xl active:scale-95 text-sm"
        >
          <RefreshCw size={20} /> Deal Next Hand
        </button>
        {!!feedError && (
          <div className="text-[12px] font-black uppercase tracking-widest text-red-500">{feedError}</div>
        )}

        {selectedItemForDetail && (
          <SavedItemDetailModal 
            item={selectedItemForDetail}
            onClose={() => setSelectedItemForDetail(null)}
            onSave={onSave}
            onShareRequest={onShareRequest}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 animate-in fade-in py-2">
      <div className="w-full max-w-sm px-4 hidden md:block">
        <Badge color="yellow">Discovery</Badge>
        <h2 className="text-4xl font-black uppercase tracking-tighter mt-1">Feed</h2>
        {feedSource === 'local' && (
          <p className="text-[12px] font-black uppercase tracking-widest text-stone-500 mt-2">Curated Feed Fallback Active</p>
        )}
      </div>
      <div className="relative w-full max-w-[380px] h-[58vh] max-h-[520px] overflow-hidden shadow-[0_24px_50px_-12px_rgba(0,0,0,0.25)] rounded-[2rem] border border-stone-200/50 bg-white">
        {renderMobileFeedContent()}
      </div>

      {/* Floating Consolidated FAB Controls (10.3) */}
      {items.length > 0 && !feedLoading && (
        <div className="flex items-center gap-6 px-6 py-4 rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg mt-2">
          {/* Dislike / Skip Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerSwipe('left')}
            className="w-14 h-14 rounded-full bg-white shadow-md border border-stone-100 flex items-center justify-center text-stone-500 hover:text-red-500 transition-colors cursor-pointer"
            aria-label="Skip dish"
          >
            <X size={24} strokeWidth={3} />
          </motion.button>

          {/* Save / Like Button */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerSwipe('down')}
            className="w-16 h-16 rounded-full bg-yellow-400 shadow-lg flex items-center justify-center text-stone-900 hover:bg-yellow-500 transition-all cursor-pointer"
            aria-label="Save dish"
          >
            <Bookmark size={28} strokeWidth={2.5} />
          </motion.button>

          {/* Share Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerSwipe('up')}
            className="w-14 h-14 rounded-full bg-white shadow-md border border-stone-100 flex items-center justify-center text-stone-500 hover:text-blue-500 transition-colors cursor-pointer"
            aria-label="Share dish"
          >
            <Share2 size={22} strokeWidth={2.5} />
          </motion.button>
        </div>
      )}

      {!!feedError && (
        <div className="text-[12px] font-black uppercase tracking-widest text-red-500 px-4 text-center">{feedError}</div>
      )}

      {selectedItemForDetail && (
        <SavedItemDetailModal 
          item={selectedItemForDetail}
          onClose={() => setSelectedItemForDetail(null)}
          onSave={onSave}
          onShareRequest={onShareRequest}
        />
      )}
    </div>
  );
};
