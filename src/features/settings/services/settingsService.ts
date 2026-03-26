import { supabase } from '../../../services/supabaseClient';
import { buildDefaultSettingsProfile, mapProfileToSettingsUpdate, mergeSettingsFromRow } from '../lib/settingsMappers';
import type { AuthContextUser, PublicUserProfile, PublicUserRow, SettingsProfile, UserSettingsRow } from '../types/settings';

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
      .select('id, display_name, username, bio, phone, location, dietary_preferences, cuisine_preferences, instagram_url, facebook_url, tiktok_url, pinterest_url, youtube_url')
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
      .select('id, display_name, username, bio, location, avatar_url, points_total, points_level, instagram_url, facebook_url, tiktok_url, pinterest_url, youtube_url, profile_type')
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

    const { data, error } = await client
      .from('users')
      .update(updatePayload)
      .eq('id', authUser.id)
      .select('id, display_name, username, bio, phone, location, dietary_preferences, cuisine_preferences, instagram_url, facebook_url, tiktok_url, pinterest_url, youtube_url')
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
        .select('id, display_name, username, bio, phone, location, dietary_preferences, cuisine_preferences, instagram_url, facebook_url, tiktok_url, pinterest_url, youtube_url')
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
};
