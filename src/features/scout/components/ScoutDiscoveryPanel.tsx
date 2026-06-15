import React, { useState, useRef, useCallback } from 'react';
import { Star, ChevronRight, ChevronUp, MapPin } from 'lucide-react';
import { ScoutPlace, ScoutFilter } from '../types/scoutUi';
import { getMatchPercentage } from '../lib/scoutLogic';

interface ScoutDiscoveryPanelProps {
  places: ScoutPlace[];
  onPlaceSelect: (place: ScoutPlace) => void;
  filter: ScoutFilter;
  onFilterChange: (filter: ScoutFilter) => void;
  onDistanceChangeEnd: () => void;
  onClose: () => void;
}

const MARKER_COLORS: Record<string, string> = {
  google: 'bg-blue-500',
  fuzo: 'bg-yellow-400',
  saved: 'bg-emerald-500',
};

const SOURCE_LABELS: Record<string, string> = {
  google: 'Nearby',
  fuzo: 'FUZO',
  saved: 'Saved',
};

export const ScoutDiscoveryPanel = ({ 
  places, 
  onPlaceSelect, 
  filter, 
  onFilterChange, 
  onDistanceChangeEnd,
  onClose,
}: ScoutDiscoveryPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const filterOptions: { id: ScoutFilter['type'], label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'top', label: 'Top Rated' },
    { id: 'open', label: 'Open Now' },
    { id: 'distance', label: 'Distance' }
  ];

  // --- Drag handlers for mobile bottom sheet ---
  const handleDragStart = useCallback((clientY: number) => {
    setDragStartY(clientY);
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((clientY: number) => {
    setIsDragging(false);
    const delta = dragStartY - clientY;
    if (delta > 50) {
      setIsExpanded(true);
    } else if (delta < -50) {
      setIsExpanded(false);
    }
  }, [dragStartY]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  }, [handleDragStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    handleDragEnd(e.changedTouches[0].clientY);
  }, [handleDragEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleDragStart(e.clientY);
  }, [handleDragStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging) handleDragEnd(e.clientY);
  }, [isDragging, handleDragEnd]);

  return (
    <>
      {/* ══════════════════════════════════════════════════════════ */}
      {/* MOBILE: Bottom Sheet                                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div 
        ref={panelRef}
        className={`md:hidden fixed inset-x-0 bottom-0 z-20 bg-white rounded-t-[1.75rem] shadow-[0_-4px_30px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out ${
          isExpanded ? 'h-[65vh]' : 'h-[160px]'
        }`}
        style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      >
        {/* Drag Handle */}
        <div 
          className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={() => setIsExpanded(prev => !prev)}
        >
          <div className="w-10 h-1 bg-stone-200 rounded-full" />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
              {places.length} places nearby
            </span>
            <ChevronUp size={14} className={`text-stone-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Distance Slider */}
        <div className="flex items-center gap-4 px-4 py-3 shrink-0">
          <span className="text-[11px] font-bold text-stone-500 whitespace-nowrap w-24">Radius: {(filter.maxDistance / 1000).toFixed(1)}km</span>
          <input 
            type="range" 
            min="500" 
            max="10000" 
            step="500" 
            value={filter.maxDistance} 
            onChange={(e) => onFilterChange({...filter, maxDistance: parseInt(e.target.value)})}
            onMouseUp={onDistanceChangeEnd}
            onTouchEnd={onDistanceChangeEnd}
            className="w-full accent-blue-500 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer" 
          />
        </div>

        {/* Place List */}
        <div className="overflow-y-auto hide-scrollbar px-4 pb-4 space-y-2" style={{ height: isExpanded ? 'calc(100% - 110px)' : '60px' }}>
          {places.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[12px] font-bold text-stone-400">No spots found in this area</p>
            </div>
          ) : (
            places.map((place) => (
              <PlaceCard key={place.id} place={place} onSelect={onPlaceSelect} />
            ))
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* DESKTOP: Floating Side Panel                              */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex absolute top-20 left-6 z-10 w-[380px] max-h-[calc(100vh-160px)] flex-col bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-stone-100/80 overflow-hidden">
        {/* Distance Slider */}
        <div className="flex items-center gap-4 p-4 border-b border-stone-50 shrink-0">
          <span className="text-[11px] font-bold text-stone-500 whitespace-nowrap w-24">Radius: {(filter.maxDistance / 1000).toFixed(1)}km</span>
          <input 
            type="range" 
            min="500" 
            max="10000" 
            step="500" 
            value={filter.maxDistance} 
            onChange={(e) => onFilterChange({...filter, maxDistance: parseInt(e.target.value)})}
            onMouseUp={onDistanceChangeEnd}
            onTouchEnd={onDistanceChangeEnd}
            className="w-full accent-blue-500 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer" 
          />
        </div>

        {/* Place count */}
        <div className="px-4 py-2.5 border-b border-stone-50 shrink-0">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
            {places.length} places discovered
          </p>
        </div>

        {/* Place List */}
        <div className="overflow-y-auto hide-scrollbar px-3 py-2 space-y-1.5 flex-grow">
          {places.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[12px] font-bold text-stone-400">No spots found in this area</p>
            </div>
          ) : (
            places.map((place) => (
              <PlaceCard key={place.id} place={place} onSelect={onPlaceSelect} />
            ))
          )}
        </div>
      </div>
    </>
  );
};

// --- Place Card ---

const PlaceCard = ({ place, onSelect }: { place: ScoutPlace; onSelect: (p: ScoutPlace) => void }) => {
  const source = place.markerSource || 'google';
  const dotColor = MARKER_COLORS[source] || 'bg-blue-500';
  const sourceLabel = SOURCE_LABELS[source] || 'Nearby';

  return (
    <button
      onClick={() => onSelect(place)}
      className="w-full group text-left bg-white hover:bg-stone-50 rounded-2xl p-3 border border-stone-100/60 hover:border-stone-200 shadow-sm hover:shadow transition-all flex gap-3 items-center"
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-sm border border-stone-100 group-hover:scale-105 transition-transform">
        <img src={place.img} alt={place.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-[13px] text-stone-900 truncate leading-tight">{place.name}</h3>
          <div className="flex items-center gap-1 text-yellow-500 shrink-0">
            <Star size={11} fill="currentColor" />
            <span className="text-[11px] font-bold text-stone-600">{place.rating}</span>
          </div>
        </div>
        <p className="text-[11px] text-stone-400 mt-0.5 truncate">{place.cat}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex items-center gap-1 text-stone-500">
            <span className="text-[11px] font-medium">{place.distanceText || '...'}</span>
          </div>
        </div>
      </div>
      <ChevronRight size={14} className="text-stone-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
    </button>
  );
};
