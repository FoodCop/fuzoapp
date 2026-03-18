import React from 'react';
import type { AuthUser } from '../../features/auth/types/auth';
import type { ChatFriend } from '../../features/chat/types/chatUi';
import type { LeaderboardEntry } from '../../features/points/services/pointsService';
import type { AppItem } from '../../shared/types/appItem';

interface RenderComponents {
  FeedView: React.ComponentType<{ onSave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void; onOpenUserProfile: (userId: string) => void }>;
  BitesView: React.ComponentType<{ onSave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void }>;
  TrimsView: React.ComponentType<{ onSave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void; authUser: AuthUser | null }>;
  ChefAIView: React.ComponentType;
  ChatView: React.ComponentType<{
    friends: ChatFriend[];
    authUser: AuthUser | null;
    onSave: (item: AppItem) => void;
    onShareRequest: (item: AppItem) => void;
    setTab: (tab: string) => void;
    onConversationOpened: (friendId: string) => void;
    onOpenUserProfile: (userId: string) => void;
  }>;
  ScoutView: React.ComponentType<{ onSave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void; savedItems: AppItem[] }>;
  ProfileView: React.ComponentType<{ savedItems: AppItem[]; authUser: AuthUser | null; friends: ChatFriend[]; onSave: (item: AppItem) => void; onUnsave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void }>;
  PublicProfileView: React.ComponentType<{ targetUserId: string; authUser: AuthUser | null; currentUserSavedItems: AppItem[]; friends: ChatFriend[]; onBackToOwnProfile: () => void; onSave: (item: AppItem) => void; onUnsave: (item: AppItem) => void; onShareRequest: (item: AppItem) => void }>;
  LeaderboardView: React.ComponentType<{ userPoints: number; userLevel: number; leaderboardUsers: LeaderboardEntry[]; onOpenUserProfile: (userId: string) => void }>;
  RewardsView: React.ComponentType;
  SettingsView: React.ComponentType<{ onSignOut: () => Promise<void>; authUser: AuthUser | null }>;
}

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
  components,
}: {
  tab: string;
  setTab: (tab: string) => void;
  handleSave: (item: AppItem) => void;
  handleUnsave: (item: AppItem) => void;
  setActiveShareItem: (item: AppItem) => void;
  friends: ChatFriend[];
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
  components: RenderComponents;
}) => {
  const {
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

  switch (tab) {
    case 'feed':
      return <FeedView onSave={handleSave} onShareRequest={setActiveShareItem} onOpenUserProfile={handleOpenUserProfile} />;
    case 'bites':
      return <BitesView onSave={handleSave} onShareRequest={setActiveShareItem} />;
    case 'trims':
      return <TrimsView onSave={handleSave} onShareRequest={setActiveShareItem} authUser={authUser} />;
    case 'chef':
      return <ChefAIView />;
    case 'chat':
      return <ChatView friends={friends} authUser={authUser} onSave={handleSave} onShareRequest={setActiveShareItem} setTab={setTab} onConversationOpened={handleConversationOpened} onOpenUserProfile={handleOpenUserProfile} />;
    case 'scout':
      return <ScoutView onSave={handleSave} onShareRequest={setActiveShareItem} savedItems={savedItems} />;
    case 'profile':
      return <ProfileView savedItems={savedItems} authUser={authUser} friends={friends} onSave={handleSave} onUnsave={handleUnsave} onShareRequest={setActiveShareItem} />;
    case 'user-profile':
      return <PublicProfileView targetUserId={profileUserId} authUser={authUser} currentUserSavedItems={savedItems} friends={friends} onBackToOwnProfile={handleBackToOwnProfile} onSave={handleSave} onUnsave={handleUnsave} onShareRequest={setActiveShareItem} />;
    case 'leaderboard':
      return <LeaderboardView userPoints={points} userLevel={level} leaderboardUsers={leaderboardUsers} onOpenUserProfile={handleOpenUserProfile} />;
    case 'rewards':
      return <RewardsView />;
    case 'settings':
      return <SettingsView onSignOut={handleSignOut} authUser={authUser} />;
    default:
      return <FeedView onSave={handleSave} onShareRequest={setActiveShareItem} onOpenUserProfile={handleOpenUserProfile} />;
  }
};
