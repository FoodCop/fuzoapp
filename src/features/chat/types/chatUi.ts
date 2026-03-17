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
}

export interface ChatUiMessage {
  id: string;
  role: 'user' | 'ai';
  type: 'text' | 'share';
  text: string;
  item?: AppItem | null;
  status?: ChatMessageStatus;
}
