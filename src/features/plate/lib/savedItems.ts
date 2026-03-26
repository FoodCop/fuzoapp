import type { AppItem } from '../../../shared/types/appItem';
import type { PlateItemType } from '../../../services/plateService';

const getSavedUiId = (itemType: string, itemId: string) => {
  const prefixByType: Record<string, string> = {
    recipe: 'recipe',
    video: 'video',
    ad: 'ad',
    trivia: 'trivia',
  };

  const prefix = prefixByType[itemType];
  return prefix ? `${prefix}-${itemId}` : itemId;
};

const getSavedItemCategory = (itemType: string) => {
  if (itemType === 'video') return 'Studio Trim';
  if (itemType === 'recipe') return 'Recipe';
  if (itemType === 'ad') return 'Ad';
  if (itemType === 'trivia') return 'Trivia';
  return 'Saved Item';
};

export const inferItemTypeFromId = (idValue: string) => {
  if (idValue.startsWith('recipe-')) return 'recipe';
  if (idValue.startsWith('video-')) return 'video';
  if (idValue.startsWith('ad-')) return 'ad';
  if (idValue.startsWith('trivia-')) return 'trivia';
  return 'restaurant';
};

const toPlateItemType = (value: string): PlateItemType => {
  if (value === 'restaurant') return 'restaurant';
  if (value === 'recipe') return 'recipe';
  if (value === 'photo') return 'photo';
  if (value === 'video') return 'video';
  return 'other';
};

export type NormalizedPlateItem = AppItem & {
  itemType: PlateItemType;
  itemId: string;
  metadata: Record<string, unknown>;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
};

export const normalizeSavedItemForUI = (savedItem: unknown): AppItem => {
  const saved = asRecord(savedItem);
  const metadata = asRecord(saved.metadata);
  const itemType = String(saved.item_type || saved.itemType || 'other');
  const itemId = String(saved.item_id || saved.itemId || saved.id || Date.now());
  const uiId = getSavedUiId(itemType, itemId);
  const fallbackCategory = getSavedItemCategory(itemType);

  const lat = metadata.lat ?? metadata.latitude ?? saved.lat;
  const lng = metadata.lng ?? metadata.longitude ?? saved.lng;
  const ratingFromMetadata = Number.isFinite(Number(metadata.rating)) ? Number(metadata.rating) : undefined;
  const ratingFromSaved = Number.isFinite(Number(saved.rating)) ? Number(saved.rating) : undefined;
  const reviewsFromMetadata = Number.isFinite(Number(metadata.reviews)) ? Number(metadata.reviews) : undefined;
  const reviewsFromSaved = Number.isFinite(Number(saved.reviews)) ? Number(saved.reviews) : undefined;
  const vibeFromMetadata = Array.isArray(metadata.vibe)
    ? metadata.vibe.filter((entry): entry is string => typeof entry === 'string')
    : undefined;
  const vibeFromSaved = Array.isArray(saved.vibe)
    ? saved.vibe.filter((entry): entry is string => typeof entry === 'string')
    : undefined;

  return {
    id: uiId,
    itemType,
    itemId,
    placeId: typeof (metadata.placeId || saved.placeId) === 'string' ? String(metadata.placeId || saved.placeId) : undefined,
    name: String(metadata.title || metadata.name || saved.name || `Saved ${itemType}`),
    cat: String(metadata.cat || metadata.category || fallbackCategory),
    img: String(metadata.image || metadata.img || metadata.image_url || saved.img || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400'),
    lat: Number.isFinite(Number(lat)) ? Number(lat) : undefined,
    lng: Number.isFinite(Number(lng)) ? Number(lng) : undefined,
    address: typeof (metadata.address || saved.address) === 'string' ? String(metadata.address || saved.address) : undefined,
    rating: ratingFromMetadata ?? ratingFromSaved,
    reviews: reviewsFromMetadata ?? reviewsFromSaved,
    phone: typeof (metadata.phone || saved.phone) === 'string' ? String(metadata.phone || saved.phone) : undefined,
    website: typeof (metadata.website || saved.website) === 'string' ? String(metadata.website || saved.website) : undefined,
    vibe: vibeFromMetadata ?? vibeFromSaved,
    metadata,
  };
};

export const normalizeItemForPlateSave = (item: AppItem): NormalizedPlateItem => {
  const itemIdValue = String(item.id || '');

  // Keep Scout map fields in metadata so they survive round-trips through PlateService.
  const metadata = {
    ...(item.metadata && typeof item.metadata === 'object' ? item.metadata : {}),
    title: item.metadata?.title || item.name,
    name: item.metadata?.name || item.name,
    cat: item.metadata?.cat || item.cat,
    image: item.metadata?.image || item.img,
    ...(Number.isFinite(Number(item.lat)) ? { lat: Number(item.lat) } : {}),
    ...(Number.isFinite(Number(item.lng)) ? { lng: Number(item.lng) } : {}),
    ...(item.placeId ? { placeId: item.placeId } : {}),
    ...(item.address ? { address: item.address } : {}),
    ...(Number.isFinite(Number(item.rating)) ? { rating: Number(item.rating) } : {}),
    ...(Number.isFinite(Number(item.reviews)) ? { reviews: Number(item.reviews) } : {}),
    ...(item.phone ? { phone: item.phone } : {}),
    ...(item.website ? { website: item.website } : {}),
    ...(Array.isArray(item.vibe) ? { vibe: item.vibe } : {}),
  };

  return {
    ...item,
    itemType: toPlateItemType(String(item.itemType || inferItemTypeFromId(itemIdValue))),
    itemId: String(item.itemId || itemIdValue.replace(/^recipe-/, '').replace(/^video-/, '').replace(/^post-/, '')),
    metadata,
  };
};

export const areSavedItemsEquivalent = (left: AppItem, right: AppItem) => {
  const normalizedLeft = normalizeItemForPlateSave(left);
  const normalizedRight = normalizeItemForPlateSave(right);

  return normalizedLeft.itemType === normalizedRight.itemType && normalizedLeft.itemId === normalizedRight.itemId;
};
