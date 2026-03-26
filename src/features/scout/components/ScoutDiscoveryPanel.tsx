import React from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, Clock, Sparkles, ChevronRight, Filter } from 'lucide-react';
import { ScoutPlace, ScoutFilter } from '../types/scoutUi';
import { getMatchPercentage } from '../lib/scoutLogic';
import { Badge } from '../../../shared/ui/Badge';

interface ScoutDiscoveryPanelProps {
  places: ScoutPlace[];
  onSelect: (place: ScoutPlace) => void;
  isLoading: boolean;
  title: string;
  emptyState?: string;
  activeFilter: ScoutFilter;
  onFilterChange: (filter: ScoutFilter) => void;
}

export const ScoutDiscoveryPanel = ({ 
  places, 
  onSelect, 
  isLoading, 
  title,
  emptyState,
  activeFilter,
  onFilterChange
}: ScoutDiscoveryPanelProps) => {
  const filters: { id: ScoutFilter, label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'top', label: 'Top Rated' },
    { id: 'open', label: 'Open Now' },
    { id: 'distance', label: 'Distance' }
  ];

  return (
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="absolute top-32 left-8 z-30 w-80 max-h-[calc(100vh-200px)] flex flex-col pointer-events-none"
    >
      <div className="bg-white/70 backdrop-blur-3xl rounded-[3rem] border border-white/40 shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
        <header className="p-8 border-b border-stone-100/20">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={16} className="text-yellow-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Discovery</span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-stone-900 leading-none mb-6">{title}</h2>
          
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                className={`px-4 py-2 rounded-2xl text-[8px] font-black uppercase tracking-widest transition-all shrink-0 ${activeFilter === f.id ? 'bg-stone-900 text-white' : 'bg-white/50 text-stone-400 hover:bg-white'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-grow overflow-y-auto hide-scrollbar p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Searching...</p>
            </div>
          ) : places.length === 0 ? (
            <div className="text-center py-20 px-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">
                {emptyState || 'No spots found in this area'}
              </p>
            </div>
          ) : (
            places.map((place, idx) => (
              <motion.button
                key={place.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onSelect(place)}
                className="w-full group text-left bg-white/50 hover:bg-white rounded-[2.2rem] p-4 border border-white/50 hover:border-yellow-400/50 shadow-sm hover:shadow-xl transition-all flex gap-4 items-center"
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-lg border-2 border-white group-hover:scale-105 transition-transform">
                  <img src={place.img} alt={place.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-black uppercase text-[11px] tracking-tight text-stone-900 truncate">{place.name}</h3>
                    <div className="flex items-center gap-1 text-yellow-500 shrink-0">
                      <Star size={10} fill="currentColor" />
                      <span className="text-[10px] font-black">{place.rating}</span>
                    </div>
                  </div>
                  <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-1 truncate">{place.cat}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">Match: {getMatchPercentage(place)}%</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-stone-300 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            ))
          )}
        </div>

        <footer className="p-6 bg-stone-900/5 border-t border-stone-100/10">
          <button className="w-full py-4 bg-stone-900 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest hover:bg-stone-800 transition-colors shadow-lg">
            View All Results
          </button>
        </footer>
      </div>
    </motion.div>
  );
};
