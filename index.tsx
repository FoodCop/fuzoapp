
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './src/styles/tailwind.css';
import { mountApp } from './src/app/bootstrap/mountApp';
import { 
  Search, ChefHat, MapPin, User, Heart, Star, Clock, Zap, MessageSquare, 
  ChevronRight, PlayCircle, Camera, X, Check, Flame, Share2, Loader2, Send, 
  Bookmark, ChevronLeft, RefreshCw, LayoutGrid, Sparkles, Bot,
  Info, List, PieChart, CheckCircle2, SlidersHorizontal, Music2, Eye,
  Mail, Phone, Bell, Shield, LogOut, Trophy, Gift, Image as ImageIcon, CheckCheck, AlertCircle,
  Plus,
  ArrowRight, Home,
  Pin, Youtube, ExternalLink, Award, Facebook, Instagram, Play, Twitter, Utensils, CreditCard
} from 'lucide-react';
import { UGC_CATEGORIES, UGC_CUISINES, UGC_DIETS, UGC_VIBES, normalizeTag, TAXONOMY_KEYWORD_MAP } from './src/shared/utils/taxonomy';
import UgcFilterBar from './src/shared/ui/UgcFilterBar';
import { LeaderboardView } from './src/features/points/components/LeaderboardView';
import { ProfileView } from './src/features/profile/components/ProfileView';
import { PublicProfileView } from './src/features/profile/components/PublicProfileView';
import { SettingsView } from './src/features/settings/components/SettingsView';
import { NotificationsView } from './src/features/notifications/components/NotificationsView';
import { UnifiedCreationModal } from './src/features/creation/components/UnifiedCreationModal';
import { ImportStudio } from './src/features/creation/components/ImportStudio';
import { 
  getMetadataRecord, 
  getMetadataString, 
  getMetadataStringArray, 
  getMetadataNumber, 
  getNutritionRecord 
} from './src/shared/lib/metadata';
import { normalizeExternalUrl } from './src/shared/lib/urlHelpers';
import { Loader } from '@googlemaps/js-api-loader';
import { BOTTOM_NAV_ITEMS, DRAWER_NAV_ITEMS, resolveInitialTab, TAB_IDS } from './src/app/layout/navItems';
import { useAuthSessionSync } from './src/app/hooks/useAuthSessionSync';
import { useSavedItemsOnAuth } from './src/app/hooks/useSavedItemsOnAuth';
import { useTabUrlSync } from './src/app/hooks/useTabUrlSync';
import { areSavedItemsEquivalent } from './src/features/plate/lib/savedItems';
import { renderAppView } from './src/app/routes/renderAppView';
import { PlacesService } from './src/services/placesService';
import { SpoonacularService } from './src/services/spoonacularService';
import { YouTubeService } from './src/services/youtubeService';
import { PlateService } from './src/services/plateService';
import { FriendRequestService, type FriendRequestRelationship } from './src/services/friendRequestService';
import { hasSupabaseConfig, supabase } from './src/services/supabaseClient';
import { UserProfileService } from './src/services/userProfileService';
import { useIsDesktop } from './src/app/hooks/useIsDesktop';
import { shouldApplyLatestRequest } from './src/shared/utils/async';
import { FeedView, FeedService, getUserFeedLocation } from './src/features/feed';
import AuthOrchestrator from './src/features/auth/components/AuthOrchestrator';
import { 
  APP_PATH, HOME_ENTRY_URL, authDebugLog, getOAuthRedirectUrl, 
  isAppPath, isAuthCallbackPath, isCoreAppDomain,
  getCoreAppUrl, getLandingUrl 
} from './src/features/auth/lib/oauthRedirect';
import type { AuthUser } from './src/features/auth/types/auth';
// Feature constants/types moved to modules
import { DEFAULT_FRIENDS } from './src/features/chat/constants/chatSeeds';
import { ChatService } from './src/features/chat/services/chatService';
import type { ChatContact, ChatMessage } from './src/features/chat/services/chatService';
import type { ChatFriend, ChatUiMessage, ChatInboxItem } from './src/features/chat/types/chatUi';
import { FALLBACK_SAVED_ITEMS } from './src/features/plate/constants/fallbackSavedItems';
import { inferItemTypeFromId, normalizeItemForPlateSave, normalizeSavedItemForUI } from './src/features/plate/lib/savedItems';
import { PointsService } from './src/features/points/services/pointsService';
import type { LeaderboardEntry } from './src/features/points/services/pointsService';
import { DashboardView } from './src/features/dashboard/components/DashboardView';
import { ScoutView } from './src/features/scout';
import { SnapView } from './src/features/snap';
import { BitesView, AIRecipeStudio } from './src/features/bites';
import { TrimsView, AITrimStudio } from './src/features/trims';
import { ChefAIView } from './src/features/chef';
import { ChatView } from './src/features/chat';
import { RewardsView } from './src/features/rewards';
import { Badge } from './src/shared/ui/Badge';
import { StudioStepper } from './src/shared/ui/StudioStepper';
import { readImageFileAsDataUrl, parseAiJson } from './src/shared/lib/studioHelpers';
import { SettingsService } from './src/features/settings/services/settingsService';
import { NotificationService } from './src/features/notifications/services/notificationService';
import type { AppNotification } from './src/features/notifications/types/notifications';
// Trims constants/types moved to modules
import { API_KEYS } from './src/shared/constants/apiKeys';
import type { AppItem } from './src/shared/types/appItem';
import type { IconComponent } from './src/shared/types/ui';
import { NavIcon } from './src/shared/ui/navIcon';
import { SettingsItem, SettingsSection } from './src/shared/ui/settingsPrimitives';
import type { PublicUserProfile, SettingsProfile } from './src/features/settings/types/settings';
import { GeminiService } from './src/services/geminiService';


/* --- MODULAR FEATURES --- */


// filterFriendsByQuery moved to src/features/chat/lib/chatHelpers.ts
import { filterFriendsByQuery } from './src/features/chat/lib/chatHelpers';



const ONBOARDING_V2_ENABLED = String(import.meta.env.VITE_ONBOARDING_V2_ENABLED || '').toLowerCase() === 'true';

// --- SHARED UI COMPONENTS ---

// Badge moved to src/shared/ui/Badge.tsx


const InstagramMark: IconComponent = ({ size = 18, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37a4 4 0 1 1-2.76-2.76A4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookMark: IconComponent = ({ size = 18, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

// --- SHARE MODAL ---

const ShareModal = ({ item, friends, onShare, onClose }: { item: AppItem, friends: ChatInboxItem[], onShare: (friendId: string | number, item: AppItem) => void, onClose: () => void }) => {
  const [sentTo, setSentTo] = useState<Array<string | number>>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const filteredFriends = useMemo(() => filterFriendsByQuery(friends, friendSearch), [friends, friendSearch]);

  const handleShareClick = (friendId: string | number) => {
    if (sentTo.includes(friendId)) return;
    onShare(friendId, item);
    setSentTo(prev => [...prev, friendId]);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Share with friend" className="fixed inset-0 z-[600] bg-stone-900/60 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-10 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-[4rem] md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-20 duration-500">
        <header className="p-10 border-b flex justify-between items-center bg-stone-50">
          <div>
            <Badge color="yellow">Studio Share</Badge>
            <h3 className="text-3xl font-black uppercase tracking-tighter mt-1">Send to Friend</h3>
          </div>
          <button onClick={onClose} className="p-4 bg-white rounded-3xl shadow-sm hover:scale-105 transition-transform"><X size={24} /></button>
        </header>

        <div className="p-10 flex items-center gap-6 border-b">
          <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-lg shrink-0">
            <img src={item.img} alt={item.name || 'Shared item'} className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="font-black uppercase text-xl leading-none">{item.name}</h4>
            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-stone-400 mt-2">{item.cat}</p>
          </div>
        </div>

        <div className="p-8 max-h-[50vh] overflow-y-auto space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
            <input
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              placeholder="Search username, name, or handle..."
              className="w-full bg-stone-50 pl-12 pr-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest outline-none border border-stone-100 focus:ring-4 focus:ring-yellow-400/10"
            />
          </div>
          <h5 className="px-2 text-[12px] font-black uppercase tracking-widest text-stone-500">Active Contacts</h5>
          {filteredFriends.map(friend => (
            <button
              type="button"
              key={friend.id} 
              onClick={() => handleShareClick(friend.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleShareClick(friend.id);
                }
              }}
              tabIndex={0}
              className="flex items-center justify-between p-4 rounded-[2rem] hover:bg-stone-50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-4">
                <img src={friend.avatar} alt={friend.name || 'Friend avatar'} className="w-12 h-12 rounded-full border-2 border-stone-100" />
                <div>
                  <span className="font-black uppercase text-xs tracking-widest block">{friend.name}</span>
                  {!!('username' in friend && friend.username) && <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">@{friend.username}</span>}
                </div>
              </div>
              {sentTo.includes(friend.id) ? (
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 size={24} strokeWidth={3} />
                </div>
              ) : (
                <div className="p-3 bg-stone-100 rounded-2xl group-hover:bg-yellow-400 transition-colors">
                  <Send size={18} />
                </div>
              )}
            </button>
          ))}
          {filteredFriends.length === 0 && (
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100 text-[12px] font-black uppercase tracking-widest text-stone-400 text-center">
              No friends found.
            </div>
          )}
        </div>
        
        <footer className="p-10 bg-stone-50 text-center">
          <button 
            onClick={onClose}
            className="w-full py-5 bg-stone-900 text-white rounded-[2rem] flex items-center justify-center shadow-xl active:scale-95 transition-transform"
          >
            <Check size={24} strokeWidth={3} />
          </button>
        </footer>
      </div>
    </div>
  );
};
// --- VIEWS ---



/* Bites feature extracted to src/features/bites/components/BitesView.tsx */
/* Trims feature extracted to src/features/trims/components/TrimsView.tsx */


/* ChefAIView extracted to src/features/chef/components/ChefAIView.tsx */

/* ChatView extracted to src/features/chat/components/ChatView.tsx */
// ScoutView moved to src/features/scout/components/ScoutView.tsx

// Cinematic Landing logic moved to src/features/landing



/* RewardsView extracted to src/features/rewards/components/RewardsView.tsx */

/* SnapStudio extracted to src/features/snap/components/SnapView.tsx */

// --- MAIN APP ---

const App = () => {
  const isApp = useMemo(() => isCoreAppDomain(), []);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authBooting, setAuthBooting] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardEntry[]>([]);

  const tabIds = useMemo(() => new Set(TAB_IDS), []);
  const [tab, setTab] = useState<typeof TAB_IDS[number]>(() => resolveInitialTab(globalThis.location.search, tabIds) as typeof TAB_IDS[number]);
  const [publicProfileUserId, setPublicProfileUserId] = useState(() => new URLSearchParams(globalThis.location.search).get('userId') || '');
  const [showSnap, setShowSnap] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUnifiedCreation, setShowUnifiedCreation] = useState(false);
  const [showAIBitesStudio, setShowAIBitesStudio] = useState(false);
  const [showAITrimStudio, setShowAITrimStudio] = useState(false);
  const [showAIImportStudio, setShowAIImportStudio] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedItems, setSavedItems] = useState<AppItem[]>(FALLBACK_SAVED_ITEMS);
  const [activeShareItem, setActiveShareItem] = useState<AppItem | null>(null);
  const [chatActiveId, setChatActiveId] = useState<string | null>(null);
  const [chatActiveType, setChatActiveType] = useState<'dm' | 'group' | null>(null);

  const [friends, setFriends] = useState<ChatInboxItem[]>(DEFAULT_FRIENDS);
  const friendsRef = useRef<ChatInboxItem[]>(DEFAULT_FRIENDS);
  useEffect(() => {
    friendsRef.current = friends;
  }, [friends]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const totalUnread = useMemo(() => friends.reduce((sum, friend) => sum + (friend.unreadCount || 0), 0) + notifications.filter(n => n.unread).length, [friends, notifications]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (globalThis.Notification === undefined) {
      return 'unsupported';
    }

    return globalThis.Notification.permission;
  });
  const notificationPromptedRef = useRef(false);
  const pathname = globalThis.location.pathname;
  const viewParam = new URLSearchParams(globalThis.location.search).get('view');
  const isOnboardingDemoView = viewParam === 'onboarding-demo';
  const appRoute = isAppPath(pathname);
  const authCallbackRoute = isAuthCallbackPath(pathname);
  const homeRoute = viewParam === 'home';

  const requestNotificationPermission = useCallback(async () => {
    if (globalThis.Notification === undefined) {
      setNotificationPermission('unsupported');
      return;
    }

    if (globalThis.Notification.permission !== 'default') {
      setNotificationPermission(globalThis.Notification.permission);
      return;
    }

    try {
      const permission = await globalThis.Notification.requestPermission();
      setNotificationPermission(permission);
    } catch (error) {
      console.warn('Notification permission request failed:', error);
    }
  }, []);

  const getFriendDisplayName = useCallback((friendId: string) => {
    const match = friends.find((friend) => String(friend.id) === String(friendId));
    if (!match) return 'Studio Contact';
    return match.name || ('username' in match ? match.username : '') || 'Studio Contact';
  }, [friends]);

  const incrementUnreadForFriend = useCallback((friendId: string) => {
    setFriends((prev) => prev.map((friend) => {
      if (String(friend.id) !== String(friendId)) return friend;
      return {
        ...friend,
        unreadCount: (friend.unreadCount || 0) + 1,
        ...('type' in friend && friend.type === 'group' ? {} : { time: 'now' }),
      };
    }));
  }, []);

  useAuthSessionSync({
    setAuthBooting,
    setIsAuthenticated,
    setAuthUser,
    setShowAuth,
    setHasCompletedOnboarding,
  });

  useSavedItemsOnAuth({
    isAuthenticated,
    setSavedItems,
    fallbackSavedItems: FALLBACK_SAVED_ITEMS,
    normalizeSavedItemForUI,
  });

  useTabUrlSync(tab, appRoute && !homeRoute && !isOnboardingDemoView, publicProfileUserId);

  const handleOpenUserProfile = useCallback((userId: string) => {
    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      return;
    }

    if (authUser?.id && trimmedUserId === authUser.id) {
      setPublicProfileUserId('');
      setTab('profile');
      return;
    }

    setPublicProfileUserId(trimmedUserId);
    setTab('user-profile');
  }, [authUser?.id]);

  const handleBackToOwnProfile = useCallback(() => {
    setPublicProfileUserId('');
    setTab('profile');
  }, []);

  useEffect(() => {
    if (tab !== 'user-profile') {
      return;
    }

    if (!publicProfileUserId && authUser?.id) {
      setTab('profile');
      return;
    }

    if (authUser?.id && publicProfileUserId === authUser.id) {
      setPublicProfileUserId('');
      setTab('profile');
    }
  }, [authUser?.id, publicProfileUserId, tab]);

  useEffect(() => {
    const currentPath = globalThis.location.pathname;
    const currentSearch = globalThis.location.search;
    const currentHash = globalThis.location.hash;
    authDebugLog('path_normalization_start', { currentPath, currentSearch, currentHash });

    if (currentPath === '/') {
      const params = new URLSearchParams(currentSearch);
      const legacyView = params.get('view');

      if (!legacyView) {
        const nextUrl = `${HOME_ENTRY_URL}${currentHash}`;
        authDebugLog('path_normalization_redirect', {
          reason: 'root_without_view',
          to: nextUrl,
        });
        globalThis.history.replaceState(null, '', nextUrl);
        return;
      }

      if (legacyView === 'home') {
        authDebugLog('path_normalization_noop', {
          reason: 'root_home_view',
          currentPath,
          currentSearch,
        });
        return;
      }

      params.set('view', legacyView);
      const nextQuery = params.toString();
      const queryPart = nextQuery ? ('?' + nextQuery) : '';
      const nextUrl = `${APP_PATH}${queryPart}${currentHash}`;
      authDebugLog('path_normalization_redirect', {
        reason: 'root_with_legacy_view',
        legacyView,
        to: nextUrl,
      });
      globalThis.history.replaceState(null, '', nextUrl);
      return;
    }

    if (currentPath === '/landing' || currentPath === '/landing/' || currentPath === '/home' || currentPath.startsWith('/home/')) {
      const nextUrl = `${HOME_ENTRY_URL}${currentHash}`;
      authDebugLog('path_normalization_redirect', {
        reason: 'legacy_home_or_landing_path',
        from: currentPath,
        to: nextUrl,
      });
      globalThis.history.replaceState(null, '', nextUrl);
      return;
    }

    if (currentPath !== APP_PATH && !currentPath.startsWith('/api/') && !isAuthCallbackPath(currentPath)) {
      authDebugLog('path_normalization_redirect', {
        reason: 'non_app_non_api_path',
        from: currentPath,
        to: `${HOME_ENTRY_URL}${currentHash}`,
      });
      globalThis.history.replaceState(null, '', `${HOME_ENTRY_URL}${currentHash}`);
      return;
    }

    authDebugLog('path_normalization_noop', { currentPath });
  }, []);

  useEffect(() => {
    if (authBooting || isAuthenticated || showAuth) {
      return;
    }

    if (appRoute || isApp) {
      setShowAuth(true);
    }
  }, [appRoute, authBooting, isAuthenticated, showAuth, isApp]);

  useEffect(() => {
    if (authBooting || !authCallbackRoute) {
      return;
    }

    authDebugLog('auth_callback_route_detected', {
      isAuthenticated,
      authCallbackRoute,
      path: globalThis.location.pathname,
      search: globalThis.location.search,
    });

    if (isAuthenticated) {
      setTab('dashboard');
      
      const targetPath = `${APP_PATH}?view=dashboard`;

      authDebugLog('auth_callback_route_authenticated_redirect', {
        to: targetPath,
      });
      globalThis.history.replaceState(null, '', targetPath);
      return;
    }

    setShowAuth(true);
    authDebugLog('auth_callback_route_unauthenticated_redirect', { to: HOME_ENTRY_URL });
    globalThis.history.replaceState(null, '', HOME_ENTRY_URL);
  }, [authBooting, authCallbackRoute, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    const ensureProfile = async () => {
      if (!isAuthenticated || !authUser?.id || !hasSupabaseConfig) {
        setProfileReady(true);
        return;
      }

      setProfileReady(false);

      const result = await UserProfileService.ensureCurrentUserProfile(authUser);
      if (!cancelled && !result.success) {
        console.warn('Failed to ensure user profile row:', result.error);
      }

      if (!cancelled) {
        setProfileReady(true);
      }
    };

    ensureProfile();

    return () => {
      cancelled = true;
    };
  }, [authUser, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    const loadContacts = async () => {
      if (!profileReady) {
        return;
      }

      if (!authUser?.id || !hasSupabaseConfig) {
        setFriends(DEFAULT_FRIENDS);
        return;
      }

      const [contacts, groups] = await Promise.all([
        ChatService.listContacts(authUser.id),
        ChatService.listGroups(authUser.id),
      ]);

      if (cancelled) return;

      const contactItems: ChatInboxItem[] = (contacts.success && contacts.data)
        ? contacts.data.map((contact: ChatContact) => ({
            ...contact,
            email: contact.email,
            online: contact.isOnline,
            time: contact.isOnline ? 'now' : 'recent',
            unreadCount: 0,
            requestStatus: 'accepted',
            type: 'dm' as const,
          }))
        : [];

      const groupItems: ChatInboxItem[] = (groups.success && groups.data)
        ? groups.data.map((g) => ({
            id: g.id,
            name: g.name,
            avatar: g.avatarUrl || `https://i.pravatar.cc/150?u=${g.id}`,
            type: 'group' as const,
            unreadCount: 0,
            time: g.lastMessageAt ? 'recent' : 'new',
          }))
        : [];

      setFriends([...groupItems, ...contactItems]);
    };

    loadContacts();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id, profileReady]);

  useEffect(() => {
    if (globalThis.Notification === undefined) {
      setNotificationPermission('unsupported');
      return;
    }

    const syncPermission = () => {
      setNotificationPermission(globalThis.Notification.permission);
    };

    syncPermission();
    globalThis.document.addEventListener('visibilitychange', syncPermission);

    return () => {
      globalThis.document.removeEventListener('visibilitychange', syncPermission);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || notificationPermission !== 'default' || notificationPromptedRef.current) {
      return;
    }

    notificationPromptedRef.current = true;
    requestNotificationPermission().catch((error) => {
      console.warn('Notification permission bootstrap failed:', error);
    });
  }, [isAuthenticated, notificationPermission, requestNotificationPermission]);

  useEffect(() => {
    if (!authUser?.id || !hasSupabaseConfig) {
      return;
    }

    const unsubscribe = ChatService.subscribeToIncomingMessages(authUser.id, ({ otherUserId, message }) => {
      const friendsList = friendsRef.current;
      const match = friendsList.find((f) => String(f.id) === String(otherUserId));
      const senderName = match ? (match.name || ('username' in match ? match.username : '') || 'Studio Contact') : 'Studio Contact';

      incrementUnreadForFriend(otherUserId);

      if (notificationPermission !== 'granted' || globalThis.Notification === undefined) {
        return;
      }

      const isHidden = globalThis.document.visibilityState !== 'visible' || !globalThis.document.hasFocus();
      if (!isHidden) {
        return;
      }

      const body = message.sharedItem
        ? `Shared: ${message.sharedItem?.name || 'an item'}`
        : (message.content || 'You received a new message.');

      const toast = new globalThis.Notification(`${senderName} sent a message`, {
        body,
        icon: '/favicon.png',
        tag: `fuzo-chat-${otherUserId}`,
      });

      toast.onclick = () => {
        globalThis.focus();
        setTab('chat');
        toast.close();
      };
    });

    return () => {
      unsubscribe();
    };
  }, [authUser?.id, incrementUnreadForFriend, notificationPermission]);

  const handleConversationOpened = useCallback((friendId: string) => {
    setFriends(prev => prev.map((friend) => (
      String(friend.id) === String(friendId)
        ? { ...friend, unreadCount: 0 }
        : friend
    )));
  }, []);

  const handleMarkNotificationRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    await NotificationService.markAsRead(id);
  }, []);

  const handleMarkAllNotificationsAsRead = useCallback(async () => {
    setFriends(prev => prev.map(f => ({ ...f, unreadCount: 0 })));
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    if (authUser?.id) {
      await NotificationService.markAllRead(authUser.id);
    }
  }, [authUser?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      if (!profileReady || !authUser?.id || !hasSupabaseConfig) return;

      const result = await NotificationService.listNotifications(authUser.id);
      if (cancelled || !result.success || !result.data) return;

      setNotifications(result.data);
    };

    loadNotifications();

    const unsubscribe = NotificationService.subscribeToNotifications(authUser?.id || '', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev].slice(0, 50));
      
      // Also trigger a system notification if needed
      if (notificationPermission === 'granted' && globalThis.Notification && (globalThis.document.visibilityState !== 'visible' || !globalThis.document.hasFocus())) {
        new globalThis.Notification(newNotif.title, {
          body: newNotif.description,
          icon: '/favicon.png',
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authUser?.id, profileReady, notificationPermission]);

  useEffect(() => {
    if (!isAuthenticated || !authUser?.id || !hasSupabaseConfig) {
      return;
    }

    const updatePresence = async (isOnline: boolean) => {
      try {
        const { error } = await supabase.rpc('update_user_presence', { p_is_online: isOnline });
        if (error) {
          console.warn('Presence sync failed:', error.message, { isOnline });
        }
      } catch (err) {
        console.error('Presence exception:', err);
      }
    };

    updatePresence(true);

    const heartbeat = setInterval(() => {
      updatePresence(true);
    }, 60000); // Heartbeat every 1 minute

    const handleUnload = () => {
      const data = new Blob([JSON.stringify({ 
        action: 'presence_offline', 
        userId: authUser.id 
      })], { type: 'application/json' });
      // Use sendBeacon for more reliability on close, 
      // though RPC needs a standard fetch usually.
      // For now, standard updatePresence(false) on cleanup 
      // handles normal React navigation.
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleUnload);
      updatePresence(false);
    };
  }, [authUser?.id, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    const loadPoints = async () => {
      if (!profileReady) {
        return;
      }

      if (!isAuthenticated || !hasSupabaseConfig) {
        setPoints(0);
        setLevel(1);
        return;
      }

      const result = await PointsService.getCurrentUserPoints();
      if (cancelled || !result.success || !result.data) return;

      setPoints(result.data.total);
      setLevel(result.data.level);
    };

    loadPoints();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id, isAuthenticated, profileReady]);

  useEffect(() => {
    let cancelled = false;

    const loadLeaderboard = async () => {
      if (!profileReady) {
        return;
      }

      if (!hasSupabaseConfig) {
        setLeaderboardUsers([]);
        return;
      }

      const result = await PointsService.getLeaderboard(50);
      if (cancelled || !result.success || !result.data) return;
      setLeaderboardUsers(result.data);
    };

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id, points, profileReady]);

  const awardPointsForAction = useCallback(async (
    actionType: 'save_item' | 'share_item' | 'snap_post',
    sourceEntityType: string,
    sourceEntityId: string,
    metadata?: Record<string, unknown>,
  ) => {
    console.log(`[Points] Awarding for ${actionType}: ${sourceEntityType}/${sourceEntityId}`);
    
    if (!isAuthenticated || !hasSupabaseConfig) {
      console.log('[Points] Not authenticated, awarding local-only simulation points');
      setPoints(prev => prev + 50);
      return;
    }

    try {
      const result = await PointsService.awardActionPoints({
        actionType,
        sourceEntityType,
        sourceEntityId,
        metadata,
      });

      if (!result.success || !result.data) {
        console.warn('[Points] Award failed:', result.error);
        return;
      }

      const awardedPoints = result.data;
      console.log(`[Points] Successfully awarded. New total: ${awardedPoints.total}`);

      // Update local state immediately
      setPoints(awardedPoints.total);
      if (awardedPoints.level !== level) {
        setLevel(awardedPoints.level);
      }

      // Refresh leaderboard if we're in the top 50 or just to keep it fresh
      setLeaderboardUsers(prev => {
        const currentUserId = authUser?.id;
        if (!currentUserId) return prev;
        
        const rest = prev.filter(entry => entry.id !== currentUserId);
        const metadata = authUser?.user_metadata;
        const displayName = getMetadataString(metadata, 'full_name', 'name') || 'Chef Studio';
        const username = getMetadataString(metadata, 'username', 'user_name') || (authUser?.email?.split('@')[0] ?? 'fuzo_user');
        const avatarUrl = (metadata?.avatar_url as string) || null;
        
        const updated: LeaderboardEntry = {
          id: currentUserId,
          displayName,
          username,
          pointsTotal: awardedPoints.total,
          pointsLevel: awardedPoints.level,
          avatarUrl
        };

        return [updated, ...rest]
          .sort((a, b) => (b.pointsTotal - a.pointsTotal) || (b.pointsLevel - a.pointsLevel));
      });
    } catch (err) {
      console.error('[Points] Critical error in awarding points:', err);
    }
  }, [isAuthenticated, authUser, level]);

  const handleSave = async (item: AppItem) => {
    const normalized = normalizeItemForPlateSave(item);
    let isNewSave = false;

    setSavedItems(prev => {
      if (prev.some(i => i.id === normalized.id)) return prev;
      isNewSave = true;
      return [normalized, ...prev];
    });

    if (isNewSave) {
      // Ensure we have a valid entity ID (restaurant placeId or recipe id)
      const entityId = normalized.itemId || normalized.placeId || String(normalized.id);
      
      await awardPointsForAction('save_item', normalized.itemType, entityId, {
        source: 'handleSave',
        itemName: normalized.name
      });
    }

    if (!hasSupabaseConfig) return;

    const result = await PlateService.saveToPlate({
      itemId: normalized.itemId,
      itemType: normalized.itemType,
      metadata: normalized.metadata,
    });

    if (!result.success) {
      console.warn('Plate save failed:', result.error);
    }
  };

  const handleUnsave = async (item: AppItem) => {
    const normalized = normalizeItemForPlateSave(item);

    setSavedItems(prev => prev.filter((savedItem) => !areSavedItemsEquivalent(savedItem, normalized)));

    if (!hasSupabaseConfig) {
      return;
    }

    const result = await PlateService.removeFromPlate({
      itemId: normalized.itemId,
      itemType: normalized.itemType,
    });

    if (!result.success) {
      console.warn('Plate unsave failed:', result.error);
      setSavedItems(prev => {
        if (prev.some((savedItem) => areSavedItemsEquivalent(savedItem, normalized))) {
          return prev;
        }
        return [normalized, ...prev];
      });
    }
  };

  const handleSnap = (item: AppItem) => {
    const itemId = String(item.id || '');
    setSavedItems(prev => [item, ...prev]);
    awardPointsForAction('snap_post', inferItemTypeFromId(itemId), itemId, {
      source: 'handleSnap',
    }).catch((error) => {
      console.warn('Snap points award failed:', error);
    });
  };

  const handleShare = async (friendId: string | number, item: AppItem) => {
    const targetFriendId = String(friendId);
    const itemId = String(item.id || '');
    const friend = friends.find(f => String(f.id) === targetFriendId);
    const isGroup = friend?.type === 'group';

    if (authUser?.id && hasSupabaseConfig) {
      if (isGroup) {
        const sent = await ChatService.sendGroupSharedItemMessage({
          groupId: targetFriendId,
          senderId: authUser.id,
          item,
        });
        if (!sent.success) {
          console.warn('Group share message send failed:', sent.error);
        }
      } else {
        const conversation = await ChatService.getOrCreateConversation(authUser.id, targetFriendId);
        if (conversation.success && conversation.data) {
          const sent = await ChatService.sendSharedItemMessage({
            conversationId: conversation.data.id,
            senderId: authUser.id,
            item,
          });

          if (!sent.success) {
            console.warn('Share message send failed:', sent.error);
          }
        }
      }
    }

    awardPointsForAction('share_item', inferItemTypeFromId(itemId), itemId, {
      source: 'handleShare',
      friendId: targetFriendId,
    }).catch((error) => {
      console.warn('Share points award failed:', error);
    });
  };


  const handleSignOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      setIsAuthenticated(false);
      setAuthUser(null);
      setShowAuth(false);
      setPoints(0);
      setLevel(1);
      setTab('dashboard');
      setPublicProfileUserId('');
      setSidebarOpen(false);
      setShowSnap(false);
      setActiveShareItem(null);
      setSavedItems(FALLBACK_SAVED_ITEMS);
      globalThis.location.href = getLandingUrl();
    }
  };

  // handleOnboardingComplete moved to AuthOrchestrator

  const [googleMapsReady, setGoogleMapsReady] = useState(false);

  useEffect(() => {
    const initGlobalMaps = async () => {
      try {
        const loader = new Loader({
          apiKey: API_KEYS.MAPS,
          version: 'weekly',
          libraries: ['places', 'visualization', 'geometry']
        });
        await loader.load();
        setGoogleMapsReady(true);
        console.log('Google Maps globally initialized');
      } catch (err) {
        console.error('Failed to load Google Maps globally:', err);
      }
    };
    initGlobalMaps();
  }, []);

  const renderApp = (tabId: string) => {
    const commonProps = {
      tab: tabId,
      setTab: ((t: string) => {
        if (t === 'snap') {
          setShowSnap(true);
        } else {
          setTab(t as any);
        }
      }) as (t: string) => void,
      handleSave: (item: AppItem) => {
        handleSave(item).catch((error) => {
          console.warn('Save failed:', error);
        });
      },
      handleUnsave: (item: AppItem) => {
        handleUnsave(item).catch((error) => {
          console.warn('Unsave failed:', error);
        });
      },
      setActiveShareItem,
      friends,
      savedItems,
      authUser,
      points,
      level,
      leaderboardUsers,
      profileUserId: publicProfileUserId,
      handleSignOut,
      handleConversationOpened,
      handleOpenUserProfile,
      handleBackToOwnProfile,
      mapsApiKey: API_KEYS.MAPS,
      googleMapsReady,
      chatActiveId,
      chatActiveType,
      onClearChatActiveId: () => {
        setChatActiveId(null);
        setChatActiveType(null);
      },
      onShowNotifications: () => setShowNotifications(true),
      components: {
        DashboardView,
        FeedView,
        BitesView,
        TrimsView,
        ChefAIView,
        ChatView,
        ScoutView,
        ProfileView,
        PublicProfileView,
        LeaderboardView,
        RewardsView,
        SettingsView,
      },
    };
    return renderAppView(commonProps);
  };

  if (authBooting) {
    return (
      <div className="min-h-screen bg-stone-900 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-white/10 border border-white/20 animate-pulse" />
          <p className="font-black uppercase tracking-widest text-xs text-white/60">Initializing Auth...</p>
        </div>
      </div>
    );
  }

  const authView = (
    <AuthOrchestrator
      isAuthenticated={isAuthenticated}
      hasCompletedOnboarding={hasCompletedOnboarding}
      showAuth={showAuth}
      setAuthUser={setAuthUser}
      setIsAuthenticated={setIsAuthenticated}
      setHasCompletedOnboarding={setHasCompletedOnboarding}
      setShowAuth={setShowAuth}
      setTab={setTab as any}
      onboardingV2Enabled={ONBOARDING_V2_ENABLED}
      appPath={APP_PATH}
      homeUrl={HOME_ENTRY_URL}
      appRoute={appRoute}
      authCallbackRoute={authCallbackRoute}
    />
  );


  return (
    <AnimatePresence mode="wait">
      {isOnboardingDemoView || !isAuthenticated || (showAuth && !hasCompletedOnboarding) ? (
        <motion.div
          key="entry-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full h-full"
        >
          {authView}
        </motion.div>
      ) : (
        <motion.div
          key="main-app-shell"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen bg-stone-50 flex flex-col md:flex-row pb-[env(safe-area-inset-bottom)] overflow-x-hidden w-full"
        >
          {showSnap && <SnapView onPost={handleSnap} onClose={() => setShowSnap(false)} />}
          <NotificationsView 
            isOpen={showNotifications} 
            onClose={() => setShowNotifications(false)} 
            notifications={notifications}
            onMarkAllRead={handleMarkAllNotificationsAsRead}
            onMarkRead={handleMarkNotificationRead}
            onOpenChat={(id, type) => {
              setShowNotifications(false);
              setChatActiveId(id);
              setChatActiveType(type);
              setSidebarOpen(false);
              setTab('chat');
            }}
          />
          <UnifiedCreationModal 
            isOpen={showUnifiedCreation} 
            onClose={() => setShowUnifiedCreation(false)}
            onSelectOption={(option) => {
              if (option === 'snap') setShowSnap(true);
              else if (option === 'bites-ai') setShowAIBitesStudio(true);
              else if (option === 'trim-ai') setShowAITrimStudio(true);
              else if (option === 'import-ai') setShowAIImportStudio(true);
              else if (option === 'scout') setTab('scout');
            }}
          />
          
          {showAIImportStudio && (
            <ImportStudio 
              onClose={() => setShowAIImportStudio(false)} 
              onPost={(item) => {
                handleSnap(item);
                setShowAIImportStudio(false);
              }} 
            />
          )}
          
          {showAIBitesStudio && (
            <AIRecipeStudio 
              onClose={() => setShowAIBitesStudio(false)} 
              onSave={(item) => handleSave(item as any)} 
              onShareRequest={setActiveShareItem}
            />
          )}

          {showAITrimStudio && (
            <AITrimStudio 
              onClose={() => setShowAITrimStudio(false)} 
              onSave={handleSave} 
              onShareRequest={setActiveShareItem}
            />
          )}

          {activeShareItem && (
            <ShareModal 
              item={activeShareItem} 
              friends={friends} 
              onShare={handleShare} 
              onClose={() => setActiveShareItem(null)} 
            />
          )}

          {/* Desktop Sidebar */}
          <aside aria-label="Main navigation" className={`fixed inset-y-0 left-0 z-[200] w-28 bg-white border-r border-stone-100 transform ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} md:translate-x-0 md:static transition-all duration-500 ease-in-out`}>
            <div className="flex flex-col h-full p-4 overflow-y-auto hide-scrollbar items-center">
              <header className="flex flex-col items-center justify-center mb-12 md:mb-16 mt-4 gap-6">
                <div className="w-14 h-14 bg-stone-900 rounded-3xl items-center justify-center text-yellow-400 shadow-2xl rotate-3 shrink-0 hidden md:flex"><ChefHat size={32} /></div>
                
                <button 
                  onClick={() => setShowUnifiedCreation(true)}
                  aria-label="Create new content"
                  className="w-12 h-12 bg-white border-2 border-stone-100 rounded-2xl flex items-center justify-center text-stone-900 shadow-sm hover:scale-105 active:scale-95 transition-all group"
                >
                  <Plus size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                </button>

                <button 
                  onClick={() => { setTab('leaderboard'); setSidebarOpen(false); }}
                  aria-label={`Leaderboard, ${points} points`}
                  className="flex flex-col items-center gap-1 group min-w-[44px] min-h-[44px]"
                >
                  <div className="px-3 py-1 bg-yellow-400 rounded-full text-[12px] font-black text-stone-900 shadow-lg group-hover:scale-110 transition-transform">
                    {points.toLocaleString()}
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-stone-500">Pts</span>
                </button>
                <button onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" className="md:hidden p-4 bg-stone-50 rounded-2xl"><X size={20} /></button>
              </header>
              
              <nav aria-label="App sections" className="space-y-4 flex-grow w-full">
                {BOTTOM_NAV_ITEMS.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => { 
                      if (item.id === 'snap') {
                        setShowUnifiedCreation(true);
                      } else {
                        setTab(item.id); 
                      }
                      setSidebarOpen(false); 
                    }}
                    aria-label={item.label}
                    aria-current={tab === item.id ? 'page' : undefined}
                    className={`w-full flex items-center justify-center py-5 rounded-[1.5rem] transition-all min-h-[44px] ${tab === item.id ? 'bg-yellow-400 text-stone-900 shadow-xl' : 'text-stone-300 hover:bg-stone-50'}`}
                  >
                    <item.icon size={28} strokeWidth={tab === item.id ? 3 : 2} />
                  </button>
                ))}

                <div className="my-8 h-px bg-stone-50 w-1/2 mx-auto" />
                
                {DRAWER_NAV_ITEMS.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'chat') {
                        requestNotificationPermission().catch((error) => {
                          console.warn('Notification permission request failed:', error);
                        });
                      }
                      if (item.id === 'notifications') {
                        setShowNotifications(true);
                      } else {
                        setTab(item.id);
                      }
                      setSidebarOpen(false);
                    }}
                    aria-label={item.label}
                    aria-current={tab === item.id ? 'page' : undefined}
                    className={`w-full flex items-center justify-center py-5 rounded-[1.5rem] transition-all min-h-[44px] ${tab === item.id ? 'bg-stone-900 text-white shadow-xl' : 'text-stone-300 hover:bg-stone-50'}`}
                  >
                    <div className="relative">
                      <item.icon size={28} strokeWidth={tab === item.id ? 3 : 2} />
                      {item.id === 'chat' && totalUnread > 0 && (
                        <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-yellow-400 text-stone-900 text-[12px] font-black flex items-center justify-center">
                          {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <a href="#main-content" className="skip-to-content">Skip to content</a>
          <main id="main-content" className={`flex-grow w-full relative h-screen overflow-x-hidden selection:bg-yellow-400 selection:text-stone-900 ${tab === 'scout' ? 'max-w-none px-0 pt-0 pb-0 md:pb-0 overflow-hidden' : 'max-w-6xl mx-auto px-6 md:px-12 pt-8 pb-48 md:pb-12 overflow-y-auto'}`}>
            {tab !== 'scout' && (
            <header className="flex items-center justify-between mb-8 md:hidden px-2">
              <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="p-3 bg-stone-900 text-yellow-400 rounded-2xl shadow-lg active:scale-90 transition-transform rotate-3">
                <ChefHat size={24} strokeWidth={2.5} />
              </button>

              <button 
                onClick={() => setShowNotifications(true)}
                className="font-black text-2xl tracking-tighter uppercase text-stone-900 hover:scale-105 active:scale-95 transition-transform"
              >
                FUZO
              </button>
              
              <button 
                onClick={() => setShowNotifications(true)}
                aria-label="Notifications"
                className="p-3 bg-white text-stone-400 rounded-2xl shadow-sm border border-stone-100 active:scale-90 transition-transform relative"
              >
                <Bell size={24} />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" aria-hidden="true" />
              </button>
            </header>
            )}

            {renderApp(tab)}
          </main>

          <nav aria-label="Main tabs" role="tablist" className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-2xl border-t border-stone-100 px-8 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex justify-between items-center md:hidden z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <NavIcon icon={Home} active={tab === 'dashboard'} onClick={() => setTab('dashboard')} label="Home" />
            <NavIcon icon={ChefHat} active={tab === 'bites'} onClick={() => setTab('bites')} label="Bites" />
            
            <button 
              onClick={() => setShowUnifiedCreation(true)} 
              aria-label="Create new content"
              className="w-[72px] h-[72px] -mt-14 bg-stone-900 rounded-[2.5rem] flex items-center justify-center text-yellow-400 shadow-[0_20px_40px_rgba(0,0,0,0.3)] border-4 border-white active:scale-90 transition-transform"
            >
              <Camera size={29} strokeWidth={3} />
            </button>

            <NavIcon icon={PlayCircle} active={tab === 'trims'} onClick={() => setTab('trims')} label="Trims" />
            <NavIcon icon={MapPin} active={tab === 'scout'} onClick={() => setTab('scout')} label="Scout" />
          </nav>


          {sidebarOpen && <button type="button" aria-label="Close sidebar" className="fixed inset-0 bg-stone-900/40 backdrop-blur-xl z-[190] md:hidden" onClick={() => setSidebarOpen(false)} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

mountApp(App);
