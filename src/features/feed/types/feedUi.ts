export type FeedUiItemType = 'recipe' | 'video' | 'ad' | 'trivia' | 'photo' | 'snap' | 'trim';

export type FeedUiItem = {
  id: string;
  itemType: FeedUiItemType;
  itemId: string;
  name: string;
  cat: string;
  img: string;
  author?: string;
  authorUserId?: string;
  authorAvatar?: string;
  address?: string;
  metadata: Record<string, unknown>;
};
