export type NotificationType = 'new_message' | 'friend_request' | 'system' | 'achievement';

export interface DbNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  type: 'message' | 'friend_request' | 'system' | 'achievement';
  title: string;
  description: string;
  time: string;
  unread: boolean;
  originalType?: 'dm' | 'group';
  data?: Record<string, any>;
}
