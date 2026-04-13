import type { ChatInboxItem } from '../types/chatUi';

/**
 * filterFriendsByQuery - Filters a list of chat contacts based on a search query.
 */
export const filterFriendsByQuery = (friends: ChatInboxItem[], query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return friends;

  return friends.filter((friend) => {
    const username = 'username' in friend ? String(friend.username || '').toLowerCase() : '';
    const displayName = String(friend.name || '').toLowerCase();
    const email = 'email' in friend ? String(friend.email || '').toLowerCase() : '';
    return username.includes(normalized) || displayName.includes(normalized) || email.includes(normalized);
  });
};
