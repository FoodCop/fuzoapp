import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, X, Search, ArrowRight, Loader2 } from 'lucide-react';
import { getGoogleMaps } from '../types/scoutUi';

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
  const originRef = useRef<HTMLInputElement>(null);
  const destRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const google = getGoogleMaps();
    if (!google || !google.places || !isVisible) return;

    if (originRef.current) {
      const originAutocomplete = new google.places.Autocomplete(originRef.current, {
        fields: ['formatted_address', 'place_id', 'name'],
        types: ['geocode', 'establishment']
      });
      originAutocomplete.addListener('place_changed', () => {
        const place = originAutocomplete.getPlace();
        if (place.place_id) {
          setOrigin(`place_id:${place.place_id}`);
          // Set the display value back to the readable address
          if (originRef.current) originRef.current.value = place.formatted_address || place.name || '';
        } else if (place.formatted_address) {
          setOrigin(place.formatted_address);
        }
      });
    }

    if (destRef.current) {
      const destAutocomplete = new google.places.Autocomplete(destRef.current, {
        fields: ['formatted_address', 'place_id', 'name'],
        types: ['geocode', 'establishment']
      });
      destAutocomplete.addListener('place_changed', () => {
        const place = destAutocomplete.getPlace();
        if (place.place_id) {
          setDestination(`place_id:${place.place_id}`);
          // Set the display value back to the readable address
          if (destRef.current) destRef.current.value = place.formatted_address || place.name || '';
        } else if (place.formatted_address) {
          setDestination(place.formatted_address);
        }
      });
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

        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-stone-200 bg-white z-10" />
          <input
            ref={originRef}
            type="text"
            placeholder="Starting Point"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full bg-stone-50 pl-12 pr-6 py-5 rounded-[2rem] text-sm font-bold outline-none border-2 border-transparent focus:border-stone-900 transition-all"
          />
        </div>

        <div className="relative">
          <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 z-10" />
          <input
            ref={destRef}
            type="text"
            placeholder="Destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full bg-stone-50 pl-12 pr-6 py-5 rounded-[2rem] text-sm font-bold outline-none border-2 border-transparent focus:border-stone-900 transition-all"
          />
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={onClear}
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
