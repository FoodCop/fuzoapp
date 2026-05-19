import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { X, MapPin, Bookmark, Share2, PlayCircle, Play } from 'lucide-react';

import type { AppItem } from '../../../shared/types/appItem';
import { Badge } from '../../../shared/ui/Badge';
import { useModalSwipeToClose } from '../hooks/useModalSwipeToClose';
import { 
  getMetadataRecord, 
  getMetadataString, 
  getMetadataStringArray, 
  getMetadataNumber, 
  getNutritionRecord 
} from '../../../shared/lib/metadata';
import { 
  inferItemTypeFromId, 
  areSavedItemsEquivalent 
} from '../../plate/lib/savedItems';
import { extractYouTubeId } from '../../../shared/lib/videoHelpers';


const SavedActionFooter = ({
  canSave,
  isAlreadySaved,
  onSaveClick,
  onUnsaveClick,
  onShareClick,
  itemType,
}: {
  canSave: boolean;
  isAlreadySaved: boolean;
  onSaveClick: () => void;
  onUnsaveClick?: () => void;
  onShareClick?: () => void;
  itemType?: string;
}) => {
  if (!canSave && !onUnsaveClick && !onShareClick) {
    return null;
  }

  let primaryAction: React.ReactNode = null;
  if (isAlreadySaved && onUnsaveClick) {
    primaryAction = (
      <button
        type="button"
        onClick={onUnsaveClick}
        className="flex-1 py-4 rounded-[1.5rem] flex items-center justify-center gap-3 transition-colors shadow-xl bg-red-600 hover:bg-red-700 text-white font-extrabold active:scale-95 cursor-pointer"
      >
        <X size={20} />
        <span className="font-black uppercase tracking-widest text-[12px]">Remove</span>
      </button>
    );
  } else if (canSave) {
    const isMapItem = itemType === 'photo' || itemType === 'restaurant' || itemType === 'spot';
    primaryAction = (
      <button
        type="button"
        onClick={onSaveClick}
        className="flex-1 py-4 rounded-[1.5rem] flex items-center justify-center gap-3 transition-transform shadow-xl bg-stone-900 text-white active:scale-95"
      >
        {isMapItem ? <MapPin size={20} /> : <Bookmark size={20} />}
        <span className="font-black uppercase tracking-widest text-[12px]">
          {isMapItem ? 'Add to Map' : 'Save'}
        </span>
      </button>
    );
  }

  return (
    <footer className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-2">
      <div className="flex gap-3">
        {primaryAction}
        {onShareClick && (
          <button
            type="button"
            onClick={onShareClick}
            className="flex-1 py-4 bg-yellow-400 text-stone-900 rounded-[1.5rem] flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-xl"
          >
            <Share2 size={20} />
            <span className="font-black uppercase tracking-widest text-[12px]">Share</span>
          </button>
        )}
      </div>
    </footer>
  );
};

const SavedRecipeSections = ({
  recipeIngredients,
  recipeInstructions,
  nutrition,
}: {
  recipeIngredients: string[];
  recipeInstructions: string;
  nutrition?: { calories?: number; protein?: number; fat?: number; carbs?: number };
}) => {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions' | 'nutrition'>('ingredients');

  const steps = recipeInstructions
    ? recipeInstructions
        .split(/\r?\n/)
        .map((step) => step.trim())
        .filter((step) => step.length > 0)
        .map((step) => step.replace(/^\d+[\.\s\-)]+\s*/, '').trim())
        .filter((step) => step.length > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Premium Dynamic Tab Selector */}
      <div className="flex p-1 bg-stone-100 rounded-2xl border border-stone-200/50">
        <button
          type="button"
          onClick={() => setActiveTab('ingredients')}
          className={`flex-grow py-3 px-4 rounded-[1rem] text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === 'ingredients'
              ? 'bg-yellow-400 shadow-sm text-white font-extrabold'
              : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          Ingredients
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('instructions')}
          className={`flex-grow py-3 px-4 rounded-[1rem] text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === 'instructions'
              ? 'bg-yellow-400 shadow-sm text-white font-extrabold'
              : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          Instructions
        </button>
        {nutrition && (
          <button
            type="button"
            onClick={() => setActiveTab('nutrition')}
            className={`flex-grow py-3 px-4 rounded-[1rem] text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'nutrition'
                ? 'bg-yellow-400 shadow-sm text-white font-extrabold'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            Nutrition
          </button>
        )}
      </div>

      <div className="min-h-[200px]">
        {activeTab === 'ingredients' && (
          <section className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <h4 className="font-black uppercase text-[12px] tracking-[0.25em] text-stone-400">Ingredients</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {recipeIngredients.length > 0 ? (
                recipeIngredients.map((ingredient) => (
                  <div key={ingredient} className="p-4 bg-stone-50 rounded-[1.5rem] border border-stone-100 text-sm font-bold text-stone-700 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                    <span>{ingredient}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm font-bold text-stone-400 italic col-span-2">No ingredients loaded.</p>
              )}
            </div>
          </section>
        )}

        {activeTab === 'instructions' && (
          <section className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <h4 className="font-black uppercase text-[12px] tracking-[0.25em] text-stone-400">Instructions</h4>
            {steps.length > 0 ? (
              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-stone-50 rounded-[1.75rem] border border-stone-100/50 text-sm font-bold text-stone-700 leading-relaxed items-start">
                    <div className="w-7 h-7 rounded-full bg-yellow-400 text-stone-900 font-black flex items-center justify-center text-[11px] shrink-0 shadow-sm border border-white">
                      {idx + 1}
                    </div>
                    <div className="pt-0.5">{step}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-stone-400 italic">No instructions available.</p>
            )}
          </section>
        )}

        {activeTab === 'nutrition' && nutrition && (
          <section className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <h4 className="font-black uppercase text-[12px] tracking-[0.25em] text-stone-400">Nutrition Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Calories', value: nutrition.calories },
                { label: 'Protein', value: nutrition.protein },
                { label: 'Fat', value: nutrition.fat },
                { label: 'Carbs', value: nutrition.carbs },
              ].map((entry) => (
                <div key={entry.label} className="p-4 bg-stone-50 rounded-[1.5rem] border border-stone-100">
                  <p className="text-xl font-black text-stone-900">{entry.value ?? '--'}</p>
                  <p className="text-[12px] font-black uppercase tracking-widest text-stone-400 mt-1">{entry.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

const SavedVideoSection = ({
  keyFoodItem,
  summary,
  sourceUrl,
}: {
  keyFoodItem: string;
  summary: string;
  sourceUrl: string;
}) => {
  if (!keyFoodItem && !summary && !sourceUrl) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h4 className="font-black uppercase text-[12px] tracking-[0.25em] text-stone-400">Trim Details</h4>
      <div className="p-5 bg-stone-50 rounded-[2rem] border border-stone-100 space-y-3 text-sm font-bold text-stone-700">
        {keyFoodItem && <p><span className="text-stone-400 uppercase tracking-widest text-[12px] mr-2">Key Food</span>{keyFoodItem}</p>}
        {summary && <p>{summary}</p>}
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:underline">
            <PlayCircle size={16} /> Open Source
          </a>
        )}
      </div>
    </section>
  );
};

const SavedGenericDetailsSection = ({
  phone,
  sourceUrl,
  vibe,
}: {
  phone: string;
  sourceUrl: string;
  vibe: string[];
}) => {
  if (!phone && !sourceUrl && vibe.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h4 className="font-black uppercase text-[12px] tracking-[0.25em] text-stone-400">Details</h4>
      <div className="p-5 bg-stone-50 rounded-[2rem] border border-stone-100 space-y-4 text-sm font-bold text-stone-700">
        {phone && <p><span className="text-stone-400 uppercase tracking-widest text-[12px] mr-2">Phone</span>{phone}</p>}
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:underline">
            <MapPin size={16} /> Open Link
          </a>
        )}
        {vibe.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {vibe.map((entry) => (
              <div key={entry} className="px-3 py-2 bg-white rounded-full border border-stone-200 text-[12px] font-black uppercase tracking-widest text-stone-600">
                {entry}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const SavedNutritionSection = ({
  nutrition,
}: {
  nutrition?: { calories?: number; protein?: number; fat?: number; carbs?: number };
}) => {
  if (!nutrition) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h4 className="font-black uppercase text-[12px] tracking-[0.25em] text-stone-400">Nutrition</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Calories', value: nutrition.calories },
          { label: 'Protein', value: nutrition.protein },
          { label: 'Fat', value: nutrition.fat },
          { label: 'Carbs', value: nutrition.carbs },
        ].map((entry) => (
          <div key={entry.label} className="p-4 bg-stone-50 rounded-[1.5rem] border border-stone-100">
            <p className="text-xl font-black text-stone-900">{entry.value ?? '--'}</p>
            <p className="text-[12px] font-black uppercase tracking-widest text-stone-400 mt-1">{entry.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const SavedContentSections = ({
  resolvedType,
  address,
  recipeIngredients,
  recipeInstructions,
  keyFoodItem,
  summary,
  sourceUrl,
  phone,
  vibe,
  nutrition,
}: {
  resolvedType: string;
  address: string;
  recipeIngredients: string[];
  recipeInstructions: string;
  keyFoodItem: string;
  summary: string;
  sourceUrl: string;
  phone: string;
  vibe: string[];
  nutrition?: { calories?: number; protein?: number; fat?: number; carbs?: number };
}) => {
  return (
    <>
      {address && (
        <section className="space-y-3">
          <h4 className="font-black uppercase text-[12px] tracking-[0.25em] text-stone-400">Location</h4>
          <div className="flex items-start gap-3 p-5 bg-stone-50 rounded-[2rem] border border-stone-100 text-stone-700">
            <MapPin size={18} className="shrink-0 mt-0.5 text-stone-400" />
            <p className="text-sm font-bold leading-relaxed">{address}</p>
          </div>
        </section>
      )}

      {resolvedType === 'recipe' && (
        <SavedRecipeSections 
          recipeIngredients={recipeIngredients} 
          recipeInstructions={recipeInstructions} 
          nutrition={nutrition} 
        />
      )}
      {resolvedType === 'video' && <SavedVideoSection keyFoodItem={keyFoodItem} summary={summary} sourceUrl={sourceUrl} />}
      {(resolvedType === 'restaurant' || resolvedType === 'other' || resolvedType === 'photo') && <SavedGenericDetailsSection phone={phone} sourceUrl={sourceUrl} vibe={vibe} />}
      {resolvedType !== 'recipe' && <SavedNutritionSection nutrition={nutrition} />}
    </>
  );
};

export const SavedItemDetailModal = ({ item, onClose, onSave, onUnsave, onShareRequest, savedItems = [] }: { item: AppItem; onClose: () => void; onSave?: (item: AppItem) => void; onUnsave?: (item: AppItem) => void; onShareRequest?: (item: AppItem) => void; savedItems?: AppItem[] }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const metadata = getMetadataRecord(item.metadata);

  const generatedRecipe = getMetadataRecord(metadata?.generatedRecipe);
  const generatedTrim = getMetadataRecord(metadata?.generatedTrim);
  const nutrition = getNutritionRecord(
    getMetadataRecord(generatedRecipe?.nutrition),
    getMetadataRecord(generatedTrim?.nutrition),
    getMetadataRecord(metadata?.nutrition),
    getMetadataRecord(item.nutrition),
  );
  let resolvedType = 'other';
  if (typeof item.itemType === 'string' && item.itemType) {
    resolvedType = item.itemType;
  } else if (typeof item.id === 'string') {
    resolvedType = inferItemTypeFromId(item.id);
  }
  const title = item.name || item.title || getMetadataString(metadata, 'title', 'name') || 'Saved Item';
  const category = item.cat || getMetadataString(metadata, 'cat', 'category') || 'Saved Item';
  const imageSrc = item.img || item.image || item.imageUrl || item.thumbnailUrl || getMetadataString(metadata, 'image', 'img', 'image_url', 'thumbnailUrl') || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80';
  const summary = getMetadataString(metadata, 'description', 'caption', 'summary') || item.description || item.caption || '';
  const address = item.address || getMetadataString(metadata, 'address', 'locationName', 'location') || '';
  const sourceUrlRaw = getMetadataString(metadata, 'sourceUrl', 'website') || item.website || '';
  let sourceUrl = sourceUrlRaw;
  if (sourceUrlRaw && !sourceUrlRaw.startsWith('http')) {
    sourceUrl = `https://${sourceUrlRaw}`;
  }
  const youtubeId = useMemo(() => extractYouTubeId(sourceUrl), [sourceUrl]);

  const recipeIngredients = Array.isArray(generatedRecipe?.ingredients)
    ? generatedRecipe.ingredients.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : getMetadataStringArray(metadata, 'ingredients');
  const recipeInstructions = (typeof generatedRecipe?.instructions === 'string' && generatedRecipe.instructions) || getMetadataString(metadata, 'instructions');
  const readyInMinutes = getMetadataNumber(generatedRecipe, 'readyInMinutes') ?? getMetadataNumber(metadata, 'readyInMinutes');
  const servings = getMetadataNumber(generatedRecipe, 'servings') ?? getMetadataNumber(metadata, 'servings');
  const author = getMetadataString(metadata, 'channelTitle', 'author') || item.author || '';
  const likes = getMetadataString(metadata, 'likes') || item.likes || '';
  const keyFoodItem = getMetadataString(metadata, 'keyFoodItem');
  const trimSummary = getMetadataString(metadata, 'summary');
  const tags = getMetadataStringArray(metadata, 'cuisineTags', 'tags', 'vibe');
  const vibe = item.vibe && item.vibe.length > 0 ? item.vibe : tags;
  const rating = typeof item.rating === 'number' ? item.rating : getMetadataNumber(metadata, 'rating');
  const reviews = typeof item.reviews === 'number' ? item.reviews : getMetadataNumber(metadata, 'reviews');
  const phone = item.phone || getMetadataString(metadata, 'phone');
  const isAlreadySaved = useMemo(() => savedItems.some((savedItem) => areSavedItemsEquivalent(savedItem, item)), [item, savedItems]);
  const [isClosing, setIsClosing] = useState(false);

  const triggerClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 250);
  }, [onClose]);

  const {
    dragOffset,
    isDragging,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useModalSwipeToClose(onClose);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        triggerClose();
      }
    };

    globalThis.addEventListener('keydown', handleEscape);
    return () => globalThis.removeEventListener('keydown', handleEscape);
  }, [triggerClose]);

  const handleSaveClick = () => {
    if (!onSave || isAlreadySaved) {
      return;
    }
    onSave(item);
  };

  const handleUnsaveClick = () => {
    if (!onUnsave || !isAlreadySaved) {
      return;
    }

    onUnsave(item);
    triggerClose();
  };

  const handleShareClick = () => {
    if (!onShareRequest) {
      return;
    }
    onShareRequest(item);
    triggerClose();
  };

  return (
    <div className={`fixed inset-0 z-[140] flex items-end md:items-center justify-center p-4 pb-8 md:p-8 transition-opacity duration-250 ease-in-out ${isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in'}`}>
      <button
        type="button"
        aria-label="Close saved item details"
        className="absolute inset-0 bg-stone-900/70 backdrop-blur-xl"
        onClick={triggerClose}
      />
      <dialog
        open
        className={`relative bg-white w-full max-w-3xl max-h-[90dvh] md:max-h-[92vh] rounded-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-250 ${
          isClosing 
            ? 'opacity-0 scale-90 translate-y-8' 
            : 'opacity-100 scale-100 translate-y-0 animate-in slide-in-from-bottom-8 md:zoom-in'
        }`}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 220ms ease-out',
        }}
      >
        {/* Floating notch-safe, YouTube-proof circular glassmorphic Close Button (10.1) */}
        <button
          type="button"
          onClick={triggerClose}
          aria-label="Close saved item details"
          className="absolute top-6 right-6 z-50 p-2.5 bg-stone-950/40 text-white rounded-full backdrop-blur-xl border border-white/20 hover:bg-stone-950/60 transition-colors shadow-lg flex items-center justify-center cursor-pointer"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          aria-label="Swipe down to close"
          className="flex justify-center pt-3 pb-1 md:hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-14 h-1.5 rounded-full bg-stone-200" />
        </button>
        <div className="relative h-64 md:h-96 bg-stone-900 shrink-0 overflow-hidden">
          {isPlaying && youtubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              title={title}
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <>
              <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              {youtubeId && (
                <div 
                  className="absolute inset-0 flex items-center justify-center group cursor-pointer"
                  onClick={() => setIsPlaying(true)}
                >
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-stone-900 shadow-xl ml-1">
                      <Play size={32} fill="currentColor" />
                    </div>
                  </div>
                  <div className="absolute bottom-24 bg-stone-900/60 backdrop-blur-md px-4 py-2 rounded-full text-white text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    Watch directly in FUZO
                  </div>
                </div>
              )}
            </>
          )}
          
          {!isPlaying && (
            <div className="absolute bottom-0 inset-x-0 p-6 md:p-8 text-white space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <Badge color="yellow">{category}</Badge>
                {readyInMinutes !== undefined && (
                  <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-white/20 shadow-sm">
                    {readyInMinutes} Min
                  </span>
                )}
                {servings !== undefined && (
                  <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-white/20 shadow-sm">
                    {servings} Servings
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">{title}</h3>
                {summary && (
                  <p className="text-sm md:text-base font-bold text-white/85 max-w-2xl">{summary}</p>
                )}
              </div>
            </div>
          )}
        </div>


        <div className="p-6 md:p-8 overflow-y-auto space-y-8">
          <div className="flex flex-wrap gap-3">
            {author && (
              <div className="px-4 py-3 bg-stone-50 rounded-2xl border border-stone-100 text-xs font-black uppercase tracking-widest text-stone-500">
                @{author}
              </div>
            )}
            {likes && (
              <div className="px-4 py-3 bg-stone-50 rounded-2xl border border-stone-100 text-xs font-black uppercase tracking-widest text-stone-500">
                {likes} Likes
              </div>
            )}
            {rating !== undefined && (
              <div className="px-4 py-3 bg-stone-50 rounded-2xl border border-stone-100 text-xs font-black uppercase tracking-widest text-stone-500">
                {rating.toFixed(1)} Rating
              </div>
            )}
            {reviews !== undefined && (
              <div className="px-4 py-3 bg-stone-50 rounded-2xl border border-stone-100 text-xs font-black uppercase tracking-widest text-stone-500">
                {reviews.toLocaleString()} Reviews
              </div>
            )}
          </div>

          <SavedContentSections resolvedType={resolvedType} address={address} recipeIngredients={recipeIngredients} recipeInstructions={recipeInstructions} keyFoodItem={keyFoodItem} summary={trimSummary} sourceUrl={sourceUrl} phone={phone} vibe={vibe} nutrition={nutrition} />

          <SavedActionFooter 
            canSave={Boolean(onSave)} 
            isAlreadySaved={isAlreadySaved} 
            onSaveClick={handleSaveClick} 
            onUnsaveClick={onUnsave ? handleUnsaveClick : undefined} 
            onShareClick={onShareRequest ? handleShareClick : undefined} 
            itemType={resolvedType}
          />
        </div>
      </dialog>
    </div>
  );
};
