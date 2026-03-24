import type { AppItem } from '../../../shared/types/appItem';

export type ChatMessageStatus = 'sending' | 'sent' | 'read' | 'error';

export interface ChatFriend {
  id: string | number;
  name: string;
  avatar: string;
  username?: string;
  email?: string;
  time?: string;
  isOnline?: boolean;
  online?: boolean;
  lastSeen?: string | null;
  unreadCount?: number;
  requestStatus?: 'pending' | 'accepted';
  type?: 'dm';
}

export interface ChatGroup {
  id: string;
  name: string;
  avatar: string;
  description?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  memberCount?: number;
  type: 'group';
}

export type ChatInboxItem = ChatFriend | ChatGroup;

export interface ChatUiMessage {
  id: string;
  role: 'user' | 'ai';
  senderId?: string;
  senderName?: string;
  type: 'text' | 'share';
  text: string;
  item?: AppItem | null;
  status?: ChatMessageStatus;
}
