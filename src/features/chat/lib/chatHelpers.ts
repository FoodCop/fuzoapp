import type { ChatInboxItem } from '../types/chatUi';

/**
 * filterFriendsByQuery - Filters a list of chat contacts based on a search query.
 */
export const filterFriendsByQuery = (friends: ChatInboxItem[], query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return friends;

  return friends.filter((friend) => {
    const username = 'username' in friend ? String(friend.username || '').toLowerCase() : '';
    const handle = 'handle' in friend ? String(friend.handle || '').toLowerCase() : '';
    const displayName = String(friend.name || '').toLowerCase();
    const displayNameRaw = 'display_name' in friend ? String(friend.display_name || '').toLowerCase() : '';
    const email = 'email' in friend ? String(friend.email || '').toLowerCase() : '';

    return username.includes(normalized) || 
           handle.includes(normalized) || 
           displayName.includes(normalized) || 
           displayNameRaw.includes(normalized) || 
           email.includes(normalized);
  });
};
