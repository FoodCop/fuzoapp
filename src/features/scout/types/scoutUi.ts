export interface ScoutMenuSection {
  section: string;
  items: string[];
}

export interface ScoutUserReview {
  user: string;
  rating: number;
  text: string;
  time?: string;
}


export type ScoutTimings = Record<string, string>;

export type ScoutMapTab = 'main' | 'fuzo' | 'my';
export type PrimaryProfileType = 'chef' | 'individual' | 'restaurant' | 'culinary_team' | 'private_chef';
export interface ScoutFilter {
  type: 'all' | 'top' | 'open' | 'distance';
  rating: number;
  openNow: boolean;
  maxDistance: number;
  sortBy: 'match' | 'rating' | 'distance' | 'reviews';
}

export interface ScoutPlace {
  id: string;
  placeId?: string;
  markerSource?: 'fuzo' | 'google' | 'saved';
  name: string;
  cat: string;
  rating: number;
  reviews: number;
  address: string;
  phone: string;
  website: string;
  vibe: string[];
  img: string;
  lat: number;
  lng: number;
  timings: ScoutTimings;
  menu: ScoutMenuSection[];
  userReviews: ScoutUserReview[];
  photos: string[];
  matchPercentage?: number;
  isNewFind?: boolean;
  notes?: string;
  time?: string;
}



export type MarkerLike = {
  setMap: (map: MapLike | null) => void;
  addListener: (eventName: string, handler: () => void) => void;
  getMap: () => MapLike | null;
  getPosition: () => { lat: number; lng: number } | null;
  setZIndex: (index: number) => void;
};



export type LatLngBoundsLike = {
  extend: (location: { lat: number; lng: number }) => void;
  isEmpty: () => boolean;
};

export type MapLike = {
  fitBounds: (bounds: LatLngBoundsLike, padding?: number) => void;
  setCenter: (center: { lat: number; lng: number }) => void;
  getCenter: () => { lat: () => number; lng: () => number };
  panTo: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  addListener: (eventName: string, handler: (event?: any) => void) => void;
  getBounds: () => LatLngBoundsLike | null;
};



export type GoogleMapsLike = {
  Map: new (
    container: HTMLDivElement,
    options: {
      center: { lat: number; lng: number };
      zoom: number;
      disableDefaultUI?: boolean;
      streetViewControl?: boolean;
      mapTypeControl?: boolean;
      fullscreenControl?: boolean;
    }
  ) => MapLike;
  Marker: any;
  Geocoder: any;
  Animation: { DROP: unknown; BOUNCE: unknown };
  LatLngBounds: new () => LatLngBoundsLike;
  SymbolPath: { CIRCLE: unknown; BACKWARD_CLOSED_ARROW: unknown };
  DirectionsService: new () => any;
  DirectionsRenderer: new (options?: any) => any;
  Polyline: new (options?: any) => any;
  geometry: {
    poly: {
      isLocationOnEdge: (point: { lat: number; lng: number }, polyline: any, tolerance?: number) => boolean;
    };
    spherical: {
      computeDistanceBetween: (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => number;
    };
  };
};



export type GooglePlacePhoto = { photo_reference?: string };

export type GooglePlaceReview = {
  author_name?: string;
  rating?: number;
  text?: string;
};

export type GooglePlaceResult = {
  place_id?: string;
  name?: string;
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  vicinity?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  opening_hours?: { weekday_text?: string[] };
  reviews?: GooglePlaceReview[];
  photos?: GooglePlacePhoto[];
};

export const getGoogleMaps = (): GoogleMapsLike | null => {
  const runtime = globalThis as { google?: { maps?: GoogleMapsLike } };
  return runtime.google?.maps ?? null;
};
