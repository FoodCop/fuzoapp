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
  user_ratings_total?: number;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
}

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
  async searchNearby(latitude: number, longitude: number, radius = 5000): Promise<ServiceResult<{ results: ScoutPlace[]; status?: string; error_message?: string }>> {
    return makeRequest<{ results: ScoutPlace[]; status?: string; error_message?: string }>('/places/nearby', {
      latitude,
      longitude,
      radius,
      type: 'restaurant',
    });
  },

  async searchByText(query: string, latitude: number, longitude: number): Promise<ServiceResult<{ results: ScoutPlace[]; status?: string; error_message?: string }>> {
    return makeRequest<{ results: ScoutPlace[]; status?: string; error_message?: string }>('/places/textsearch', {
      query,
      location: { lat: latitude, lng: longitude },
      radius: 50000,
    });
  },

  async getPlaceDetails(placeId: string): Promise<ServiceResult<{ result?: ScoutPlace; status?: string }>> {
    return makeRequest<{ result?: ScoutPlace; status?: string }>('/places/details', {
      place_id: placeId,
    });
  },
};

export default PlacesService;
