import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  MapPin, ChefHat, PlayCircle, User, LayoutGrid, Music2, Pin, Youtube, ChevronLeft, Loader2 
} from 'lucide-react';
import type { AppItem } from '../../../shared/types/appItem';
import type { AuthUser } from '../../auth/types/auth';
import type { ChatFriend, ChatInboxItem } from '../../chat/types/chatUi';
import { Badge } from '../../../shared/ui/Badge';
import { InstagramMark, FacebookMark } from '../../../shared/ui/SocialIcons';
import { normalizeExternalUrl } from '../../../shared/lib/urlHelpers';
import { SettingsService } from '../../settings/services/settingsService';
import { PlateService } from '../../../services/plateService';
import { FriendRequestService, type FriendRequestRelationship } from '../../../services/friendRequestService';
import type { PublicUserProfile } from '../../settings/types/settings';
import { normalizeSavedItemForUI } from '../../plate/lib/savedItems';
import { hasSupabaseConfig } from '../../../services/supabaseClient';
import { SavedItemDetailModal } from './SavedItemDetailModal';
import { MiniMapWidget } from './MiniMapWidget';
import { LeaderboardModal } from './LeaderboardModal';
import { PROFILE_TYPE_BADGES } from '../types/profile';
import type { PrimaryProfileType, ChefSubtype } from '../types/profile';

export const PublicProfileView = ({ 
  targetUserId, 
  authUser, 
  currentUserSavedItems, 
  friends, 
  onBackToOwnProfile, 
  onSave, 
  onUnsave, 
  onShareRequest, 
  setTab 
}: { 
  targetUserId: string; 
  authUser: AuthUser | null; 
  currentUserSavedItems: AppItem[]; 
  friends: ChatInboxItem[]; 
  onBackToOwnProfile: () => void; 
  onSave: (item: AppItem) => void; 
  onUnsave: (item: AppItem) => void; 
  onShareRequest: (item: AppItem) => void; 
  setTab?: (tab: string) => void 
}) => {
  const [activeTab, setActiveTab] = useState('places');
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [savedItems, setSavedItems] = useState<AppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSavedItem, setSelectedSavedItem] = useState<AppItem | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [relationship, setRelationship] = useState<FriendRequestRelationship>({ state: 'none', request: null });
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  const [relationshipUpdating, setRelationshipUpdating] = useState(false);
  const [relationshipError, setRelationshipError] = useState('');

  const hasIdPrefix = useCallback((item: AppItem, prefix: string) => {
    return typeof item.id === 'string' && item.id.startsWith(prefix);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setIsLoading(true);

      if (!targetUserId) {
        setProfile(null);
        setSavedItems([]);
        setIsLoading(false);
        return;
      }

      const profileResult = await SettingsService.getPublicUserProfile(targetUserId);
      if (cancelled) return;

      if (!profileResult.success || !profileResult.data) {
        setProfile(null);
        setSavedItems([]);
        setIsLoading(false);
        return;
      }

      setProfile(profileResult.data);

      const savedResult = await PlateService.listSavedItemsByUserId(targetUserId);
      if (cancelled) return;

      if (!savedResult.success || !savedResult.data) {
        setSavedItems([]);
      } else {
        setSavedItems(savedResult.data.map(normalizeSavedItemForUI));
      }

      setIsLoading(false);
    };

    loadProfile().catch((error) => {
      if (!cancelled) {
        console.warn('Failed to load public profile:', error);
        setProfile(null);
        setSavedItems([]);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  useEffect(() => {
    let cancelled = false;

    const loadRelationship = async () => {
      if (!authUser?.id || !targetUserId || authUser.id === targetUserId || !hasSupabaseConfig) {
        setRelationship({ state: 'none', request: null });
        setRelationshipLoading(false);
        setRelationshipError('');
        return;
      }

      setRelationshipLoading(true);
      setRelationshipError('');

      const result = await FriendRequestService.getRelationship(authUser.id, targetUserId);
      if (cancelled) {
        return;
      }

      if (!result.success || !result.data) {
        setRelationship({ state: 'none', request: null });
        setRelationshipError(result.error || 'Could not load follow status.');
        setRelationshipLoading(false);
        return;
      }

      setRelationship(result.data);
      setRelationshipLoading(false);
    };

    loadRelationship().catch((error) => {
      if (!cancelled) {
        console.warn('Failed to load profile relationship:', error);
        setRelationship({ state: 'none', request: null });
        setRelationshipError('Could not load follow status.');
        setRelationshipLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authUser?.id, targetUserId]);

  const profileDisplay = useMemo(() => {
    if (profile) {
      return {
        name: profile.name,
        username: profile.username,
        bio: profile.bio,
        avatar: profile.avatarUrl,
        location: profile.location,
        pointsTotal: profile.pointsTotal,
        pointsLevel: profile.pointsLevel,
      };
    }

    const isSelfFallback = authUser?.id === targetUserId;
    const metadata = (authUser?.user_metadata || {}) as Record<string, string | undefined>;
    const email = authUser?.email || '';
    const emailName = email.includes('@') ? email.split('@')[0] : 'Chef Studio';
    const name = metadata.full_name || metadata.name || (isSelfFallback ? 'Your Profile' : 'Chef Studio');

    return {
      name,
      username: metadata.username || metadata.user_name || emailName,
      bio: isSelfFallback ? 'This profile is currently unavailable. Try again in a moment.' : 'This profile is currently limited.',
      avatar: metadata.avatar_url || `https://i.pravatar.cc/150?u=${targetUserId || 'limited-profile'}`,
      location: 'Location hidden',
      pointsTotal: 0,
      pointsLevel: 1,
    };
  }, [authUser, profile, targetUserId]);

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
  }, [activeTab, hasIdPrefix, savedItems]);

  const activeCount = activeTab === 'crew' ? friends.length : filteredItems.length;
  const socialLinks = {
    instagram: normalizeExternalUrl(profile?.instagram, 'https://instagram.com'),
    facebook: normalizeExternalUrl(profile?.facebook, 'https://facebook.com'),
    tiktok: normalizeExternalUrl(profile?.tiktok, 'https://tiktok.com'),
    pinterest: normalizeExternalUrl(profile?.pinterest, 'https://pinterest.com'),
    youtube: normalizeExternalUrl(profile?.youtube, 'https://youtube.com'),
  };

  const showLimitedShell = !isLoading && !profile;
  const visibleSavedItems = showLimitedShell ? [] : savedItems;
  const canReturnToOwnProfile = Boolean(authUser?.id) && authUser?.id !== targetUserId;
  const canFollowProfile = Boolean(authUser?.id) && authUser?.id !== targetUserId;
  const relationshipHelperText = relationship.state === 'incoming-pending'
    ? 'This user requested to connect with you.'
    : relationship.state === 'outgoing-pending'
      ? 'Request sent. Tap again to cancel.'
      : relationship.state === 'accepted'
        ? 'You are connected with this profile.'
        : 'Follow this profile to stay connected.';

  const handleRelationshipAction = useCallback(async () => {
    if (!authUser?.id || !targetUserId || relationshipLoading || relationshipUpdating) {
      return;
    }

    setRelationshipUpdating(true);
    setRelationshipError('');

    let nextRelationship: FriendRequestRelationship = relationship;

    if (relationship.state === 'incoming-pending' && relationship.request?.id) {
      const result = await FriendRequestService.acceptRequest(relationship.request.id);
      if (!result.success || !result.data) {
        setRelationshipError(result.error || 'Could not accept request.');
        setRelationshipUpdating(false);
        return;
      }

      nextRelationship = { state: 'accepted', request: result.data };
    } else if (relationship.state === 'outgoing-pending' && relationship.request?.id) {
      const result = await FriendRequestService.cancelRequest(relationship.request.id);
      if (!result.success) {
        setRelationshipError(result.error || 'Could not cancel request.');
        setRelationshipUpdating(false);
        return;
      }

      nextRelationship = { state: 'none', request: null };
    } else if (relationship.state === 'none') {
      const result = await FriendRequestService.sendRequest(authUser.id, targetUserId);
      if (!result.success || !result.data) {
        setRelationshipError(result.error || 'Could not send request.');
        setRelationshipUpdating(false);
        return;
      }

      nextRelationship = { state: 'outgoing-pending', request: result.data };
    }

    setRelationship(nextRelationship);
    setRelationshipUpdating(false);
  }, [authUser?.id, relationship, relationshipLoading, relationshipUpdating, targetUserId]);

  const followButtonLabel = relationshipLoading
    ? 'Loading...'
    : relationshipUpdating
      ? 'Working...'
      : relationship.state === 'incoming-pending'
        ? 'Accept Request'
        : relationship.state === 'outgoing-pending'
          ? 'Requested'
          : relationship.state === 'accepted'
            ? 'Following'
            : 'Follow';

  const followButtonClassName = relationship.state === 'incoming-pending'
    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
    : relationship.state === 'outgoing-pending'
      ? 'bg-stone-100 text-stone-900 hover:bg-stone-200'
      : relationship.state === 'accepted'
        ? 'bg-stone-900 text-white'
        : 'bg-yellow-400 text-stone-900 hover:bg-yellow-300';

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
              <Badge color={PROFILE_TYPE_BADGES[(profile?.profile_type as PrimaryProfileType) || 'Individual'].color}>
                {(profile?.profile_type || 'Individual').toUpperCase()}
              </Badge>
              {profile?.profile_type === 'Chef' && (
                <Badge color="yellow">Chef de Cuisine</Badge>
              )}
            </div>
          </div>
        </div>
        <p className="text-stone-500 font-bold max-w-md">{profileDisplay.bio}</p>
        <div className="flex items-center gap-4 pt-4">
          <div className="text-center group cursor-pointer" onClick={() => setShowLeaderboard(true)}>
            <p className="text-2xl font-black group-hover:text-yellow-500 transition-colors">#{profileDisplay.pointsLevel > 1 ? '5' : '15'}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 group-hover:text-stone-900">Rank</p>
          </div>
          <div className="w-px h-10 bg-stone-100" />
          <div className="text-center"><p className="text-2xl font-black">{savedItems.length}</p><p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Saves</p></div>
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
            <a href={socialLinks.pinterest} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all active:scale-90" aria-label="Pinterest profile">
              <Pin size={18} />
            </a>
            <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all active:scale-90" aria-label="YouTube channel">
              <Youtube size={18} />
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4">
          {canReturnToOwnProfile && (
            <button
              type="button"
              onClick={onBackToOwnProfile}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-900 text-white text-[10px] font-black uppercase tracking-widest"
            >
              <ChevronLeft size={14} />
              Back To My Profile
            </button>
          )}
          {canFollowProfile && (
            <button
              type="button"
              onClick={() => {
                handleRelationshipAction().catch((error) => {
                  console.warn('Failed to update profile relationship:', error);
                  setRelationshipError('Could not update follow state.');
                  setRelationshipUpdating(false);
                });
              }}
              disabled={relationshipLoading || relationshipUpdating || relationship.state === 'accepted'}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors disabled:cursor-default disabled:opacity-70 ${followButtonClassName}`}
            >
              {relationshipUpdating && <Loader2 size={14} className="animate-spin" />}
              {followButtonLabel}
            </button>
          )}
        </div>

        {canFollowProfile && (
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{relationshipHelperText}</p>
            {relationshipError && <p className="text-[10px] font-black uppercase tracking-widest text-red-500">{relationshipError}</p>}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="px-8">
          <div className="p-12 bg-stone-100 rounded-[3rem] text-center text-stone-500 font-black uppercase text-[10px] tracking-widest">
            Loading profile...
          </div>
        </div>
      )}

      {showLimitedShell && (
        <div className="px-8">
          <div className="p-12 bg-stone-100 rounded-[3rem] text-center text-stone-500 font-black uppercase text-[10px] tracking-widest">
            Limited profile view
          </div>
        </div>
      )}

      {!isLoading && (
        <>
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
                <div className="p-8 bg-stone-50 rounded-[3rem] border border-stone-100 italic text-stone-400 text-[10px] font-bold text-center uppercase tracking-widest leading-relaxed">
                  Food territory of {profileDisplay.name}. <br/> Heatmap reflects density of their culinary explorations.
                </div>
              </div>
            ) : activeTab === 'crew' ? (
              <div className="p-12 bg-stone-100 rounded-[3rem] text-center text-stone-300 font-black uppercase text-[10px] tracking-widest">
                Crew list is private
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {filteredItems.length === 0 ? (
                  <div className="col-span-2 p-12 bg-stone-100 rounded-[3rem] text-center text-stone-300 font-black uppercase text-[10px] tracking-widest">
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
                        <p className="font-black uppercase text-[10px] tracking-tighter leading-tight mb-2">{item.name}</p>
                        <Badge color="yellow">{item.cat}</Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {selectedSavedItem && (
        <SavedItemDetailModal item={selectedSavedItem} onClose={() => setSelectedSavedItem(null)} onSave={onSave} onUnsave={onUnsave} onShareRequest={onShareRequest} savedItems={currentUserSavedItems} />
      )}

      <LeaderboardModal 
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
        currentUserRank={profileDisplay.pointsLevel > 1 ? 5 : 15} 
        leaderboardUsers={[]} // Modal will fetch fresh data
        currentUserId={targetUserId}
        friends={friends}
        authUser={authUser}
      />
    </div>
  );
};
