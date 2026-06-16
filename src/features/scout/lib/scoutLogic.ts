import React from 'react';
import { AppItem } from '../../../shared/types/appItem';
import { ScoutPlace, ScoutFilter } from '../types/scoutUi';
import { API_KEYS } from '../../../shared/constants/apiKeys';

/**
 * Transforms Google's weekday_text array into our timings object
 * e.g. ["Monday: 9:00 AM – 5:00 PM"] -> { mon: "9:00 AM – 5:00 PM" }
 */
const parseOpeningHours = (weekdayText?: string[]): Record<string, string> => {
  if (!weekdayText || weekdayText.length === 0) return {};
  
  const daysMap: Record<string, string> = {
    'monday': 'mon', 'tuesday': 'tue', 'wednesday': 'wed', 
    'thursday': 'thu', 'friday': 'fri', 'saturday': 'sat', 'sunday': 'sun'
  };

  const results: Record<string, string> = {};
  weekdayText.forEach(line => {
    const [dayPart, ...hourParts] = line.split(': ');
    const dayKey = dayPart.trim().toLowerCase();
    const hours = hourParts.join(': ').trim();
    if (daysMap[dayKey]) {
      results[daysMap[dayKey]] = hours;
    }
  });

  return results;
};

/**
 * Merges raw Google Place Details into an existing ScoutPlace
 */
export const mergePlaceDetails = (original: ScoutPlace, details: any, mapsApiKey: string = API_KEYS.MAPS): ScoutPlace => {
  if (!details) return original;

  return {
    ...original,
    phone: details.formatted_phone_number || details.international_phone_number || original.phone,
    website: details.website || original.website,
    rating: details.rating || original.rating,
    reviews: details.user_ratings_total || original.reviews,
    address: details.formatted_address || original.address,
    timings: parseOpeningHours(details.opening_hours?.weekday_text) || original.timings,
    priceLevel: details.price_level,
    editorialSummary: details.editorial_summary?.overview,
    dineIn: details.dine_in,
    takeout: details.takeout,
    delivery: details.delivery,
    reservable: details.reservable,
    plusCode: details.plus_code?.global_code || details.plus_code?.compound_code,
    currentOpeningHours: details.current_opening_hours,
    userReviews: (details.reviews || []).map((r: any) => ({
      user: r.author_name || 'FUZO Scout',
      rating: r.rating || 5,
      text: r.text || '',
      time: r.relative_time_description || 'Recently'
    })),
    photos: (details.photos || []).map((p: any) => 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${p.photo_reference}&key=${mapsApiKey}`
    ),
    wheelchairAccessibleEntrance: details.wheelchair_accessible_entrance,
    servesBeer: details.serves_beer,
    servesWine: details.serves_wine,
    servesBreakfast: details.serves_breakfast,
    servesBrunch: details.serves_brunch,
    servesLunch: details.serves_lunch,
    servesDinner: details.serves_dinner,
    servesVegetarianFood: details.serves_vegetarian_food,
    menuLink: details.url // The old API doesn't have menu_link, so we use their Google Maps URL as fallback
  };
};

export const SCOUT_FALLBACK_PLACES: ScoutPlace[] = [
  {
    id: 'fallback-1',
    name: 'The Glass House',
    cat: 'Fine Dining',
    rating: 4.8,
    reviews: 1240,
    address: '123 Crystal Lane, NY',
    phone: '+1 212-555-0123',
    website: 'theglasshouse.com',
    vibe: ['Elegant', 'Romantic', 'Quiet'],
    img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400',
    lat: 40.7128,
    lng: -74.0060,
    timings: { mon: '5PM - 11PM', tue: '5PM - 11PM', wed: '5PM - 11PM', thu: '5PM - 12AM', fri: '5PM - 1AM', sat: '4PM - 1AM', sun: '4PM - 10PM' },
    menu: [],
    userReviews: [],
    photos: [],
    matchPercentage: 98
  }
];

export const toScoutPlace = (result: any, index: number, mapsApiKey: string): ScoutPlace => {
  // Handle both JS API (functions) and REST API (numbers)
  const getCoord = (coord: any) => {
    if (typeof coord === 'function') return coord();
    if (typeof coord === 'number') return coord;
    return 0;
  };

  const lat = getCoord(result.geometry?.location?.lat);
  const lng = getCoord(result.geometry?.location?.lng);
  const placeId = result.place_id || `google-${index}`;
  
  return {
    id: placeId,
    placeId: placeId,
    markerSource: 'google',
    name: result.name || 'Unnamed Place',
    cat: result.types?.[0]?.replace(/_/g, ' ') || 'Restaurant',
    rating: result.rating || 0,
    reviews: result.user_ratings_total || 0,
    address: result.vicinity || result.formatted_address || '',
    phone: result.formatted_phone_number || '',
    website: result.website || '',
    vibe: [],
    img: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${result.photos?.[0]?.photo_reference}&key=${mapsApiKey}`,
    lat,
    lng,
    timings: {},
    menu: [],
    userReviews: [],
    photos: []
  };
};

export const toSavedScoutPlace = (item: AppItem, index: number): ScoutPlace => {
  return {
    ...item,
    id: item.id || `saved-${index}`,
    name: item.name || 'Saved Place',
    cat: item.cat || 'Restaurant',
    img: item.img || '',
    rating: item.rating || 0,
    reviews: item.reviews || 0,
    address: item.address || '',
    lat: item.lat || 0,
    lng: item.lng || 0,
    markerSource: 'saved',
    vibe: item.vibe || [],
    phone: item.phone || '',
    website: item.website || '',
    timings: item.timings || {},
    menu: item.menu || [],
    userReviews: item.userReviews || [],
    photos: item.photos || []
  };
};

export const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

export const calculateNeuralMatch = (place: ScoutPlace): number => {
  const base = place.rating * 20; 
  const random = Math.floor(Math.random() * 10) - 5; 
  return Math.min(100, Math.max(70, Math.round(base + random)));
};

export const getMatchPercentage = (place: ScoutPlace | null): number => {
  if (!place) return 0;
  return place.matchPercentage || calculateNeuralMatch(place);
};

export const filterPlaces = (places: ScoutPlace[], filter: ScoutFilter): ScoutPlace[] => {
  let filtered = [...places];

  if (filter.type === 'top') {
    filtered = filtered.filter(p => p.rating >= 4.5);
  } else if (filter.type === 'open') {
    filtered = filtered.filter(p => p.rating > 4.2); // Simplified
  }

  if (filter.rating > 0) {
    filtered = filtered.filter(p => p.rating >= filter.rating);
  }

  return filtered;
};

export const sortPlaces = (places: ScoutPlace[], sortBy: ScoutFilter['sortBy']): ScoutPlace[] => {
  const sorted = [...places];
  switch (sortBy) {
    case 'match':
      return sorted.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'reviews':
      return sorted.sort((a, b) => b.reviews - a.reviews);
    case 'distance':
      return sorted; // Needs lat/lng of user
    default:
      return sorted;
  }
};

export const shouldApplyLatestRequest = (mountedRef: React.MutableRefObject<boolean>, requestSeq: number, requestSeqRef: React.MutableRefObject<number>) => {
    return mountedRef.current && requestSeq === requestSeqRef.current;
};

export const extractSuggestionText = (s: any): { text: string; placeId: string } | null => {
  if (!s) return null;
  const prediction = s.placePrediction || s.queryPrediction;
  if (!prediction) {
    // Fallback for cases where it's a raw string or description property
    let text = s.description || s.text || s.name || s.formattedAddress;
    if (typeof s === 'string') text = s;
    if (!text) return null;
    return { text, placeId: s.placeId || s.place_id || '' };
  }

  let text = '';
  if (prediction.text?.text) text = prediction.text.text;
  else if (prediction.text?.toString) text = prediction.text.toString();
  else if (prediction.description) text = prediction.description;
  
  const placeId = prediction.placeId || prediction.place_id || '';
  
  if (!text) return null;
  return { text, placeId };
};

