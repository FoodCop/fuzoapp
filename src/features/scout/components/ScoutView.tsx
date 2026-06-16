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
import { Search, X, RefreshCw, Navigation, Locate, ChefHat, Menu, Bell, Plus, MapPin } from 'lucide-react';
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
  shouldApplyLatestRequest,
  getDistanceInMeters,
  extractSuggestionText
} from '../lib/scoutLogic';
import { getDistanceToPolyline } from '../lib/geometryUtils';
import { getSearchableDishTypes } from '../../../shared/utils/taxonomy';
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<Array<{ text: string; placeId: string }>>([]);
  const searchTimerRef = useRef<any>(null);

  // Filters & Pinning State (moved up for dependency access)
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



  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input || input.length < 2) {
      setPlaceSuggestions([]);
      return;
    }

    const google = getGoogleMaps();
    if (!google) return;

    try {
      if (typeof (google as any).importLibrary === 'function') {
        const placesLib = await (google as any).importLibrary('places') as any;
        if (placesLib?.AutocompleteSuggestion) {
          const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input });
          if (response?.suggestions) {
            const parsed = response.suggestions
              .map(extractSuggestionText)
              .filter((s: any): s is { text: string; placeId: string } => s !== null)
              .slice(0, 4);
            setPlaceSuggestions(parsed);
          } else {
            setPlaceSuggestions([]);
          }
        }
      }
    } catch (err) {
      console.error('ScoutView autocomplete error:', err);
    }
  }, []);

  const taxonomySuggestions = useMemo(() => {
    if (!searchQuery) return [];
    const lowerQ = searchQuery.toLowerCase();
    const dishTypes = getSearchableDishTypes();
    // Unique suggestions
    return Array.from(new Set(dishTypes.filter(d => d.toLowerCase().includes(lowerQ))))
      .slice(0, 3)
      .map(text => ({ text, type: 'taxonomy' as const }));
  }, [searchQuery]);

  const suggestions = useMemo(() => {
    const combined: Array<{ text: string; type: 'taxonomy' | 'place'; placeId?: string }> = [
      ...taxonomySuggestions,
      ...placeSuggestions.map(p => ({ text: p.text, placeId: p.placeId, type: 'place' as const }))
    ];
    // deduplicate by text
    const seen = new Set<string>();
    return combined.filter(c => {
      if (seen.has(c.text)) return false;
      seen.add(c.text);
      return true;
    });
  }, [taxonomySuggestions, placeSuggestions]);

  // Snap Studio Integration
  const [showSnapStudio, setShowSnapStudio] = useState(false);
  const [snapStudioData, setSnapStudioData] = useState<any>(null);

  // User Location
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);

  // --- REFS: Performance & Resource Locking ---
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLike | null>(null);
  const directionsRendererRef = useRef<any>(null); // Legacy — kept as null for compat
  const routePolylineRef = useRef<any>(null);
  const routeMarkersRef = useRef<any[]>([]);
  const activeMarkersRef = useRef<any[]>([]);
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
      setMapCenter({lat, lng});

      const result = query 
        ? await PlacesService.searchByText(query, lat, lng, filter.maxDistance) 
        : await PlacesService.searchNearby(lat, lng, filter.maxDistance);
      
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
  }, [mapsApiKey, filter.maxDistance]);

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

    const addUnique = (places: ScoutPlace[], checkDistance: boolean = false) => {
      for (const p of places) {
        let distStr = '';
        if (mapCenter) {
          const dist = getDistanceInMeters(mapCenter.lat, mapCenter.lng, p.lat, p.lng);
          if (checkDistance && dist > filter.maxDistance) continue;
          
          if (dist < 1000) {
            distStr = `${Math.round(dist)} m`;
          } else {
            distStr = `${(dist / 1000).toFixed(1)} km`;
          }
        }

        const key = p.placeId || p.id;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push({ 
            ...p, 
            matchPercentage: calculateNeuralMatch(p),
            distanceText: distStr 
          });
        }
      }
    };

    addUnique(mainMapPlaces, true); // Enforce strict client-side culling, overriding Google's loose bounds
    addUnique(communitySnapPlaces, true);
    addUnique(myMapPlaces, true);

    return sortPlaces(filterPlaces(merged, filter), filter.sortBy);
  }, [mainMapPlaces, communitySnapPlaces, myMapPlaces, filter, mapCenter]);


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
        if (google && mapInstanceRef.current) {
          // Clear any previous route polyline and markers
          if (routePolylineRef.current) {
            routePolylineRef.current.setMap(null);
            routePolylineRef.current = null;
          }
          routeMarkersRef.current.forEach(m => m.setMap(null));
          routeMarkersRef.current = [];

          // Decode the polyline and draw it on the map
          const polylinePath = (google as any).geometry.encoding.decodePath(route.polyline.encodedPolyline);
          const pathPoints = polylinePath.map((p: any) => ({
            lat: typeof p.lat === 'function' ? p.lat() : p.lat,
            lng: typeof p.lng === 'function' ? p.lng() : p.lng
          }));

          // Draw manual polyline
          routePolylineRef.current = new google.Polyline({
            path: polylinePath,
            geodesic: true,
            strokeColor: '#4285F4',
            strokeOpacity: 0.9,
            strokeWeight: 6,
            map: mapInstanceRef.current
          });

          // Add origin marker
          if (pathPoints.length > 0) {
            const originMarker = new google.Marker({
              position: pathPoints[0],
              map: mapInstanceRef.current,
              icon: getPinIcon(google, '#22c55e', false), // Green for origin
              zIndex: 900
            });
            routeMarkersRef.current.push(originMarker);
          }

          // Add destination marker
          if (pathPoints.length > 1) {
            const destMarker = new google.Marker({
              position: pathPoints[pathPoints.length - 1],
              map: mapInstanceRef.current,
              icon: getPinIcon(google, '#ef4444', false), // Red for destination
              zIndex: 900
            });
            routeMarkersRef.current.push(destMarker);
          }

          // Fit map to route bounds
          const bounds = new google.LatLngBounds();
          pathPoints.forEach((pt: any) => bounds.extend(pt));
          mapInstanceRef.current.fitBounds(bounds);
          
          const searchResult = await PlacesService.searchAlongRoute(route.polyline.encodedPolyline, 'restaurants');
          let combinedResults: ScoutPlace[] = [];
          
          if (searchResult.success && searchResult.data?.results) {
            combinedResults = searchResult.data.results.map((r, i) => toScoutPlace(r, i, mapsApiKey));
          }

          // Tolerance of 500 meters from the polyline
          const MAX_DETOUR_METERS = 500;
          const savedAsScout = savedItems.map((item, i) => toSavedScoutPlace(item, i));
          
          const localAlongRoute = [...mainMapPlaces, ...savedAsScout].filter(p => {
             if (!p.lat || !p.lng) return false;
             const dist = getDistanceToPolyline({ lat: p.lat, lng: p.lng }, pathPoints);
             return dist <= MAX_DETOUR_METERS;
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
        const errorMsg = result.error || 'No route found between these points. Try being more specific.';
        alert(`Route Error: ${errorMsg}`);
      }
    } catch (err) {
      console.error('Route error:', err);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleClearRoute = () => {
    setCurrentRoute(null);
    // Clean up polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
    // Clean up route markers
    routeMarkersRef.current.forEach(m => m.setMap(null));
    routeMarkersRef.current = [];
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
      setUserLocation(pos);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(pos);
        mapInstanceRef.current.setZoom(14);
        fetchPlaces(mapInstanceRef.current);
      }
    });
  }, [fetchPlaces]);

  const handleSearch = (e?: React.FormEvent, explicitQuery?: string) => {
    if (e) e.preventDefault();
    const queryToUse = explicitQuery || searchQuery;
    if (mapInstanceRef.current) {
      fetchPlaces(mapInstanceRef.current, queryToUse);
    }
    setShowSuggestions(false);
  };

  const handlePlaceSelect = (place: ScoutPlace) => {
    setSelectedPlace(place);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: place.lat, lng: place.lng });
      mapInstanceRef.current.setZoom(16);
      
      // Offset the map center to account for both the discovery panel and details drawer on larger screens
      if (window.innerWidth >= 768) {
        // panBy(x, y) - negative x pans the map left, which moves the marker right
        (mapInstanceRef.current as any).panBy(-350, 0); 
      }
    }
  };

  // --- SECTION: Map Instance Lifecycle ---
  useEffect(() => {
    if (!mapRef.current || !mapsApiKey) return;

    const initMap = async () => {
      const google = getGoogleMaps();
      if (!google) return;

      let MapClass = google.Map;
      if (!MapClass && typeof google.importLibrary === 'function') {
        const mapsLib = await google.importLibrary("maps") as any;
        MapClass = mapsLib.Map;
      }

      if (!MapClass) {
        console.error("Failed to load Google Maps Map class.");
        return;
      }

      const map = new MapClass(mapRef.current!, {
        center: { lat: 40.7128, lng: -74.0060 }, // NYC Primary Grid
        zoom: 13,
        disableDefaultUI: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f5' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          { featureType: 'road.highway', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ]
      });

      mapInstanceRef.current = map;
      setIsMapReady(true);
      
      // No longer using deprecated DirectionsRenderer — route is drawn via manual Polyline

      fetchPlaces(map);
      map.addListener('click', handleMapClick);

      // Attempt immediate geolocation for 'My Hub' centering
      navigator.geolocation.getCurrentPosition((p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        setUserLocation(pos);
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

  const getPinIcon = (google: any, color: string, isUser = false) => {
    const width = isUser ? 36 : 28;
    const height = isUser ? 48 : 38;
    // Standard map pin SVG teardrop
    const svg = `<svg width="${width}" height="${height}" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 20 12 20s12-11.5 12-20C24 5.37 18.63 0 12 0z" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
      <circle cx="12" cy="12" r="${isUser ? 5 : 4}" fill="#ffffff" opacity="${isUser ? '1' : '0.9'}" />
    </svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.Size(width, height),
      anchor: new google.Point(width / 2, height)
    };
  };

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    const google = getGoogleMaps();
    if (!google) return;

    activeMarkersRef.current.forEach(m => m.setMap(null));
    activeMarkersRef.current = [];

    const markers = activePlaces.map(place => {
      const color = MARKER_COLORS[place.markerSource || 'google'] || '#3b82f6';
      const marker = new google.Marker({
        position: { lat: place.lat, lng: place.lng },
        map: mapInstanceRef.current,
        icon: getPinIcon(google, color, false)
      });

      marker.addListener('click', () => setSelectedPlace(place));
      return marker;
    });

    if (userLocation) {
      const userMarker = new google.Marker({
        position: userLocation,
        map: mapInstanceRef.current,
        zIndex: 1000,
        icon: getPinIcon(google, '#ef4444', true) // Large Red pointer
      });
      markers.push(userMarker);
    }

    activeMarkersRef.current = markers;

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
      <div className="absolute top-4 left-4 right-20 md:left-6 md:right-auto md:w-[400px] z-30 space-y-2.5">
        <div className="relative">
          <div className="bg-white rounded-[1.5rem] shadow-md border border-stone-100 flex items-center">
            <form onSubmit={handleSearch} className="flex-1 flex items-center h-12">
              <div className="w-4" /> {/* Spacer to replace the hamburger icon */}
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  setShowSuggestions(true);
                  
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  searchTimerRef.current = setTimeout(() => {
                    fetchSuggestions(val);
                  }, 300);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search food territory..."
                className="flex-1 bg-transparent h-full font-medium text-sm outline-none placeholder:text-stone-500"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                    if (mapInstanceRef.current) fetchPlaces(mapInstanceRef.current);
                  }}
                  className="px-2 h-full flex items-center text-stone-400 hover:text-stone-900"
                >
                  <X size={18} />
                </button>
              )}
              <button 
                type="submit"
                className="w-10 h-full flex items-center justify-center text-stone-500 hover:text-blue-600 transition-colors"
              >
                <Search size={18} strokeWidth={2.5} />
              </button>
            </form>
            
            <div className="w-px h-6 bg-stone-200" />
            
            <button 
              onClick={() => setIsRoutePlannerOpen(true)}
              className="w-12 h-12 flex items-center justify-center text-blue-600 hover:text-blue-700 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Navigation size={16} />
              </div>
            </button>
          </div>

          {/* Suggestions dropdown — OUTSIDE the rounded container to avoid clipping */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden z-30">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSearchQuery(sug.text);
                    handleSearch(undefined, sug.text);
                  }}
                  className="w-full text-left px-5 py-3 hover:bg-stone-50 text-sm font-medium text-stone-700 border-b border-stone-50 last:border-0 flex items-center gap-2"
                >
                  {sug.type === 'place' ? <MapPin size={14} className="text-stone-400 shrink-0" /> : <Search size={14} className="text-stone-400 shrink-0" />}
                  <span className="truncate">{sug.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>


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
        onDistanceChangeEnd={() => { if (mapInstanceRef.current) fetchPlaces(mapInstanceRef.current, searchQuery); }}
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
