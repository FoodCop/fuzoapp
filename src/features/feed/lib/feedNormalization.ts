import { dealCardsWithSeed, generateSeed } from '../../../shared/lib/feedDealer';
import { resolvePublicAssetPath } from '../../../shared/lib/resolvePublicAssetPath';
import type { DealerContent, FeedCard } from '../../../shared/types/feed';
import type { FeedUiItem, FeedUiItemType } from '../types/feedUi';

const TARGET_FEED_TYPES = new Set<FeedUiItemType>(['ad', 'trivia', 'recipe', 'video', 'photo', 'snap', 'trim']);

type FeedParityItem = Pick<FeedUiItem, 'id' | 'itemType' | 'itemId' | 'name' | 'cat' | 'img'>;

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
};

const buildStableUiId = (itemType: FeedUiItemType, itemId: string) => `${itemType}-${itemId}`;

const normalizeFeedImagePathForType = (itemType: FeedUiItemType, imagePath: string) => {
  if (!imagePath) return imagePath;
  const normalized = imagePath.replaceAll('\\', '/');
  if (itemType === 'ad') {
    return normalized.replace(/(^|\/)ads\/vertical\//i, '$1ads/Vertical/');
  }
  if (itemType === 'trivia') {
    return normalized.replace(/(^|\/)trivia\/vertical\//i, '$1trivia/vertical/');
  }
  return normalized;
};

const getNormalizedName = (itemType: FeedUiItemType, record: Record<string, unknown>) => {
  const candidates = [
    record.name,
    record.title,
    record.brandName,
    record.headline,
    record.question,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  if (candidates.length > 0) return String(candidates[0]);

  if (itemType === 'recipe') return 'Recipe';
  if (itemType === 'video' || itemType === 'trim') return 'Video';
  if (itemType === 'photo' || itemType === 'snap') return 'Culinary Snap';
  if (itemType === 'ad') return 'Sponsored';
  return 'Food Trivia';
};

const getNormalizedCategory = (itemType: FeedUiItemType) => {
  if (itemType === 'recipe') return 'Recipe';
  if (itemType === 'video' || itemType === 'trim') return 'Studio Trim';
  if (itemType === 'photo' || itemType === 'snap') return 'Studio Snap';
  if (itemType === 'ad') return 'Ad';
  return 'Trivia';
};

const getRawImage = (itemType: FeedUiItemType, record: Record<string, unknown>) => {
  const candidates = [
    record.imageUrl,
    record.img,
    record.image,
    record.thumbnailUrl,
    ...(Array.isArray(record.photos) ? record.photos : []),
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  if (candidates.length > 0) return String(candidates[0]);
  return '';
};

const getOptionalString = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
};

export const normalizeDealerContentToCards = (dealerCards: DealerContent[]): FeedUiItem[] => {
  const normalized = dealerCards
    .map((entry) => {
      const record = asRecord(entry);
      const sourceType = String(record.type || '').toLowerCase();
      if (!TARGET_FEED_TYPES.has(sourceType as FeedUiItemType)) return null;

      const rawId = String(record.id || '').trim();
      if (!rawId) return null;

      const itemType = sourceType as FeedUiItemType;
      const itemId = rawId.replace(new RegExp(`^${itemType}-`), '') || rawId;
      const id = buildStableUiId(itemType, itemId);

      const name = getNormalizedName(itemType, record);
      const cat = getNormalizedCategory(itemType);
      const rawImage = getRawImage(itemType, record);

      const normalizedImage = normalizeFeedImagePathForType(itemType, rawImage);

      const img = resolvePublicAssetPath(normalizedImage);
      const author = getOptionalString(record, ['authorName', 'author', 'authorName', 'creatorName', 'username', 'channelTitle']);
      const authorUserId = getOptionalString(record, ['authorUserId', 'author_id', 'userId', 'user_id', 'creatorId']);
      const authorAvatar = record.authorAvatar as string | undefined;
      const address = getOptionalString(record, ['address', 'location_name', 'vicinity']);

      if (!name || !img) return null;

      return {
        id,
        itemType,
        itemId,
        name,
        cat,
        img,
        ...(author ? { author } : {}),
        ...(authorUserId ? { authorUserId } : {}),
        ...(authorAvatar ? { authorAvatar } : {}),
        ...(address ? { address } : {}),
        metadata: {
          ...record,
          title: name,
          name,
          cat,
          image: img,
          ...(author ? { author } : {}),
          ...(authorUserId ? { authorUserId, userId: authorUserId, author_id: authorUserId } : {}),
          ...(authorAvatar ? { authorAvatar } : {}),
          sourceType,
          sourceId: rawId,
        },
      };
    })
    .filter(Boolean) as FeedUiItem[];

  const uniqueById = new Map<string, FeedUiItem>();
  normalized.forEach((item) => {
    if (!uniqueById.has(item.id)) {
      uniqueById.set(item.id, item);
    }
  });

  return Array.from(uniqueById.values());
};

export const normalizeFeedServiceToCards = (feedCards: FeedCard[]) => {
  const seed = generateSeed();
  const dealtCards = dealCardsWithSeed(feedCards, seed, 36);
  return normalizeDealerContentToCards(dealtCards);
};

const getMissingFieldNames = (item: FeedParityItem) => {
  const missing: string[] = [];
  if (!item.id) missing.push('id');
  if (!item.itemType) missing.push('itemType');
  if (!item.itemId) missing.push('itemId');
  if (!item.name) missing.push('name');
  if (!item.cat) missing.push('cat');
  if (!item.img) missing.push('img');
  return missing;
};

const isValidImageUrl = (url?: string) => !!url && /^(https?:\/\/|\/)/.test(url);

export const ensureAdTriviaPresence = (
  items: FeedUiItem[],
  _fallbackItems: readonly { id: string; itemType: string; itemId: string; name: string; cat: string; img: string }[]
): FeedUiItem[] => {
  // --- TEMPORARY TEST OVERRIDE: Returning items as-is to verify organic population ---
  return items;

  /* Original Logic (Disabled for testing)
  const hasAd = items.some((item) => item.itemType === 'ad');
  ...
  */
};

export const logFeedParity = (localItems: readonly FeedParityItem[], serviceItems: readonly FeedParityItem[]) => {
  const localMissing = localItems.map((item) => ({ id: item.id, missing: getMissingFieldNames(item) })).filter((row) => row.missing.length > 0);
  const serviceMissing = serviceItems.map((item) => ({ id: item.id, missing: getMissingFieldNames(item) })).filter((row) => row.missing.length > 0);
  const localInvalidImages = localItems.filter((item) => !isValidImageUrl(item.img)).map((item) => item.id);
  const serviceInvalidImages = serviceItems.filter((item) => !isValidImageUrl(item.img)).map((item) => item.id);
  const localIds = new Set(localItems.map((item) => item.id));
  const serviceIds = new Set(serviceItems.map((item) => item.id));
  const overlappingIds = Array.from(serviceIds).filter((id) => localIds.has(id));

  console.groupCollapsed('🍽️ [Feed Parity] Local vs FeedService');
  console.log('Counts', { local: localItems.length, feedService: serviceItems.length });
  console.log('Missing fields', { local: localMissing, feedService: serviceMissing });
  console.log('Invalid image URLs', { local: localInvalidImages, feedService: serviceInvalidImages });
  console.log('IDs', {
    localSample: localItems.slice(0, 8).map((item) => item.id),
    feedServiceSample: serviceItems.slice(0, 8).map((item) => item.id),
    overlapCount: overlappingIds.length,
  });
  console.groupEnd();
};
