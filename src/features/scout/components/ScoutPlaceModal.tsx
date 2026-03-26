import React from 'react';
import { motion } from 'framer-motion';
import { X, Star, Info, Clock, List, MapPin, Zap, PlayCircle, Bookmark, Share2 } from 'lucide-react';
import { ScoutPlace } from '../types/scoutUi';
import { Badge } from '../../../shared/ui/Badge';

interface ScoutPlaceModalProps {
  place: ScoutPlace;
  modalTab: string;
  setModalTab: (tab: string) => void;
  isLoadingDetails: boolean;
  onClose: () => void;
  onAction: (place: ScoutPlace, action: 'save' | 'share') => void;
}

export const ScoutPlaceModal = ({
  place,
  modalTab,
  setModalTab,
  isLoadingDetails,
  onClose,
  onAction,
}: ScoutPlaceModalProps) => {
  return (
    <div role="dialog" aria-modal="true" aria-label={`Details for ${place.name}`} className="fixed inset-0 z-[110] bg-stone-900/60 backdrop-blur-xl flex items-start justify-center p-4 md:p-10 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in duration-300">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 z-20 p-4 bg-stone-900 text-white rounded-3xl active:scale-90 transition-transform"
        >
          <X size={24} />
        </button>
        
        <div className="w-full md:w-1/2 h-64 md:h-auto overflow-hidden relative">
          <img src={place.img} alt={place.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent md:hidden" />
          <div className="absolute bottom-6 left-8 md:hidden text-white">
            <Badge color="yellow">{place.cat}</Badge>
            <h2 className="text-3xl font-black uppercase tracking-tighter mt-2">{place.name}</h2>
          </div>
        </div>

        <div className="w-full md:w-1/2 p-8 md:p-14 overflow-y-auto hide-scrollbar flex flex-col gap-6">
          <header className="space-y-4">
            <div className="hidden md:block">
              <Badge color="yellow">{place.cat}</Badge>
              <h2 className="text-4xl font-black uppercase tracking-tighter mt-2 leading-none">{place.name}</h2>
            </div>
            {isLoadingDetails && <p className="text-[12px] font-black uppercase tracking-widest text-stone-400">Loading live details...</p>}
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="flex text-yellow-400">
                  {[1,2,3,4,5].map(i => <Star key={i} size={16} fill={i <= Math.floor(place.rating) ? "currentColor" : "none"} />)}
                </div>
                <span className="text-xs font-black">{place.rating}</span>
                <span className="text-[12px] font-bold text-stone-300 uppercase tracking-widest">({place.reviews} Reviews)</span>
              </div>
            </div>
          </header>

          <div className="flex border-b border-stone-100 overflow-x-auto hide-scrollbar">
            {[
              { id: 'overview', icon: Info },
              { id: 'timings', icon: Clock },
              { id: 'menu', icon: List },
              { id: 'reviews', icon: Star },
              { id: 'photos', icon: LayoutGrid }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setModalTab(t.id)}
                className={`flex-1 min-w-[60px] flex items-center justify-center py-5 transition-all border-b-2 ${modalTab === t.id ? 'border-yellow-400 text-stone-900' : 'border-transparent text-stone-300 hover:text-stone-500'}`}
              >
                <t.icon size={20} strokeWidth={modalTab === t.id ? 3 : 2} />
              </button>
            ))}
          </div>

          <div className="flex-grow">
            {modalTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 text-stone-600">
                    <MapPin size={20} className="shrink-0 mt-0.5 text-stone-400" />
                    <p className="text-sm font-bold leading-relaxed">{place.address}</p>
                  </div>
                  <div className="flex items-center gap-4 text-stone-600">
                    <Clock size={20} className="shrink-0 text-stone-400" />
                    <p className="text-sm font-bold">Open now: {place.timings[new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase()]}</p>
                  </div>
                  <div className="flex items-center gap-4 text-stone-600">
                    <Zap size={20} className="shrink-0 text-stone-400" />
                    <p className="text-sm font-bold">{place.phone}</p>
                  </div>
                  <div className="flex items-center gap-4 text-stone-600">
                    <PlayCircle size={20} className="shrink-0 text-stone-400" />
                    <a href={place.website?.startsWith('http') ? place.website : `https://${place.website}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-500 hover:underline">{place.website}</a>
                  </div>
                </div>

                <section className="space-y-4">
                  <h4 className="font-black uppercase text-[12px] tracking-[0.2em] text-stone-300 px-2">The Vibe</h4>
                  <div className="flex flex-wrap gap-3">
                    {(place.vibe || []).map((v) => (
                      <div key={v} className="px-6 py-3 bg-stone-50 rounded-full text-[12px] font-black uppercase tracking-widest text-stone-900 border border-stone-100">
                        {v}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {modalTab === 'timings' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h4 className="font-black uppercase text-[12px] tracking-[0.2em] text-stone-300 px-2">Opening Hours</h4>
                <div className="bg-stone-50 p-8 rounded-[3rem] border border-stone-100 space-y-3">
                  {Object.entries(place.timings || {}).map(([day, hours]) => (
                    <div key={day} className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-widest text-stone-400">{day}</span>
                      <span className="text-xs font-bold text-stone-900">{hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {modalTab === 'menu' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {(place.menu || []).map((section) => (
                  <div key={section.section} className="space-y-4">
                    <h4 className="font-black uppercase text-[12px] tracking-[0.2em] text-stone-300 px-2">{section.section}</h4>
                    <div className="bg-stone-50 p-8 rounded-[3rem] border border-stone-100 space-y-3">
                      {section.items.map((item) => (
                        <div key={`${section.section}-${item}`} className="flex justify-between items-center border-b border-stone-100/50 pb-2 last:border-0 last:pb-0">
                          <span className="text-xs font-bold text-stone-900">{item.split(' - ')[0]}</span>
                          <span className="text-xs font-black text-stone-400">{item.split(' - ')[1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button className="w-full py-5 border-4 border-stone-100 rounded-[2rem] font-black uppercase text-[12px] tracking-widest text-stone-400 hover:bg-stone-50 transition-colors">View Full Menu</button>
              </div>
            )}

            {modalTab === 'reviews' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between px-2">
                  <h4 className="font-black uppercase text-[12px] tracking-[0.2em] text-stone-300">User Reviews</h4>
                  <button className="text-[12px] font-black uppercase tracking-widest text-blue-500">Write Review</button>
                </div>
                {(place.userReviews || []).map((review) => (
                  <div key={`${review.user}-${review.text}`} className="bg-stone-50 p-8 rounded-[3rem] border border-stone-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-stone-200 rounded-full" />
                        <span className="text-xs font-black uppercase tracking-widest">{review.user}</span>
                      </div>
                      <div className="flex text-yellow-400">
                        {[1,2,3,4,5].map(star => <Star key={star} size={12} fill={star <= review.rating ? "currentColor" : "none"} />)}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-stone-500 leading-relaxed italic">"{review.text}"</p>
                  </div>
                ))}
              </div>
            )}

            {modalTab === 'photos' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                {(place.photos || []).map((photo) => (
                  <div key={photo} className="aspect-square rounded-[2.5rem] overflow-hidden border-4 border-stone-50 shadow-sm">
                    <img src={photo} alt={place.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <footer className="pt-4 flex gap-4 sticky bottom-0 bg-white/90 backdrop-blur-md pb-2">
            <button 
              onClick={() => onAction(place, 'save')}
              className="flex-grow py-5 bg-stone-900 text-white rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
            >
              <Bookmark size={22} />
            </button>
            <button 
              onClick={() => onAction(place, 'share')}
              className="py-5 px-10 bg-yellow-400 text-stone-900 rounded-[2rem] flex items-center justify-center active:scale-95 transition-all shadow-xl"
            >
              <Share2 size={22} />
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

// Helper components needed locally or shared
import { LayoutGrid } from 'lucide-react';
