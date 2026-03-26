import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Bot, MapPin, Mail, Shield, AlertCircle, Phone, 
  Music2, Pin, ChefHat, Flame, Bell, LogOut, Camera 
} from 'lucide-react';
import type { AuthUser } from '../../auth/types/auth';
import type { SettingsProfile } from '../types/settings';
import { SettingsService } from '../services/settingsService';
import { supabase } from '../../../services/supabaseClient';
import { getOAuthRedirectUrl } from '../../auth/lib/oauthRedirect';
import { SettingsItem, SettingsSection } from '../../../shared/ui/settingsPrimitives';
import { InstagramMark, FacebookMark } from '../../../shared/ui/SocialIcons';

export const SettingsView = ({ 
  onSignOut, 
  authUser 
}: { 
  onSignOut: () => Promise<void>; 
  authUser: AuthUser | null 
}) => {
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
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setProfile(defaults);
    setIsDirty(false);
  }, [defaults]);

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
      }

      setLoadingSettings(false);
      setIsDirty(false);
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [authUser, defaults]);

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

  const handleSaveSettings = async () => {
    if (!authUser?.id || !isDirty || savingSettings) return;

    setSavingSettings(true);
    setSettingsError('');
    setSettingsMessage('');

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
    setSettingsMessage('Settings saved.');
  };

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

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in pb-32 px-4">
      <header className="flex flex-col items-center text-center space-y-6 py-8">
        <div className="relative group">
          <div className="w-32 h-32 rounded-[3rem] border-8 border-white bg-white shadow-2xl overflow-hidden">
            <img src="https://i.pravatar.cc/150?u=me" alt="Settings avatar" className="w-full h-full object-cover" />
          </div>
          <button className="absolute bottom-0 right-0 p-3 bg-stone-900 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform">
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
            className="px-8 py-3 bg-stone-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
          {loadingSettings && <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">Loading saved settings...</p>}
          {settingsError && <p className="text-[10px] font-black uppercase tracking-widest text-red-500">{settingsError}</p>}
          {settingsMessage && !settingsError && <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{settingsMessage}</p>}
        </div>
      </header>

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
          onClick={() => editField('instagram', 'Instagram')}
        />
        <SettingsItem
          icon={FacebookMark}
          label="Facebook"
          value={profile.facebook || 'Not set'}
          onClick={() => editField('facebook', 'Facebook')}
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
              <p className="font-black uppercase text-[10px] tracking-widest text-stone-400 leading-none mb-1.5">Notifications</p>
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
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-200">FUZO Studio v2.5.0</p>
        <div className="flex justify-center gap-4 text-[10px] font-bold text-stone-300 uppercase tracking-widest">
          <button className="hover:text-stone-500">Terms</button>
          <span>&bull;</span>
          <button className="hover:text-stone-500">Privacy</button>
        </div>
      </div>
    </div>
  );
};
