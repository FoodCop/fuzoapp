import { supabase } from '../../../services/supabaseClient';
import type { DbNotification, AppNotification } from '../types/notifications';

export const NotificationService = {
  async listNotifications(userId: string): Promise<{ success: boolean; data?: AppNotification[]; error?: string }> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase not configured' };

    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return { success: false, error: error.message };

    const mapped: AppNotification[] = (data || []).map((n: DbNotification) => {
      const type = n.type === 'new_message' ? 'message' : n.type;
      const originalType = n.data?.group_id ? 'group' : 'dm';

      return {
        id: n.id,
        type,
        title: n.title,
        description: n.message,
        time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: !n.read,
        data: n.data,
        originalType: type === 'message' ? originalType : undefined
      };
    });

    return { success: true, data: mapped };
  },

  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase not configured' };

    const { error } = await client
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    return { success: !error, error: error?.message };
  },

  async markAllRead(userId: string): Promise<{ success: boolean; error?: string }> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase not configured' };

    const { error } = await client
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    return { success: !error, error: error?.message };
  },

  subscribeToNotifications(userId: string, onNotification: (notif: AppNotification) => void) {
    const client = supabase;
    if (!client) return () => {};

    const channel = client
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const n = payload.new as DbNotification;
        const type = n.type === 'new_message' ? 'message' : n.type;
        const originalType = n.data?.group_id ? 'group' : 'dm';

        onNotification({
          id: n.id,
          type,
          title: n.title,
          description: n.message,
          time: 'now',
          unread: true,
          data: n.data,
          originalType: type === 'message' ? originalType : undefined
        });
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }
};
