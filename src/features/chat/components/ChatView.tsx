import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  ChevronLeft, LayoutGrid, X, Search, ChevronRight, Eye, Bookmark, 
  Share2, Send, Check, CheckCheck, AlertCircle, Clock 
} from 'lucide-react';
import { ChatService, type ChatMessage } from '../services/chatService';
import { filterFriendsByQuery } from '../lib/chatHelpers';
import type { ChatInboxItem, ChatUiMessage } from '../types/chatUi';
import type { AuthUser } from '../../auth/types/auth';
import type { AppItem } from '../../../shared/types/appItem';
import { Badge } from '../../../shared/ui/Badge';
import { hasSupabaseConfig } from '../../../services/supabaseClient';

/**
 * requestNotificationPermission helper (moved from index.tsx or kept here if specific to chat)
 */
const requestNotificationPermission = async () => {
  if (globalThis.Notification === undefined) return;
  if (globalThis.Notification.permission !== 'default') return;
  try {
    await globalThis.Notification.requestPermission();
  } catch (error) {
    console.warn('Notification permission request failed:', error);
  }
};

/**
 * ChatView - Full-screen inbox and messaging interface.
 * Extracted from index.tsx as part of the modularization effort.
 */
export const ChatView = ({
  friends,
  authUser,
  onSave,
  onShareRequest,
  setTab,
  onConversationOpened,
  onOpenUserProfile,
}: {
  friends: ChatInboxItem[];
  authUser: AuthUser | null;
  onSave: (item: AppItem) => void;
  onShareRequest: (item: AppItem) => void;
  setTab: (tab: string) => void;
  onConversationOpened: (friendId: string) => void;
  onOpenUserProfile: (userId: string) => void;
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'dm' | 'group' | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [friendSearch, setFriendSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (activeId) {
      scrollToBottom();
    }
  }, [messages.length, isTyping, activeId, scrollToBottom]);

  const active = friends.find(f => String(f.id) === activeId);
  const filteredFriends = useMemo(() => filterFriendsByQuery(friends, friendSearch), [friends, friendSearch]);

  const mapMessageToUi = useCallback((message: ChatMessage): ChatUiMessage => ({
    id: message.id,
    role: message.senderId === authUser?.id ? 'user' : 'ai',
    type: message.sharedItem ? 'share' : 'text',
    text: message.content,
    item: message.sharedItem,
  }), [authUser?.id]);

  useEffect(() => {
    if (!draft.trim() || !activeId || !authUser?.id || !conversationId) return;

    const targetId = activeType === 'group' ? activeId : conversationId;
    const isGroup = activeType === 'group';

    ChatService.sendTypingStatus(targetId, authUser.id, true, isGroup);

    const timeout = setTimeout(() => {
      ChatService.sendTypingStatus(targetId, authUser.id, false, isGroup);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [draft, activeId, authUser?.id, conversationId, activeType]);

  useEffect(() => {
    if (!activeId || (!conversationId && activeType === 'dm')) return;

    const targetId = activeType === 'group' ? activeId : (conversationId as string);
    const isGroup = activeType === 'group';

    const unsubscribe = ChatService.subscribeToTypingStatus(targetId, (typingUserId, typingStatus) => {
      if (typingUserId !== authUser?.id) {
        setIsTyping(typingStatus);
      }
    }, isGroup);

    return () => unsubscribe();
  }, [activeId, activeType, conversationId, authUser?.id]);

  const appendIncomingMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      if (prev.some((entry) => entry.id === message.id)) return prev;
      return [...prev, mapMessageToUi(message)];
    });
    if (message.senderId !== authUser?.id && activeId) {
      onConversationOpened(activeId);
    }
  }, [activeId, authUser?.id, mapMessageToUi, onConversationOpened]);

  useEffect(() => {
    setActiveId(null);
    setConversationId(null);
    setMessages([]);
  }, [authUser?.id]);

  useEffect(() => {
    if (!activeId || !activeType) return;

    if (activeType === 'dm' && conversationId) {
      const unsubscribe = ChatService.subscribeToConversationMessages(conversationId, (message) => {
        appendIncomingMessage(message);
      });
      return () => unsubscribe();
    } else if (activeType === 'group' && activeId) {
      const unsubscribe = ChatService.subscribeToGroupMessages(activeId, (message) => {
        appendIncomingMessage(message);
      });
      return () => unsubscribe();
    }
  }, [activeId, activeType, conversationId, appendIncomingMessage]);

  const formatFriendTime = (item: ChatInboxItem) => {
    if ('time' in item && item.time) return item.time;
    if ('online' in item && item.online) return 'now';
    if ('lastSeen' in item && item.lastSeen) return 'recent';
    return '—';
  };

  const getMessageStatusIcon = (status?: string) => {
    if (!status || status === 'sent') return <Check size={10} className="text-stone-400" />;
    if (status === 'sending') return <Clock size={10} className="text-stone-400 animate-pulse" />;
    if (status === 'read') return <CheckCheck size={10} className="text-yellow-500" />;
    if (status === 'error') return <AlertCircle size={10} className="text-red-500" />;
    return <Check size={10} className="text-stone-400" />;
  };

  const openConversation = async (participantId: string, type: 'dm' | 'group' = 'dm') => {
    if (!authUser?.id || !hasSupabaseConfig) {
      setActiveId(participantId);
      setActiveType(type);
      setMessages([]);
      return;
    }

    setActiveId(participantId);
    setActiveType(type);
    onConversationOpened(participantId);

    if (type === 'dm') {
      const conversation = await ChatService.getOrCreateConversation(authUser.id, participantId);
      if (!conversation.success || !conversation.data) return;

      setConversationId(conversation.data.id);
      const result = await ChatService.listMessages(conversation.data.id);
      if (!result.success || !result.data) {
        setMessages([]);
        return;
      }

      setMessages(result.data.map((message) => ({
        id: message.id,
        role: message.senderId === authUser?.id ? 'user' : 'ai',
        type: message.sharedItem ? 'share' : 'text',
        text: message.content,
        item: message.sharedItem,
        status: message.senderId === authUser?.id ? 'sent' : undefined,
      })));
    } else {
      setConversationId(null);
      const result = await ChatService.listGroupMessages(participantId);
      if (!result.success || !result.data) {
        setMessages([]);
        return;
      }

      setMessages(result.data.map((message) => ({
        id: message.id,
        role: message.senderId === authUser?.id ? 'user' : 'ai',
        type: message.sharedItem ? 'share' : 'text',
        text: message.content,
        item: message.sharedItem,
        status: message.senderId === authUser?.id ? 'sent' : undefined,
      })));
    }
  };

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || !activeId || !authUser?.id) return;

    setDraft('');
    const optimisticId = `local-${Date.now()}`;
    setMessages(prev => ([...prev, {
      id: optimisticId,
      role: 'user',
      type: 'text',
      text: content,
      status: 'sending',
    }]));

    let sent;
    if (activeType === 'dm' && conversationId) {
      sent = await ChatService.sendTextMessage({
        conversationId,
        senderId: authUser.id,
        content,
      });
    } else if (activeType === 'group') {
      sent = await ChatService.sendGroupTextMessage({
        groupId: activeId,
        senderId: authUser.id,
        content,
      });
    }

    if (!sent || !sent.success || !sent.data) {
      setMessages(prev => prev.map((message) => message.id === optimisticId ? { ...message, status: 'error' } : message));
      setDraft(content);
      return;
    }

    const sentMessage = sent.data;
    setMessages(prev => prev
      .filter((message) => message.id !== optimisticId)
      .concat([{ 
        ...mapMessageToUi(sentMessage), 
        status: 'sent', 
        senderName: (authUser.user_metadata?.full_name as string) || (authUser.user_metadata?.name as string) || 'You' 
      }]));
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedMemberIds.length === 0 || !authUser?.id) return;

    const result = await ChatService.createGroup({
      name: newGroupName,
      memberIds: [authUser.id, ...selectedMemberIds],
      createdBy: authUser.id,
    });

    if (result.success && result.data) {
      setIsCreatingGroup(false);
      setNewGroupName('');
      setSelectedMemberIds([]);
      openConversation(result.data.id, 'group');
    }
  };

  if (activeId && active) return (
    <div className="max-w-2xl mx-auto h-[75vh] flex flex-col bg-white rounded-[1.75rem] shadow-2xl border-4 border-white overflow-hidden animate-in slide-in-from-right duration-300">
      <header className="p-8 border-b flex items-center justify-between bg-stone-50/50">
        <button onClick={() => setActiveId(null)} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><ChevronLeft size={28} /></button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => active.type === 'dm' && onOpenUserProfile(String(active.id))}
            className="relative"
          >
            <img src={active.avatar} alt={active.name || 'Chat'} className="w-10 h-10 rounded-full border-2 border-yellow-400" />
            {active.type === 'dm' && 'online' in active && active.online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            )}
            {active.type === 'group' && (
              <div className="absolute -bottom-1 -right-1 bg-stone-900 text-white p-0.5 rounded shadow-sm">
                <LayoutGrid size={8} />
              </div>
            )}
          </button>
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest">{active.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${active.type === 'group' ? 'bg-stone-400' : (('online' in active && active.online) ? 'bg-emerald-500' : 'bg-stone-300')}`} />
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                {active.type === 'group' ? 'Studio Group' : (('online' in active && active.online) ? 'Online' : 'Offline')}
              </p>
            </div>
          </div>
        </div>
        <div className="w-10" />
      </header>

      {active.type === 'dm' && 'requestStatus' in active && active.requestStatus === 'pending' && (
        <div className="p-6 bg-yellow-50 border-b flex flex-col items-center gap-4 text-center">
          <p className="text-xs font-bold text-stone-600 uppercase tracking-widest">Message Request</p>
          <p className="text-sm font-bold text-stone-900">{active.name} wants to connect with you.</p>
          <div className="flex gap-3 w-full">
            <button onClick={() => {}} className="flex-grow py-3 bg-stone-900 text-white rounded-2xl font-black uppercase text-[12px] tracking-widest">Accept</button>
            <button onClick={() => setActiveId(null)} className="flex-grow py-3 bg-stone-100 text-stone-900 rounded-2xl font-black uppercase text-[12px] tracking-widest">Decline</button>
          </div>
        </div>
      )}

      <div className="flex-grow p-10 space-y-6 overflow-y-auto hide-scrollbar">
        {messages.map((m) => (
          <div key={`${m.id || ''}-${m.role}-${m.type || 'text'}-${m.text || ''}-${m.item?.id || ''}`} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            {activeType === 'group' && m.role !== 'user' && m.senderName && (
              <span className="text-[12px] font-black uppercase tracking-widest text-stone-400 mb-1 ml-4">{m.senderName}</span>
            )}
            <div className={`max-w-[85%] p-6 rounded-[2.5rem] font-bold text-sm shadow-sm ${m.role === 'user' ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-900'}`}>
              {m.type === 'share' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="opacity-60 text-[12px] uppercase font-black tracking-widest">Shared Studio Item</p>
                    <Badge color="yellow">{m.item?.cat || 'Item'}</Badge>
                  </div>
                  <div className="rounded-2xl overflow-hidden shadow-md aspect-video relative group">
                    <img src={m.item?.img} alt={m.item?.name || 'Shared item'} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => {
                          if (m.item?.id?.startsWith('recipe')) setTab('bites');
                          else if (m.item?.id?.startsWith('video')) setTab('trims');
                          else setTab('scout');
                        }}
                        className="p-3 bg-white text-stone-900 rounded-full shadow-xl hover:scale-110 transition-transform"
                      >
                        <Eye size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-black uppercase tracking-tighter text-lg">{m.item?.name}</p>
                    <p className="text-[12px] opacity-50 font-bold uppercase tracking-widest">Sent via FUZO Studio</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={() => {
                        if (m.item?.id?.startsWith('recipe')) setTab('bites');
                        else if (m.item?.id?.startsWith('video')) setTab('trims');
                        else setTab('scout');
                      }}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-stone-100 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600"><Eye size={16} /></div>
                      <span className="text-[11px] font-black uppercase tracking-widest">View</span>
                    </button>
                    <button
                      onClick={() => { if (m.item) onSave(m.item); }}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-stone-100 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600"><Bookmark size={16} /></div>
                      <span className="text-[11px] font-black uppercase tracking-widest">Save</span>
                    </button>
                    <button
                      onClick={() => { if (m.item) onShareRequest(m.item); }}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-stone-100 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600"><Share2 size={16} /></div>
                      <span className="text-[11px] font-black uppercase tracking-widest">Share</span>
                    </button>
                  </div>
                </div>
              ) : m.text}
            </div>
            {m.role === 'user' && (
              <div className="flex items-center gap-1 mt-2 px-4">{getMessageStatusIcon(m.status)}</div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 bg-stone-50 p-4 rounded-2xl w-fit">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[12px] font-black uppercase tracking-widest text-stone-400">Typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <footer className="p-6 border-t flex gap-3 bg-white">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={(active.type === 'dm' && 'requestStatus' in active && active.requestStatus === 'pending') ? 'Accept request to reply' : 'Message...'}
          disabled={active.type === 'dm' && 'requestStatus' in active && active.requestStatus === 'pending'}
          className="flex-grow bg-stone-50 px-8 py-5 rounded-[2rem] font-bold outline-none focus:bg-stone-100 transition-colors disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={(active.type === 'dm' && 'requestStatus' in active && active.requestStatus === 'pending') || !draft.trim()}
          className="w-16 h-16 bg-yellow-400 text-stone-900 rounded-3xl flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
        >
          <Send size={24} />
        </button>
      </footer>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 animate-in fade-in">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter">Studio Inbox</h2>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-[12px] font-black uppercase tracking-widest text-stone-400">Find Friends</p>
            <button
              onClick={() => setIsCreatingGroup(true)}
              className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-widest text-yellow-600 hover:text-yellow-700 transition-colors"
            >
              <LayoutGrid size={12} />
              Create Group
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-400 rounded-full">
          <div className="w-2 h-2 bg-stone-900 rounded-full animate-pulse" />
          <span className="text-[12px] font-black uppercase tracking-widest">Live</span>
        </div>
      </header>

      {isCreatingGroup && (
        <div className="bg-stone-50 p-8 rounded-[3rem] border-2 border-dashed border-stone-200 space-y-6 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black uppercase tracking-tighter">New Chat Group</h3>
            <button onClick={() => setIsCreatingGroup(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group Name..."
              className="w-full bg-white px-6 py-4 rounded-2xl font-bold outline-none border focus:border-yellow-400"
            />
            <div className="space-y-2">
              <p className="text-[12px] font-black uppercase tracking-widest text-stone-400 px-2">Select Members</p>
              <div className="flex flex-wrap gap-2">
                {friends.filter(f => f.type !== 'group').map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedMemberIds(prev => prev.includes(String(f.id)) ? prev.filter(mid => mid !== String(f.id)) : [...prev, String(f.id)]);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${
                      selectedMemberIds.includes(String(f.id)) ? 'bg-stone-900 text-white shadow-lg' : 'bg-white text-stone-500 border hover:border-stone-300'
                    }`}
                  >
                    <img src={f.avatar} alt={`${f.name || 'Member'} avatar`} className="w-4 h-4 rounded-full" />
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={createGroup}
            disabled={!newGroupName.trim() || selectedMemberIds.length === 0}
            className="w-full py-4 bg-yellow-400 text-stone-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
          >
            Create Studio Group
          </button>
        </div>
      )}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
        <input
          value={friendSearch}
          onChange={(e) => setFriendSearch(e.target.value)}
          placeholder="Search username, name, or email"
          className="w-full bg-white border border-stone-100 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-yellow-400/10"
        />
      </div>
      <div className="space-y-4">
        {filteredFriends.map(c => (
          <div key={c.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                openConversation(String(c.id), c.type || 'dm').catch((error) => {
                  console.warn('Failed to open conversation:', error);
                });
              }}
              className="w-full bg-white p-6 rounded-[3rem] flex items-center gap-5 border shadow-sm cursor-pointer hover:bg-stone-50 transition-all hover:scale-[1.01] relative group text-left"
            >
              <div className="relative">
                <img src={c.avatar} alt={c.name || 'Chat'} className="w-16 h-16 rounded-3xl border-2 border-yellow-400 shadow-md" />
                {c.type === 'dm' && 'online' in c && c.online && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                )}
                {c.type === 'group' && (
                  <div className="absolute -bottom-2 -right-2 bg-stone-900 text-white p-1 rounded-lg border-2 border-white shadow-sm">
                    <LayoutGrid size={12} />
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm uppercase tracking-widest">{c.name}</h4>
                    {c.type === 'group' && (
                      <span className="bg-stone-100 text-[11px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest text-stone-500">Group</span>
                    )}
                  </div>
                  <span className="text-[12px] text-stone-500 font-bold">{formatFriendTime(c)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold truncate ${(c.unreadCount ?? 0) > 0 ? 'text-stone-900' : 'text-stone-400'}`}>
                    {c.type === 'dm' && 'requestStatus' in c && c.requestStatus === 'pending' ? 'New Message Request' : 'Open to chat...'}
                  </p>
                  {(c.unreadCount ?? 0) > 0 && (
                    <div className="bg-yellow-400 text-stone-900 text-[12px] font-black px-2 py-1 rounded-full shadow-sm">{c.unreadCount}</div>
                  )}
                </div>
              </div>
              <ChevronRight className="text-stone-200 group-hover:text-stone-400 transition-colors" />
            </button>
            {c.type === 'dm' && (
              <button
                type="button"
                onClick={() => onOpenUserProfile(String(c.id))}
                className="px-3 py-2 rounded-xl bg-stone-900 text-white text-[12px] font-black uppercase tracking-widest hover:bg-stone-800 transition-colors"
              >
                Profile
              </button>
            )}
          </div>
        ))}
        {filteredFriends.length === 0 && (
          <div className="p-8 text-center bg-stone-50 rounded-[2rem] border border-stone-100 text-[12px] font-black uppercase tracking-widest text-stone-400">No contacts or groups found.</div>
        )}
      </div>
    </div>
  );
};
