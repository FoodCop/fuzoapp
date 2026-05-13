import React, { useState, useEffect, useRef } from 'react';
import { 
  X, MapPin, ChevronRight, ChevronLeft, Star, Camera, 
  Upload, Clock, Check, Loader2, Search, Trash2, Plus
} from 'lucide-react';
import { getGoogleMaps } from '../types/scoutUi';
import { UGC_CUISINES } from '../../../shared/utils/taxonomy';
import { Badge } from '../../../shared/ui/Badge';
import { StudioStepper } from '../../../shared/ui/StudioStepper';
import { readImageFileAsDataUrl } from '../../../shared/lib/studioHelpers';
import { ScoutPersistence } from '../services/scoutPersistence';
import { supabase } from '../../../services/supabaseClient';

interface ScoutAddPinModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialCoordinates?: { lat: number; lng: number };
}

const STEPS = ['Search', 'Pin', 'Identity', 'Photos', 'Details', 'Done'];

export const ScoutAddPinModal = ({ onClose, onSuccess, initialCoordinates }: ScoutAddPinModalProps) => {
  const [currentStep, setCurrentStep] = useState(initialCoordinates ? 2 : 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [coordinates, setCoordinates] = useState(initialCoordinates || { lat: 40.7128, lng: -74.0060 });
  const [address, setAddress] = useState('');
  const [identity, setIdentity] = useState({ name: '', cuisine: '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [details, setDetails] = useState({
    rating: 5,
    review: '',
    hours: {
      monday: '09:00 - 22:00',
      tuesday: '09:00 - 22:00',
      wednesday: '09:00 - 22:00',
      thursday: '09:00 - 22:00',
      friday: '09:00 - 23:00',
      saturday: '10:00 - 23:00',
      sunday: '10:00 - 21:00',
    }
  });

  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // --- Step 0: Autocomplete Logic ---
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (currentStep === 0 && autocompleteInputRef.current) {
      const google = getGoogleMaps();
      if (!google || !google.places) return;

      const autocomplete = new google.places.Autocomplete(autocompleteInputRef.current, {
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['establishment', 'geocode']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setCoordinates({ lat, lng });
          setAddress(place.formatted_address || place.name || '');
          if (place.name) {
            setIdentity(prev => ({ ...prev, name: place.name }));
          }
          setCurrentStep(1);
        }
      });

      autocompleteRef.current = autocomplete;
    }
  }, [currentStep]);

  const handleManualSearch = async () => {
    if (!address) return;
    setIsLoading(true);
    const google = getGoogleMaps();
    if (!google) return;

    const geocoder = new google.Geocoder();
    try {
      const response = await geocoder.geocode({ address });
      if (response.results?.[0]) {
        const { lat, lng } = response.results[0].geometry.location;
        setCoordinates({ lat: lat(), lng: lng() });
        setAddress(response.results[0].formatted_address);
        setCurrentStep(1);
      } else {
        setError('Could not find this location.');
      }
    } catch (err) {
      setError('Geocoding service failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Step 2: Map Pinning Logic ---
  useEffect(() => {
    if (currentStep === 1 && mapRef.current && !mapInstanceRef.current) {
      const google = getGoogleMaps();
      if (!google) return;

      const map = new google.Map(mapRef.current, {
        center: coordinates,
        zoom: 15,
        disableDefaultUI: true,
        styles: [
          { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#ffffff' }] },
          { featureType: 'landscape', elementType: 'all', stylers: [{ color: '#1c1c1c' }] },
          { featureType: 'water', elementType: 'all', stylers: [{ color: '#000000' }] },
          { featureType: 'road', elementType: 'all', stylers: [{ color: '#2c2c2c' }] },
          { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
        ]
      });

      const marker = new google.Marker({
        position: coordinates,
        map,
        draggable: true,
        animation: google.Animation.DROP,
        icon: {
          path: google.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 10,
          fillColor: '#facc15',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        }
      });

      const geocoder = new google.Geocoder();
      const updateAddress = async (pos: { lat: number, lng: number }) => {
        try {
          const res = await geocoder.geocode({ location: pos });
          if (res.results?.[0]) setAddress(res.results[0].formatted_address);
        } catch (e) {}
      };

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        const newPos = { lat: pos.lat(), lng: pos.lng() };
        setCoordinates(newPos);
        updateAddress(newPos);
      });

      map.addListener('click', (e: any) => {
        const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        marker.setPosition(newPos);
        setCoordinates(newPos);
        updateAddress(newPos);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }
  }, [currentStep]);

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.panTo(coordinates);
      markerRef.current.setPosition(coordinates);
    }
  }, [coordinates]);

  // --- Persistence ---
  const handleFinalSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error('You must be logged in to pin a location');

      const result = await ScoutPersistence.saveScoutFind(userId, {
        name: identity.name,
        category: identity.cuisine,
        lat: coordinates.lat,
        lng: coordinates.lng,
        address: address,
        notes: details.review,
        photos: photos,
        timings: details.hours,
        rating: details.rating,
        tags: [identity.cuisine, 'Community Discovery']
      });

      if (result.success) {
        setCurrentStep(5);
      } else {
        throw new Error(result.error || 'Failed to save discovery');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-stone-950 text-white flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Header */}
      <header className="p-8 border-b border-white/5 bg-stone-900/50 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-6 flex-grow">
          <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
            <X size={24} />
          </button>
          <StudioStepper steps={STEPS} currentStep={currentStep} className="flex-grow max-w-xl" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-grow relative overflow-y-auto hide-scrollbar">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[310] bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 animate-in slide-in-from-top">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={18} /></button>
          </div>
        )}

        {/* --- STEP 0: SEARCH --- */}
        {currentStep === 0 && (
          <div className="max-w-md mx-auto h-full flex flex-col justify-center p-8 space-y-12 animate-in slide-in-from-bottom duration-500">
            <div className="space-y-4 text-center">
              <Badge color="yellow">Scout Pin</Badge>
              <h2 className="text-5xl font-black uppercase tracking-tighter italic leading-tight">Find the Spot</h2>
              <p className="text-stone-500 font-bold text-xs uppercase tracking-[0.2em]">Search for a restaurant or address</p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 ml-6">Location Search</label>
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-500" size={20} />
                  <input 
                    ref={autocompleteInputRef}
                    autoFocus
                    placeholder="e.g. Nobu New York or 123 Main St"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-stone-900/50 border-2 border-white/5 pl-16 pr-8 py-6 rounded-[2.5rem] font-bold text-xl uppercase tracking-tighter outline-none focus:border-yellow-400 focus:bg-stone-900 transition-all"
                  />
                </div>
              </div>
              <p className="text-[10px] font-bold text-stone-700 uppercase tracking-widest text-center px-10 leading-relaxed">
                Start typing to see suggestions. Selecting a suggestion will automatically pinpoint it on the map.
              </p>
            </div>

            <button 
              onClick={handleManualSearch}
              disabled={!address || isLoading}
              className={`w-full py-7 rounded-[3rem] font-black uppercase tracking-widest text-sm shadow-2xl transition-all flex items-center justify-center gap-3 ${
                address ? 'bg-white text-stone-950 hover:scale-[1.02] active:scale-95' : 'bg-stone-900 text-stone-700 cursor-not-allowed'
              }`}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <>Next: Pinpoint <ChevronRight size={18} /></>}
            </button>
          </div>
        )}

        {/* --- STEP 1: PINPOINT --- */}
        {currentStep === 1 && (
          <div className="h-full flex flex-col relative animate-in fade-in duration-700">
            <div ref={mapRef} className="flex-grow w-full" />
            <div className="absolute inset-x-0 bottom-0 p-8 pt-12 bg-gradient-to-t from-stone-950 via-stone-950/90 to-transparent pointer-events-none">
              <div className="max-w-md mx-auto space-y-6 pointer-events-auto">
                <div className="space-y-3 text-center">
                  <Badge color="yellow">Fuzo Pin</Badge>
                  <p className="text-stone-300 font-bold text-xs uppercase tracking-[0.15em] px-4 truncate">{address}</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setCurrentStep(0)} className="w-1/3 py-6 bg-white/10 text-white rounded-[2.5rem] font-black uppercase tracking-widest text-xs border border-white/5">Back</button>
                  <button onClick={() => setCurrentStep(2)} className="flex-grow py-6 bg-white text-stone-950 rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">Next: Identity</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- STEP 2: IDENTITY --- */}
        {currentStep === 2 && (
          <div className="max-w-md mx-auto h-full flex flex-col justify-center p-8 space-y-10 animate-in slide-in-from-right duration-500">
            <div className="space-y-4 text-center">
              <Badge color="stone">Identity</Badge>
              <h2 className="text-5xl font-black uppercase tracking-tighter italic leading-none">The Spot</h2>
            </div>
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 ml-6">Restaurant Name</label>
                <input 
                  autoFocus 
                  placeholder="e.g. Mama Mia's"
                  value={identity.name}
                  onChange={(e) => setIdentity({ ...identity, name: e.target.value })}
                  className="w-full bg-stone-900/50 border-2 border-white/5 px-8 py-6 rounded-[2.5rem] font-black text-white text-xl uppercase tracking-tighter outline-none focus:border-yellow-400 focus:bg-stone-900 transition-all placeholder:text-stone-800"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 ml-6">Cuisine</label>
                <div className="grid grid-cols-2 gap-3 max-h-[35vh] overflow-y-auto pr-2 custom-scrollbar">
                  {UGC_CUISINES.map((c) => (
                    <button 
                      key={c} 
                      onClick={() => setIdentity({ ...identity, cuisine: c })}
                      className={`py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${
                        identity.cuisine === c ? 'bg-yellow-400 text-stone-950 border-yellow-400' : 'bg-stone-900 text-stone-500 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setCurrentStep(1)} className="w-1/3 py-6 bg-white/10 text-white rounded-[2.5rem] font-black uppercase tracking-widest text-xs">Back</button>
              <button 
                onClick={() => setCurrentStep(3)} 
                disabled={!identity.name || !identity.cuisine}
                className={`flex-grow py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-xs transition-all ${
                  identity.name && identity.cuisine ? 'bg-white text-stone-950' : 'bg-stone-900 text-stone-700 cursor-not-allowed'
                }`}
              >
                Next: Photos
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 3: PHOTOS --- */}
        {currentStep === 3 && (
          <div className="max-w-md mx-auto h-full flex flex-col justify-center p-8 space-y-10 animate-in slide-in-from-right duration-500">
            <div className="space-y-4 text-center">
              <Badge color="yellow">Visual Proof</Badge>
              <h2 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Media</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {photos.map((p, idx) => (
                <div key={idx} className="relative aspect-square rounded-3xl overflow-hidden border-2 border-white/10 group">
                  <img src={p} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                    className="absolute top-3 right-3 p-2 bg-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <label className="aspect-square rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 bg-white/5 hover:bg-white/10 cursor-pointer transition-all hover:border-yellow-400/50">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-stone-400">
                    <Plus size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">Add Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const img = await readImageFileAsDataUrl(file);
                        setPhotos(prev => [...prev, img]);
                      } catch (err) {}
                    }
                  }} />
                </label>
              )}
            </div>

            <div className="flex gap-4 pt-8">
              <button onClick={() => setCurrentStep(2)} className="w-1/3 py-6 bg-white/10 text-white rounded-[2.5rem] font-black uppercase tracking-widest text-xs">Back</button>
              <button onClick={() => setCurrentStep(4)} className="flex-grow py-6 bg-white text-stone-950 rounded-[2.5rem] font-black uppercase tracking-widest text-xs">Next: Details</button>
            </div>
          </div>
        )}

        {/* --- STEP 4: DETAILS (Rating + Review + Hours) --- */}
        {currentStep === 4 && (
          <div className="max-w-2xl mx-auto h-full flex flex-col p-8 space-y-12 animate-in slide-in-from-right duration-500 py-20">
            <div className="space-y-4 text-center">
              <Badge color="stone">Final Meta</Badge>
              <h2 className="text-6xl font-black uppercase tracking-tighter italic leading-none">Insights</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="flex flex-col items-center gap-4 py-8 bg-stone-900/30 rounded-[2.5rem]">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setDetails({...details, rating: s})} className="transition-transform active:scale-90">
                        <Star size={32} fill={s <= details.rating ? "#facc15" : "none"} className={s <= details.rating ? "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]" : "text-stone-800"} />
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600">Master Rating</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 ml-6">Personal Review</label>
                  <textarea 
                    placeholder="Tell the community about your discovery..."
                    value={details.review}
                    onChange={(e) => setDetails({...details, review: e.target.value})}
                    className="w-full bg-stone-900/50 border-2 border-white/5 px-8 py-6 rounded-[2.5rem] font-medium text-white outline-none focus:border-white/20 focus:bg-stone-900 transition-all h-48 resize-none"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2 ml-4">
                  <Clock size={16} className="text-yellow-400" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-stone-400">Opening Hours</span>
                </div>
                <div className="bg-stone-900/40 rounded-[2.5rem] p-6 space-y-4 border border-white/5">
                  {Object.entries(details.hours).map(([day, time]) => (
                    <div key={day} className="flex items-center justify-between group">
                      <span className="text-[11px] font-black uppercase text-stone-500 group-hover:text-stone-300 transition-colors">{day.slice(0, 3)}</span>
                      <input 
                        value={time} 
                        onChange={(e) => setDetails({
                          ...details, 
                          hours: { ...details.hours, [day]: e.target.value }
                        })}
                        className="bg-transparent border-b border-white/5 text-[11px] font-bold text-white text-right outline-none focus:border-yellow-400/50 py-1 transition-all w-32"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[9px] font-bold text-stone-700 uppercase tracking-widest text-center">Format: HH:MM - HH:MM or "Closed"</p>
              </div>
            </div>

            <div className="flex gap-4 sticky bottom-0 bg-stone-950 py-8">
              <button onClick={() => setCurrentStep(3)} className="w-1/3 py-7 bg-white/10 text-white rounded-[3rem] font-black uppercase tracking-widest text-xs">Back</button>
              <button 
                onClick={handleFinalSubmit}
                disabled={isLoading}
                className="flex-grow py-7 bg-white text-stone-950 rounded-[3rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <>Lock Discovery <Check size={20} /></>}
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 5: SUCCESS --- */}
        {currentStep === 5 && (
          <div className="fixed inset-0 z-[350] bg-emerald-500 flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-2xl border-[12px] border-emerald-400/50 animate-bounce">
              <Check size={80} strokeWidth={4} />
            </div>
            <div className="space-y-4">
              <h2 className="text-7xl font-black uppercase tracking-tighter italic text-white leading-none">Pin Locked</h2>
              <p className="text-emerald-100 font-bold text-sm uppercase tracking-widest">Discovery successfully syndicated to FUZO community</p>
            </div>
            <button 
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="mt-12 px-16 py-7 bg-white text-emerald-600 rounded-[3rem] font-black uppercase tracking-widest text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              Back to Scout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
