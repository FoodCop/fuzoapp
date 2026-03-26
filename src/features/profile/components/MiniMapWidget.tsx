import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { API_KEYS } from '../../../shared/constants/apiKeys';
import type { AppItem } from '../../../shared/types/appItem';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { getGoogleMaps } from '../../scout/types/scoutUi';

interface MiniMapWidgetProps {
  savedItems: AppItem[];
  className?: string;
  defaultCenter?: { lat: number; lng: number };
}

export const MiniMapWidget = ({ 
  savedItems, 
  className = "", 
  defaultCenter = { lat: 43.6532, lng: -79.3832 } // Toronto default
}: MiniMapWidgetProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validPins = savedItems.filter(item => 
    typeof item.lat === 'number' && typeof item.lng === 'number'
  );

  useEffect(() => {
    let disposed = false;

    const initMap = async () => {
      if (!API_KEYS.MAPS) {
        setError('Maps API key not found');
        return;
      }

      if (!mapContainerRef.current) return;

      try {
        const loader = new Loader({
          apiKey: API_KEYS.MAPS,
          version: 'weekly',
          libraries: ['visualization']
        });

        await loader.importLibrary('maps');
        
        if (disposed || !mapContainerRef.current) return;

        const googleMaps = getGoogleMaps();
        if (!googleMaps) throw new Error('Google Maps runtime not available');

        // Calculate center based on pins or use default
        const center = validPins.length > 0 
          ? { lat: validPins[0].lat!, lng: validPins[0].lng! }
          : defaultCenter;

        const map = new googleMaps.Map(mapContainerRef.current, {
          center,
          zoom: 12,
          // @ts-ignore - custom styles
          styles: MAP_STYLES,
          disableDefaultUI: true,
          // @ts-ignore
          zoomControl: true,
          // @ts-ignore
          gestureHandling: 'cooperative',
        });

        mapInstanceRef.current = map;

        // Add Markers
        validPins.forEach(pin => {
          new googleMaps.Marker({
            position: { lat: pin.lat!, lng: pin.lng! },
            map,
            title: pin.name || 'Saved location',
            icon: {
              path: googleMaps.SymbolPath.CIRCLE,
              fillColor: '#EAB308', // yellow-500
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
              scale: 8
            }
          });
        });

        // Add Heatmap/Density if visualization is available
        // @ts-ignore
        if (validPins.length > 0 && typeof google !== 'undefined' && google.maps.visualization) {
          const heatmapData = validPins.map(pin => {
             // @ts-ignore
             return new google.maps.LatLng(pin.lat!, pin.lng!);
          });
          // @ts-ignore
          new google.maps.visualization.HeatmapLayer({
            data: heatmapData,
            map,
            radius: 30,
            opacity: 0.6,
            gradient: [
              'rgba(0, 255, 255, 0)',
              'rgba(0, 255, 255, 1)',
              'rgba(0, 191, 255, 1)',
              'rgba(0, 127, 255, 1)',
              'rgba(0, 63, 255, 1)',
              'rgba(0, 0, 255, 1)',
              'rgba(0, 0, 223, 1)',
              'rgba(0, 0, 191, 1)',
              'rgba(0, 0, 159, 1)',
              'rgba(0, 0, 127, 1)',
              'rgba(63, 0, 91, 1)',
              'rgba(127, 0, 63, 1)',
              'rgba(191, 0, 31, 1)',
              'rgba(255, 0, 0, 1)'
            ]
          });
        }

        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to load Google Maps:', err);
        setError('Failed to initialize map');
      }
    };

    initMap();

    return () => {
      disposed = true;
      mapInstanceRef.current = null;
    };
  }, [validPins.length]);

  return (
    <div className={`relative w-full h-[400px] bg-stone-100 rounded-[3rem] overflow-hidden border-4 border-white shadow-xl ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-50/80 backdrop-blur-sm z-10">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Gourmet Map Loading...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-50/80 backdrop-blur-sm z-10 px-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{error}</p>
        </div>
      )}

      {isLoaded && (
        <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white/50 flex items-center gap-3 slide-in-bottom">
          <div className="p-2 bg-yellow-400 rounded-xl text-stone-900">
            <MapPin size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-900">{validPins.length} Locations</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-stone-400">Activity Density Active</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Sleek dark-mode inspired custom styles for the map
const MAP_STYLES: any[] = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#f5f5f5" }]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#f5f5f5" }]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#bdbdbd" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#eeeeee" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#e5e5e5" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9e9e9e" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#dadada" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9e9e9e" }]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry",
    "stylers": [{ "color": "#e5e5e5" }]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [{ "color": "#eeeeee" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#c9c9c9" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9e9e9e" }]
  }
];
