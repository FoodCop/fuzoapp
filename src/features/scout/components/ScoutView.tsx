
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  MapPin, RefreshCw, LayoutGrid, Sparkles, X, Star, Clock, Info, 
  List, Bookmark, Share2, Plus, ArrowRight, Zap, PlayCircle, Search
} from 'lucide-react';
import { Badge } from '../../../shared/ui/Badge';
import { API_KEYS } from '../../../shared/constants/apiKeys';
import { 
  getGoogleMaps 
} from '../types/scoutUi';
import type { 
  ScoutPlace, 
  MapLike, 
  MarkerLike,
  ScoutFilter
} from '../types/scoutUi';
import { 
  SCOUT_FALLBACK_PLACES, 
  calculateNeuralMatch, 
  filterPlaces, 
  sortPlaces,
  toScoutPlace
} from '../lib/scoutLogic';
import { ScoutDiscoveryPanel } from './ScoutDiscoveryPanel';
import { ScoutPlaceModal } from './ScoutPlaceModal';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { supabase, hasSupabaseConfig } from '../../../services/supabaseClient';

type ScoutTab = 'main' | 'fuzo' | 'my';

const shouldApplyLatestRequest = (
  mounted: { current: boolean },
  seq: number,
  ref: { current: number }
) => mounted.current && seq === ref.current;

export const ScoutView = ({ 
  mapsApiKey = API_KEYS.MAPS,
  savedItems = [],
  onAction 
}: { 
  mapsApiKey?: string;
  savedItems?: any[];
  onAction: (item: any, action: 'save' | 'share') => void;
}) => {
  const [scoutTab, setScoutTab] = useState<ScoutTab>('main');
  const [mainMapPlaces, setMainMapPlaces] = useState<ScoutPlace[]>([]);
  const [communitySnapPlaces, setCommunitySnapPlaces] = useState<ScoutPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<ScoutPlace | null>(null);
  const [modalTab, setModalTab] = useState('overview');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [filter, setFilter] = useState<ScoutFilter>({
    type: 'all',
    rating: 0,
    openNow: false,
    maxDistance: 5000,
    sortBy: 'match'
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLike | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const requestSeq = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const fetchPlaces = useCallback(async (map: MapLike) => {
    if (!mapsApiKey) return;
    setIsLoading(true);
    const seq = ++requestSeq.current;

    try {
      const google = getGoogleMaps();
      if (!google) throw new Error('Google Maps not loaded');

      const center = (map as any).getCenter();
      const lat = typeof center.lat === 'function' ? center.lat() : center.lat;
      const lng = typeof center.lng === 'function' ? center.lng() : center.lng;

      try {
        const { Place } = await (google as any).importLibrary('places');
        const { places } = await Place.searchNearby({
          fields: ['displayName', 'location', 'rating', 'userRatingCount', 'vicinity', 'types', 'photos'],
          locationRestriction: { center: { lat, lng }, radius: 5000 },
          includedPrimaryTypes: ['restaurant', 'cafe', 'bar'],
          maxResultCount: 20,
        });

        if (!shouldApplyLatestRequest(mounted, seq, requestSeq)) return;
        setIsLoading(false);

        if (places && places.length > 0) {
          const transformed = places.map((p: any, i: number) => {
            const loc = p.location;
            return {
              id: p.id || `google-${i}`,
              placeId: p.id,
              markerSource: 'google',
              name: p.displayName || 'Unnamed Place',
              cat: p.types?.[0]?.replace(/_/g, ' ') || 'Restaurant',
              rating: p.rating || 0,
              reviews: p.userRatingCount || 0,
              address: p.vicinity || '',
              phone: '',
              website: '',
              vibe: [],
              img: p.photos?.[0]?.getURI({ maxWidth: 400 }) || '',
              lat: loc?.lat?.() || loc?.lat || 0,
              lng: loc?.lng?.() || loc?.lng || 0,
              timings: {},
              menu: [],
              userReviews: [],
              photos: []
            };
          });
          setMainMapPlaces(transformed);
        } else {
          setMainMapPlaces(SCOUT_FALLBACK_PLACES);
        }
      } catch (innerErr) {
        // Fallback
        const service = new (google as any).places.PlacesService(map);
        service.nearbySearch({
          location: { lat, lng },
          radius: 5000,
          type: ['restaurant', 'cafe', 'bar']
        }, (results: any[], status: any) => {
          if (!shouldApplyLatestRequest(mounted, seq, requestSeq)) return;
          setIsLoading(false);

          if (status === (google as any).places.PlacesServiceStatus.OK && results) {
            const transformed = results.slice(0, 20).map((r, i) => toScoutPlace(r, i, mapsApiKey));
            setMainMapPlaces(transformed);
          } else {
            setMainMapPlaces(SCOUT_FALLBACK_PLACES);
          }
        });
      }
    } catch (err) {
      if (shouldApplyLatestRequest(mounted, seq, requestSeq)) {
        setIsLoading(false);
        setMainMapPlaces(SCOUT_FALLBACK_PLACES);
      }
    }
  }, [mapsApiKey]);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return;
    const loadFuzo = async () => {
      const { data } = await supabase.from('fuzo_locations').select('*').limit(50);
      if (data) {
        setCommunitySnapPlaces(data.map((row, i) => ({
          id: `fuzo-${row.id || i}`,
          markerSource: 'fuzo',
          name: row.location_name || row.restaurant_name || 'FUZO Discovery',
          cat: row.cuisine || 'Spot',
          rating: 4.5,
          reviews: 12,
          address: row.address || '',
          phone: '',
          website: '',
          img: row.photos?.[0] || '',
          lat: Number(row.latitude),
          lng: Number(row.longitude),
          vibe: row.tags || [],
          timings: {},
          menu: [],
          userReviews: [],
          photos: row.photos || []
        })));
      }
    };
    loadFuzo();
  }, []);

  const myMapPlaces = useMemo(() => {
    return savedItems
      .filter(item => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)))
      .map((item, i): ScoutPlace => ({
        id: item.id || `saved-${i}`,
        name: item.name,
        cat: item.cat,
        img: item.img,
        lat: Number(item.lat),
        lng: Number(item.lng),
        markerSource: 'saved' as const,
        rating: 5,
        reviews: 0,
        address: item.address || '',
        phone: item.phone || '',
        website: item.website || '',
        vibe: [],
        timings: {},
        menu: [],
        userReviews: [],
        photos: []
      }));
  }, [savedItems]);

  const activePlaces = useMemo(() => {
    let base = mainMapPlaces;
    if (scoutTab === 'fuzo') base = communitySnapPlaces;
    if (scoutTab === 'my') base = myMapPlaces;
    
    // Apply neural match simulation
    const withMatch = base.map(p => ({
      ...p,
      matchPercentage: calculateNeuralMatch(p)
    }));
    
    return sortPlaces(filterPlaces(withMatch, filter), filter.sortBy);
  }, [scoutTab, mainMapPlaces, communitySnapPlaces, myMapPlaces, filter]);

  useEffect(() => {
    if (!mapRef.current || !mapsApiKey) return;

    const initMap = async () => {
      const google = getGoogleMaps();
      if (!google) return;

      const map = new google.Map(mapRef.current!, {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 13,
        disableDefaultUI: true,
      });

      mapInstanceRef.current = map;
      setIsMapReady(true);
      fetchPlaces(map);

      // Attempt geolocation
      navigator.geolocation.getCurrentPosition((p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        map.setCenter(pos);
        fetchPlaces(map);
      });
    };

    initMap();
  }, [mapsApiKey, fetchPlaces]);

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    const google = getGoogleMaps();
    if (!google) return;

    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }

    const markers = activePlaces.map(place => {
      const marker = new google.Marker({
        position: { lat: place.lat, lng: place.lng },
        label: {
          text: place.matchPercentage ? `${place.matchPercentage}% Match` : place.name,
          color: '#ffffff',
          fontSize: '10px',
          fontWeight: '900',
          className: 'marker-label-premium bg-stone-900/80 px-2 py-1 rounded-full border border-yellow-400/30 backdrop-blur-md'
        },
        icon: {
          path: google.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: place.markerSource === 'fuzo' ? '#facc15' : '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        }
      });

      marker.addListener('click', () => setSelectedPlace(place));
      return marker;
    });

    clustererRef.current = new MarkerClusterer({
      map: mapInstanceRef.current,
      markers
    });

  }, [isMapReady, activePlaces]);

  const handlePlaceSelect = (place: ScoutPlace) => {
    setSelectedPlace(place);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: place.lat, lng: place.lng });
      mapInstanceRef.current.setZoom(16);
    }
  };

  const scoutHeadline = useMemo(() => {
    if (isLoading) return 'Scouting your area...';
    if (activePlaces.length === 0) return 'No matches found';
    return `Discovering ${activePlaces.length} premium spots`;
  }, [isLoading, activePlaces.length]);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-auto space-y-0 md:space-y-8 md:px-4 animate-in fade-in pb-24 md:pb-24 -mx-6 md:mx-0">
      {/* Header with Tabs */}
      <header className="hidden md:flex justify-between items-end px-4">
        <div>
          <Badge color="emerald">Scout v3.0</Badge>
          <h2 className="text-4xl font-black uppercase tracking-tighter mt-1 text-stone-900">FUZO Map Discovery</h2>
        </div>
        <div className="flex bg-stone-100 p-1.5 rounded-2xl">
          {(['main', 'fuzo', 'my'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setScoutTab(tab)}
              className={`px-6 py-2 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${scoutTab === tab ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
            >
              {tab === 'main' ? 'Main Map' : tab === 'fuzo' ? 'FUZO Locations' : 'My Map'}
            </button>
          ))}
        </div>
      </header>

      {/* Mobile Tabs */}
      <div className="flex md:hidden bg-white border-b border-stone-100 sticky top-0 z-30">
        {(['main', 'fuzo', 'my'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setScoutTab(tab)}
            className={`flex-1 py-4 text-[12px] font-black uppercase tracking-widest border-b-2 transition-all ${scoutTab === tab ? 'border-yellow-400 text-stone-900' : 'border-transparent text-stone-400'}`}
          >
            {tab === 'main' ? 'Main' : tab === 'fuzo' ? 'FUZO' : 'My Map'}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-0 md:gap-8 flex-grow">
        {/* Map Area */}
        <div className="lg:col-span-2 h-[60vh] md:h-[50vh] lg:h-[75vh] rounded-none md:rounded-[3.5rem] overflow-hidden border-0 md:border-[12px] border-white shadow-2xl bg-stone-100 relative group">
          <div ref={mapRef} className="absolute inset-0" id="scout-map" />
          
          {/* Map Controls */}
          <div className="absolute top-6 left-6 md:top-8 md:left-8 bg-white/90 backdrop-blur-md rounded-2xl border border-white/50 shadow-lg px-3 py-2.5">
            <div className="flex items-center gap-4 text-[11px] md:text-[11px] font-black uppercase tracking-widest text-stone-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-white"></span>
                <span>FUZO Spots</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white"></span>
                <span>Community</span>
              </div>
            </div>
          </div>

          <div className="absolute top-6 right-6 md:top-8 md:right-8 flex flex-col gap-3">
            <button 
              onClick={() => mapInstanceRef.current && fetchPlaces(mapInstanceRef.current)} 
              className="p-3 md:p-4 bg-white rounded-2xl shadow-xl hover:bg-stone-50 transition-colors"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          
          <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 bg-white/90 backdrop-blur-md p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-white/50 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600"><Sparkles size={20} /></div>
              <div>
                <p className="text-[11px] md:text-[12px] font-black uppercase tracking-widest text-stone-400 leading-none">Scout Active</p>
                <h4 className="font-black uppercase text-xs md:text-sm tracking-tighter mt-1 text-stone-900">{scoutHeadline}</h4>
              </div>
            </div>
            <button className="px-4 py-2 md:px-6 md:py-3 bg-stone-900 text-white rounded-xl md:rounded-2xl font-black uppercase text-[11px] md:text-[12px] tracking-widest">Expand</button>
          </div>
        </div>

        {/* Discovery Sidebar (The replacement for the old list sidebar) */}
        <div className="relative space-y-6 p-6 md:p-0 bg-white md:bg-transparent rounded-t-[3rem] -mt-12 md:mt-0 z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] md:shadow-none h-full overflow-hidden">
          <div className="w-12 h-1.5 bg-stone-100 rounded-full mx-auto mb-6 md:hidden" />
          <ScoutDiscoveryPanel
            places={activePlaces}
            onPlaceSelect={handlePlaceSelect}
            filter={filter}
            onFilterChange={setFilter}
            onClose={() => {}} // No close button needed in side panel mode
            className="h-[60vh] md:h-full relative pointer-events-auto"
            isSidebar={true}
          />
        </div>
      </div>

      {selectedPlace && (
        <ScoutPlaceModal
          place={selectedPlace}
          modalTab={modalTab}
          setModalTab={setModalTab}
          isLoadingDetails={isLoadingDetails}
          onClose={() => setSelectedPlace(null)}
          onAction={onAction}
        />
      )}
    </div>
  );
};
