import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, RefreshCw, Navigation } from 'lucide-react';
import { API_KEYS } from '../../../shared/constants/apiKeys';
import { hasSupabaseConfig, supabase } from '../../../services/supabaseClient';
import { PlacesService } from '../../../services/placesService';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { AppItem } from '../../../shared/types/appItem';
import type { AuthUser } from '../../auth/types/auth';
import { 
  ScoutPlace, 
  ScoutMapTab as ScoutTab, 
  ScoutFilter, 
  MapLike, 
  getGoogleMaps 
} from '../types/scoutUi';
import { 
  toScoutPlace, 
  toSavedScoutPlace,
  SCOUT_FALLBACK_PLACES, 
  calculateNeuralMatch, 
  sortPlaces, 
  filterPlaces, 
  mergePlaceDetails, 
  shouldApplyLatestRequest 
} from '../lib/scoutLogic';
import { SnapStudio } from '../../snap/components/SnapView';
import { ScoutDiscoveryPanel } from './ScoutDiscoveryPanel';
import { ScoutPlaceModal } from './ScoutPlaceModal';
import { ScoutRoutePlanner } from './ScoutRoutePlanner';

interface ScoutViewProps {
  mapsApiKey?: string;
  savedItems?: AppItem[];
  googleMapsReady?: boolean;
  onAction: (item: AppItem, action: 'save' | 'share' | 'delete') => void;
  authUser?: AuthUser | null;
}

export const ScoutView = ({ 
  mapsApiKey = API_KEYS.MAPS,
  savedItems = [],
  googleMapsReady,
  onAction,
  authUser
}: ScoutViewProps) => {
  const [scoutTab, setScoutTab] = useState<ScoutTab>('main');
  const [mainMapPlaces, setMainMapPlaces] = useState<ScoutPlace[]>([]);
  const [communitySnapPlaces, setCommunitySnapPlaces] = useState<ScoutPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<ScoutPlace | null>(null);
  const [modalTab, setModalTab] = useState('overview');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Snap Studio Bridge
  const [showSnapStudio, setShowSnapStudio] = useState(false);
  const [snapStudioData, setSnapStudioData] = useState<any>(null);

  const [filter, setFilter] = useState<ScoutFilter>({
    type: 'all',
    rating: 0,
    openNow: false,
    maxDistance: 5000,
    sortBy: 'match'
  });
  const [pinnedPlace, setPinnedPlace] = useState<ScoutPlace | null>(null);
  const [isPinning, setIsPinning] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLike | null>(null);
  const directionsRendererRef = useRef<any>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);

  const requestSeq = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const fetchPlaces = useCallback(async (map: MapLike) => {
    setIsLoading(true);
    const seq = ++requestSeq.current;

    try {
      const center = (map as any).getCenter();
      const lat = typeof center.lat === 'function' ? center.lat() : center.lat;
      const lng = typeof center.lng === 'function' ? center.lng() : center.lng;

      console.log(`🔍 Scout: Searching near ${lat}, ${lng}`);
      const result = await PlacesService.searchNearby(lat, lng);
      
      if (!shouldApplyLatestRequest(mounted, seq, requestSeq)) return;
      setIsLoading(false);

      if (result.success && result.data?.results && result.data.results.length > 0) {
        console.log(`✅ Scout: Found ${result.data.results.length} results`);
        const transformed = result.data.results.map((r, i) => toScoutPlace(r, i, mapsApiKey));
        setMainMapPlaces(transformed);
        
        // Fit bounds to results if we have them
        if (transformed.length > 0) {
          const google = getGoogleMaps();
          if (google && mapInstanceRef.current) {
            const bounds = new google.LatLngBounds();
            transformed.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
            mapInstanceRef.current.fitBounds(bounds);
          }
        }
      } else {
        console.warn('Scout search returned no results or failed:', result.error || result.data?.status);
        if (result.data?.status === 'ZERO_RESULTS') {
            setMainMapPlaces([]); // Don't fallback to NY if we just found nothing here
        } else {
            setMainMapPlaces(SCOUT_FALLBACK_PLACES);
        }
      }
    } catch (err) {
      console.error('Scout fetch error:', err);
      if (shouldApplyLatestRequest(mounted, seq, requestSeq)) {
        setIsLoading(false);
        setMainMapPlaces(SCOUT_FALLBACK_PLACES);
      }
    }
  }, [mapsApiKey]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    const google = getGoogleMaps();
    if (!google) return;

    const geocoder = new google.Geocoder();
    setIsPinning(true);

    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results && response.results.length > 0) {
        const res = response.results[0];
        const newFind: ScoutPlace = {
          id: `new-pin-${Date.now()}`,
          name: res.formatted_address || 'New Spot',
          cat: 'User Discovery',
          address: res.formatted_address,
          phone: '',
          website: '',
          img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80', // Default discovery food image
          lat,
          lng,
          markerSource: 'saved',
          rating: 5,
          reviews: 0,
          vibe: [],
          timings: {},
          menu: [],
          userReviews: [],
          photos: [],
          isNewFind: true // Custom flag for modal
        };
        setPinnedPlace(newFind);
        setSelectedPlace(newFind);
      }
    } catch (err) {
      console.error('Reverse Geocode failed:', err);
    } finally {
      setIsPinning(false);
    }
  }, []);

  const handleContribute = useCallback(async (place: ScoutPlace) => {
    // Standardizing: Bridging into Snap Studio instead of saving silent find
    setSnapStudioData({
      restaurant: place.name,
      lat: place.lat,
      lng: place.lng,
      address: place.address || '',
      cuisine: place.cat
    });
    setShowSnapStudio(true);
  }, []);

  const handleCalculateRoute = async (origin: string, destination: string) => {
    setIsCalculatingRoute(true);
    try {
      const result = await PlacesService.getDirections(origin, destination);
      if (result.success && result.data?.routes?.[0]) {
        const route = result.data.routes[0];
        setCurrentRoute(route);
        
        const google = getGoogleMaps();
        if (google && mapInstanceRef.current && directionsRendererRef.current) {
          // Set direction result to renderer
          directionsRendererRef.current.setDirections(result.data);
          
          const polyline = (google as any).geometry.encoding.decodePath(route.polyline.encodedPolyline);
          const path = new (google as any).Polyline({ path: polyline });
          
          // 1. Fetch External Results Along Route
          const searchResult = await PlacesService.searchAlongRoute(route.polyline.encodedPolyline, 'restaurants');
          let combinedResults: ScoutPlace[] = [];
          
          if (searchResult.success && searchResult.data?.results) {
            combinedResults = searchResult.data.results.map((r, i) => toScoutPlace(r, i, mapsApiKey));
          }

          // 2. Filter existing results and saved items along the route corridor
          const corridorTolerance = 0.005; // ~500m
          const savedAsScout = savedItems.map((item, i) => toSavedScoutPlace(item, i));
          
          const localAlongRoute = [...mainMapPlaces, ...savedAsScout].filter(p => {
             if (!p.lat || !p.lng) return false;
             const point = new (google as any).LatLng(p.lat, p.lng);
             return (google as any).geometry.poly.isLocationOnEdge(point, path, corridorTolerance);
          });

          // Combine and deduplicate by place_id / id
          const seen = new Set();
          const finalPlaces = [...combinedResults, ...localAlongRoute].filter(p => {
            const id = p.placeId || p.id || p.name;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });

          setMainMapPlaces(finalPlaces);
          setIsRoutePlannerOpen(false);
        }
      } else {
        alert("Could not find route. Try being more specific.");
      }
    } catch (err) {
      console.error('Route error:', err);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleClearRoute = () => {
    setCurrentRoute(null);
    if (mapInstanceRef.current) fetchPlaces(mapInstanceRef.current);
  };

  const handleMapClick = useCallback((e: any) => {

    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

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
      .map((item, i) => toSavedScoutPlace(item, i));
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
      
      // Init Directions Renderer
      directionsRendererRef.current = new google.DirectionsRenderer({
        map: map,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeWeight: 6,
          strokeOpacity: 0.8
        }
      });

      fetchPlaces(map);


      // Add Click Listener for Pinning
      map.addListener('click', handleMapClick);

      // Attempt geolocation
      navigator.geolocation.getCurrentPosition((p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        map.setCenter(pos);
        fetchPlaces(map);
      });
    };

    initMap();
  }, [mapsApiKey, fetchPlaces, googleMapsReady, handleMapClick]);

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

    // Add pinned marker if exists
    if (pinnedPlace) {
      const pinnedMarker = new google.Marker({
        position: { lat: pinnedPlace.lat, lng: pinnedPlace.lng },
        animation: google.Animation.DROP,
        icon: {
          path: google.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 8,
          fillColor: '#a855f7', // Purple/Discovery color
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        map: mapInstanceRef.current,
        zIndex: 999
      });
      pinnedMarker.addListener('click', () => setSelectedPlace(pinnedPlace));
    }

  }, [isMapReady, activePlaces, pinnedPlace]);

  const handlePlaceSelect = (place: ScoutPlace) => {
    setSelectedPlace(place);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: place.lat, lng: place.lng });
      mapInstanceRef.current.setZoom(16);
    }
  };

  // Auto-fetch details when a place is selected
  useEffect(() => {
    if (!selectedPlace || selectedPlace.isNewFind) return;
    
    // If we've already fetched details (using phone or userReviews length as heuristic)
    if (selectedPlace.phone || (selectedPlace.userReviews && selectedPlace.userReviews.length > 0)) return;

    // Only fetch for Google places that have a placeId
    if (selectedPlace.markerSource === 'google' && selectedPlace.placeId) {
      const fetchDetails = async () => {
        setIsLoadingDetails(true);
        try {
          const result = await PlacesService.getPlaceDetails(selectedPlace.placeId as string);
          if (result.success && result.data?.result) {
            const detailedPlace = mergePlaceDetails(selectedPlace, result.data.result, mapsApiKey);
            
            // Update the selected place to trigger UI update
            setSelectedPlace(detailedPlace);
            
            // Optionally update the place in the main list so it's cached
            setMainMapPlaces(prev => 
              prev.map(p => p.id === selectedPlace.id ? detailedPlace : p)
            );
          }
        } catch (err) {
          console.error('Failed to fetch place details:', err);
        } finally {
          setIsLoadingDetails(false);
        }
      };
      
      fetchDetails();
    }
  }, [selectedPlace?.id, mapsApiKey]);


  const scoutHeadline = useMemo(() => {
    if (isLoading) return 'Scouting your area...';
    if (activePlaces.length === 0) return 'No matches found';
    return `Discovering ${activePlaces.length} premium spots`;
  }, [isLoading, activePlaces.length]);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-auto space-y-0 md:space-y-8 md:px-4 animate-in fade-in pb-24 md:pb-24 -mx-6 md:mx-0">
      {/* Header with Tabs */}
        <div className="flex bg-stone-100 p-1.5 rounded-2xl">
          {(['main', 'fuzo', 'my'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setScoutTab(tab)}
              aria-label={`Switch to ${tab === 'main' ? 'Main Map' : tab === 'fuzo' ? 'FUZO Locations' : 'My Map'}`}
              className={`px-6 py-2.5 min-h-[44px] rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${scoutTab === tab ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
            >
              {tab === 'main' ? 'Main Map' : tab === 'fuzo' ? 'FUZO Locations' : 'My Map'}
            </button>
          ))}
        </div>

      {/* Mobile Tabs */}
      <div className="flex md:hidden bg-white border-b border-stone-100 sticky top-0 z-30">
        {(['main', 'fuzo', 'my'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setScoutTab(tab)}
            aria-label={`Switch to ${tab === 'main' ? 'Main' : tab === 'fuzo' ? 'FUZO' : 'My Map'}`}
            className={`flex-1 py-5 min-h-[50px] text-[12px] font-black uppercase tracking-widest border-b-2 transition-all ${scoutTab === tab ? 'border-yellow-400 text-stone-900' : 'border-transparent text-stone-400'}`}
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
          <div className="absolute top-6 left-6 right-24 md:top-8 md:left-8 md:right-auto md:w-96 z-10 space-y-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-stone-900 transition-colors">
                <Search size={18} strokeWidth={2.5} />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food territory..."
                className="w-full bg-white/95 backdrop-blur-xl border-none h-14 pl-14 pr-5 rounded-[1.25rem] shadow-2xl font-black text-xs uppercase tracking-widest outline-none focus:ring-4 focus:ring-yellow-400/20 transition-all placeholder:text-stone-300"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-4 flex items-center text-stone-300 hover:text-stone-900"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/50 shadow-lg px-3 py-2.5 inline-flex">
              <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest text-stone-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-white shadow-sm"></span>
                  <span>FUZO Spots</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white shadow-sm"></span>
                  <span>Community</span>
                </div>
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
            <button 
              onClick={() => setIsRoutePlannerOpen(true)} 
              className={`p-3 md:p-4 rounded-2xl shadow-xl transition-all ${currentRoute ? 'bg-blue-500 text-white' : 'bg-white text-stone-900'}`}
            >
              <Navigation size={20} />
            </button>
          </div>
          
          <ScoutRoutePlanner 
            isVisible={isRoutePlannerOpen}
            onClose={() => setIsRoutePlannerOpen(false)}
            onCalculateRoute={handleCalculateRoute}
            onClear={handleClearRoute}
            isCalculating={isCalculatingRoute}
          />

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
          onContribute={handleContribute}
        />
      )}

      {showSnapStudio && (
        <SnapStudio 
          initialData={snapStudioData}
          onPost={(item) => {
            onAction(item, 'save');
            setShowSnapStudio(false);
          }}
          onClose={() => setShowSnapStudio(false)}
        />
      )}
    </div>
  );
};

