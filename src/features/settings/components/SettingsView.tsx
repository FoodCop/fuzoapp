/**
 * ============================================================================
 * SETTINGS MODULE — Account & Privacy Orchestrator
 * ============================================================================
 * 
 * Component Architecture:
 * 1. Default Logic: Merges Auth metadata with application defaults.
 * 2. Settings Service: Bidirectional sync with the 'user_settings' table.
 * 3. Media Cluster: Handles async uploads for Avatars and Cover photos.
 * 4. Security Logic: Wraps Supabase Auth for password/reset flows.
 * 5. Preference Engine: Specialized UI for cuisine/dietary configurations.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Bot, MapPin, Mail, Shield, AlertCircle, Phone, 
  Music2, Pin, Youtube, ChefHat, Flame, Bell, LogOut, Camera,
  RefreshCw, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AuthUser } from '../../auth/types/auth';
import type { SettingsProfile } from '../types/settings';
import { SettingsService } from '../services/settingsService';
import { AuthService } from '../../auth/services/authService';
import { supabase } from '../../../services/supabaseClient';
import { getOAuthRedirectUrl } from '../../auth/lib/oauthRedirect';
import { SettingsItem, SettingsSection } from '../../../shared/ui/settingsPrimitives';
import { InstagramMark, FacebookMark } from '../../../shared/ui/SocialIcons';
import { PrimaryProfileType, ChefSubtype, IndividualSubtype } from '../../profile/types/profile';
import { ProfileTypeModal } from './ProfileTypeModal';
import { Avatar } from '../../../shared/ui/Avatar';

/**
 * COMPONENT: SettingsView
 * Interface for managing account identity, security, and discovery preferences.
 */
export const SettingsView = ({ 
  onSignOut, 
  authUser 
}: { 
  onSignOut: () => Promise<void>; 
  authUser: AuthUser | null 
}) => {
  // SECTION: Default State Construction
  const defaults = useMemo<SettingsProfile>(() => {
    const metadata = (authUser?.user_metadata || {}) as Record<string, string | undefined>;
    const email = authUser?.email || '';
    const emailName = email.includes('@') ? email.split('@')[0] : 'chef_studio_lab';

    return {
      name: metadata.full_name || metadata.name || 'Chef Studio',
      username: metadata.username || metadata.user_name || emailName,
      bio: metadata.bio || 'Discovery engine architect. Exploring the world of fine dining and culinary hacks.',
      email: email || 'chef@fuzo.studio',
      phone: metadata.phone || '+1 (555) 0123-4567',
      location: metadata.location || 'Toronto, ON',
      diet: 'None',
      cuisine: 'Italian, Japanese',
      instagram: metadata.instagram_url || metadata.instagram || metadata.ig || '',
      facebook: metadata.facebook_url || metadata.facebook || metadata.fb || '',
      tiktok: metadata.tiktok_url || metadata.tiktok || '',
      pinterest: metadata.pinterest_url || metadata.pinterest || '',
      youtube: metadata.youtube_url || metadata.youtube || '',
      profileType: (metadata.profile_type as string) || 'Individual',
      profileSubtype: (metadata.profile_subtype as string) || (metadata.chef_subtype as string) || 'Food Explorer',
      avatarUrl: metadata.avatar_url || '',
      coverUrl: metadata.cover_photo_url || '',
    };
  }, [authUser]);


  const [profile, setProfile] = useState<SettingsProfile>(defaults);
  const [notifications, setNotifications] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [syncingYoutube, setSyncingYoutube] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(!!profile.youtube);
  const [detectedChannelTitle, setDetectedChannelTitle] = useState('');
  const [showYoutubeSyncModal, setShowYoutubeSyncModal] = useState(false);

  const [syncingMeta, setSyncingMeta] = useState(false);
  const [metaConnected, setMetaConnected] = useState(!!profile.facebook || !!profile.instagram);
  const [detectedMetaTitle, setDetectedMetaTitle] = useState('');
  const [showMetaSyncModal, setShowMetaSyncModal] = useState(false);

  const [hasAutodetected, setHasAutodetected] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    field: 'profileType' | 'profileSubtype';
    title: string;
    options: string[];
  }>({
    isOpen: false,
    field: 'profileType',
    title: '',
    options: []
  });


  // SECTION: Initial Sync
  // Removed redundant useEffect that was resetting isDirty on defaults change
  // to prevent it from overriding autodetection updates.

  // SECTION: Persistence logic
  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      if (!authUser?.id) {
        setProfile(defaults);
        return;
      }

      setLoadingSettings(true);
      setSettingsError('');

      const result = await SettingsService.getUserSettings(authUser);
      if (cancelled) return;

      if (!result.success || !result.data) {
        setProfile(defaults);
        setSettingsError(result.error || 'Unable to load saved settings.');
      } else {
        setProfile({
          ...defaults,
          ...result.data,
          email: defaults.email,
        });

        // Sync local flags
        if (result.data.youtube) {
          setYoutubeConnected(true);
        }
        if (result.data.facebook || result.data.instagram) {
          setMetaConnected(true);
        }
      }

      setIsDirty(false);
      setLoadingSettings(false);
      
      // Log for debugging
      console.log('Settings loaded successfully for:', authUser.id);
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [authUser, defaults]);

  
  // SECTION: Meta Sync Completion
  useEffect(() => {
    let pendingMetaSync = false;
    try {
      pendingMetaSync = globalThis.sessionStorage.getItem('fuzo_meta_sync_pending') === 'true';
    } catch (e) {
      // Ignore
    }

    if (pendingMetaSync && !loadingSettings && authUser?.id) {
      try {
        globalThis.sessionStorage.removeItem('fuzo_meta_sync_pending');
      } catch (e) {}
      
      setShowMetaSyncModal(true);
      completeMetaSync();
    }
  }, [loadingSettings, authUser?.id]);

  const handleSyncMeta = async () => {
    try {
      globalThis.sessionStorage.setItem('fuzo_meta_sync_pending', 'true');
      await AuthService.signInForMetaSync();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to initiate Meta sync.');
    }
  };

  const completeMetaSync = async () => {
    if (syncingMeta) return;

    setSyncingMeta(true);
    setMetaConnected(false);
    setSettingsError('');
    setSettingsMessage('Syncing with Meta...');

    const result = await SettingsService.syncMetaWithFacebook();

    if (result.success && result.data) {
      if (result.data.facebook) updateProfileField('facebook', result.data.facebook);
      if (result.data.instagram) updateProfileField('instagram', result.data.instagram);
      setDetectedMetaTitle(result.data.title);
      setMetaConnected(true);
      setSettingsMessage(`Connected to ${result.data.title || 'Meta account'}!`);
    } else {
      setSettingsError(result.error || 'Failed to sync Meta account.');
      setSettingsMessage('');
    }

    setSyncingMeta(false);
  };

  // SECTION: YouTube Sync Completion
  useEffect(() => {
    let pendingSync = false;
    try {
      pendingSync = globalThis.sessionStorage.getItem('fuzo_youtube_sync_pending') === 'true';
    } catch (e) {
      // Ignore
    }

    if (pendingSync && !loadingSettings && authUser?.id) {
      try {
        globalThis.sessionStorage.removeItem('fuzo_youtube_sync_pending');
      } catch (e) {}
      
      setShowYoutubeSyncModal(true);
      completeYoutubeSync();
    }
  }, [loadingSettings, authUser?.id]);

  const handleSignOutClick = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await onSignOut();
    setSigningOut(false);
  };

  const updateProfileField = (field: keyof SettingsProfile, nextValue: string) => {
    setProfile(prev => ({ ...prev, [field]: nextValue }));
    setIsDirty(true);
    setSettingsMessage('');
  };

  const editField = (field: keyof SettingsProfile, label: string, options?: { readOnly?: boolean }) => {
    if (options?.readOnly) {
      setSettingsMessage(`${label} is managed by your account and cannot be edited here.`);
      return;
    }

    const currentValue = profile[field] || '';
    const nextValue = globalThis.prompt(`Update ${label}`, currentValue);
    if (nextValue === null) return;
    updateProfileField(field, nextValue.trim());
  };

  const openSelectionModal = (field: 'profileType' | 'profileSubtype', label: string, options: string[]) => {
    setModalState({
      isOpen: true,
      field,
      title: label,
      options
    });
  };

  const primaryTypes: PrimaryProfileType[] = ['Individual', 'Chef', 'Restaurant', 'Culinary Team', 'Private Chef'];
  const chefSubtypes: ChefSubtype[] = ['Executive Chef', 'Sous Chef', 'Pastry Chef', 'Private Chef', 'Chef de Cuisine', 'Consultant Chef'];
  const individualSubtypes: IndividualSubtype[] = ['Food Explorer', 'Culinary Enthusiast', 'Taste Maker', 'Home Cook', 'Dine-Out Pro'];


  const handleSaveSettings = async () => {
    if (!authUser?.id || !isDirty || savingSettings) return;

    setSavingSettings(true);
    setSettingsError('');
    setSettingsMessage('Synchronizing profile...');

    try {
      const result = await SettingsService.updateUserSettings(authUser, profile);

      if (!result.success || !result.data) {
        setSettingsError(result.error || 'Unable to save settings right now.');
        setSavingSettings(false);
        return;
      }

      setProfile(prev => ({
        ...prev,
        ...result.data,
        email: prev.email,
      }));
      setIsDirty(false);
      setSavingSettings(false);
      setSettingsMessage('Success! Your profile is up to date.');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSettingsMessage(''), 3000);
    } catch (err) {
      console.error('Settings save fatal error:', err);
      setSettingsError('A connection error occurred. Please try again.');
      setSavingSettings(false);
    }
  };

  // SECTION: Security Flows

  const handleChangePassword = async () => {
    if (!supabase || updatingPassword) {
      return;
    }

    const nextPassword = globalThis.prompt('Enter a new password (minimum 8 characters)');
    if (nextPassword === null) return;

    const trimmedPassword = nextPassword.trim();
    if (trimmedPassword.length < 8) {
      setSettingsError('Password must be at least 8 characters.');
      setSettingsMessage('');
      return;
    }

    const confirmPassword = globalThis.prompt('Confirm your new password');
    if (confirmPassword === null) return;

    if (trimmedPassword !== confirmPassword.trim()) {
      setSettingsError('Password confirmation does not match.');
      setSettingsMessage('');
      return;
    }

    setUpdatingPassword(true);
    setSettingsError('');
    setSettingsMessage('');

    const { error } = await supabase.auth.updateUser({ password: trimmedPassword });
    if (error) {
      setSettingsError(error.message);
    } else {
      setSettingsMessage('Password updated successfully.');
    }

    setUpdatingPassword(false);
  };

  const handleSendPasswordReset = async () => {
    if (!supabase || sendingResetEmail) {
      return;
    }

    if (!profile.email) {
      setSettingsError('No account email is available for password reset.');
      setSettingsMessage('');
      return;
    }

    setSendingResetEmail(true);
    setSettingsError('');
    setSettingsMessage('');

    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: getOAuthRedirectUrl(),
    });

    if (error) {
      setSettingsError(error.message);
    } else {
      setSettingsMessage('Password reset email sent. Check your inbox.');
    }

    setSendingResetEmail(false);
  };

  const handleSyncYoutube = async () => {
    try {
      globalThis.sessionStorage.setItem('fuzo_youtube_sync_pending', 'true');
      await AuthService.signInForYouTubeSync();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to initiate YouTube sync.');
    }
  };

  const completeYoutubeSync = async () => {
    if (syncingYoutube) return;

    setSyncingYoutube(true);
    setYoutubeConnected(false);
    setSettingsError('');
    setSettingsMessage('Syncing with Google...');

    const result = await SettingsService.syncYouTubeWithGoogle();

    if (result.success && result.data) {
      updateProfileField('youtube', result.data.youtube);
      setDetectedChannelTitle(result.data.title);
      setYoutubeConnected(true);
      setSettingsMessage(`Connected to ${result.data.title || 'YouTube'}!`);
    } else {
      setSettingsError(result.error || 'Failed to sync YouTube channel.');
      setSettingsMessage('');
    }

    setSyncingYoutube(false);
  };

  // SECTION: Media Orchestration

  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;

    setSavingSettings(true);
    setSettingsMessage(`Uploading ${type}...`);

    const result = await SettingsService.uploadUserMedia(file, type);
    if (result.success && result.data) {
      const field = type === 'avatar' ? 'avatarUrl' : 'coverUrl';
      updateProfileField(field, result.data);
      setSettingsMessage(`${type === 'avatar' ? 'Avatar' : 'Cover image'} uploaded. Save settings to persist.`);
    } else {
      setSettingsError(result.error || `Failed to upload ${type}.`);
    }
    setSavingSettings(false);
  };


  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in pb-32 px-4">
      <header className="flex flex-col items-center text-center space-y-6 py-8">
        <input 
          type="file" 
          ref={avatarInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleMediaUpload(e, 'avatar')} 
        />
        <input 
          type="file" 
          ref={coverInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleMediaUpload(e, 'cover')} 
        />
        
        <div className="relative group">
          <Avatar 
            src={profile.avatarUrl} 
            name={profile.name} 
            size="xl" 
            className="border-8 border-white bg-white shadow-2xl"
          />
          <button 
            onClick={() => avatarInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-3 bg-stone-900 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform"
          >
            <Camera size={16} />
          </button>
        </div>

        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{profile.name}</h2>
          <p className="text-stone-400 font-bold mt-2">@{profile.username}</p>
        </div>
        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            onClick={handleSaveSettings}
            disabled={!authUser?.id || !isDirty || savingSettings || loadingSettings}
            className="px-8 py-3 bg-stone-900 text-white rounded-2xl font-black uppercase tracking-widest text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
          {loadingSettings && <p className="text-[12px] font-black uppercase tracking-widest text-stone-500">Loading saved settings...</p>}
          {settingsError && <p className="text-[12px] font-black uppercase tracking-widest text-red-500">{settingsError}</p>}
          {settingsMessage && !settingsError && <p className="text-[12px] font-black uppercase tracking-widest text-emerald-600">{settingsMessage}</p>}
        </div>
      </header>

      <SettingsSection title="Profile Identity">
        <SettingsItem
          icon={ChefHat} 
          label="Profile Type" 
          value={profile.profileType} 
          onClick={() => openSelectionModal('profileType', 'Account Type', primaryTypes)} 
          color="indigo"
        />
        {(profile.profileType === 'Chef' || profile.profileType === 'Private Chef') && (
          <SettingsItem
            icon={Flame} 
            label="Chef Specialization" 
            value={profile.profileSubtype} 
            onClick={() => openSelectionModal('profileSubtype', 'Specialization', chefSubtypes)} 
            color="orange"
          />
        )}
        {profile.profileType === 'Individual' && (
          <SettingsItem
            icon={Bot} 
            label="Explorer Category" 
            value={profile.profileSubtype} 
            onClick={() => openSelectionModal('profileSubtype', 'Category', individualSubtypes)} 
            color="blue"
          />
        )}

      </SettingsSection>


      <SettingsSection title="Personal Profile">
        <SettingsItem
          icon={User} 
          label="Display Name" 
          value={profile.name} 
          onClick={() => editField('name', 'Display Name')} 
        />
        <SettingsItem
          icon={Bot} 
          label="Bio" 
          value={profile.bio} 
          onClick={() => editField('bio', 'Bio')} 
        />
        <SettingsItem
          icon={MapPin} 
          label="Location" 
          value={profile.location} 
          onClick={() => editField('location', 'Location')} 
        />
        <SettingsItem
          icon={Camera} 
          label="Cover Photo" 
          value={profile.coverUrl ? 'Change Image' : 'Add Cover Image'} 
          onClick={() => coverInputRef.current?.click()} 
          color="indigo"
        />
      </SettingsSection>


      <SettingsSection title="Account Settings">
        <SettingsItem
          icon={Mail} 
          label="Email Address" 
          value={profile.email} 
          onClick={() => editField('email', 'Email Address', { readOnly: true })} 
        />
        <SettingsItem
          icon={Shield}
          label="Password"
          value={updatingPassword ? 'Updating...' : 'Change Password'}
          onClick={() => {
            handleChangePassword().catch((error) => {
              console.warn('Password update failed:', error);
              setSettingsError('Unable to update password right now.');
            });
          }}
          color="indigo"
        />
        <SettingsItem
          icon={AlertCircle}
          label="Password Reset"
          value={sendingResetEmail ? 'Sending reset email...' : 'Send reset email'}
          onClick={() => {
            handleSendPasswordReset().catch((error) => {
              console.warn('Password reset email failed:', error);
              setSettingsError('Unable to send password reset email right now.');
            });
          }}
          color="blue"
        />
        <SettingsItem
          icon={Phone} 
          label="Phone Number" 
          value={profile.phone} 
          onClick={() => editField('phone', 'Phone Number')} 
        />
      </SettingsSection>

      <SettingsSection title="Social Links">
        <SettingsItem
          icon={InstagramMark}
          label="Instagram"
          value={profile.instagram || 'Not set'}
          onClick={() => setShowMetaSyncModal(true)}
          action={
            <div className="flex items-center gap-3">
              {metaConnected && profile.instagram && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                  <CheckCircle2 size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMetaSyncModal(true);
                }}
                className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-stone-900 hover:text-white transition-all"
              >
                {metaConnected && profile.instagram ? 'Resync' : 'Sync'}
              </button>
            </div>
          }
        />
        <SettingsItem
          icon={FacebookMark}
          label="Facebook"
          value={profile.facebook || 'Not set'}
          onClick={() => setShowMetaSyncModal(true)}
          action={
            <div className="flex items-center gap-3">
              {metaConnected && profile.facebook && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                  <CheckCircle2 size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMetaSyncModal(true);
                }}
                className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-stone-900 hover:text-white transition-all"
              >
                {metaConnected && profile.facebook ? 'Resync' : 'Sync'}
              </button>
            </div>
          }
        />
        <SettingsItem
          icon={Music2}
          label="TikTok"
          value={profile.tiktok || 'Not set'}
          onClick={() => editField('tiktok', 'TikTok')}
        />
        <SettingsItem
          icon={Pin}
          label="Pinterest"
          value={profile.pinterest || 'Not set'}
          onClick={() => editField('pinterest', 'Pinterest')}
        />
        <SettingsItem
          icon={Youtube}
          label="YouTube"
          value={profile.youtube || 'Not set'}
          onClick={() => setShowYoutubeSyncModal(true)}
          action={
            <div className="flex items-center gap-3">
              {youtubeConnected && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                  <CheckCircle2 size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowYoutubeSyncModal(true);
                }}
                className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-stone-900 hover:text-white transition-all"
              >
                {youtubeConnected ? 'Resync' : 'Sync'}
              </button>
            </div>
          }
        />
      </SettingsSection>

      <SettingsSection title="Discovery Preferences">
        <SettingsItem
          icon={ChefHat} 
          label="Dietary Focus" 
          value={profile.diet} 
          onClick={() => editField('diet', 'Dietary Focus')} 
          color="emerald"
        />
        <SettingsItem
          icon={Flame} 
          label="Favorite Cuisines" 
          value={profile.cuisine} 
          onClick={() => editField('cuisine', 'Favorite Cuisines')} 
          color="orange"
        />
      </SettingsSection>

      <SettingsSection title="App Settings">
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-blue-100 rounded-2xl text-blue-900">
              <Bell size={20} />
            </div>
            <div>
              <p className="font-black uppercase text-[12px] tracking-widest text-stone-400 leading-none mb-1.5">Notifications</p>
              <p className="font-bold text-sm text-stone-900">Push & Email</p>
            </div>
          </div>
          <button 
            onClick={() => setNotifications(!notifications)}
            className={`w-14 h-8 rounded-full transition-colors relative ${notifications ? 'bg-emerald-500' : 'bg-stone-200'}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${notifications ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
        <SettingsItem
          icon={Shield} 
          label="Privacy & Security" 
          value="Standard Protection" 
          onClick={() => {}} 
          color="indigo"
        />
      </SettingsSection>

      <div className="pt-4">
        <button
          onClick={handleSignOutClick}
          disabled={signingOut}
          className="w-full p-8 bg-red-50 text-red-600 rounded-[2.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-red-100 transition-colors disabled:opacity-60"
        >
          <LogOut size={20} /> {signingOut ? 'Signing Out...' : 'Sign Out of Studio'}
        </button>
      </div>

      <div className="text-center space-y-2 pt-8">
        <p className="text-[12px] font-black uppercase tracking-[0.4em] text-stone-200">FUZO Studio v2.5.0</p>
        <div className="flex justify-center gap-4 text-[12px] font-bold text-stone-300 uppercase tracking-widest">
          <button className="hover:text-stone-500">Terms</button>
          <span>&bull;</span>
          <button className="hover:text-stone-500">Privacy</button>
        </div>
      </div>

      <ProfileTypeModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        onSelect={(val) => updateProfileField(modalState.field, val)}
        type={modalState.field === 'profileType' ? 'primary' : 'subtype'}
        options={modalState.options}
        currentValue={profile[modalState.field] || ''}
        title={modalState.title}
      />

      
      {/* SECTION: Meta Sync Modal */}
      <AnimatePresence>
        {showMetaSyncModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !syncingMeta && setShowMetaSyncModal(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-6">
                  {metaConnected ? (
                    <CheckCircle2 size={40} className="text-emerald-500" />
                  ) : (
                    <div className="flex gap-2">
                      <FacebookMark size={24} className="fill-blue-600" />
                      <InstagramMark size={24} />
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-stone-900 mb-2">
                  {metaConnected ? 'Meta Connected' : 'Sync Meta'}
                </h3>
                <p className="text-sm font-bold text-stone-500 leading-relaxed mb-8">
                  {metaConnected 
                    ? `We've successfully identified your Meta account: ${detectedMetaTitle}. Save your settings to keep this link.`
                    : 'Connect your Facebook/Instagram account to automatically identify and verify your handles.'
                  }
                </p>

                <div className="space-y-3">
                  {!metaConnected ? (
                    <button
                      onClick={handleSyncMeta}
                      disabled={syncingMeta}
                      className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {syncingMeta ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <FacebookMark size={14} className="fill-white" />
                          Sync with Meta
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowMetaSyncModal(false)}
                      className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <CheckCircle2 size={14} />
                      Perfect, thanks!
                    </button>
                  )}
                  
                  {!metaConnected && (
                    <button
                      onClick={() => setShowMetaSyncModal(false)}
                      disabled={syncingMeta}
                      className="w-full py-4 bg-stone-50 text-stone-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-stone-100 transition-colors"
                    >
                      Maybe Later
                    </button>
                  )}
                </div>
              </div>

              {/* Manual Entry Fallback */}
              {!metaConnected && (
                <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-center gap-4 text-center">
                  <button 
                    onClick={() => {
                      setShowMetaSyncModal(false);
                      editField('facebook', 'Facebook');
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors"
                  >
                    FB Manually
                  </button>
                  <span className="text-stone-300">|</span>
                  <button 
                    onClick={() => {
                      setShowMetaSyncModal(false);
                      editField('instagram', 'Instagram');
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors"
                  >
                    IG Manually
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SECTION: YouTube Sync Modal */}
      <AnimatePresence>
        {showYoutubeSyncModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !syncingYoutube && setShowYoutubeSyncModal(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-6">
                  {youtubeConnected ? (
                    <CheckCircle2 size={40} className="text-emerald-500" />
                  ) : (
                    <Youtube size={40} />
                  )}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-stone-900 mb-2">
                  {youtubeConnected ? 'Channel Connected' : 'Sync YouTube'}
                </h3>
                <p className="text-sm font-bold text-stone-500 leading-relaxed mb-8">
                  {youtubeConnected 
                    ? `We've successfully identified your YouTube channel: ${detectedChannelTitle || profile.youtube}. Save your settings to keep this link.`
                    : 'Connect your Google account to automatically identify and verify your YouTube channel handle.'
                  }
                </p>

                <div className="space-y-3">
                  {!youtubeConnected ? (
                    <button
                      onClick={handleSyncYoutube}
                      disabled={syncingYoutube}
                      className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {syncingYoutube ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Youtube size={14} />
                          Sync with Google
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowYoutubeSyncModal(false)}
                      className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <CheckCircle2 size={14} />
                      Perfect, thanks!
                    </button>
                  )}
                  
                  {!youtubeConnected && (
                    <button
                      onClick={() => setShowYoutubeSyncModal(false)}
                      disabled={syncingYoutube}
                      className="w-full py-4 bg-stone-50 text-stone-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-stone-100 transition-colors"
                    >
                      Maybe Later
                    </button>
                  )}
                </div>
              </div>

              {/* Manual Entry Fallback */}
              {!youtubeConnected && (
                <div className="p-6 bg-stone-50 border-t border-stone-100 text-center">
                  <button 
                    onClick={() => {
                      setShowYoutubeSyncModal(false);
                      editField('youtube', 'YouTube');
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors"
                  >
                    Or enter manually
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>

  );
};
