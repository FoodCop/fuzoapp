/**
 * ============================================================================
 * PROFILE MODULE — The Plate (User Discovery Hub)
 * ============================================================================
 * 
 * Component Architecture:
 * 1. Profile Orchestrator: Merges Auth metadata with persisted SettingsProfile.
 * 2. Stat Engine: Real-time point/rank synchronization (PointsService).
 * 3. Feature Widgets: Integration of spatial (MiniMap) and social (Leaderboard) tools.
 * 4. Content Grid: Tab-based filtering for cross-feature saved artifacts.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  MapPin, ChefHat, PlayCircle, User, LayoutGrid, Music2, Pin, Youtube, Instagram 
} from 'lucide-react';
import { SocialGrid } from './SocialGrid';
import { MetaService, type InstagramMedia } from '../../../services/metaService';
import type { AppItem } from '../../../shared/types/appItem';
import type { AuthUser } from '../../auth/types/auth';
import type { ChatFriend, ChatInboxItem } from '../../chat/types/chatUi';
import { Badge } from '../../../shared/ui/Badge';
import { InstagramMark, FacebookMark } from '../../../shared/ui/SocialIcons';
import { normalizeExternalUrl } from '../../../shared/lib/urlHelpers';
import { SettingsService } from '../../settings/services/settingsService';
import type { SettingsProfile } from '../../settings/types/settings';
import { SavedItemDetailModal } from './SavedItemDetailModal';
import { MiniMapWidget } from './MiniMapWidget';
import { LeaderboardModal } from './LeaderboardModal';
import { PROFILE_TYPE_BADGES } from '../types/profile';
import type { PrimaryProfileType, ChefSubtype } from '../types/profile';
import { PointsService } from '../../points/services/pointsService';
import { Avatar } from '../../../shared/ui/Avatar';

/**
 * COMPONENT: ProfileView
 * Master orchestrator for the 'Plate' (User Profile).
 * logic:
 * - Aggregates all saved items (Places, Recipes, Videos).
 * - Manages user rank and social links.
 * - Hosts the leaderboard and discovery heatmap.
 */
export const ProfileView = ({ 
  savedItems, 
  authUser, 
  friends, 
  onSave, 
  onUnsave, 
  onShareRequest, 
  setTab,
  onOpenUserProfile
}: { 
  savedItems: AppItem[]; 
  authUser: AuthUser | null; 
  friends: ChatInboxItem[]; 
  onSave: (item: AppItem) => void; 
  onUnsave: (item: AppItem) => void; 
  onShareRequest: (item: AppItem) => void; 
  setTab?: (tab: string) => void;
  onOpenUserProfile?: (userId: string) => void;
}) => {
  const [activeTab, setActiveTab] = useState('places');
  const [persistedProfile, setPersistedProfile] = useState<SettingsProfile | null>(null);
  const [selectedSavedItem, setSelectedSavedItem] = useState<AppItem | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userLevel, setUserLevel] = useState<number | null>(null);
  const [instagramMedia, setInstagramMedia] = useState<InstagramMedia[]>([]);
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  // SECTION: Helpers

  const hasIdPrefix = useCallback((item: AppItem, prefix: string) => {
    return typeof item.id === 'string' && item.id.startsWith(prefix);
  }, []);

  // SECTION: Data Fetching (Profile & Rank)

  const profileDisplay = useMemo(() => {
    const metadata = (authUser?.user_metadata || {}) as Record<string, string | undefined>;
    const email = authUser?.email || '';
    const emailName = email.includes('@') ? email.split('@')[0] : 'Chef Studio';
    const persisted = persistedProfile;

    return {
      name: persisted?.name || metadata.full_name || metadata.name || 'Chef Studio',
      username: persisted?.username || metadata.username || metadata.user_name || emailName,
      bio: persisted?.bio || metadata.bio || 'Discovery engine architect. Exploring the world of fine dining and culinary hacks.',
      avatar: persisted?.avatarUrl || metadata.avatar_url || null,
      cover: persisted?.coverUrl || metadata.cover_photo_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    };
  }, [authUser, persistedProfile]);


  useEffect(() => {
    let cancelled = false;

    const loadPersistedProfile = async () => {
      if (!authUser?.id) {
        setPersistedProfile(null);
        setUserRank(null);
        return;
      }

      const [settingsResult, rankResult] = await Promise.all([
        SettingsService.getUserSettings(authUser),
        PointsService.getUserRank(authUser.id)
      ]);

      if (cancelled) return;

      if (settingsResult.success && settingsResult.data) {
        setPersistedProfile(settingsResult.data);
      }
      
      if (rankResult.success && rankResult.data && !cancelled) {
        setUserRank(rankResult.data.rank);
        setUserLevel(rankResult.data.level);
      }
    };


    loadPersistedProfile();

    // Mock social media sync for demo purposes
    if (authUser?.id) {
      setIsSocialLoading(true);
      setTimeout(() => {
        setInstagramMedia([
          { id: '1', media_type: 'IMAGE', media_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80', permalink: '#', timestamp: '', caption: 'Elite Discoveries' },
          { id: '2', media_type: 'IMAGE', media_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80', permalink: '#', timestamp: '', caption: 'Healthy Greens' },
          { id: '3', media_type: 'VIDEO', media_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80', thumbnail_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80', permalink: '#', timestamp: '', caption: 'Pizza Night' }
        ]);
        setIsSocialLoading(false);
      }, 1000);
    }

    return () => {
      cancelled = true;
    };
  }, [authUser]);

  // SECTION: Social & Tab Config

  const socialLinks = useMemo(() => {
    const metadata = (authUser?.user_metadata || {}) as Record<string, string | undefined>;
    const persisted = persistedProfile;

    return {
      instagram: normalizeExternalUrl(persisted?.instagram || metadata.instagram_url || metadata.instagram || metadata.ig, 'https://instagram.com'),
      facebook: normalizeExternalUrl(persisted?.facebook || metadata.facebook_url || metadata.facebook || metadata.fb, 'https://facebook.com'),
      tiktok: normalizeExternalUrl(persisted?.tiktok || metadata.tiktok_url || metadata.tiktok, 'https://tiktok.com'),
      pinterest: normalizeExternalUrl(persisted?.pinterest || metadata.pinterest_url || metadata.pinterest, 'https://pinterest.com'),
      youtube: normalizeExternalUrl(persisted?.youtube || metadata.youtube_url || metadata.youtube, 'https://youtube.com'),
    };
  }, [authUser, persistedProfile]);

  const tabs = [
    { id: 'places', label: 'Saved Places', icon: MapPin },
    { id: 'map', label: 'Food Map', icon: Pin },
    { id: 'recipes', label: 'Recipes', icon: ChefHat },
    { id: 'videos', label: 'Videos', icon: PlayCircle },
    { id: 'instagram', label: 'Instagram', icon: Instagram },
    { id: 'crew', label: 'Crew', icon: User },
    { id: 'posts', label: 'Posts', icon: LayoutGrid },
  ];

  const filteredItems = useMemo(() => {
    if (activeTab === 'places') return savedItems.filter(i => !hasIdPrefix(i, 'recipe-') && !hasIdPrefix(i, 'video-') && !hasIdPrefix(i, 'post-'));
    if (activeTab === 'recipes') return savedItems.filter(i => hasIdPrefix(i, 'recipe-'));
    if (activeTab === 'videos') return savedItems.filter(i => hasIdPrefix(i, 'video-'));
    if (activeTab === 'posts') return savedItems.filter(i => hasIdPrefix(i, 'post-'));
    return [];
  }, [savedItems, activeTab, hasIdPrefix]);

  const activeCount = activeTab === 'crew' ? friends.length : filteredItems.length;

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in pb-20">
      {/* Header Cluster */}
      <div className="relative h-64 bg-stone-900 rounded-[4rem] overflow-hidden shadow-2xl">
        <img src={profileDisplay.cover} alt="Profile cover" className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
        <div className="absolute -bottom-2 right-12 flex flex-col items-center">
          <Avatar 
            src={profileDisplay.avatar} 
            name={profileDisplay.name} 
            size="lg" 
            className="w-28 h-28 border-8 border-white bg-white shadow-2xl rounded-[2.5rem]"
          />
          {userRank !== null && (
            <div 
              onClick={() => setShowLeaderboard(true)}
              className="absolute -bottom-4 bg-yellow-400 text-stone-900 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg border-2 border-white cursor-pointer hover:scale-105 active:scale-95 transition-all"
            >
              #{userRank} Global
            </div>
          )}
        </div>
      </div>

      <div className="px-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-4">
            <h2 className="text-5xl font-black uppercase tracking-tighter">{profileDisplay.name}</h2>
            <div className="flex items-center gap-3">
              <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">@{profileDisplay.username}</p>
              <Badge color={PROFILE_TYPE_BADGES[(authUser?.user_metadata?.profile_type as PrimaryProfileType) || 'Individual']?.color || 'blue'}>

                {((authUser?.user_metadata?.profile_type as string) || 'Individual').toUpperCase()}
              </Badge>
              {(authUser?.user_metadata?.profile_subtype || authUser?.user_metadata?.chef_subtype) && (
                <Badge color="yellow">{(authUser.user_metadata.profile_subtype as string || authUser.user_metadata.chef_subtype as string).toUpperCase()}</Badge>
              )}
            </div>

          </div>
        </div>
        <p className="text-stone-500 font-bold max-w-md">{profileDisplay.bio}</p>
        <div className="grid grid-cols-3 gap-4 pt-4">
          <button 
            onClick={() => setShowLeaderboard(true)}
            className="p-6 bg-stone-900 text-white rounded-[2rem] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all group flex flex-col items-center justify-center gap-2"
          >
            <p className="text-3xl font-black italic tracking-tighter text-yellow-400">
              #{userRank ?? '—'}
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 group-hover:text-white transition-colors">Global Rank</p>
          </button>

          <div className="p-6 bg-white border border-stone-100 rounded-[2rem] flex flex-col items-center justify-center gap-2">
            <p className="text-2xl font-black text-stone-900">{userLevel ?? '1'}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Current Level</p>
          </div>

          <div className="p-6 bg-white border border-stone-100 rounded-[2rem] flex flex-col items-center justify-center gap-2">
            <p className="text-2xl font-black text-stone-900">{savedItems.length}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Total Saves</p>
          </div>
        </div>

        {/* Social Links Sub-Row */}
        <div className="flex items-center gap-2 pt-2">
          {socialLinks.instagram && !socialLinks.instagram.endsWith('instagram.com') && (
            <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all active:scale-90" aria-label="Instagram profile">
              <InstagramMark size={18} />
            </a>
          )}
          {socialLinks.facebook && !socialLinks.facebook.endsWith('facebook.com') && (
            <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all active:scale-90" aria-label="Facebook profile">
              <FacebookMark size={18} />
            </a>
          )}
          {socialLinks.tiktok && !socialLinks.tiktok.endsWith('tiktok.com') && (
            <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all active:scale-90" aria-label="TikTok profile">
              <Music2 size={18} />
            </a>
          )}
          {socialLinks.pinterest && !socialLinks.pinterest.endsWith('pinterest.com') && (
            <a href={socialLinks.pinterest} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all active:scale-90" aria-label="Pinterest profile">
              <Pin size={18} />
            </a>
          )}
          {socialLinks.youtube && !socialLinks.youtube.endsWith('youtube.com') && (
            <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all active:scale-90" aria-label="YouTube profile">
              <Youtube size={18} />
            </a>
          )}
        </div>
      </div>

      {/* SECTION: Tabbed Discovery */}
      <div className="px-8">
        <div className="flex bg-stone-100 p-2 rounded-[2.5rem] gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center py-5 rounded-[2rem] transition-all ${activeTab === t.id ? 'bg-white shadow-md text-stone-900' : 'text-stone-300 hover:text-stone-600'}`}
            >
              <t.icon size={22} strokeWidth={activeTab === t.id ? 3 : 2} />
            </button>
          ))}
        </div>
      </div>
      
      <div className="px-8 space-y-6">
        <div className="flex justify-between items-center">
          <h4 className="font-black uppercase text-xs tracking-widest text-stone-900">
            {tabs.find(t => t.id === activeTab)?.label}
          </h4>
          <Badge color="yellow">{activeCount} Items</Badge>
        </div>

        {activeTab === 'map' ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <MiniMapWidget savedItems={savedItems} />
            <div className="p-8 bg-stone-50 rounded-[3rem] border border-stone-100 italic text-stone-400 text-[12px] font-bold text-center uppercase tracking-widest leading-relaxed">
              Your personal food territory. <br/> Heatmap reflects density of your culinary explorations.
            </div>
          </div>
        ) : activeTab === 'crew' ? (
          <div className="space-y-4">
            {friends.length === 0 ? (
              <div className="p-12 bg-stone-100 rounded-[3rem] text-center text-stone-300 font-black uppercase text-[12px] tracking-widest">
                No crew connections yet
              </div>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={friend.avatar} alt={friend.name || 'Crew member'} className="w-14 h-14 rounded-2xl object-cover border-2 border-stone-100" />
                    <div>
                      <p className="font-black uppercase tracking-widest text-xs text-stone-900">{friend.name}</p>
                      <p className="text-[12px] font-bold uppercase tracking-widest text-stone-400">
                        {'time' in friend && friend.time ? `Last active ${friend.time}` : 'Team Member'}
                      </p>
                    </div>
                  </div>
                    <button 
                      onClick={() => onOpenUserProfile?.(String(friend.id))}
                      className="px-4 py-2 rounded-xl bg-stone-900 text-white text-[12px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                    >
                      View
                    </button>

                </div>
              ))
            )}
          </div>
        ) : activeTab === 'instagram' ? (
          <SocialGrid media={instagramMedia} isLoading={isSocialLoading} />
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {filteredItems.length === 0 ? (
              <div className="col-span-2 p-12 bg-stone-100 rounded-[3rem] text-center text-stone-300 font-black uppercase text-[12px] tracking-widest">
                No {activeTab} saved yet
              </div>
            ) : (
              filteredItems.map((item) => (
                <button
                  type="button"
                  key={item.id || `${item.name}-${item.cat}`}
                  onClick={() => setSelectedSavedItem(item)}
                  className="aspect-square bg-stone-100 rounded-[3rem] border-4 border-white shadow-md overflow-hidden relative group text-left active:scale-[0.98] transition-transform"
                >
                  <img src={item.img} alt={item.name || 'Saved item'} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4 text-center">
                    <p className="font-black uppercase text-[12px] tracking-tighter leading-tight mb-2">{item.name}</p>
                    <Badge color="yellow">{item.cat}</Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* SECTION: Overlay Modals */}
      {selectedSavedItem && (
        <SavedItemDetailModal item={selectedSavedItem} onClose={() => setSelectedSavedItem(null)} onSave={onSave} onUnsave={onUnsave} onShareRequest={onShareRequest} savedItems={savedItems} />
      )}

      <LeaderboardModal 
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
        currentUserRank={userRank || 0} 
        leaderboardUsers={[]} // Modal will fetch fresh data
        currentUserId={authUser?.id}
        friends={friends}
        authUser={authUser}
        onOpenUserProfile={onOpenUserProfile}
      />

    </div>
  );
};
