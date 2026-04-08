import React from 'react';
import { UGC_CUISINES, UGC_DIETS, UGC_VIBES } from '../utils/taxonomy';

interface UgcFilterBarProps {
  activeCuisine: string | null;
  onCuisineChange: (cuisine: string | null) => void;
  activeDiet?: string | null;
  onDietChange?: (diet: string | null) => void;
  activeVibe?: string | null;
  onVibeChange?: (vibe: string | null) => void;
  className?: string;
}

const UgcFilterBar: React.FC<UgcFilterBarProps> = ({
  activeCuisine,
  onCuisineChange,
  activeDiet,
  onDietChange,
  activeVibe,
  onVibeChange,
  className = ''
}) => {
  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Cuisines */}
      <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2 px-6">
        <button
          onClick={() => onCuisineChange(null)}
          className={`shrink-0 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${!activeCuisine ? 'bg-stone-900 text-white shadow-lg' : 'bg-white text-stone-400 border border-stone-100'}`}
        >
          All Cuisines
        </button>
        {UGC_CUISINES.slice(0, 12).map((cuisine) => (
          <button
            key={cuisine}
            onClick={() => onCuisineChange(cuisine === activeCuisine ? null : cuisine)}
            className={`shrink-0 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${activeCuisine === cuisine ? 'bg-yellow-400 text-stone-900 shadow-lg' : 'bg-white text-stone-400 border border-stone-100 hover:border-stone-200'}`}
          >
            {cuisine}
          </button>
        )}
      </div>

      {onDietChange && (
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2 px-6">
          {UGC_DIETS.map((diet) => (
            <button
              key={diet}
              onClick={() => onDietChange(diet === activeDiet ? null : diet)}
              className={`shrink-0 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${activeDiet === diet ? 'bg-emerald-500 text-white shadow-lg' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}
            >
              {diet}
            </button>
          ))}
        </div>
      )}
      
      {onVibeChange && (
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2 px-6">
           {UGC_VIBES.map((vibe) => (
            <button
              key={vibe}
              onClick={() => onVibeChange(vibe === activeVibe ? null : vibe)}
              className={`shrink-0 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${activeVibe === vibe ? 'bg-stone-900 text-white shadow-lg' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}
            >
              {vibe}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UgcFilterBar;
