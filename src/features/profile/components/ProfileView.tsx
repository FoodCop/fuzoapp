import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  MapPin, ChefHat, PlayCircle, User, LayoutGrid, Music2, Pin, Youtube 
} from 'lucide-react';
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




export const ProfileView = ({ 
  savedItems, 
  authUser, 
  friends, 
  onSave, 
  onUnsave, 
  onShareRequest, 
  setTab 
}: { 
  savedItems: AppItem[]; 
  authUser: AuthUser | null; 
  friends: ChatInboxItem[]; 
  onSave: (item: AppItem) => void; 
  onUnsave: (item: AppItem) => void; 
  onShareRequest: (item: AppItem) => void; 
  setTab?: (tab: string) => void 
}) => {
  const [activeTab, setActiveTab] = useState('places');
  const [persistedProfile, setPersistedProfile] = useState<SettingsProfile | null>(null);
  const [selectedSavedItem, setSelectedSavedItem] = useState<AppItem | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);


  const hasIdPrefix = useCallback((item: AppItem, prefix: string) => {
    return typeof item.id === 'string' && item.id.startsWith(prefix);
  }, []);

  const profileDisplay = useMemo(() => {
    const metadata = (authUser?.user_metadata || {}) as Record<string, string | undefined>;
    const email = authUser?.email || '';
    const emailName = email.includes('@') ? email.split('@')[0] : 'Chef Studio';
    const persisted = persistedProfile;

    return {
      name: persisted?.name || metadata.full_name || metadata.name || 'Chef Studio',
      username: persisted?.username || metadata.username || metadata.user_name || emailName,
      bio: persisted?.bio || metadata.bio || 'Discovery engine architect. Exploring the world of fine dining and culinary hacks.',
      avatar: metadata.avatar_url || `https://i.pravatar.cc/150?u=${email || 'me'}`,
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
      
      if (rankResult.success && rankResult.data !== undefined) {
        setUserRank(rankResult.data);
      }
    };


    loadPersistedProfile();

    return () => {
      cancelled = true;
    };
  }, [authUser]);

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
      <div className="relative h-64 bg-stone-900 rounded-[4rem] overflow-hidden shadow-2xl">
        <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80" alt="Profile cover" className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
        <div className="absolute -bottom-2 right-12"><div className="w-28 h-28 rounded-[2.5rem] border-8 border-white bg-white shadow-2xl overflow-hidden"><img src={profileDisplay.avatar} alt={`${profileDisplay.name} avatar`} /></div></div>
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
        <div className="flex items-center gap-4 pt-4">
          <div className="text-center group cursor-pointer" onClick={() => setShowLeaderboard(true)}>
            <p className="text-2xl font-black group-hover:text-yellow-500 transition-colors">
              #{userRank ?? '—'}
            </p>
            <p className="text-[12px] font-black uppercase tracking-widest text-stone-400 group-hover:text-stone-900">Rank</p>
          </div>

          <div className="w-px h-10 bg-stone-100" />
          <div className="text-center"><p className="text-2xl font-black">{savedItems.length}</p><p className="text-[12px] font-black uppercase tracking-widest text-stone-400">Saves</p></div>
          <div className="w-px h-10 bg-stone-100" />
          <div className="text-center"><p className="text-2xl font-black">42</p><p className="text-[12px] font-black uppercase tracking-widest text-stone-400">Reviews</p></div>
          <div className="w-px h-10 bg-stone-100" />
          <div className="flex items-center gap-2">
            <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all active:scale-90" aria-label="Instagram profile">
              <InstagramMark size={18} />
            </a>
            <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all active:scale-90" aria-label="Facebook profile">
              <FacebookMark size={18} />
            </a>
            <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all active:scale-90" aria-label="TikTok profile">
              <Music2 size={18} />
            </a>
            <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all active:scale-90" aria-label="YouTube profile">
              <Youtube size={18} />
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
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
                  <button className="px-4 py-2 rounded-xl bg-stone-900 text-white text-[12px] font-black uppercase tracking-widest">View</button>
                </div>
              ))
            )}
          </div>
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
      />
    </div>
  );
};
