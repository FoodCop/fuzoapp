/**
 * ============================================================================
 * APPLICATION NAVIGATION REGISTRY — UX Orchestration
 * ============================================================================
 * 
 * This module defines the architectural navigation structure of the platform.
 * It maps view IDs to their respective icons and labels, ensuring consistency 
 * between the Mobile 'Bottom Nav' and the Sidebar 'Drawer Nav'.
 */

import { Bell, Bot, Camera, ChefHat, Gift, Home, LayoutGrid, MapPin, MessageSquare, PlayCircle, Settings, Trophy, User } from 'lucide-react';

/**
 * SECTION: Global Tab Definitions
 * The definitive list of all top-level entry points for the React orchestrator.
 */
export const TAB_IDS = ['dashboard', 'feed', 'bites', 'trims', 'chef', 'chat', 'scout', 'profile', 'user-profile', 'leaderboard', 'rewards', 'settings', 'notifications'] as const;

/**
 * SECTION: Primary Bottom Navigation
 * Logic: These features constitute the "Core Loop" of the application and 
 * are accessible from any screen via the primary navigation bar.
 */
export const BOTTOM_NAV_ITEMS = [
  { id: 'dashboard', icon: Home, label: 'Home' },
  { id: 'bites', icon: ChefHat, label: 'Bites' },
  { id: 'snap', icon: Camera, label: 'Snap' },
  { id: 'trims', icon: PlayCircle, label: 'Trims' },
  { id: 'scout', icon: MapPin, label: 'Scout' },
] as const;

/**
 * SECTION: Secondary Drawer Navigation
 * Logic: Deeper features, social interactions, and configuration settings 
 * typically accessed via the profile or hamburger menu.
 */
export const DRAWER_NAV_ITEMS = [
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'leaderboard', icon: Trophy, label: 'Leaderboard' },
  { id: 'rewards', icon: Gift, label: 'Rewards' },
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'chef', icon: Bot, label: 'AI Chef' },
  { id: 'settings', icon: Settings, label: 'Settings' },
] as const;

/**
 * SECTION: Routing Helpers
 * Logic: Resolves the initial app view based on the URL search parameters 
 * (e.g., ?view=chat). Provides fallback to 'dashboard' if invalid.
 */
export const resolveInitialTab = (search: string, allowedTabs: ReadonlySet<string>) => {
  const view = new URLSearchParams(search).get('view') || '';
  if (view === 'home') {
    return 'dashboard';
  }
  return allowedTabs.has(view) ? view : 'dashboard';
};
