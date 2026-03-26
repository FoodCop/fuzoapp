import { supabase } from '../../../services/supabaseClient';
import type { AppItem } from '../../../shared/types/appItem';

type ChatSharedItem = AppItem;

export interface ChatContact {
  id: string;
  name: string;
  username: string;
  email?: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId?: string;
  groupId?: string;
  senderId: string;
  content: string;
  sharedItem: ChatSharedItem | null;
  createdAt: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  createdBy: string;
  createdAt: string;
  lastMessageAt?: string;
}

interface ChatResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ChatConversationParticipants {
  id: string;
  participant1: string;
  participant2: string;
}

interface ChatIncomingMessageNotice {
  message: ChatMessage;
  otherUserId: string;
}

type SupabaseRealtimePayload = {
  new?: unknown;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
};

const toChatMessage = (value: unknown): ChatMessage => {
  const row = asRecord(value);
  return {
    id: String(row.id || ''),
    conversationId: row.conversation_id ? String(row.conversation_id) : undefined,
    groupId: row.group_id ? String(row.group_id) : undefined,
    senderId: String(row.sender_id || ''),
    content: typeof row.content === 'string' ? row.content : '',
    sharedItem: (row.shared_item && typeof row.shared_item === 'object') ? (row.shared_item as ChatSharedItem) : null,
    createdAt: String(row.created_at || ''),
  };
};

const toChatGroup = (value: unknown): ChatGroup => {
  const row = asRecord(value);
  return {
    id: String(row.id || ''),
    name: String(row.name || 'Group'),
    description: typeof row.description === 'string' ? row.description : undefined,
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : undefined,
    createdBy: String(row.created_by || ''),
    createdAt: String(row.created_at || ''),
    lastMessageAt: typeof row.last_message_at === 'string' ? row.last_message_at : undefined,
  };
};

const toChatContact = (value: unknown): ChatContact => {
  const row = asRecord(value);
  const id = String(row.id || '');
  const username = typeof row.username === 'string' ? row.username : 'fuzo_user';
  const email = typeof row.email === 'string' && row.email.trim().length > 0 ? row.email : undefined;

  return {
    id,
    name: typeof row.display_name === 'string' && row.display_name.trim().length > 0
      ? row.display_name
      : username || 'User',
    username,
    email,
    avatar: typeof row.avatar_url === 'string' && row.avatar_url.trim().length > 0
      ? row.avatar_url
      : `https://i.pravatar.cc/150?u=${id}`,
    isOnline: Boolean(row.is_online),
    lastSeen: typeof row.last_seen === 'string' ? row.last_seen : null,
  };
};

export const ChatService = {
  async listContacts(currentUserId: string): Promise<ChatResult<ChatContact[]>> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase is not configured' };

    const withEmailQuery = client
      .from('users')
      .select('id, display_name, username, email, avatar_url, is_online, last_seen, is_master_bot')
      .neq('id', currentUserId)
      .eq('is_master_bot', false)
      .order('points_total', { ascending: false })
      .limit(100);

    const withEmailResult = await withEmailQuery;
    let contactRows: unknown[] = (withEmailResult.data || []) as unknown[];
    let error = withEmailResult.error;

    if (error && /column .*email|email.*does not exist/i.test(error.message || '')) {
      const fallback = await client
        .from('users')
        .select('id, display_name, username, avatar_url, is_online, last_seen, is_master_bot')
        .neq('id', currentUserId)
        .eq('is_master_bot', false)
        .order('points_total', { ascending: false })
        .limit(100);

      contactRows = (fallback.data || []) as unknown[];
      error = fallback.error;
    }

    if (error) {
      return { success: false, error: error.message };
    }

    const contacts = contactRows.map((row) => toChatContact(row));

    return { success: true, data: contacts };
  },

  async getOrCreateConversation(currentUserId: string, otherUserId: string): Promise<ChatResult<{ id: string }>> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase is not configured' };

    const [participant1, participant2] = [currentUserId, otherUserId].sort((left, right) => left.localeCompare(right));

    const { data: existing, error: existingError } = await client
      .from('dm_conversations')
      .select('id')
      .or(`and(participant_1.eq.${participant1},participant_2.eq.${participant2})`)
      .maybeSingle();

    if (existingError) {
      return { success: false, error: existingError.message };
    }

    if (existing?.id) {
      return { success: true, data: { id: existing.id } };
    }

    const { data, error } = await client
      .from('dm_conversations')
      .insert({
        participant_1: participant1,
        participant_2: participant2,
        initiator_id: currentUserId,
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { id: data.id } };
  },

  async listMessages(conversationId: string): Promise<ChatResult<ChatMessage[]>> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase is not configured' };

    const { data, error } = await client
      .from('dm_messages')
      .select('id, conversation_id, sender_id, content, shared_item, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data || []).map((row) => toChatMessage(row)),
    };
  },

  async getConversationParticipants(conversationId: string): Promise<ChatResult<ChatConversationParticipants>> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase is not configured' };

    const { data, error } = await client
      .from('dm_conversations')
      .select('id, participant_1, participant_2')
      .eq('id', conversationId)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: error?.message || 'Conversation not found' };
    }

    return {
      success: true,
      data: {
        id: data.id,
        participant1: data.participant_1,
        participant2: data.participant_2,
      },
    };
  },

  async sendTextMessage(params: {
    conversationId: string;
    senderId: string;
    content: string;
  }): Promise<ChatResult<ChatMessage>> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase is not configured' };

    const { data, error } = await client
      .from('dm_messages')
      .insert({
        conversation_id: params.conversationId,
        sender_id: params.senderId,
        content: params.content,
      })
      .select('id, conversation_id, sender_id, content, shared_item, created_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: toChatMessage(data),
    };
  },

  async sendSharedItemMessage(params: {
    conversationId: string;
    senderId: string;
    item: ChatSharedItem;
  }): Promise<ChatResult<ChatMessage>> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase is not configured' };

    const { data, error } = await client
      .from('dm_messages')
      .insert({
        conversation_id: params.conversationId,
        sender_id: params.senderId,
        content: `Shared: ${params.item?.name || 'item'}`,
        shared_item: params.item,
      })
      .select('id, conversation_id, sender_id, content, shared_item, created_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: toChatMessage(data),
    };
  },

  subscribeToConversationMessages(conversationId: string, onMessage: (message: ChatMessage) => void) {
    const client = supabase;
    if (!client) {
      return () => undefined;
    }

    const channel = client
      .channel(`dm_messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload: SupabaseRealtimePayload) => {
        try {
          const message = toChatMessage(payload.new);
          if (!message.id || !message.conversationId || !message.senderId) return;
          onMessage(message);
        } catch (err) {
          console.error('Realtime message error:', err);
        }
      })
      .subscribe();

    return () => {
      client.removeChannel(channel).catch(e => console.error('Unsubscribe error:', e));
    };
  },

  subscribeToIncomingMessages(currentUserId: string, onIncoming: (notice: ChatIncomingMessageNotice) => void) {
    const client = supabase;
    if (!client) {
      return () => undefined;
    }

    const channel = client
      .channel(`dm_messages:user:${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
      }, async (payload: SupabaseRealtimePayload) => {
        try {
          const message = toChatMessage(payload.new);
          if (!message.id || !message.conversationId || !message.senderId) return;
          if (message.senderId === currentUserId) return;

          const conversation = await ChatService.getConversationParticipants(message.conversationId);
          if (!conversation.success || !conversation.data) return;

          const { participant1, participant2 } = conversation.data;
          if (participant1 !== currentUserId && participant2 !== currentUserId) return;

          const otherUserId = participant1 === currentUserId ? participant2 : participant1;

          onIncoming({
            otherUserId,
            message,
          });
        } catch (err) {
          console.error('Realtime incoming message error:', err);
        }
      })
      .subscribe();

    return () => {
      client.removeChannel(channel).catch(e => console.error('Unsubscribe error:', e));
    };
  },

  async listGroups(userId: string): Promise<ChatResult<ChatGroup[]>> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase is not configured' };

    const { data, error } = await client
      .from('groups')
      .select(`
        *,
        group_members!inner(user_id)
      `)
      .eq('group_members.user_id', userId)
      .order('last_message_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data || []).map(toChatGroup),
    };
  },

  async createGroup(params: {
    name: string;
    description?: string;
    avatarUrl?: string;
    memberIds: string[];
    createdBy: string;
  }): Promise<ChatResult<ChatGroup>> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase is not configured' };

    // 1. Create group
    const { data: group, error: groupError } = await client
      .from('groups')
      .insert({
        name: params.name,
        description: params.description,
        avatar_url: params.avatarUrl,
        created_by: params.createdBy,
      })
      .select()
      .single();

    if (groupError || !group) {
      return { success: false, error: groupError?.message || 'Failed to create group' };
    }

    // 2. Add members
    const members = params.memberIds.map(id => ({
      group_id: group.id,
      user_id: id,
      role: id === params.createdBy ? 'admin' : 'member',
    }));

    const { error: membersError } = await client
      .from('group_members')
      .insert(members);

    if (membersError) {
      // Cleanup group if members fail (optional but good)
      await client.from('groups').delete().eq('id', group.id);
      return { success: false, error: membersError.message };
    }

    return { success: true, data: toChatGroup(group) };
  },

  async listGroupMessages(groupId: string): Promise<ChatResult<ChatMessage[]>> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase is not configured' };

    const { data, error } = await client
      .from('group_messages')
      .select('id, group_id, sender_id, content, shared_item, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data || []).map(toChatMessage),
    };
  },

  async sendGroupTextMessage(params: {
    groupId: string;
    senderId: string;
    content: string;
  }): Promise<ChatResult<ChatMessage>> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase is not configured' };

    const { data, error } = await client
      .from('group_messages')
      .insert({
        group_id: params.groupId,
        sender_id: params.senderId,
        content: params.content,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: toChatMessage(data) };
  },

  async sendGroupSharedItemMessage(params: {
    groupId: string;
    senderId: string;
    item: ChatSharedItem;
  }): Promise<ChatResult<ChatMessage>> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase is not configured' };

    const { data, error } = await client
      .from('group_messages')
      .insert({
        group_id: params.groupId,
        sender_id: params.senderId,
        content: `Shared: ${params.item?.name || 'item'}`,
        shared_item: params.item,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: toChatMessage(data) };
  },

  subscribeToGroupMessages(groupId: string, onMessage: (message: ChatMessage) => void) {
    const client = supabase;
    if (!client) return () => undefined;

    const channel = client
      .channel(`group_messages:${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, (payload: SupabaseRealtimePayload) => {
        try {
          const message = toChatMessage(payload.new);
          if (!message.id || !message.groupId || !message.senderId) return;
          onMessage(message);
        } catch (err) {
          console.error('Realtime group message error:', err);
        }
      })
      .subscribe();

    return () => {
      client.removeChannel(channel).catch(e => console.error('Unsubscribe error:', e));
    };
  },
};
