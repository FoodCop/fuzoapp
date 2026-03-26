import React from 'react';
import { AppItem } from '../../../shared/types/appItem';
import { ScoutPlace, ScoutMapTab, ScoutFilter } from '../types/scoutUi';

export const toScoutPlace = (result: any, index: number, mapsApiKey: string): ScoutPlace => {
  const lat = result.geometry?.location?.lat() || 0;
  const lng = result.geometry?.location?.lng() || 0;
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
    phone: '',
    website: '',
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
    lat: item.lat || 0,
    lng: item.lng || 0,
    markerSource: 'fuzo',
    vibe: item.vibe || [],
    timings: item.timings || {},
    menu: item.menu || [],
    userReviews: item.userReviews || [],
    photos: item.photos || []
  };
};

export const resolveScoutDisplayPlaces = (
  tab: ScoutMapTab, 
  main: ScoutPlace[], 
  snaps: ScoutPlace[], 
  my: ScoutPlace[]
): ScoutPlace[] => {
  switch (tab) {
    case 'main': return main;
    case 'fuzo': return snaps;
    case 'my': return my;
    default: return main;
  }
};

export const resolveScoutCopy = (tab: ScoutMapTab, count: number, isLoading: boolean) => {
  if (isLoading) return { scoutHeadline: 'Scanning Area...', listTitle: 'Detecting Spots', emptyStateMessage: '' };

  switch (tab) {
    case 'main':
      return { 
        scoutHeadline: 'Discovery Mode', 
        listTitle: count > 0 ? 'Top Picks Nearby' : 'No Spots Found',
        emptyStateMessage: 'Try moving the map or refreshing'
      };
    case 'fuzo':
      return { 
        scoutHeadline: 'Community Snaps', 
        listTitle: 'Recent Vibes',
        emptyStateMessage: 'No community snaps in this area yet'
      };
    case 'my':
      return { 
        scoutHeadline: 'My Map', 
        listTitle: 'Saved Spots',
        emptyStateMessage: 'You haven\'t saved any spots yet'
      };
    default:
      return { scoutHeadline: 'Scout Mode', listTitle: 'Nearby', emptyStateMessage: '' };
  }
};

export const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const earthRadius = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const arc = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * arc;
};

export const getMatchPercentage = (place: ScoutPlace | null): number => {
  if (!place) return 0;
  const base = place.rating * 20; 
  const random = Math.floor(Math.random() * 10) - 5; 
  return Math.min(100, Math.max(70, base + random));
};

export const filterPlaces = (places: ScoutPlace[], filter: ScoutFilter): ScoutPlace[] => {
  switch (filter) {
    case 'top':
      return [...places].sort((a, b) => b.rating - a.rating);
    case 'open':
      return places.filter(p => p.rating > 4.2);
    case 'distance':
      return places;
    default:
      return places;
  }
};

export const shouldApplyLatestRequest = (mountedRef: React.MutableRefObject<boolean>, requestSeq: number, requestSeqRef: React.MutableRefObject<number>) => {
    return mountedRef.current && requestSeq === requestSeqRef.current;
};
