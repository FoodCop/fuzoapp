import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock, Sparkles, ChevronRight, Filter, Info, MapPin } from 'lucide-react';
import { ScoutPlace, ScoutFilter } from '../types/scoutUi';
import { getMatchPercentage } from '../lib/scoutLogic';

interface ScoutDiscoveryPanelProps {
  places: ScoutPlace[];
  onPlaceSelect: (place: ScoutPlace) => void;
  filter: ScoutFilter;
  onFilterChange: (filter: ScoutFilter) => void;
  onClose: () => void;
  className?: string;
  isSidebar?: boolean;
}

export const ScoutDiscoveryPanel = ({ 
  places, 
  onPlaceSelect, 
  filter, 
  onFilterChange, 
  onClose,
  className = "",
  isSidebar = false
}: ScoutDiscoveryPanelProps) => {
  const filterOptions: { id: ScoutFilter['type'], label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'top', label: 'Top Rated' },
    { id: 'open', label: 'Open Now' },
    { id: 'distance', label: 'Distance' }
  ];

  const panelClasses = isSidebar 
    ? "relative w-full h-full flex flex-col bg-transparent"
    : `fixed inset-x-0 bottom-0 z-50 md:absolute md:top-32 md:left-8 md:bottom-auto md:w-80 h-[70vh] md:max-h-[calc(100vh-200px)] flex flex-col ${className}`;

  return (
    <div className={panelClasses}>
      <header className={`p-6 ${isSidebar ? 'px-4' : 'bg-white/80 backdrop-blur-3xl rounded-t-[3rem] md:rounded-[3rem] border border-white/40 shadow-2xl'} mb-4`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-yellow-500" />
            <span className="text-[12px] font-black uppercase tracking-[0.3em] text-stone-400">Discovery</span>
          </div>
          {!isSidebar && (
            <button onClick={onClose} className="p-2 bg-stone-100 rounded-full md:hidden">
              <ChevronRight className="rotate-90" size={16} />
            </button>
          )}
        </div>
        <h2 className={`text-2xl font-black uppercase tracking-tighter text-stone-900 leading-none ${isSidebar ? 'mb-4' : 'mb-6'}`}>
          Premium Picks
        </h2>
        
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {filterOptions.map(f => (
            <button
              key={f.id}
              onClick={() => onFilterChange({ ...filter, type: f.id })}
              className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0 ${filter.type === f.id ? 'bg-stone-900 text-white' : 'bg-white/50 text-stone-400 hover:bg-white border border-stone-100'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className={`flex-grow overflow-y-auto hide-scrollbar ${isSidebar ? 'px-0' : 'bg-white/80 backdrop-blur-3xl p-6 rounded-b-[3rem] md:rounded-[3rem] border border-white/40 shadow-2xl'} space-y-4`}>
        {places.length === 0 ? (
          <div className="text-center py-20 px-4">
            <p className="text-[12px] font-black uppercase tracking-widest text-stone-500">
              No spots found in this area
            </p>
          </div>
        ) : (
          places.map((place, idx) => (
            <motion.button
              key={place.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onPlaceSelect(place)}
              className="w-full group text-left bg-white/60 hover:bg-white rounded-[2.2rem] p-4 border border-white/50 hover:border-yellow-400/50 shadow-sm hover:shadow-xl transition-all flex gap-4 items-center"
            >
              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-lg border-2 border-white group-hover:scale-105 transition-transform">
                <img src={place.img} alt={place.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-black uppercase text-[11px] tracking-tight text-stone-900 truncate">{place.name}</h3>
                  <div className="flex items-center gap-1 text-yellow-500 shrink-0">
                    <Star size={10} fill="currentColor" />
                    <span className="text-[12px] font-black">{place.rating}</span>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mt-1 truncate">{place.cat}</p>
                <div className="flex items-center gap-1 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-stone-400">Match: {place.matchPercentage || getMatchPercentage(place)}%</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-stone-300 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
};
