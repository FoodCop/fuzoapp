import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, RefreshCw, LayoutGrid, Sparkles, Star, 
  Search, X, Menu, Filter 
} from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { 
  ScoutMapTab, ScoutPlace, MapLike, MarkerLike, 
  getGoogleMaps, ScoutFilter 
} from '../types/scoutUi';
import { 
  resolveScoutDisplayPlaces, resolveScoutCopy, 
  toScoutPlace, toSavedScoutPlace, shouldApplyLatestRequest,
  getMatchPercentage, filterPlaces
} from '../lib/scoutLogic';
import { SCOUT_FALLBACK_PLACES } from '../constants/scoutSeeds';
import { ScoutPlaceModal } from './ScoutPlaceModal';
import { ScoutDiscoveryPanel } from './ScoutDiscoveryPanel';
import { Badge } from '../../../shared/ui/Badge';
import { AppItem } from '../../../shared/types/appItem';

interface ScoutViewProps {
  mapsApiKey: string;
  savedItems: AppItem[];
  onAction: (item: AppItem, action: 'save' | 'share' | 'delete') => void;
}

export const ScoutView = ({ mapsApiKey, savedItems, onAction }: ScoutViewProps) => {
  const [activeTab, setActiveTab] = useState<ScoutMapTab>('main');
  const [filter, setFilter] = useState<ScoutFilter>('all');
  const [selectedPlace, setSelectedPlace] = useState<ScoutPlace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [modalTab, setModalTab] = useState('overview');

  const [mainMapPlaces, setMainMapPlaces] = useState<ScoutPlace[]>([]);
  const [communitySnapPlaces, setCommunitySnapPlaces] = useState<ScoutPlace[]>([]);
  
  const myMapPlaces = useMemo(() => {
    return savedItems.map((item, idx) => toSavedScoutPlace(item, idx));
  }, [savedItems]);

  const unfilteredPlaces = useMemo(() => 
    resolveScoutDisplayPlaces(activeTab, mainMapPlaces, communitySnapPlaces, myMapPlaces),
    [activeTab, mainMapPlaces, communitySnapPlaces, myMapPlaces]
  );

  const displayPlaces = useMemo(() => 
    filterPlaces(unfilteredPlaces, filter),
    [unfilteredPlaces, filter]
  );

  const { scoutHeadline, listTitle, emptyStateMessage } = resolveScoutCopy(activeTab, displayPlaces.length, isLoading);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMap = useRef<MapLike | null>(null);
  const markers = useRef<MarkerLike[]>([]);
  const clusterer = useRef<MarkerClusterer | null>(null);
  const requestSeq = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const clearMarkers = useCallback(() => {
    markers.current.forEach(m => m.setMap(null));
    markers.current = [];
    if (clusterer.current) {
      clusterer.current.clearMarkers();
    }
  }, []);

  const fetchCommunitySnaps = useCallback(async () => {
    try {
      setCommunitySnapPlaces(SCOUT_FALLBACK_PLACES.slice(0, 4).map(p => ({
        ...p,
        id: `snap-${p.id}`,
        markerSource: 'fuzo'
      })));
    } catch (err) {
      console.error('Failed to fetch community snaps:', err);
    }
  }, []);

  const fetchPlaces = useCallback(async (map: MapLike) => {
    if (!mapsApiKey) return;
    setIsLoading(true);
    const seq = ++requestSeq.current;

    try {
      const google = getGoogleMaps();
      if (!google) throw new Error('Google Maps not loaded');

      // Use modern searchNearby if available, fallback to legacy PlacesService
      const center = (map as any).getCenter();
      const lat = typeof center.lat === 'function' ? center.lat() : center.lat;
      const lng = typeof center.lng === 'function' ? center.lng() : center.lng;

      try {
        const { Place } = await (google as any).importLibrary('places');
        const { places } = await Place.searchNearby({
          fields: ['displayName', 'location', 'rating', 'userRatingCount', 'vicinity', 'types', 'photos'],
          locationRestriction: { 
            center: { lat, lng }, 
            radius: 2000 
          },
          includedPrimaryTypes: ['restaurant', 'cafe', 'bar'],
          maxResultCount: 15,
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
        // Fallback to legacy PlacesService if modern API fails or is unavailable
        const service = new (google as any).places.PlacesService(map);
        service.nearbySearch({
          location: { lat, lng },
          radius: 2000,
          type: ['restaurant', 'cafe', 'bar']
        }, (results: any[], status: any) => {
          if (!shouldApplyLatestRequest(mounted, seq, requestSeq)) return;
          setIsLoading(false);

          if (status === (google as any).places.PlacesServiceStatus.OK && results) {
            const transformed = results.slice(0, 15).map((r, i) => toScoutPlace(r, i, mapsApiKey));
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

  const renderMarkers = useCallback(() => {
    const google = getGoogleMaps();
    if (!google || !googleMap.current) return;

    clearMarkers();
    const bounds = new google.LatLngBounds();
    const newMarkers: MarkerLike[] = [];

    displayPlaces.forEach(place => {
      const match = getMatchPercentage(place);
      const marker = new google.Marker({
        position: { lat: place.lat, lng: place.lng },
        title: `${place.name} (${match}% Match)`,
        label: {
          text: `${match}%`,
          color: 'white',
          fontSize: '10px',
          fontWeight: 'black'
        },
        icon: {
          path: google.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: place.markerSource === 'google' ? '#FACC15' : '#1C1917',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        }
      });

      marker.addListener('click', () => setSelectedPlace(place));
      newMarkers.push(marker);
      bounds.extend({ lat: place.lat, lng: place.lng });
    });

    markers.current = newMarkers;

    if (!clusterer.current) {
      clusterer.current = new MarkerClusterer({
        map: googleMap.current,
        markers: newMarkers,
        renderer: {
          render: ({ count, position }) => {
            return new google.Marker({
              label: { text: String(count), color: "white", fontSize: "12px", fontWeight: "bold" },
              position,
              icon: {
                path: google.SymbolPath.CIRCLE,
                scale: 18,
                fillColor: "#FACC15",
                fillOpacity: 0.9,
                strokeColor: "#FFFFFF",
                strokeWeight: 3,
              },
              zIndex: 1000,
            });
          }
        }
      });
    } else {
      clusterer.current.addMarkers(newMarkers);
    }

    if (!bounds.isEmpty()) {
      googleMap.current.fitBounds(bounds, 50);
    }
  }, [displayPlaces, clearMarkers]);

  useEffect(() => {
    if (!mapsApiKey || !mapRef.current) return;

    const loader = new Loader({
      apiKey: mapsApiKey,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load().then(() => {
      const google = getGoogleMaps();
      if (!google || !mapRef.current) return;

      const map = new google.Map(mapRef.current, {
        center: { lat: 43.644, lng: -79.4 },
        zoom: 14,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      googleMap.current = map;
      fetchPlaces(map);
      fetchCommunitySnaps();
    });
  }, [mapsApiKey, fetchPlaces, fetchCommunitySnaps]);

  useEffect(() => {
    renderMarkers();
  }, [displayPlaces, renderMarkers]);

  const handleAction = (place: ScoutPlace, action: 'save' | 'share') => {
    const item: AppItem = {
      id: place.id,
      name: place.name,
      img: place.img,
      cat: place.cat,
      rating: place.rating,
      reviews: place.reviews,
      lat: place.lat,
      lng: place.lng,
      placeId: place.placeId,
      address: place.address,
      phone: place.phone,
      website: place.website,
      vibe: place.vibe,
      timings: place.timings,
      menu: place.menu,
      userReviews: place.userReviews,
      photos: place.photos,
    };
    onAction(item, action);
  };

  const handleSelectPlace = useCallback((place: ScoutPlace) => {
    setSelectedPlace(place);
    if (googleMap.current && (googleMap.current as any).setCenter) {
      (googleMap.current as any).setCenter({ lat: place.lat, lng: place.lng });
      (googleMap.current as any).setZoom(16);
    }
  }, []);

  return (
    <div className="flex-grow flex flex-col relative h-full bg-white">
      <div ref={mapRef} className="absolute inset-0 z-0" />

      <ScoutDiscoveryPanel
        places={displayPlaces}
        onSelect={handleSelectPlace}
        isLoading={isLoading}
        title={listTitle}
        emptyState={emptyStateMessage}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-[90%] md:w-auto">
        <div className="flex flex-col gap-4">
          <nav className="bg-white/80 backdrop-blur-3xl p-3 rounded-[2.5rem] shadow-2xl flex gap-3 border border-white/40">
            {[
              { id: 'main', label: 'Discovery', icon: MapPin },
              { id: 'fuzo', label: 'Snaps', icon: Sparkles },
              { id: 'my', label: 'My Map', icon: LayoutGrid }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ScoutMapTab)}
                className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-400 hover:bg-white'}`}
              >
                <tab.icon size={16} strokeWidth={3} />
                <span className="hidden md:block">{tab.label}</span>
              </button>
            ))}
          </nav>

          <header className="bg-white/80 backdrop-blur-3xl p-6 rounded-[2.5rem] shadow-2xl border border-white/40 flex items-center justify-between">
            <div className="px-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${isLoading ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
                <h3 className="text-sm font-black uppercase tracking-tighter">{scoutHeadline}</h3>
              </div>
            </div>
            <button 
              onClick={() => googleMap.current && fetchPlaces(googleMap.current)}
              className="p-4 bg-white rounded-3xl active:rotate-180 transition-transform duration-500 shadow-sm"
              disabled={isLoading}
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </header>
        </div>
      </div>

      <AnimatePresence>
        {selectedPlace && (
          <ScoutPlaceModal
            place={selectedPlace}
            modalTab={modalTab}
            setModalTab={setModalTab}
            isLoadingDetails={isLoadingDetails}
            onClose={() => setSelectedPlace(null)}
            onAction={handleAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
