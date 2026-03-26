import { Bell, Bot, Camera, ChefHat, Gift, LayoutGrid, MapPin, MessageSquare, PlayCircle, Settings, Trophy, User } from 'lucide-react';

export const TAB_IDS = ['feed', 'bites', 'trims', 'chef', 'chat', 'scout', 'profile', 'user-profile', 'leaderboard', 'rewards', 'settings', 'notifications'] as const;

export const BOTTOM_NAV_ITEMS = [
  { id: 'feed', icon: LayoutGrid, label: 'Feed' },
  { id: 'bites', icon: ChefHat, label: 'Bites' },
  { id: 'snap', icon: Camera, label: 'Snap' },
  { id: 'trims', icon: PlayCircle, label: 'Trims' },
  { id: 'scout', icon: MapPin, label: 'Scout' },
] as const;

export const DRAWER_NAV_ITEMS = [
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'leaderboard', icon: Trophy, label: 'Leaderboard' },
  { id: 'rewards', icon: Gift, label: 'Rewards' },
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'chef', icon: Bot, label: 'AI Chef' },
  { id: 'settings', icon: Settings, label: 'Settings' },
] as const;

export const resolveInitialTab = (search: string, allowedTabs: ReadonlySet<string>) => {
  const view = new URLSearchParams(search).get('view') || '';
  if (view === 'home') {
    return 'feed';
  }
  return allowedTabs.has(view) ? view : 'feed';
};
