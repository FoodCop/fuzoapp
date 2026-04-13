import React, { useState, useEffect } from 'react';
import { Eye, X, Heart, Share2, Bookmark } from 'lucide-react';
import { Badge } from '../../../shared/ui/Badge';
import { AppItem } from '../../../shared/types/appItem';

export const DealCard = ({ 
  item, 
  index, 
  onAction, 
  onAuthorClick 
}: { 
  item: AppItem, 
  index: number, 
  onAction: (action: string, item: AppItem) => void, 
  onAuthorClick?: (item: AppItem) => void 
}) => {
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
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsFlipped(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsFlipped(true); }}
          aria-label={`Reveal ${item.name}`}
          className="absolute inset-0 w-full h-full rounded-[1.75rem] border-8 border-white bg-yellow-400 flex flex-col items-center justify-center gap-6 group/front select-none"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Card Branding */}
          <div className="flex flex-col items-center justify-center gap-4 group-hover/front:scale-110 transition-transform duration-500">
             <img 
               src="/logo_mobile.png" 
               alt="FUZO Logo" 
               className="w-24 h-24 object-contain opacity-90 transition-all group-hover/front:opacity-100" 
             />
          </div>
        </div>

        {/* Back */}
        <div 
          className="absolute inset-0 w-full h-full rounded-[3rem] border-8 border-white bg-white overflow-hidden group/back"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Back face content - clickable to expand into full detail */}
          <div 
            className="w-full h-full cursor-zoom-in"
            onClick={() => onAction('expand', item)}
          >
            {/* Main Image Background */}
            <img src={item.img} alt={item.name || 'Deal item'} className="w-full h-full object-cover transition-transform duration-700 group-hover/back:scale-110" />
            
            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />

            {!isAdOrTrivia && (
              <>
                {/* Top Profile Header */}
                <div className="absolute top-8 left-8 flex items-center gap-4 text-white z-20">
                  <div className="w-14 h-14 rounded-full border-2 border-white/50 overflow-hidden bg-stone-800 shadow-xl flex-shrink-0">
                    <img 
                      src={item.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author || 'U')}&background=EAB308&color=fff&bold=true`} 
                      alt={item.author} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-xl tracking-tight leading-none mb-1 truncate">{item.author || 'Anonymous'}</h4>
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-white/60">Food reviewer</p>
                  </div>
                </div>


                {/* Bottom Info Overlay */}
                <div className="absolute bottom-8 left-8 right-24 text-white space-y-4 z-10 pointer-events-none">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight drop-shadow-xl line-clamp-2">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 text-white/70 text-[12px] font-bold tracking-tight">
                      <span className="truncate">{item.address || 'Local Discovery'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* Map tags or categories */}
                    {(item.cat || '').split(',').slice(0, 3).map((tag, i) => (
                      <div key={i} className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors whitespace-nowrap">
                        {tag.trim()}
                      </div>
                    ))}
                  </div>

                  {/* Integration Indicators */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10 opacity-90 select-none overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center p-1 flex-shrink-0">
                        <div className="w-full h-full bg-black rounded-full" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest truncate">Uber <span className="text-emerald-400">Eats</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 bg-stone-300 rounded flex items-center justify-center font-bold text-stone-900 text-[7px] leading-none flex-shrink-0">SK</div>
                      <span className="text-[10px] font-black uppercase tracking-widest truncate">Skip</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 bg-white rounded-full border-4 border-stone-800 flex-shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-widest truncate">OpenTable</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {isAdOrTrivia && (
              <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
                 <Badge color="yellow" className="scale-150">{item.itemType?.toUpperCase()}</Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
