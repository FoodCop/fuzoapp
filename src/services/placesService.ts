/**
 * ============================================================================
 * GEOSPATIAL PLACES SERVICE — Map Intelligence & Discovery
 * ============================================================================
 * 
 * This service provides a typed interface to Google Places and Directions APIs, 
 * routed through a secure Supabase Edge Function to protect API credentials.
 * 
 * Core Capabilities:
 * 1. Nearby Discovery: Fetches restaurants and culinary sites based on geolocation.
 * 2. Semantic Search: Allows text-based location lookups with spatial constraints.
 * 3. Routing Intelligence: Computes directions and searches for pins along a 
 *    travel polyline.
 * 4. Rich Meta Extraction: Fetches ratings, photos, and hours for map markers.
 */

/**
 * SECTION: Configuration & Sanitization
 */
const cleanEnv = (value: string | undefined) => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  const withoutLeading = (trimmed.startsWith('"') || trimmed.startsWith("'")) ? trimmed.slice(1) : trimmed;
  return (withoutLeading.endsWith('"') || withoutLeading.endsWith("'")) ? withoutLeading.slice(0, -1) : withoutLeading;
};

const SUPABASE_URL = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_ANON_KEY = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);
const EDGE_URL = `${SUPABASE_URL}/functions/v1/make-server-5976446e`;

/**
 * SECTION: Domain Entities & Scout Types
 */
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ScoutPlace {
  place_id?: string;
  id?: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  reviews?: Array<{
    author_name?: string;
    rating?: number;
    text?: string;
    time?: number;
    relative_time_description?: string;
  }>;
  photos?: Array<{
    photo_reference?: string;
    html_attributions?: string[];
  }>;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  current_opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  price_level?: number;
  editorial_summary?: {
    overview?: string;
  };
  dine_in?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  reservable?: boolean;
  plus_code?: {
    global_code?: string;
    compound_code?: string;
  };
  user_ratings_total?: number;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
}

/**
 * SECTION: Request Orchestrator
 * Performs the low-level HTTP handshake with the Edge Function proxy.
 */
async function makeRequest<T>(path: string, payload: unknown): Promise<ServiceResult<T>> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      success: false,
      error: 'Supabase env vars missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
    };
  }

  try {
    const response = await fetch(`${EDGE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data?.error || `Request failed (${response.status})`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export const PlacesService = {
  /**
   * SECTION: Local Discovery Methods
   * Logic for finding culinary sites relative to the user's current or target map view.
   */
  async searchNearby(latitude: number, longitude: number, radius = 5000): Promise<ServiceResult<{ results: ScoutPlace[]; status?: string; error_message?: string }>> {
    return makeRequest<{ results: ScoutPlace[]; status?: string; error_message?: string }>('/places/nearby', {
      latitude,
      longitude,
      radius,
      type: 'restaurant',
    });
  },

  async searchByText(query: string, latitude: number, longitude: number, radius = 50000): Promise<ServiceResult<{ results: ScoutPlace[]; status?: string; error_message?: string }>> {
    return makeRequest<{ results: ScoutPlace[]; status?: string; error_message?: string }>('/places/textsearch', {
      query,
      location: { lat: latitude, lng: longitude },
      radius,
    });
  },

  async searchAlongRoute(polyline: string, query: string, origin?: {lat: number, lng: number}, destination?: {lat: number, lng: number}): Promise<ServiceResult<{ results: ScoutPlace[]; status?: string }>> {
    return makeRequest<{ results: ScoutPlace[]; status?: string }>('/places/search-along-route', {
      polyline,
      query,
      origin,
      destination
    });
  },

  /**
   * SECTION: Navigation & Intelligence
   * Fetches pathing data and deep location metadata for UI overlays.
   */
  async getDirections(origin: string | { lat: number; lng: number }, destination: string | { lat: number; lng: number }): Promise<ServiceResult<{ routes: any[]; status: string }>> {
    const parseWaypoint = (wp: string | { lat: number; lng: number }) => {
      if (typeof wp === 'object') {
        return { location: { latLng: { latitude: wp.lat, longitude: wp.lng } } };
      }
      if (wp.startsWith('place_id:')) {
        return { placeId: wp.replace('place_id:', '') };
      }
      return { address: wp };
    };

    const payload = {
      origin: parseWaypoint(origin),
      destination: parseWaypoint(destination),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      }
    };

    return makeRequest<{ routes: any[]; status: string }>('/directions', payload);
  },

  async getPlaceDetails(placeId: string): Promise<ServiceResult<{ result?: ScoutPlace; status?: string }>> {

    return makeRequest<{ result?: ScoutPlace; status?: string }>('/places/details', {
      place_id: placeId,
    });
  },
};

export default PlacesService;
