/**
 * ============================================================================
 * VIEW ROUTING ENGINE — UI Orchestration
 * ============================================================================
 * 
 * This module acts as the layout's dynamic 'switchboard'. It receives the 
 * current active tab and injects the necessary global state (Auth, Points, 
 * Nav, Saved Items) into the respective feature view.
 * 
 * Core Responsibilities:
 * 1. View Selection: Maps TAB_IDS to their respective component implementations.
 * 2. Prop Delegation: Normalizes diverse callback patterns (Save, Share, 
 *    Identify) into a consistent interface for sub-components.
 * 3. Default Fallback: Ensures the user always sees the 'Feed' if a view 
 *    fails to resolve.
 */

import React from 'react';
import type { AuthUser } from '../../features/auth/types/auth';
import type { ChatFriend, ChatInboxItem } from '../../features/chat/types/chatUi';
import type { LeaderboardEntry } from '../../features/points/services/pointsService';
import type { AppItem } from '../../shared/types/appItem';

/**
 * SECTION: Component Registry Types
 * Defines the contract that each top-level feature view must satisfy to 
 * be rendered by the orchestrator.
 */
interface RenderComponents {
  DashboardView: React.ComponentType<{ setTab: (tab: string) => void }>;
  FeedView: React.ComponentType<{ onSave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void; onOpenUserProfile: (userId: string) => void }>;
  BitesView: React.ComponentType<{ onSave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void }>;
  TrimsView: React.ComponentType<{ onSave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void; authUser: AuthUser | null }>;
  ChefAIView: React.ComponentType;
  ChatView: React.ComponentType<{
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
  }>;
  ScoutView: React.ComponentType<{
    mapsApiKey?: string;
    savedItems: AppItem[];
    onAction: (item: AppItem, action: 'save' | 'share') => void;
    googleMapsReady?: boolean;
    authUser: AuthUser | null;
  }>;
  ProfileView: React.ComponentType<{ savedItems: AppItem[]; authUser: AuthUser | null; friends: ChatInboxItem[]; onSave: (item: AppItem) => void; onUnsave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void; setTab: (tab: string) => void; onOpenUserProfile: (userId: string) => void }>;

  PublicProfileView: React.ComponentType<{ targetUserId: string; authUser: AuthUser | null; currentUserSavedItems: AppItem[]; friends: ChatInboxItem[]; onBackToOwnProfile: () => void; onSave: (item: AppItem) => void; onUnsave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void; setTab: (tab: string) => void }>;
  LeaderboardView: React.ComponentType<{ userPoints: number; userLevel: number; leaderboardUsers: LeaderboardEntry[]; onOpenUserProfile: (userId: string) => void }>;
  RewardsView: React.ComponentType;
  SettingsView: React.ComponentType<{ onSignOut: () => Promise<void>; authUser: AuthUser | null }>;
}

/**
 * SECTION: View Selection Logic
 * The main orchestrator function called from index.tsx.
 */
export const renderAppView = ({
  tab,
  setTab,
  handleSave,
  handleUnsave,
  setActiveShareItem,
  friends,
  savedItems,
  authUser,
  points,
  level,
  leaderboardUsers,
  profileUserId,
  handleSignOut,
  handleConversationOpened,
  handleOpenUserProfile,
  handleBackToOwnProfile,
  mapsApiKey,
  googleMapsReady,
  chatActiveId,
  chatActiveType,
  onClearChatActiveId,
  components,
}: {
  tab: string;
  setTab: (tab: string) => void;
  handleSave: (item: AppItem) => void;
  handleUnsave: (item: AppItem) => void;
  setActiveShareItem: (item: AppItem) => void;
  friends: ChatInboxItem[];
  savedItems: AppItem[];
  authUser: AuthUser | null;
  points: number;
  level: number;
  leaderboardUsers: LeaderboardEntry[];
  profileUserId: string;
  handleSignOut: () => Promise<void>;
  handleConversationOpened: (friendId: string) => void;
  handleOpenUserProfile: (userId: string) => void;
  handleBackToOwnProfile: () => void;
  mapsApiKey: string;
  googleMapsReady?: boolean;
  chatActiveId?: string | null;
  chatActiveType?: 'dm' | 'group' | null;
  onClearChatActiveId?: () => void;
  components: RenderComponents;
}) => {
  const {
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
  } = components;

  // Logic: Map the ID from 'navItems.ts' to the physical component instance.
  switch (tab) {
    case 'dashboard':
      return <DashboardView setTab={setTab} />;
    case 'feed':
      return <FeedView onSave={handleSave} onShareRequest={setActiveShareItem} onOpenUserProfile={handleOpenUserProfile} />;
    case 'bites':
      return <BitesView onSave={handleSave} onShareRequest={setActiveShareItem} />;
    case 'trims':
      return <TrimsView onSave={handleSave} onShareRequest={setActiveShareItem} authUser={authUser} />;
    case 'chef':
      return <ChefAIView />;
    case 'chat':
      return <ChatView 
        friends={friends} 
        authUser={authUser} 
        onSave={handleSave} 
        onShareRequest={setActiveShareItem} 
        setTab={setTab} 
        onConversationOpened={handleConversationOpened} 
        onOpenUserProfile={handleOpenUserProfile}
        initialActiveId={chatActiveId}
        initialActiveType={chatActiveType}
        onClearInitial={onClearChatActiveId}
      />;
    case 'scout':
      return (
        <ScoutView
          mapsApiKey={mapsApiKey}
          savedItems={savedItems}
          googleMapsReady={googleMapsReady}
          onAction={(item, action) => {
            if (action === 'save') handleSave(item);
            else setActiveShareItem(item);
          }}
          authUser={authUser}
        />
      );
    case 'profile':
      return <ProfileView savedItems={savedItems} authUser={authUser} friends={friends} onSave={handleSave} onUnsave={handleUnsave} onShareRequest={setActiveShareItem} setTab={setTab} onOpenUserProfile={handleOpenUserProfile} />;

    case 'user-profile':
      return <PublicProfileView targetUserId={profileUserId} authUser={authUser} currentUserSavedItems={savedItems} friends={friends} onBackToOwnProfile={handleBackToOwnProfile} onSave={handleSave} onUnsave={handleUnsave} onShareRequest={setActiveShareItem} setTab={setTab} />;
    case 'leaderboard':
      return <LeaderboardView userPoints={points} userLevel={level} leaderboardUsers={leaderboardUsers} onOpenUserProfile={handleOpenUserProfile} />;
    case 'rewards':
      return <RewardsView />;
    case 'settings':
      return <SettingsView onSignOut={handleSignOut} authUser={authUser} />;
    default:
      return <DashboardView setTab={setTab} />;
  }
};
