import React from 'react';
import { motion } from 'framer-motion';
import { X, Star, Info, Clock, List, MapPin, Zap, PlayCircle, Bookmark, Share2 } from 'lucide-react';
import { ScoutPlace } from '../types/scoutUi';
import { Badge } from '../../../shared/ui/Badge';
import { useFocusTrap } from '../../../shared/hooks/useFocusTrap';

interface ScoutPlaceModalProps {
  place: ScoutPlace;
  modalTab: string;
  setModalTab: (tab: string) => void;
  isLoadingDetails: boolean;
  onClose: () => void;
  onAction: (place: ScoutPlace, action: 'save' | 'share') => void;
  onContribute?: (place: ScoutPlace) => Promise<void>;
}

export const ScoutPlaceModal = ({
  place,
  modalTab,
  setModalTab,
  isLoadingDetails,
  onClose,
  onAction,
  onContribute,
}: ScoutPlaceModalProps) => {

  const containerRef = useFocusTrap(true);
  const [editedName, setEditedName] = React.useState(place.name);
  const [editedCat, setEditedCat] = React.useState(place.cat);
  const [editedNotes, setEditedNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);


  return (
    <div 
      ref={containerRef as any}
      role="dialog" 
      aria-modal="true" 
      aria-label={`Details for ${place.name}`} 
      className="fixed inset-0 z-[110] bg-stone-900/60 backdrop-blur-xl flex items-start justify-center p-4 md:p-10 overflow-y-auto"
    >
      <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in duration-300">
        <button 
          onClick={onClose} 
          aria-label="Close modal"
          className="absolute top-6 right-6 z-20 p-5 bg-stone-900 text-white rounded-3xl active:scale-90 transition-transform min-w-[54px] min-h-[54px] flex items-center justify-center"
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
              {place.isNewFind ? (
                <div className="space-y-4">
                  <Badge color="indigo">New Discovery</Badge>
                  <input 
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Name this spot..."
                    className="text-4xl font-black uppercase tracking-tighter w-full bg-stone-50 p-4 rounded-3xl border-4 border-dashed border-stone-200 focus:border-stone-900 outline-none transition-all mt-2"
                  />
                  <select 
                    value={editedCat}
                    onChange={(e) => setEditedCat(e.target.value)}
                    className="text-[12px] font-black uppercase tracking-widest bg-stone-100 px-6 py-3 rounded-full border-none outline-none mt-2"
                  >
                    <option value="Casual Eatery">Casual Eatery</option>
                    <option value="Fine Dining">Fine Dining</option>
                    <option value="Coffee & Cafe">Coffee & Cafe</option>
                    <option value="Bar & Lounge">Bar & Lounge</option>
                    <option value="Street Food">Street Food</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Hidden Gem">Hidden Gem</option>
                  </select>
                </div>
              ) : (
                <>
                  <Badge color="yellow">{place.cat}</Badge>
                  <h2 className="text-4xl font-black uppercase tracking-tighter mt-2 leading-none">{place.name}</h2>
                </>
              )}
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
                    <p className="text-sm font-bold leading-relaxed">{place.address || 'Address not listed'}</p>
                  </div>
                  <div className="flex items-center gap-4 text-stone-600">
                    <Clock size={20} className="shrink-0 text-stone-400" />
                    <p className="text-sm font-bold">
                      {(place.timings && Object.keys(place.timings).length > 0) 
                        ? `Open now: ${place.timings[new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase()] || 'Hours not listed'}`
                        : 'Hours not available'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-stone-600">
                    <Zap size={20} className="shrink-0 text-stone-400" />
                    <p className="text-sm font-bold">{place.phone || 'Phone not available'}</p>
                  </div>

                  <div className="flex items-center gap-4 text-stone-600">
                    <PlayCircle size={20} className="shrink-0 text-stone-400" />
                    {place.website ? (
                      <a href={place.website.startsWith('http') ? place.website : `https://${place.website}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-500 hover:underline truncate max-w-[200px]">{place.website}</a>
                    ) : (
                      <span className="text-sm font-bold text-stone-400 italic">Website not available</span>
                    )}
                  </div>

                </div>

                <section className="space-y-4">
                  <h4 className="font-black uppercase text-[12px] tracking-[0.2em] text-stone-300 px-2">
                    {place.isNewFind ? 'Add Notes' : 'The Vibe'}
                  </h4>
                  {place.isNewFind ? (
                    <textarea 
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      placeholder="Tell the community what makes this spot special..."
                      className="w-full bg-stone-50 p-6 rounded-[2.5rem] border-2 border-stone-100 focus:bg-white focus:border-stone-900 outline-none transition-all h-32 text-sm font-bold resize-none"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {(place.vibe || []).map((v) => (
                        <div key={v} className="px-6 py-3 bg-stone-50 rounded-full text-[12px] font-black uppercase tracking-widest text-stone-900 border border-stone-100">
                          {v}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

              </div>
            )}

            {modalTab === 'timings' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h4 className="font-black uppercase text-[12px] tracking-[0.2em] text-stone-300 px-2">Opening Hours</h4>
                <div className="bg-stone-50 p-8 rounded-[3rem] border border-stone-100 space-y-3">
                  {Object.keys(place.timings || {}).length > 0 ? (
                    Object.entries(place.timings || {}).map(([day, hours]) => (
                      <div key={day} className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest text-stone-400">{day}</span>
                        <span className="text-xs font-bold text-stone-900">{hours}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-[12px] font-black uppercase tracking-widest text-stone-300">Opening hours not available</p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {modalTab === 'menu' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {place.menu && place.menu.length > 0 ? (
                  place.menu.map((section) => (
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
                  ))
                ) : (
                  <div className="bg-stone-50 p-12 rounded-[3.5rem] border border-stone-100 text-center">
                    <p className="text-[12px] font-black uppercase tracking-widest text-stone-300">Detailed menu not available yet</p>
                  </div>
                )}
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
                  <div key={`${review.user}-${review.text}`} className="bg-stone-50 p-8 rounded-[3rem] border border-stone-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-stone-200 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase text-stone-400">
                          {review.user.substring(0, 2)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase tracking-widest">{review.user}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-300">{review.time}</span>
                        </div>
                      </div>
                      <div className="flex text-yellow-400 gap-0.5">
                        {[1,2,3,4,5].map(star => <Star key={star} size={12} fill={star <= review.rating ? "currentColor" : "none"} />)}
                      </div>
                    </div>
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

          <footer className="pt-4 flex gap-4 sticky bottom-0 bg-white/90 backdrop-blur-md pb-4">
            {place.isNewFind ? (
              <button 
                onClick={async () => {
                  if (onContribute) {
                    setIsSubmitting(true);
                    await onContribute({
                      ...place,
                      name: editedName,
                      cat: editedCat,
                      notes: editedNotes
                    });
                    setIsSubmitting(false);
                    onClose();
                  }
                }}
                disabled={isSubmitting || !editedName.trim()}
                className="flex-grow min-h-[56px] bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50"
              >
                <Zap size={22} className={isSubmitting ? 'animate-pulse' : ''} />
                <span className="text-[12px] font-black uppercase tracking-widest">
                  {isSubmitting ? 'Contributing...' : 'Add to FUZO Dataset'}
                </span>
              </button>
            ) : (
              <>
                <button 
                  onClick={() => onAction(place, 'save')}
                  aria-label="Save this place"
                  className="flex-grow min-h-[56px] bg-stone-900 text-white rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
                >
                  <Bookmark size={22} />
                  <span className="text-[12px] font-black uppercase tracking-widest">Save</span>
                </button>
                <button 
                  onClick={() => onAction(place, 'share')}
                  aria-label="Share this place"
                  className="min-h-[56px] px-10 bg-yellow-400 text-stone-900 rounded-[2rem] flex items-center justify-center active:scale-95 transition-all shadow-xl"
                >
                  <Share2 size={22} />
                </button>
              </>
            )}
          </footer>

        </div>
      </div>
    </div>
  );
};

// Helper components needed locally or shared
import { LayoutGrid } from 'lucide-react';
