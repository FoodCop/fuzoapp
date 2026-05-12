import { supabase } from '../../../services/supabaseClient';
import { buildDefaultSettingsProfile, mapProfileToSettingsUpdate, mergeSettingsFromRow } from '../lib/settingsMappers';
import type { AuthContextUser, PublicUserProfile, PublicUserRow, SettingsProfile, UserSettingsRow } from '../types/settings';
import { YouTubeService } from '../../../services/youtubeService';

interface SettingsServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const SettingsService = {
  async getUserSettings(authUser: AuthContextUser | null): Promise<SettingsServiceResult<SettingsProfile>> {
    if (!authUser?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    const defaults = buildDefaultSettingsProfile(authUser);
    const client = supabase;
    if (!client) {
      return { success: false, error: 'Supabase is not configured' };
    }

    const { data, error } = await client
      .from('users')
      .select('id, display_name, username, bio, phone, location, dietary_preferences, cuisine_preferences, instagram_url, facebook_url, tiktok_url, pinterest_url, youtube_url, profile_type, profile_subtype, avatar_url, cover_photo_url')


      .eq('id', authUser.id)
      .maybeSingle<UserSettingsRow>();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: mergeSettingsFromRow(defaults, data || null),
    };
  },

  async getPublicUserProfile(userId: string): Promise<SettingsServiceResult<PublicUserProfile | null>> {
    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      return { success: false, error: 'User id is required' };
    }

    const client = supabase;
    if (!client) {
      return { success: false, error: 'Supabase is not configured' };
    }

    const { data, error } = await client
      .from('users')
      .select('id, display_name, username, bio, location, avatar_url, cover_photo_url, points_total, points_level, instagram_url, facebook_url, tiktok_url, pinterest_url, youtube_url, profile_type')

      .eq('id', trimmedUserId)
      .maybeSingle<PublicUserRow>();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        id: data.id,
        name: data.display_name || 'Chef Studio',
        username: data.username || 'fuzo_user',
        bio: data.bio || 'This chef has not added a bio yet.',
        location: data.location || 'Location hidden',
        avatarUrl: data.avatar_url || `https://i.pravatar.cc/150?u=${data.id}`,
        pointsTotal: data.points_total ?? 0,
        pointsLevel: data.points_level ?? 1,
        instagram: data.instagram_url || '',
        facebook: data.facebook_url || '',
        tiktok: data.tiktok_url || '',
        pinterest: data.pinterest_url || '',
        youtube: data.youtube_url || '',
        profile_type: data.profile_type || 'Chef',
      },
    };
  },

  async updateUserSettings(authUser: AuthContextUser | null, profile: SettingsProfile): Promise<SettingsServiceResult<SettingsProfile>> {
    if (!authUser?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    const client = supabase;
    if (!client) {
      return { success: false, error: 'Supabase is not configured' };
    }

    const updatePayload = mapProfileToSettingsUpdate(profile);

    // Sync to Auth Metadata so UI reflects changes immediately across all sessions
    // We sync ALL editable fields to metadata as a fast-cache fallback
    const { error: authError } = await client.auth.updateUser({
      data: {
        display_name: profile.name,
        full_name: profile.name,
        username: profile.username,
        bio: profile.bio,
        phone: profile.phone,
        location: profile.location,
        instagram_url: profile.instagram,
        facebook_url: profile.facebook,
        tiktok_url: profile.tiktok,
        pinterest_url: profile.pinterest,
        youtube_url: profile.youtube,
        profile_type: profile.profileType,
        profile_subtype: profile.profileSubtype,
        chef_subtype: profile.profileType === 'Chef' ? profile.profileSubtype : undefined,
      }
    });

    if (authError) {
      console.warn('Auth metadata sync failed, but proceeding with DB update:', authError.message);
    }

    const { data, error } = await client
      .from('users')
      .update(updatePayload)
      .eq('id', authUser.id)

        .select('id, display_name, username, bio, phone, location, dietary_preferences, cuisine_preferences, instagram_url, facebook_url, tiktok_url, pinterest_url, youtube_url, profile_type, profile_subtype, avatar_url, cover_photo_url')


      .maybeSingle<UserSettingsRow>();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      const { data: upserted, error: upsertError } = await client
        .from('users')
        .upsert({
          id: authUser.id,
          email: authUser.email || null,
          ...updatePayload,
        })
        .select('id, display_name, username, bio, phone, location, dietary_preferences, cuisine_preferences, instagram_url, facebook_url, tiktok_url, pinterest_url, youtube_url, profile_type, profile_subtype, avatar_url, cover_photo_url')


        .maybeSingle<UserSettingsRow>();

      if (upsertError) {
        return { success: false, error: upsertError.message };
      }

      return {
        success: true,
        data: mergeSettingsFromRow(profile, upserted || null),
      };
    }

    return {
      success: true,
      data: mergeSettingsFromRow(profile, data),
    };
  },

  async uploadUserMedia(file: File, type: 'avatar' | 'cover'): Promise<SettingsServiceResult<string>> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase is not configured' };

    const { data: userData } = await client.auth.getUser();
    if (!userData.user) return { success: false, error: 'Not authenticated' };

    const userId = userData.user.id;
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}-${type}-${Math.random()}.${fileExt}`;

    const { error: uploadError } = await client.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) return { success: false, error: uploadError.message };

    const { data: publicUrlData } = client.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return { success: true, data: publicUrlData.publicUrl };
  },

  async syncYouTubeWithGoogle(): Promise<SettingsServiceResult<{ youtube: string; title: string }>> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase is not configured' };

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData.session) {
      return { success: false, error: 'No active session found.' };
    }

    const providerToken = sessionData.session.provider_token;
    if (!providerToken) {
      return { success: false, error: 'No Google account linked or session expired. Please sign in with Google again.' };
    }

    const ytResult = await YouTubeService.getMyChannel(providerToken);
    if (!ytResult.success || !ytResult.data) {
      return { success: false, error: ytResult.error || 'Failed to identify YouTube channel.' };
    }

    // Return the handle or URL to the UI so it can be saved with other settings
    return {
      success: true,
      data: { 
        youtube: ytResult.data.handle || ytResult.data.url,
        title: ytResult.data.title
      }
    };
  },
};

