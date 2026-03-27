import React from 'react';
import { AppItem } from '../../../shared/types/appItem';
import { ScoutPlace, ScoutMapTab, ScoutFilter } from '../types/scoutUi';

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
    markerSource: 'fuzo',
    vibe: item.vibe || [],
    phone: item.phone || '',
    website: item.website || '',
    timings: item.timings || {},
    menu: item.menu || [],
    userReviews: item.userReviews || [],
    photos: item.photos || []
  };
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
