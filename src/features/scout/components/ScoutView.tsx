/**
 * ============================================================================
 * SCOUT VIEW — Full-Bleed Spatial Intelligence
 * ============================================================================
 * 
 * Architecture:
 * - Full-screen interactive map (Google Maps JS API)
 * - Tri-Source Data Sync:
 *   1. Proximity: Real-time Google Places API results.
 *   2. Community: Global FUZO Snap discoveries from Supabase.
 *   3. Private: User's personal 'Saved' collection (Plate).
 * 
 * Sub-Features:
 * - Route Planner: Finds culinary spots specifically along a travel corridor.
 * - Discovery Panel: Dynamic bottom sheet for list-based scouting.
 * - Snap Bridge: Seamless handoff to Snap Studio for new discoveries.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, RefreshCw, Navigation, Locate, ChefHat, Menu, Bell, Plus } from 'lucide-react';
import { API_KEYS } from '../../../shared/constants/apiKeys';
import { hasSupabaseConfig, supabase } from '../../../services/supabaseClient';
import { PlacesService } from '../../../services/placesService';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { AppItem } from '../../../shared/types/appItem';
import type { AuthUser } from '../../auth/types/auth';
import { 
  ScoutPlace, 
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
import { ScoutAddPinModal } from './ScoutAddPinModal';

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
  
  // --- SECTION: State Management ---
  // Coordinates data from three distinct sources (Google, Community, Personal)
  const [mainMapPlaces, setMainMapPlaces] = useState<ScoutPlace[]>([]);
  const [communitySnapPlaces, setCommunitySnapPlaces] = useState<ScoutPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<ScoutPlace | null>(null);
  const [modalTab, setModalTab] = useState('overview');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Flow State: Routing & Creation
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [isAddPinModalOpen, setIsAddPinModalOpen] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Snap Studio Integration
  const [showSnapStudio, setShowSnapStudio] = useState(false);
  const [snapStudioData, setSnapStudioData] = useState<any>(null);

  // Filters: UI constraints for the discovery panel
  const [filter, setFilter] = useState<ScoutFilter>({
    type: 'all',
    rating: 0,
    openNow: false,
    maxDistance: 5000,
    sortBy: 'match'
  });
  const [pinnedPlace, setPinnedPlace] = useState<ScoutPlace | null>(null);
  const [isPinning, setIsPinning] = useState(false);
  const [isPinningMode, setIsPinningMode] = useState(false);

  // --- REFS: Performance & Resource Locking ---
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

  /**
   * SECTION: Data Fetching — Source A (Nearby Google Places)
   * Triggered on map movement or search. 
   * Uses a 'sequence lock' to avoid state flicker from delayed async results.
   */
  const fetchPlaces = useCallback(async (map: MapLike, query?: string) => {
    setIsLoading(true);
    const seq = ++requestSeq.current;

    try {
      const center = (map as any).getCenter();
      const lat = typeof center.lat === 'function' ? center.lat() : center.lat;
      const lng = typeof center.lng === 'function' ? center.lng() : center.lng;

      const result = query 
        ? await PlacesService.searchByText(query, lat, lng) 
        : await PlacesService.searchNearby(lat, lng);
      
      if (!shouldApplyLatestRequest(mounted, seq, requestSeq)) return;
      setIsLoading(false);

      if (result.success && result.data?.results && result.data.results.length > 0) {
        const transformed = result.data.results.map((r, i) => toScoutPlace(r, i, mapsApiKey));
        setMainMapPlaces(transformed);
      } else {
        if (result.data?.status === 'ZERO_RESULTS') {
          setMainMapPlaces([]);
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

  /**
   * SECTION: Data Fetching — Source B (Community FUZO Snaps)
   * Hydrates the map with global discoveries persisted to the 'fuzo_locations' table.
   */
  const loadFuzo = useCallback(async () => {
    if (!hasSupabaseConfig || !supabase) return;
    const { data } = await supabase.from('fuzo_locations').select('*').limit(50);
    if (data) {
      setCommunitySnapPlaces(data.map((row, i) => ({
        id: `fuzo-${row.id || i}`,
        markerSource: 'fuzo' as const,
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
  }, []);

  useEffect(() => {
    loadFuzo();
  }, [loadFuzo]);

  /**
   * SECTION: Data Fetching — Source C (Personal Saved Items)
   * Local transform of the 'savedItems' prop (from Plate feature) into map-ready ScoutPlaces.
   */
  const myMapPlaces = useMemo(() => {
    return savedItems
      .filter(item => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)))
      .map((item, i) => toSavedScoutPlace(item, i));
  }, [savedItems]);

  /**
   * LOGIC: Unified Tri-Source Aggregator
   * Merges all three discovery streams, removes duplicates by PlaceID/ID, 
   * and calculates the Neural Match percentage for personalized sorting.
   */
  const activePlaces = useMemo(() => {
    const seen = new Set<string>();
    const merged: ScoutPlace[] = [];

    const addUnique = (places: ScoutPlace[]) => {
      for (const p of places) {
        const key = p.placeId || p.id;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push({ ...p, matchPercentage: calculateNeuralMatch(p) });
        }
      }
    };

    addUnique(mainMapPlaces);
    addUnique(communitySnapPlaces);
    addUnique(myMapPlaces);

    return sortPlaces(filterPlaces(merged, filter), filter.sortBy);
  }, [mainMapPlaces, communitySnapPlaces, myMapPlaces, filter]);


  /**
   * SECTION: Spatial Callbacks
   * Logic for geocoding, route planning, and hardware interaction.
   */

  // Reverse Geocoding: Converts a map click (lat/lng) into a readable "New Find" pin.
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
          img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80',
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
          isNewFind: true
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
    setSnapStudioData({
      restaurant: place.name,
      lat: place.lat,
      lng: place.lng,
      address: place.address || '',
      cuisine: place.cat
    });
    setShowSnapStudio(true);
  }, []);

  /**
   * LOGIC: handleCalculateRoute
   * Advanced Routing: Finds a travel corridor between two points and triggers 
   * 'searchAlongRoute' to populate the map only with spots adjacent to the path.
   */
  const handleCalculateRoute = async (origin: string, destination: string) => {
    setIsCalculatingRoute(true);
    try {
      const result = await PlacesService.getDirections(origin, destination);
      if (result.success && result.data?.routes?.[0]) {
        const route = result.data.routes[0];
        setCurrentRoute(route);
        
        const google = getGoogleMaps();
        if (google && mapInstanceRef.current && directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result.data);
          
          // Corridor analysis: only show points within 0.005 tolerance of the polyline
          const polyline = (google as any).geometry.encoding.decodePath(route.polyline.encodedPolyline);
          const path = new (google as any).Polyline({ path: polyline });
          
          const searchResult = await PlacesService.searchAlongRoute(route.polyline.encodedPolyline, 'restaurants');
          let combinedResults: ScoutPlace[] = [];
          
          if (searchResult.success && searchResult.data?.results) {
            combinedResults = searchResult.data.results.map((r, i) => toScoutPlace(r, i, mapsApiKey));
          }

          const corridorTolerance = 0.005;
          const savedAsScout = savedItems.map((item, i) => toSavedScoutPlace(item, i));
          
          const localAlongRoute = [...mainMapPlaces, ...savedAsScout].filter(p => {
             if (!p.lat || !p.lng) return false;
             const point = new (google as any).LatLng(p.lat, p.lng);
             return (google as any).geometry.poly.isLocationOnEdge(point, path, corridorTolerance);
          });

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
    if (isPinningMode) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setSnapStudioData({
        lat,
        lng,
        restaurant: '',
        address: '',
        cuisine: ''
      });
      setIsAddPinModalOpen(true);
      setIsPinningMode(false);
    }
  }, [isPinningMode]);

  const handleRecenterMap = useCallback(() => {
    navigator.geolocation.getCurrentPosition((p) => {
      const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(pos);
        mapInstanceRef.current.setZoom(14);
        fetchPlaces(mapInstanceRef.current);
      }
    });
  }, [fetchPlaces]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (mapInstanceRef.current) {
      fetchPlaces(mapInstanceRef.current, searchQuery);
    }
  };

  const handlePlaceSelect = (place: ScoutPlace) => {
    setSelectedPlace(place);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: place.lat, lng: place.lng });
      mapInstanceRef.current.setZoom(16);
    }
  };

  // --- SECTION: Map Instance Lifecycle ---
  useEffect(() => {
    if (!mapRef.current || !mapsApiKey) return;

    const initMap = async () => {
      const google = getGoogleMaps();
      if (!google) return;

      const map = new google.Map(mapRef.current!, {
        center: { lat: 40.7128, lng: -74.0060 }, // NYC Primary Grid
        zoom: 13,
        disableDefaultUI: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f5' }] },
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5f5e0' }] },
        ]
      });

      mapInstanceRef.current = map;
      setIsMapReady(true);
      
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
      map.addListener('click', handleMapClick);

      // Attempt immediate geolocation for 'My Hub' centering
      navigator.geolocation.getCurrentPosition((p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        map.setCenter(pos);
        fetchPlaces(map);
      });
    };

    initMap();
  }, [mapsApiKey, googleMapsReady]);

  // --- SECTION: Spatial Overlay (Markers & Clusters) ---
  const MARKER_COLORS: Record<string, string> = {
    google: '#3b82f6',  // Standard Discovery (Blue)
    fuzo: '#facc15',     // Community Snap (Yellow)
    saved: '#10b981',    // Personal Saved (Emerald)
  };

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    const google = getGoogleMaps();
    if (!google) return;

    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }

    const markers = activePlaces.map(place => {
      const color = MARKER_COLORS[place.markerSource || 'google'] || '#3b82f6';
      const marker = new google.Marker({
        position: { lat: place.lat, lng: place.lng },
        icon: {
          path: google.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        }
      });

      marker.addListener('click', () => setSelectedPlace(place));
      return marker;
    });

    clustererRef.current = new MarkerClusterer({
      map: mapInstanceRef.current,
      markers
    });

    // Sub-Logic: New Discovery "Dropped Pin"
    if (pinnedPlace) {
      const pinnedMarker = new google.Marker({
        position: { lat: pinnedPlace.lat, lng: pinnedPlace.lng },
        animation: google.Animation.DROP,
        icon: {
          path: google.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 8,
          fillColor: '#a855f7', // Creative Pin (Purple)
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

  /**
   * SECTION: Deep Detail Fetching
   * On selecting a place, fetch full Google metadata (phone, website, reviews) 
   * to populate the ScoutPlaceModal without bloating the initial map search results.
   */
  useEffect(() => {
    if (!selectedPlace || selectedPlace.isNewFind) return;
    if (selectedPlace.phone || (selectedPlace.userReviews && selectedPlace.userReviews.length > 0)) return;

    if (selectedPlace.markerSource === 'google' && selectedPlace.placeId) {
      const fetchDetails = async () => {
        setIsLoadingDetails(true);
        try {
          const result = await PlacesService.getPlaceDetails(selectedPlace.placeId as string);
          if (result.success && result.data?.result) {
            const detailedPlace = mergePlaceDetails(selectedPlace, result.data.result, mapsApiKey);
            setSelectedPlace(detailedPlace);
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

  // UI HELPER: Calculate legend counts
  const sourceCounts = useMemo(() => {
    const counts = { google: 0, fuzo: 0, saved: 0 };
    activePlaces.forEach(p => {
      const src = p.markerSource || 'google';
      if (src in counts) counts[src as keyof typeof counts]++;
    });
    return counts;
  }, [activePlaces]);

  return (
    <div className="relative w-full h-full">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FULL-BLEED MAP ENGINE                                         */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div ref={mapRef} className="absolute inset-0 z-0" id="scout-map" />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FLOATING SEARCH & LEGEND                                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="absolute top-4 left-4 right-20 md:left-6 md:right-auto md:w-[400px] z-10 space-y-2.5">
        <form onSubmit={handleSearch} className="relative group">
          <button 
            type="submit"
            className="absolute inset-y-0 left-5 flex items-center text-stone-400 group-focus-within:text-stone-900 transition-colors"
          >
            <Search size={18} strokeWidth={2.5} />
          </button>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search food territory..."
            className="w-full bg-white h-12 md:h-14 pl-14 pr-12 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.12)] font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:shadow-[0_2px_20px_rgba(0,0,0,0.15)] transition-all placeholder:text-stone-400 border border-stone-100/80"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => {
                setSearchQuery('');
                if (mapInstanceRef.current) fetchPlaces(mapInstanceRef.current);
              }}
              className="absolute inset-y-0 right-4 flex items-center text-stone-300 hover:text-stone-900"
            >
              <X size={18} />
            </button>
          )}
        </form>

        <div className="bg-white/95 backdrop-blur-md rounded-full shadow-md px-4 py-2 inline-flex border border-stone-100/60">
          <div className="flex items-center gap-4 text-[11px] font-bold text-stone-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
              <span>Nearby ({sourceCounts.google})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm" />
              <span>FUZO ({sourceCounts.fuzo})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
              <span>Saved ({sourceCounts.saved})</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FLOATING ACTION CLUSTER (Primary Operations)                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 flex flex-col gap-2.5 z-10">
        <button 
          onClick={() => mapInstanceRef.current && fetchPlaces(mapInstanceRef.current)} 
          className="w-11 h-11 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-stone-50 transition-colors border border-stone-100/60"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin text-blue-500' : 'text-stone-600'} />
        </button>
        <button 
          onClick={() => setIsRoutePlannerOpen(true)} 
          className={`w-11 h-11 rounded-full shadow-md flex items-center justify-center transition-all border ${currentRoute ? 'bg-blue-500 text-white border-blue-400' : 'bg-white text-stone-600 border-stone-100/60 hover:bg-stone-50'}`}
        >
          <Navigation size={18} />
        </button>
        <button 
          onClick={handleRecenterMap}
          className="w-11 h-11 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-stone-50 transition-colors border border-stone-100/60"
        >
          <Locate size={18} className="text-stone-600" />
        </button>
        <button 
          onClick={() => setIsPinningMode(!isPinningMode)}
          className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-2 ${isPinningMode ? 'bg-purple-600 text-white border-white animate-pulse' : 'bg-stone-900 text-white border-white/20'}`}
          title="Drop a Pin"
        >
          <MapPin size={20} strokeWidth={3} />
        </button>
        <button 
          onClick={() => setIsAddPinModalOpen(true)}
          className="w-11 h-11 bg-white text-stone-900 rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-stone-200"
          title="Add Discovery Wizard"
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* OVERLAY LAYERS (Modals & Logic Panels)                        */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      <ScoutRoutePlanner 
        isVisible={isRoutePlannerOpen}
        onClose={() => setIsRoutePlannerOpen(false)}
        onCalculateRoute={handleCalculateRoute}
        onClear={handleClearRoute}
        isCalculating={isCalculatingRoute}
      />

      <ScoutDiscoveryPanel
        places={activePlaces}
        onPlaceSelect={handlePlaceSelect}
        filter={filter}
        onFilterChange={setFilter}
        onClose={() => {}}
      />

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

      {isAddPinModalOpen && (
        <ScoutAddPinModal 
          initialCoordinates={snapStudioData}
          onClose={() => {
            setIsAddPinModalOpen(false);
            setSnapStudioData(null);
          }}
          onSuccess={() => {
            if (mapInstanceRef.current) fetchPlaces(mapInstanceRef.current);
            loadFuzo();
          }}
        />
      )}

      {/* Neural Pass Bridge: Handoff to Snap Studio */}
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
