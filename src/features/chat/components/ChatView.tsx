import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  ChevronLeft, LayoutGrid, X, Search, ChevronRight, Eye, Bookmark, 
  Share2, Send, Check, CheckCheck, AlertCircle, Clock, MessageSquare
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
  initialActiveId,
  initialActiveType,
  onClearInitial,
}: {
  friends: ChatInboxItem[];
  authUser: AuthUser | null;
  onSave: (item: AppItem) => void;
  onShareRequest: (item: AppItem) => void;
  setTab: (tab: string) => void;
  onConversationOpened: (friendId: string) => void;
  onOpenUserProfile: (userId: string) => void;
  initialActiveId?: string | null;
  initialActiveType?: 'dm' | 'group' | null;
  onClearInitial?: () => void;
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'dm' | 'group' | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [friendSearch, setFriendSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialActiveId) {
      openConversation(initialActiveId, initialActiveType || 'dm');
      onClearInitial?.();
    }
  }, [initialActiveId, initialActiveType, onClearInitial]);

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

    setIsSubmittingGroup(true);
    setGroupError(null);

    try {
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
      } else {
        setGroupError(result.error || 'Failed to create group');
      }
    } catch (err) {
      console.error('[ChatView] createGroup exception:', err);
      setGroupError('An unexpected error occurred');
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-white md:bg-stone-50 animate-in fade-in overflow-hidden border-t md:border-none">
      
      {/* Left Pane (Inbox List) */}
      <div className={`
        flex flex-col h-full bg-stone-50 md:border-r border-stone-200
        ${activeId ? 'hidden md:flex' : 'flex'} 
        w-full md:w-96 shrink-0
      `}>
        <header className="p-6 md:p-8 flex justify-between items-end bg-stone-50/50">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">Studio Inbox</h2>
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-400 rounded-full">
            <div className="w-2 h-2 bg-stone-900 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
          </div>
        </header>

        {isCreatingGroup && (
          <div className="bg-stone-50 p-6 md:p-8 border-b border-dashed border-stone-200 space-y-6 animate-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tighter">New Chat Group</h3>
              <button onClick={() => setIsCreatingGroup(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input
                value={newGroupName}
                onChange={(e) => {
                  setNewGroupName(e.target.value);
                  setGroupError(null);
                }}
                disabled={isSubmittingGroup}
                placeholder="Group Name..."
                className="w-full bg-white px-6 py-4 rounded-2xl font-bold outline-none border focus:border-yellow-400 disabled:opacity-50"
              />
              <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                  <p className="text-[12px] font-black uppercase tracking-widest text-stone-400">Select Members</p>
                  {selectedMemberIds.length === 0 && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-yellow-600 animate-pulse">Add at least 1 friend</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {friends.filter(f => f.type !== 'group').map(f => (
                    <button
                      key={f.id}
                      onClick={() => {
                        if (isSubmittingGroup) return;
                        setSelectedMemberIds(prev => prev.includes(String(f.id)) ? prev.filter(mid => mid !== String(f.id)) : [...prev, String(f.id)]);
                        setGroupError(null);
                      }}
                      disabled={isSubmittingGroup}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${
                        selectedMemberIds.includes(String(f.id)) ? 'bg-stone-900 text-white shadow-lg' : 'bg-white text-stone-500 border hover:border-stone-300'
                      } ${isSubmittingGroup ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <img src={f.avatar} alt={`${f.name || 'Member'} avatar`} className="w-4 h-4 rounded-full" />
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {groupError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold uppercase tracking-widest border border-red-100">
                <AlertCircle size={14} />
                {groupError}
              </div>
            )}
            <button
              onClick={createGroup}
              disabled={!newGroupName.trim() || selectedMemberIds.length === 0 || isSubmittingGroup}
              className="w-full py-4 bg-yellow-400 text-stone-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
            >
              {isSubmittingGroup ? (
                <>
                  <Clock size={16} className="animate-spin" />
                  Creating...
                </>
              ) : 'Create Studio Group'}
            </button>
          </div>
        )}

        <div className="px-6 py-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
            <input
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full bg-white border border-stone-100 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-yellow-400/10"
            />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto px-4 pb-[env(safe-area-inset-bottom)] md:pb-4 space-y-4 hide-scrollbar">
          {filteredFriends.map(c => (
            <div key={c.id} className="flex flex-col gap-2 relative">
              <button
                type="button"
                onClick={() => {
                  openConversation(String(c.id), c.type || 'dm').catch((error) => {
                    console.warn('Failed to open conversation:', error);
                  });
                }}
                className={`w-full bg-white p-5 rounded-[2.5rem] flex items-center gap-4 border shadow-sm cursor-pointer transition-all hover:scale-[1.01] text-left
                  ${activeId === String(c.id) ? 'ring-4 ring-yellow-400/50 border-yellow-400 sticky z-10' : 'hover:bg-stone-50'}
                `}
              >
                <div className="relative shrink-0">
                  <img src={c.avatar} alt={c.name || 'Chat'} className="w-14 h-14 rounded-[1.25rem] border-2 border-yellow-400 shadow-sm" />
                  {c.type === 'dm' && 'online' in c && c.online && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                  )}
                  {c.type === 'group' && (
                    <div className="absolute -bottom-1 -right-1 bg-stone-900 text-white p-1 rounded-md border-2 border-white shadow-sm">
                      <LayoutGrid size={10} />
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between mb-0.5">
                    <div className="flex items-center gap-2 truncate">
                      <h4 className="font-black text-sm uppercase tracking-widest truncate">{c.name}</h4>
                      {c.type === 'group' && (
                        <span className="bg-stone-100 text-[10px] shrink-0 font-black px-1.5 py-0.5 rounded uppercase tracking-widest text-stone-500">Group</span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-400 font-bold shrink-0 ml-2">{formatFriendTime(c)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-[11px] font-bold truncate pr-2 ${(c.unreadCount ?? 0) > 0 ? 'text-stone-900' : 'text-stone-400'}`}>
                      {c.type === 'dm' && 'requestStatus' in c && c.requestStatus === 'pending' ? 'Message Request' : 'Tap to chat...'}
                    </p>
                    {(c.unreadCount ?? 0) > 0 && (
                      <div className="bg-yellow-400 shrink-0 text-stone-900 text-[11px] font-black px-1.5 py-0.5 rounded-full shadow-sm min-w-5 text-center">{c.unreadCount}</div>
                    )}
                  </div>
                </div>
              </button>
            </div>
          ))}
          {filteredFriends.length === 0 && (
            <div className="p-8 text-center bg-stone-50 rounded-[2rem] border border-stone-100 text-[12px] font-black uppercase tracking-widest text-stone-400">No contacts found.</div>
          )}
        </div>
      </div>

      {/* Right Pane (Active Conversation) */}
      <div className={`
        flex-col h-full bg-white overflow-hidden flex-grow
        ${!activeId ? 'hidden md:flex' : 'flex w-full'}
      `}>
        {!activeId || !active ? (
          <div className="flex-grow flex flex-col items-center justify-center bg-stone-50 text-stone-400 h-full">
            <div className="w-24 h-24 rounded-full bg-stone-100 flex items-center justify-center text-stone-300 mb-6 drop-shadow-sm">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-stone-900">Your Messages</h3>
            <p className="text-xs font-bold uppercase tracking-widest mt-2 max-w-xs text-center">Select a conversation from the left to start chatting with your studio friends.</p>
          </div>
        ) : (
          <div className="flex-grow flex flex-col h-full bg-white animate-in md:animate-none slide-in-from-right-2 md:fade-in duration-300">
            {/* Conversation Header */}
            <header className="px-4 py-3 md:p-6 border-b flex items-center justify-between bg-white z-10 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveId(null)} 
                  className="md:hidden p-2 hover:bg-stone-50 rounded-xl transition-colors shrink-0"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => active.type === 'dm' && onOpenUserProfile(String(active.id))}>
                  <div className="relative shrink-0">
                    <img src={active.avatar} alt={active.name || 'Chat'} className="w-10 md:w-12 h-10 md:h-12 rounded-full border-2 border-yellow-400 group-hover:scale-105 transition-transform" />
                    {active.type === 'dm' && 'online' in active && active.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                    {active.type === 'group' && (
                      <div className="absolute -bottom-1 -right-1 bg-stone-900 text-white p-0.5 rounded shadow-sm">
                        <LayoutGrid size={8} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-[13px] md:text-sm uppercase tracking-widest line-clamp-1">{active.name}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${active.type === 'group' ? 'bg-stone-400' : (('online' in active && active.online) ? 'bg-emerald-500' : 'bg-stone-300')}`} />
                      <p className="text-[10px] md:text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                        {active.type === 'group' ? 'Studio Group' : (('online' in active && active.online) ? 'Online' : 'Offline')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {active.type === 'dm' && (
                  <button
                    type="button"
                    onClick={() => onOpenUserProfile(String(active.id))}
                    className="px-3 py-2 rounded-xl bg-stone-900 text-white text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-stone-800 transition-colors shadow-sm"
                  >
                    Profile
                  </button>
                )}
              </div>
            </header>

            {active.type === 'dm' && 'requestStatus' in active && active.requestStatus === 'pending' && (
              <div className="p-4 md:p-6 bg-yellow-50 border-b flex flex-col items-center gap-3 md:gap-4 text-center shrink-0">
                <p className="text-[11px] md:text-xs font-bold text-stone-600 uppercase tracking-widest">Message Request</p>
                <p className="text-[13px] md:text-sm font-bold text-stone-900 line-clamp-2 px-4">{active.name} wants to connect with you.</p>
                <div className="flex gap-3 w-full max-w-sm justify-center">
                  <button onClick={() => {}} className="flex-grow max-w-[140px] py-2.5 md:py-3 bg-stone-900 text-white rounded-xl md:rounded-2xl font-black uppercase text-[11px] md:text-[12px] tracking-widest shadow-md">Accept</button>
                  <button onClick={() => setActiveId(null)} className="flex-grow max-w-[140px] py-2.5 md:py-3 bg-stone-100 border border-stone-200 text-stone-900 rounded-xl md:rounded-2xl font-black uppercase text-[11px] md:text-[12px] tracking-widest shadow-sm hover:bg-stone-200">Decline</button>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-grow p-4 md:p-8 space-y-4 md:space-y-6 overflow-y-auto hide-scrollbar bg-[#f8f9fa] relative">
              {messages.map((m) => (
                <div key={`${m.id || ''}-${m.role}-${m.type || 'text'}-${m.text || ''}-${m.item?.id || ''}`} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {activeType === 'group' && m.role !== 'user' && m.senderName && (
                    <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-stone-400 mb-1 ml-4">{m.senderName}</span>
                  )}
                  <div className={`max-w-[85%] md:max-w-[75%] p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] font-bold text-[13px] md:text-sm shadow-sm ${m.role === 'user' ? 'bg-stone-900 text-white rounded-br-md md:rounded-br-lg' : 'bg-white border border-stone-100 text-stone-900 rounded-bl-md md:rounded-bl-lg'}`}>
                    {m.type === 'share' ? (
                      <div className="space-y-3 md:space-y-4 min-w-[200px]">
                        <div className="flex items-center justify-between">
                          <p className="opacity-60 text-[10px] md:text-[11px] uppercase font-black tracking-widest">Shared Item</p>
                          <Badge color="yellow">{m.item?.cat || 'Item'}</Badge>
                        </div>
                        <div className="rounded-xl overflow-hidden shadow-sm aspect-video relative group border border-stone-100/20">
                          <img src={m.item?.img} alt={m.item?.name || 'Shared item'} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => {
                                if (m.item?.id?.startsWith('recipe')) setTab('bites');
                                else if (m.item?.id?.startsWith('video')) setTab('trims');
                                else setTab('scout');
                              }}
                              className="p-2 md:p-3 bg-white text-stone-900 rounded-full shadow-xl hover:scale-110 transition-transform"
                            >
                              <Eye size={18} className="md:w-5 md:h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-black uppercase tracking-tighter text-base md:text-lg line-clamp-2">{m.item?.name}</p>
                          <p className="text-[10px] md:text-[11px] opacity-50 font-bold uppercase tracking-widest">Sent via Fuzo Studio</p>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 md:gap-2 pt-1">
                          <button
                            onClick={() => {
                              if (m.item?.id?.startsWith('recipe')) setTab('bites');
                              else if (m.item?.id?.startsWith('video')) setTab('trims');
                              else setTab('scout');
                            }}
                            className={`flex flex-col items-center gap-1 p-1.5 md:p-2 rounded-xl transition-colors ${m.role === 'user' ? 'hover:bg-white/10' : 'hover:bg-stone-50'}`}
                          >
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center ${m.role === 'user' ? 'bg-white/10 text-white' : 'bg-stone-50 text-stone-600'}`}><Eye size={14} /></div>
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">View</span>
                          </button>
                          <button
                            onClick={() => { if (m.item) onSave(m.item); }}
                            className={`flex flex-col items-center gap-1 p-1.5 md:p-2 rounded-xl transition-colors ${m.role === 'user' ? 'hover:bg-white/10' : 'hover:bg-stone-50'}`}
                          >
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center ${m.role === 'user' ? 'bg-white/10 text-white' : 'bg-stone-50 text-stone-600'}`}><Bookmark size={14} /></div>
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Save</span>
                          </button>
                          <button
                            onClick={() => { if (m.item) onShareRequest(m.item); }}
                            className={`flex flex-col items-center gap-1 p-1.5 md:p-2 rounded-xl transition-colors ${m.role === 'user' ? 'hover:bg-white/10' : 'hover:bg-stone-50'}`}
                          >
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center ${m.role === 'user' ? 'bg-white/10 text-white' : 'bg-stone-50 text-stone-600'}`}><Share2 size={14} /></div>
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Share</span>
                          </button>
                        </div>
                      </div>
                    ) : m.text}
                  </div>
                  {m.role === 'user' && (
                    <div className="flex items-center gap-1 mt-1.5 px-2 md:px-4 text-stone-400 opacity-80">{getMessageStatusIcon(m.status)}</div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 bg-white border border-stone-100 p-3 md:p-4 rounded-2xl md:rounded-[1.5rem] w-fit shadow-sm rounded-bl-sm">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Conversation Composer */}
            <footer className="p-3 md:p-5 border-t flex items-end gap-2 md:gap-3 bg-white z-10 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={(active.type === 'dm' && 'requestStatus' in active && active.requestStatus === 'pending') ? 'Accept request to reply...' : 'Type a message...'}
                disabled={active.type === 'dm' && 'requestStatus' in active && active.requestStatus === 'pending'}
                className="flex-grow bg-stone-50 md:bg-white md:border md:border-stone-100 px-5 md:px-6 py-3.5 md:py-4 rounded-[1.5rem] md:rounded-[2rem] font-bold text-[13px] md:text-sm outline-none focus:ring-4 focus:ring-yellow-400/10 transition-shadow disabled:opacity-50 resize-none min-h-[44px] md:min-h-[52px] max-h-32 hide-scrollbar shadow-inner shadow-stone-900/5 md:shadow-none"
                rows={1}
                style={{ 
                  height: draft ? 'auto' : undefined,
                }}
              />
              <button
                onClick={sendMessage}
                disabled={(active.type === 'dm' && 'requestStatus' in active && active.requestStatus === 'pending') || !draft.trim()}
                className="w-[44px] h-[44px] md:w-[52px] md:h-[52px] shrink-0 bg-yellow-400 text-stone-900 rounded-full md:rounded-3xl flex items-center justify-center shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
              >
                <Send size={18} className="md:w-5 md:h-5 ml-1" />
              </button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};
