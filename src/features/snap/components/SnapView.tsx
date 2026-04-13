/**
 * ============================================================================
 * SNAP STUDIO — Sequential Full-Screen Wizard
 * ============================================================================
 * 
 * 7-step immersive Snap creation flow:
 *   0. Source   — Camera capture or file upload
 *   1. Location — Interactive Google Maps "Fuzo Pin"
 *   2. Identity — Restaurant name + Cuisine selector
 *   3. Story    — Star rating + description
 *   4. Reveal   — Neural Synthesis loading state
 *   5. Review   — Studio Card preview
 *   6. Finish   — Success + Post to Feed
 * 
 * @see docs/GUIDES/SNAP_STUDIO_READY_RECKONER.md
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Star, MapPin, X, Check, CheckCircle2, Loader2,
  Send, RefreshCw, Sparkles, Image as ImageIcon,
} from 'lucide-react';
import { UGC_CUISINES, normalizeTag, TAXONOMY_KEYWORD_MAP } from '../../../shared/utils/taxonomy';
import { Badge } from '../../../shared/ui/Badge';
import { StudioStepper } from '../../../shared/ui/StudioStepper';
import { loadUploadedImage, parseAiJson } from '../../../shared/lib/studioHelpers';
import { persistSnapData } from '../services/snapPersistence';
import { GeminiService } from '../../../services/geminiService';
import { PlacesService } from '../../../services/placesService';
import { FeedService } from '../../feed';
import type { AppItem } from '../../../shared/types/appItem';


// ---------------------------------------------------------------------------
// Hybrid Autotagging — local keyword extraction
// ---------------------------------------------------------------------------

const extractLocalTags = (description: string): string[] => {
  const found: string[] = [];
  const lower = description.toLowerCase();
  Object.entries(TAXONOMY_KEYWORD_MAP).forEach(([keyword, tag]) => {
    if (lower.includes(keyword.toLowerCase())) {
      found.push(tag);
    }
  });
  return [...new Set(found)];
};


// ---------------------------------------------------------------------------
// Step 1 — Location Pin (Full-Screen Google Map)
// ---------------------------------------------------------------------------

const LocationPinStep = ({ location, onUpdate, onNext }: { location: any, onUpdate: (lat: number, lng: number) => void, onNext: () => void }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState('Pinpoint your discovery...');

  useEffect(() => {
    const google = (window as any).google;
    if (!google || !mapRef.current) return;

    const initialPos = location || { lat: 40.7128, lng: -74.0060 };
    const map = new google.maps.Map(mapRef.current, {
      center: initialPos,
      zoom: 15,
      disableDefaultUI: true,
      styles: [
        { featureType: "all", elementType: "labels.text.fill", textColor: "#ffffff" },
        { featureType: "all", elementType: "labels.text.stroke", visibility: "off" },
        { featureType: "landscape", elementType: "all", fillColor: "#1c1c1c" },
        { featureType: "poi", elementType: "all", visibility: "off" },
        { featureType: "road", elementType: "all", fillColor: "#2c2c2c" },
        { featureType: "water", elementType: "all", fillColor: "#000000" }
      ]
    });

    const marker = new google.maps.Marker({
      position: initialPos,
      map,
      draggable: true,
      animation: google.maps.Animation.DROP,
      icon: {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 10,
        fillColor: '#facc15',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      }
    });

    const updateAddress = async (lat: number, lng: number) => {
      const geocoder = new google.maps.Geocoder();
      try {
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results[0]) {
          setAddress(response.results[0].formatted_address);
        }
      } catch (e) {
        console.error(e);
      }
    };

    updateAddress(initialPos.lat, initialPos.lng);

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      onUpdate(pos.lat(), pos.lng());
      updateAddress(pos.lat(), pos.lng());
    });

    map.addListener('click', (e: any) => {
      marker.setPosition(e.latLng);
      onUpdate(e.latLng.lat(), e.latLng.lng());
      updateAddress(e.latLng.lat(), e.latLng.lng());
    });
  }, []);

  return (
    <div className="fixed inset-0 z-[250] bg-stone-950 flex flex-col overflow-hidden">
      <div ref={mapRef} className="flex-grow w-full" />
      <div className="absolute inset-x-0 bottom-0 p-8 pt-12 bg-gradient-to-t from-stone-950 via-stone-950/90 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto space-y-8 pointer-events-auto">
          <div className="space-y-4 text-center">
            <Badge color="yellow">Fuzo Pin</Badge>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Where was it?</h2>
            <p className="text-stone-400 font-bold text-xs uppercase tracking-[0.2em] px-4 truncate">{address}</p>
          </div>
          <button onClick={onNext} className="w-full py-7 bg-white text-stone-950 rounded-[3rem] font-black uppercase tracking-widest text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
            Next: Identity
          </button>
        </div>
      </div>
    </div>
  );
};


// ---------------------------------------------------------------------------
// Step 2 — Identity (Restaurant Name + Cuisine)
// ---------------------------------------------------------------------------

const IdentityStep = ({ restaurant, cuisine, onUpdate, onNext }: { restaurant: string, cuisine: string, onUpdate: (data: any) => void, onNext: () => void }) => {
  return (
    <div className="fixed inset-0 z-[250] bg-stone-950 p-8 flex flex-col justify-center animate-in slide-in-from-right duration-500">
      <div className="max-w-md mx-auto w-full space-y-12">
        <div className="space-y-4 text-center">
          <Badge color="yellow">Identity</Badge>
          <h2 className="text-5xl font-black uppercase tracking-tighter italic text-white leading-none">The Spot</h2>
        </div>
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 ml-6">Restaurant Name</label>
            <input autoFocus value={restaurant} onChange={(e) => onUpdate({ restaurant: e.target.value })} placeholder="e.g. Sushi Zen" className="w-full bg-stone-900/50 border-2 border-white/5 px-8 py-6 rounded-[2.5rem] font-black text-white text-xl uppercase tracking-tighter outline-none focus:border-yellow-400 focus:bg-stone-900 transition-all placeholder:text-stone-800" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 ml-6">Cuisine</label>
            <div className="grid grid-cols-2 gap-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
              {UGC_CUISINES.map((c) => (
                <button key={c} onClick={() => onUpdate({ cuisine: c })} className={`py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${cuisine === c ? 'bg-yellow-400 text-stone-950 border-yellow-400' : 'bg-stone-900 text-stone-400 border-white/5'}`}>{c}</button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={onNext} disabled={!restaurant || !cuisine} className={`w-full py-7 rounded-[3rem] font-black uppercase tracking-widest text-sm shadow-2xl transition-all ${restaurant && cuisine ? 'bg-white text-stone-950 hover:scale-[1.02] active:scale-95' : 'bg-stone-900 text-stone-700 cursor-not-allowed'}`}>
          Next: Experience
        </button>
      </div>
    </div>
  );
};


// ---------------------------------------------------------------------------
// Step 3 — Experience (Rating + Description)
// ---------------------------------------------------------------------------

const ExperienceStep = ({ rating, description, onUpdate, onNext }: { rating: number, description: string, onUpdate: (data: any) => void, onNext: () => void }) => {
  return (
    <div className="fixed inset-0 z-[250] bg-stone-950 p-8 flex flex-col justify-center animate-in slide-in-from-right duration-500">
      <div className="max-w-md mx-auto w-full space-y-12">
        <div className="space-y-4 text-center">
          <Badge color="stone">Story</Badge>
          <h2 className="text-5xl font-black uppercase tracking-tighter italic text-white leading-none">The Vibe</h2>
        </div>
        <div className="space-y-12">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => onUpdate({ rating: s })} className="p-2 transition-transform active:scale-90">
                  <Star size={44} fill={s <= rating ? "#facc15" : "none"} className={s <= rating ? "text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" : "text-stone-800"} />
                </button>
              ))}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500">Rate your experience</p>
          </div>
          <div className="space-y-3">
            <textarea autoFocus value={description} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="Describe the discovery..." className="w-full bg-stone-900/50 border-2 border-white/5 px-8 py-6 rounded-[2.5rem] font-bold text-white text-lg outline-none focus:border-white/20 focus:bg-stone-900 transition-all h-40 resize-none placeholder:text-stone-800" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 ml-6">AI will derive tags from your description</p>
          </div>
        </div>
        <button onClick={onNext} disabled={!description || description.length < 5} className={`w-full py-7 rounded-[3rem] font-black uppercase tracking-widest text-sm shadow-2xl transition-all ${description.length >= 5 ? 'bg-yellow-400 text-stone-950 hover:scale-[1.02] active:scale-95' : 'bg-stone-900 text-stone-700 cursor-not-allowed'}`}>
          Neural Sync
        </button>
      </div>
    </div>
  );
};


// ---------------------------------------------------------------------------
// Step 4 — Neural Reveal (Loading)
// ---------------------------------------------------------------------------

const NeuralRevealStep = ({ onNext }: { onNext: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onNext, 2500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="fixed inset-0 z-[250] bg-stone-950 flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in zoom-in-95 duration-700">
      <Sparkles size={80} className="text-yellow-400 animate-pulse" />
      <h2 className="text-5xl font-black uppercase tracking-tighter italic text-white leading-none">Neural Synthesis</h2>
      <div className="flex justify-center gap-1">
        {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />)}
      </div>
    </div>
  );
};


// ---------------------------------------------------------------------------
// Step 5 — Review (Studio Card Preview)
// ---------------------------------------------------------------------------

const ReviewStep = ({ image, data, onEdit, onLock, isUploading }: { image: string, data: any, onEdit: () => void, onLock: () => void, isUploading: boolean }) => {
  return (
    <div className="fixed inset-0 z-[250] bg-stone-950 p-8 flex flex-col items-center justify-center space-y-12 animate-in zoom-in-95 duration-500 overflow-y-auto">
      <div className="space-y-4 text-center">
        <Badge color="yellow">Locked & Loaded</Badge>
        <h2 className="text-5xl font-black uppercase tracking-tighter italic text-white leading-none">Culinary Snap Card</h2>
      </div>
      <div className="max-w-xl w-full">
        <div className="relative aspect-[9/16] rounded-[2rem] overflow-hidden bg-stone-900 shadow-2xl border-[10px] border-white">
          <img src={image} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          <div className="absolute top-8 left-8 flex flex-wrap gap-2 pr-10">
            <Badge color="yellow">{data.cuisine}</Badge>
            {data.tags?.slice(0, 3).map((t: string) => <Badge key={t} color="stone">{t}</Badge>)}
          </div>
          <div className="absolute bottom-12 left-8 right-24 text-white space-y-3">
            <h3 className="text-3xl font-black uppercase tracking-tighter leading-tight">{data.restaurant}</h3>
            <p className="text-sm font-bold text-white/80 line-clamp-3 italic leading-relaxed">"{data.description}"</p>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
               <MapPin size={12} /> {data.address?.split(',')[0]}
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <button onClick={onEdit} className="px-8 py-5 bg-white/10 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs border border-white/5">Edit</button>
          <button onClick={onLock} disabled={isUploading} className="flex-grow py-5 bg-white text-stone-900 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
            {isUploading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
            Confirm & Publish
          </button>
        </div>
      </div>
    </div>
  );
};


// ---------------------------------------------------------------------------
// Step 6 — Success
// ---------------------------------------------------------------------------

const SuccessStep = ({ isPosting, postSuccess, onPostToFeed, onClose }: { isPosting: boolean, postSuccess: boolean, onPostToFeed: () => void, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[250] bg-emerald-500 flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in duration-700">
      <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-2xl">
        <Check size={80} strokeWidth={4} />
      </div>
      <h2 className="text-6xl font-black uppercase tracking-tighter italic text-white leading-none">Snap Locked</h2>
      <div className="max-w-md w-full space-y-4 pt-12">
        <button onClick={onPostToFeed} disabled={isPosting || postSuccess} className={`w-full py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-sm shadow-2xl flex items-center justify-center gap-4 border-4 transition-all ${postSuccess ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-stone-900 text-white border-white/20'}`}>
          {isPosting ? <Loader2 className="animate-spin" /> : postSuccess ? <Check size={20} /> : <Send size={20} />}
          {isPosting ? 'Syndicating...' : postSuccess ? 'Posted' : 'Post to Feed'}
        </button>
        <button onClick={onClose} className="w-full py-6 bg-white text-emerald-600 rounded-[2.5rem] font-black uppercase tracking-widest text-sm">Done</button>
      </div>
    </div>
  );
};


// ---------------------------------------------------------------------------
// Main Orchestrator
// ---------------------------------------------------------------------------

const SnapStudio = ({ onPost, onClose }: { onPost: (item: AppItem) => void, onClose: () => void }) => {
  const STUDIO_STEPS = ['Source', 'Location', 'Identity', 'Story', 'Reveal', 'Review', 'Finish'];
  const [currentStep, setCurrentStep] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPostingToFeed, setIsPostingToFeed] = useState(false);
  const [feedPostSuccess, setFeedPostSuccess] = useState(false);
  const [snapData, setSnapData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1920 } }
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (currentStep === 0) {
      startCamera();
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLocation({ lat, lng });
          
          try {
            const result = await PlacesService.searchNearby(lat, lng, 100);
            if (result.success && result.data?.results?.length) {
              setNearbyPlaces(result.data.results);
              const place = result.data.results[0];
              setSnapData((prev: any) => ({
                ...prev,
                address: place.vicinity || place.formatted_address || prev?.address || '',
              }));
            }
          } catch (err) {
            console.warn('Auto-geocoding failed:', err);
          }
        },
        (err) => console.warn('Location error:', err),
        { enableHighAccuracy: true }
      );
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [currentStep]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.85));
      setCurrentStep(1); 
    }
  };

  const handleNeuralAnalysis = async () => {
    if (!snapData?.description) return;
    setIsAnalyzing(true);
    try {
      const localTags = extractLocalTags(snapData.description);
      const placesContext = nearbyPlaces?.length 
        ? `Nearby: ${nearbyPlaces.slice(0, 3).map(p => p.name).join(', ')}` 
        : '';

      const prompt = `Analyze this culinary discovery: "${snapData.description}". ${placesContext}
      Extract structured tags into these buckets:
      - cuisine (must be ONE from ${UGC_CUISINES.join(', ')})
      - dietary (e.g. Vegetarian, Vegan, Halal)
      - meal_type (e.g. Brunch, Dinner)
      - ambience (e.g. Rooftop, Casual, Fine Dining)
      - features (e.g. Live Music, WiFi)
      - price_range ($, $$, $$$, $$$$)
      
      Suggest 5 additional creative tags.
      Return JSON: { cuisine, dietary, meal_type, ambience, features, price_range, creative_tags }`;
      
      const response = await GeminiService.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        config: { responseMimeType: 'application/json' }
      });

      if (response.success && response.data?.text) {
        const parsed = parseAiJson(response.data.text);
        const combinedTags = [
          ...localTags,
          ...(parsed.dietary || []),
          ...(parsed.meal_type || []),
          ...(parsed.ambience || []),
          ...(parsed.features || []),
          ...(parsed.creative_tags || []),
          parsed.price_range
        ].filter(Boolean).map(normalizeTag);

        setSnapData((prev: any) => ({
          ...prev,
          tags: [...new Set(combinedTags)],
          cuisine: normalizeTag(parsed.cuisine) || prev.cuisine
        }));
      }
    } catch (err) {
      console.warn('Neural analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await loadUploadedImage(file, setCapturedImage, () => setCurrentStep(1));
      } catch (error) {
        console.warn('Failed to read uploaded image', error);
      }
    }
  };

  const handleFinish = async (publishToFeed: boolean = false) => {
    if (!capturedImage || !snapData) return;
    setIsUploading(true);
    try {
      const snapId = `snap-${Date.now()}`;
      const snapItem = await persistSnapData({
        snapId,
        imageData: capturedImage,
        ...snapData,
        location,
      });
      
      onPost(snapItem);
      
      if (publishToFeed) {
        setIsPostingToFeed(true);
        try {
          const result = await FeedService.publishToFeed(snapItem);
          if (result.success) setFeedPostSuccess(true);
        } finally {
          setIsPostingToFeed(false);
        }
      }
      setCurrentStep(6); 
    } catch (err) {
      console.error('Failed to persist snap:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[200] bg-black text-white flex flex-col overflow-hidden">
      <header className="p-8 border-b border-white/5 bg-stone-950/50 backdrop-blur-xl shrink-0 flex items-center justify-between z-30">
        <StudioStepper steps={STUDIO_STEPS} currentStep={currentStep} className="flex-grow max-w-2xl mx-auto" />
        <button onClick={onClose} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-colors">
          <X size={24} />
        </button>
      </header>

      <div className="flex-grow relative overflow-hidden">
        {currentStep === 0 && (
          <div className="h-full flex flex-col relative animate-in fade-in duration-500">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <footer className="absolute bottom-12 inset-x-0 flex justify-around items-center z-20 px-8">
              <label className="w-16 h-16 bg-white/10 backdrop-blur-3xl rounded-3xl flex items-center justify-center text-white cursor-pointer border border-white/20">
                <ImageIcon size={28} />
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
              <button onClick={handleCapture} className="w-32 h-32 rounded-full border-[10px] border-white/30 bg-white/10 shadow-2xl backdrop-blur-xl active:scale-90 transition-transform flex items-center justify-center group">
                <div className="w-20 h-20 bg-white rounded-full" />
              </button>
              <button className="w-16 h-16 bg-white/10 backdrop-blur-3xl rounded-3xl flex items-center justify-center text-white border border-white/20">
                <RefreshCw size={28} />
              </button>
            </footer>
          </div>
        )}

        {currentStep === 1 && capturedImage && (
          <LocationPinStep location={location} onUpdate={(lat, lng) => setLocation({ lat, lng })} onNext={() => setCurrentStep(2)} />
        )}
        {currentStep === 2 && (
          <IdentityStep restaurant={snapData?.restaurant || ''} cuisine={snapData?.cuisine || ''} onUpdate={(data) => setSnapData((prev: any) => ({ ...prev, ...data }))} onNext={() => setCurrentStep(3)} />
        )}
        {currentStep === 3 && (
          <ExperienceStep rating={snapData?.rating || 5} description={snapData?.description || ''} onUpdate={(data) => setSnapData((prev: any) => ({ ...prev, ...data }))} onNext={() => { setCurrentStep(4); handleNeuralAnalysis(); }} />
        )}
        {currentStep === 4 && <NeuralRevealStep onNext={() => setCurrentStep(5)} />}
        {currentStep === 5 && snapData && (
          <ReviewStep image={capturedImage!} data={snapData} onEdit={() => setCurrentStep(2)} onLock={() => handleFinish(false)} isUploading={isUploading} />
        )}
        {currentStep === 6 && (
          <SuccessStep isPosting={isPostingToFeed} postSuccess={feedPostSuccess} onPostToFeed={() => handleFinish(true)} onClose={onClose} />
        )}
      </div>
    </div>
  );
};


// ---------------------------------------------------------------------------
// Public Export
// ---------------------------------------------------------------------------

export const SnapView = ({ onPost, onClose }: { onPost: (item: AppItem) => void, onClose: () => void }) => {
  return <SnapStudio onPost={onPost} onClose={onClose} />;
};
