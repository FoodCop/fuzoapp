import { Bell, Bot, Camera, ChefHat, Gift, LayoutGrid, MapPin, MessageSquare, PlayCircle, Settings, Trophy, User } from 'lucide-react';

export const TAB_IDS = ['feed', 'bites', 'trims', 'chef', 'chat', 'scout', 'profile', 'user-profile', 'leaderboard', 'rewards', 'settings', 'notifications'] as const;

export const BOTTOM_NAV_ITEMS = [
  { id: 'feed', icon: LayoutGrid },
  { id: 'bites', icon: ChefHat },
  { id: 'snap', icon: Camera },
  { id: 'trims', icon: PlayCircle },
  { id: 'scout', icon: MapPin },
] as const;

export const DRAWER_NAV_ITEMS = [
  { id: 'profile', icon: User },
  { id: 'leaderboard', icon: Trophy },
  { id: 'rewards', icon: Gift },
  { id: 'chat', icon: MessageSquare },
  { id: 'notifications', icon: Bell },
  { id: 'chef', icon: Bot },
  { id: 'settings', icon: Settings },
] as const;

export const resolveInitialTab = (search: string, allowedTabs: ReadonlySet<string>) => {
  const view = new URLSearchParams(search).get('view') || '';
  if (view === 'home') {
    return 'feed';
  }
  return allowedTabs.has(view) ? view : 'feed';
};
