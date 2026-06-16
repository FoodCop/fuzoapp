import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, X, Search, Loader2 } from 'lucide-react';
import { getGoogleMaps } from '../types/scoutUi';
import { extractSuggestionText } from '../lib/scoutLogic';

interface ScoutRoutePlannerProps {
  onCalculateRoute: (origin: string, destination: string) => Promise<void>;
  onClear: () => void;
  isCalculating: boolean;
  isVisible: boolean;
  onClose: () => void;
}

export const ScoutRoutePlanner = ({
  onCalculateRoute,
  onClear,
  isCalculating,
  isVisible,
  onClose
}: ScoutRoutePlannerProps) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originDisplay, setOriginDisplay] = useState('');
  const [destDisplay, setDestDisplay] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<Array<{ text: string; placeId: string }>>([]);
  const [destSuggestions, setDestSuggestions] = useState<Array<{ text: string; placeId: string }>>([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  
  const originTimerRef = useRef<any>(null);
  const destTimerRef = useRef<any>(null);

  const fetchSuggestions = useCallback(async (input: string, setter: (s: Array<{ text: string; placeId: string }>) => void) => {
    if (!input || input.length < 2) {
      setter([]);
      return;
    }

    const google = getGoogleMaps();
    if (!google) return;

    try {
      if (typeof (google as any).importLibrary === 'function') {
        const placesLib = await (google as any).importLibrary('places') as any;
        if (placesLib?.AutocompleteSuggestion) {
          const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input });
          if (response?.suggestions) {
            const parsed = response.suggestions
              .map(extractSuggestionText)
              .filter((s: any): s is { text: string; placeId: string } => s !== null);
            setter(parsed);
          }
        }
      }
    } catch (err) {
      console.error('Route Planner autocomplete error:', err);
    }
  }, []);

  const handleOriginChange = (value: string) => {
    setOriginDisplay(value);
    setOrigin(value); // fallback to text if no place selected
    setShowOriginDropdown(true);

    if (originTimerRef.current) clearTimeout(originTimerRef.current);
    originTimerRef.current = setTimeout(() => {
      fetchSuggestions(value, setOriginSuggestions);
    }, 300);
  };

  const handleDestChange = (value: string) => {
    setDestDisplay(value);
    setDestination(value); // fallback to text if no place selected
    setShowDestDropdown(true);

    if (destTimerRef.current) clearTimeout(destTimerRef.current);
    destTimerRef.current = setTimeout(() => {
      fetchSuggestions(value, setDestSuggestions);
    }, 300);
  };

  const selectOrigin = (suggestion: { text: string; placeId: string }) => {
    setOriginDisplay(suggestion.text);
    setOrigin(suggestion.placeId ? `place_id:${suggestion.placeId}` : suggestion.text);
    setOriginSuggestions([]);
    setShowOriginDropdown(false);
  };

  const selectDest = (suggestion: { text: string; placeId: string }) => {
    setDestDisplay(suggestion.text);
    setDestination(suggestion.placeId ? `place_id:${suggestion.placeId}` : suggestion.text);
    setDestSuggestions([]);
    setShowDestDropdown(false);
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (originTimerRef.current) clearTimeout(originTimerRef.current);
      if (destTimerRef.current) clearTimeout(destTimerRef.current);
    };
  }, []);

  // Reset state when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      setOrigin('');
      setDestination('');
      setOriginDisplay('');
      setDestDisplay('');
      setOriginSuggestions([]);
      setDestSuggestions([]);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="absolute top-20 left-4 right-4 md:left-6 md:w-[400px] z-20 bg-white/95 backdrop-blur-2xl rounded-2xl p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-stone-100/80 animate-in slide-in-from-top duration-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Navigation size={18} className="text-blue-500" />
          <span className="text-[12px] font-black uppercase tracking-[0.2em] text-stone-400">Route Planner</span>
        </div>
        <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4 relative">
        {/* Connecting Line */}
        <div className="absolute left-[23px] top-10 bottom-10 w-0.5 bg-stone-100 dashed-border" />

        {/* Origin Input */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-green-400 bg-green-50 z-10" />
          <input
            type="text"
            placeholder="Starting Point"
            value={originDisplay}
            onChange={(e) => handleOriginChange(e.target.value)}
            onFocus={() => originSuggestions.length > 0 && setShowOriginDropdown(true)}
            onBlur={() => setTimeout(() => setShowOriginDropdown(false), 200)}
            className="w-full bg-stone-50 pl-12 pr-6 py-5 rounded-[2rem] text-sm font-bold outline-none border-2 border-transparent focus:border-stone-900 transition-all"
          />
          {showOriginDropdown && originSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-stone-100 overflow-hidden z-30">
              {originSuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOrigin(s)}
                  className="w-full text-left px-4 py-3 hover:bg-stone-50 text-sm text-stone-700 border-b border-stone-50 last:border-0 flex items-center gap-2"
                >
                  <MapPin size={14} className="text-stone-400 shrink-0" />
                  <span className="truncate">{s.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination Input */}
        <div className="relative">
          <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 z-10" />
          <input
            type="text"
            placeholder="Destination"
            value={destDisplay}
            onChange={(e) => handleDestChange(e.target.value)}
            onFocus={() => destSuggestions.length > 0 && setShowDestDropdown(true)}
            onBlur={() => setTimeout(() => setShowDestDropdown(false), 200)}
            className="w-full bg-stone-50 pl-12 pr-6 py-5 rounded-[2rem] text-sm font-bold outline-none border-2 border-transparent focus:border-stone-900 transition-all"
          />
          {showDestDropdown && destSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-stone-100 overflow-hidden z-30">
              {destSuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectDest(s)}
                  className="w-full text-left px-4 py-3 hover:bg-stone-50 text-sm text-stone-700 border-b border-stone-50 last:border-0 flex items-center gap-2"
                >
                  <MapPin size={14} className="text-stone-400 shrink-0" />
                  <span className="truncate">{s.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={() => {
            onClear();
            setOriginDisplay('');
            setDestDisplay('');
            setOrigin('');
            setDestination('');
          }}
          className="px-6 py-4 bg-stone-100 text-stone-400 rounded-2xl font-black uppercase text-[12px] tracking-widest hover:text-stone-600 transition-all"
        >
          Clear
        </button>
        <button
          onClick={() => onCalculateRoute(origin, destination)}
          disabled={!origin || !destination || isCalculating}
          className="flex-grow bg-stone-900 text-white rounded-2xl font-black uppercase text-[12px] tracking-widest py-4 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
        >
          {isCalculating ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          <span>Find Eats Along Route</span>
        </button>
      </div>
    </div>
  );
};
