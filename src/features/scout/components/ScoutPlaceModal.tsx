import React from 'react';
import { X, Star, Info, Clock, List, MapPin, Zap, PlayCircle, Bookmark, Share2, Navigation, Smartphone, Globe, Phone, Check, ChevronDown } from 'lucide-react';
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

  const priceStr = place.priceLevel ? '$'.repeat(place.priceLevel) : null;

  return (
    <div 
      ref={containerRef as any}
      role="dialog" 
      aria-modal="true" 
      aria-label={`Details for ${place.name}`} 
      className="absolute top-0 left-0 w-full h-full z-[110] bg-white flex flex-col overflow-y-auto animate-in slide-in-from-bottom md:slide-in-from-left duration-300 md:top-20 md:left-[416px] md:w-[400px] md:h-[calc(100vh-160px)] md:rounded-2xl md:shadow-[0_4px_24px_rgba(0,0,0,0.08)] md:border md:border-stone-100/80"
    >
      {/* HEADER BAR (Floating Close) */}
      <div className="absolute top-4 right-4 md:left-4 md:right-auto z-20 flex gap-2">
        <button 
          onClick={onClose} 
          className="w-10 h-10 bg-white/90 backdrop-blur-md text-stone-900 rounded-full shadow-md flex items-center justify-center hover:bg-white transition-colors border border-stone-200"
        >
          <X size={20} />
        </button>
      </div>

      {/* HERO IMAGE */}
      <div className="w-full h-64 shrink-0 relative bg-stone-100">
        <img src={place.img} alt={place.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="flex-grow flex flex-col -mt-4 bg-white rounded-t-[1.5rem] relative z-10">
        {/* TITLE & QUICK INFO */}
        <div className="p-5 pb-0 space-y-2">
          {place.isNewFind ? (
            <div className="space-y-3">
              <Badge color="indigo">New Discovery</Badge>
              <input 
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Name this spot..."
                className="text-2xl font-black uppercase w-full bg-stone-50 p-3 rounded-xl outline-none"
              />
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-stone-900 leading-tight">{place.name}</h2>
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <span className="font-bold text-stone-900">{place.rating}</span>
                <div className="flex text-yellow-400">
                  {[1,2,3,4,5].map(i => <Star key={i} size={14} fill={i <= Math.floor(place.rating) ? "currentColor" : "none"} />)}
                </div>
                <span className="text-stone-500">({place.reviews?.toLocaleString()})</span>
                {priceStr && <span className="text-stone-500">· {priceStr}</span>}
              </div>
              <div className="text-sm text-stone-600">
                {place.cat}
              </div>
            </>
          )}

          {isLoadingDetails && <p className="text-xs font-medium text-blue-500 animate-pulse">Updating live details...</p>}
        </div>

        {/* CIRCULAR ACTIONS ROW */}
        {!place.isNewFind && (
          <div className="flex items-center justify-around py-5 border-b border-stone-100 px-2">
            <button className="flex flex-col items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"><Navigation size={18} /></div>
              <span className="text-[11px] font-medium">Directions</span>
            </button>
            <button onClick={() => onAction(place, 'save')} className="flex flex-col items-center gap-1.5 text-stone-700 hover:text-stone-900 transition-colors">
              <div className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center"><Bookmark size={18} /></div>
              <span className="text-[11px] font-medium">Save</span>
            </button>
            <button className="flex flex-col items-center gap-1.5 text-stone-700 hover:text-stone-900 transition-colors">
              <div className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center"><Smartphone size={18} /></div>
              <span className="text-[11px] font-medium">Send</span>
            </button>
            <button onClick={() => onAction(place, 'share')} className="flex flex-col items-center gap-1.5 text-stone-700 hover:text-stone-900 transition-colors">
              <div className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center"><Share2 size={18} /></div>
              <span className="text-[11px] font-medium">Share</span>
            </button>
          </div>
        )}

        {/* PRIMARY ACTIONS */}
        {!place.isNewFind && (
          <div className="p-4 flex gap-3 border-b border-stone-100">
            {place.reservable === true && (
              <button 
                onClick={() => window.open(place.website || place.menuLink || `https://www.google.com/search?q=${encodeURIComponent(place.name + ' reservations')}`, '_blank')}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Bookmark size={16} /> Reserve a table
              </button>
            )}
            {(place.takeout === true || place.delivery === true) && (
              <button 
                onClick={() => window.open(place.website || place.menuLink || `https://www.google.com/search?q=${encodeURIComponent(place.name + ' order online')}`, '_blank')}
                className="flex-1 bg-blue-50 text-blue-700 py-2.5 rounded-full text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
              >
                <Smartphone size={16} /> Order online
              </button>
            )}
          </div>
        )}

        {/* TABS */}
        <div className="flex border-b border-stone-100">
          {['overview', 'menu', 'reviews', 'about'].map(tab => (
            <button
              key={tab}
              onClick={() => setModalTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${modalTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-stone-500 hover:text-stone-900'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div className="p-5 flex-grow">
          {modalTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Editorial Summary */}
              {place.editorialSummary && (
                <p className="text-sm text-stone-800 leading-relaxed">
                  {place.editorialSummary}
                </p>
              )}

              {/* Shortened Service Options for Overview */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-stone-700">
                {place.dineIn !== undefined && (
                  <div className="flex items-center gap-1.5">
                    {place.dineIn ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                    <span className={place.dineIn === false ? 'line-through text-stone-400' : ''}>Dine-in</span>
                  </div>
                )}
                {place.takeout !== undefined && (
                  <div className="flex items-center gap-1.5">
                    {place.takeout ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                    <span className={place.takeout === false ? 'line-through text-stone-400' : ''}>Takeaway</span>
                  </div>
                )}
                {place.delivery !== undefined && (
                  <div className="flex items-center gap-1.5">
                    {place.delivery ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                    <span className={place.delivery === false ? 'line-through text-stone-400' : ''}>Delivery</span>
                  </div>
                )}
              </div>

              <div className="w-full h-px bg-stone-100" />

              {/* Information List */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <MapPin size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-stone-700">{place.address}</p>
                </div>
                
                <div className="flex items-start gap-4">
                  <Clock size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center cursor-pointer group">
                      <p className="text-sm text-stone-700">
                        {place.currentOpeningHours?.open_now ? (
                          <span className="text-green-600 font-medium">Open now</span>
                        ) : (
                          <span className="text-red-600 font-medium">Closed</span>
                        )}
                      </p>
                      <ChevronDown size={16} className="text-stone-400 group-hover:text-stone-900" />
                    </div>
                  </div>
                </div>

                {place.website && (
                  <div className="flex items-center gap-4">
                    <Globe size={20} className="text-blue-600 shrink-0" />
                    <a href={place.website.startsWith('http') ? place.website : `https://${place.website}`} target="_blank" rel="noreferrer" className="text-sm text-stone-700 hover:text-blue-600 truncate max-w-[250px] inline-block">
                      {place.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                    </a>
                  </div>
                )}

                {place.phone && (
                  <div className="flex items-center gap-4">
                    <Phone size={20} className="text-blue-600 shrink-0" />
                    <p className="text-sm text-stone-700">{place.phone}</p>
                  </div>
                )}
              </div>
              
              {place.plusCode && (
                <>
                  <div className="w-full h-px bg-stone-100 mt-6" />
                  <div className="flex items-center gap-4 mt-4">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                       <span className="text-blue-600 font-bold text-lg leading-none">+</span>
                    </div>
                    <p className="text-sm text-stone-500">{place.plusCode}</p>
                  </div>
                </>
              )}

            </div>
          )}

          {modalTab === 'menu' && (
             <div className="py-8 space-y-6 animate-in fade-in duration-300 flex flex-col items-center">
               <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-400">
                 <List size={32} />
               </div>
               <div className="text-center space-y-2">
                 <h3 className="font-bold text-stone-900">Menu items not available</h3>
                 <p className="text-sm text-stone-500 max-w-[250px]">Google does not provide itemized menus for this location.</p>
               </div>
               {(place.menuLink || place.website) && (
                 <a 
                   href={place.menuLink || place.website} 
                   target="_blank" 
                   rel="noreferrer"
                   className="px-6 py-2.5 bg-blue-50 text-blue-700 font-semibold rounded-full text-sm hover:bg-blue-100 transition-colors"
                 >
                   View website menu
                 </a>
               )}
             </div>
          )}

          {modalTab === 'reviews' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-4 border-b border-stone-100 pb-4">
                <div className="text-5xl font-normal">{place.rating}</div>
                <div>
                  <div className="flex text-yellow-400 mb-1">
                    {[1,2,3,4,5].map(star => <Star key={star} size={14} fill={star <= Math.floor(place.rating) ? "currentColor" : "none"} />)}
                  </div>
                  <div className="text-xs text-stone-500">{place.reviews?.toLocaleString()} reviews</div>
                </div>
              </div>
              
              {(place.userReviews || []).map((review) => (
                <div key={`${review.user}-${review.time}`} className="space-y-2 pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-stone-200 rounded-full flex items-center justify-center font-bold text-xs text-stone-600">
                      {review.user.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{review.user}</div>
                      <div className="text-xs text-stone-500">{review.time}</div>
                    </div>
                  </div>
                  <div className="flex text-yellow-400">
                    {[1,2,3,4,5].map(star => <Star key={star} size={12} fill={star <= review.rating ? "currentColor" : "none"} />)}
                  </div>
                  {review.text && <p className="text-sm text-stone-700 line-clamp-4">{review.text}</p>}
                </div>
              ))}
            </div>
          )}

          {modalTab === 'about' && (
            <div className="space-y-6 animate-in fade-in duration-300 pb-8">
              
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-stone-900">Accessibility</h3>
                <ul className="space-y-3 text-sm text-stone-700">
                  {place.wheelchairAccessibleEntrance !== undefined && (
                    <li className="flex items-center gap-3">
                      {place.wheelchairAccessibleEntrance ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                      <span className={place.wheelchairAccessibleEntrance ? '' : 'line-through text-stone-400'}>Wheelchair-accessible entrance</span>
                    </li>
                  )}
                  {place.wheelchairAccessibleEntrance === undefined && (
                    <li className="text-stone-400 italic">No accessibility data available</li>
                  )}
                </ul>
              </div>

              <div className="w-full h-px bg-stone-100" />

              <div className="space-y-3">
                <h3 className="font-bold text-sm text-stone-900">Service options</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-stone-700">
                  {place.takeout !== undefined && (
                    <div className="flex items-center gap-3">
                      {place.takeout ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                      <span className={place.takeout ? '' : 'line-through text-stone-400'}>Takeaway</span>
                    </div>
                  )}
                  {place.delivery !== undefined && (
                    <div className="flex items-center gap-3">
                      {place.delivery ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                      <span className={place.delivery ? '' : 'line-through text-stone-400'}>Delivery</span>
                    </div>
                  )}
                  {place.dineIn !== undefined && (
                    <div className="flex items-center gap-3">
                      {place.dineIn ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                      <span className={place.dineIn ? '' : 'line-through text-stone-400'}>Dine-in</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full h-px bg-stone-100" />

              <div className="space-y-3">
                <h3 className="font-bold text-sm text-stone-900">Offerings</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-stone-700">
                  {place.servesBeer !== undefined && (
                    <div className="flex items-center gap-3">
                      {place.servesBeer ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                      <span className={place.servesBeer ? '' : 'line-through text-stone-400'}>Beer</span>
                    </div>
                  )}
                  {place.servesWine !== undefined && (
                    <div className="flex items-center gap-3">
                      {place.servesWine ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                      <span className={place.servesWine ? '' : 'line-through text-stone-400'}>Wine</span>
                    </div>
                  )}
                  {place.servesVegetarianFood !== undefined && (
                    <div className="flex items-center gap-3">
                      {place.servesVegetarianFood ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                      <span className={place.servesVegetarianFood ? '' : 'line-through text-stone-400'}>Vegetarian food</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full h-px bg-stone-100" />

              <div className="space-y-3">
                <h3 className="font-bold text-sm text-stone-900">Dining options</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-stone-700">
                  {place.servesBreakfast !== undefined && (
                    <div className="flex items-center gap-3">
                      {place.servesBreakfast ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                      <span className={place.servesBreakfast ? '' : 'line-through text-stone-400'}>Breakfast</span>
                    </div>
                  )}
                  {place.servesBrunch !== undefined && (
                    <div className="flex items-center gap-3">
                      {place.servesBrunch ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                      <span className={place.servesBrunch ? '' : 'line-through text-stone-400'}>Brunch</span>
                    </div>
                  )}
                  {place.servesLunch !== undefined && (
                    <div className="flex items-center gap-3">
                      {place.servesLunch ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                      <span className={place.servesLunch ? '' : 'line-through text-stone-400'}>Lunch</span>
                    </div>
                  )}
                  {place.servesDinner !== undefined && (
                    <div className="flex items-center gap-3">
                      {place.servesDinner ? <Check size={16} className="text-stone-900" /> : <X size={16} className="text-red-500" />}
                      <span className={place.servesDinner ? '' : 'line-through text-stone-400'}>Dinner</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer for new finds */}
        {place.isNewFind && (
          <div className="p-4 border-t border-stone-100 bg-stone-50 shrink-0">
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
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md"
            >
              {isSubmitting ? 'Contributing...' : 'Add to FUZO'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
