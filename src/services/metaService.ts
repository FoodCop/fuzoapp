/**
 * ============================================================================
 * META (INSTAGRAM & FACEBOOK) SERVICE — Social Media Integration
 * ============================================================================
 * 
 * This service orchestrates the ingestion of media and profile metadata 
 * from the Meta Graph API and Instagram Basic Display API.
 */

import { supabase } from './supabaseClient';

export interface InstagramMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  caption?: string;
  timestamp: string;
}

export interface MetaSyncResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const MetaService = {
  /**
   * SECTION: Instagram Media Ingestion
   * Fetches the latest media from the connected Instagram account.
   * Note: Requires a valid user access token obtained via OAuth.
   */
  async fetchInstagramMedia(accessToken: string): Promise<MetaSyncResult> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${accessToken}`
      );
      
      const data = await response.json();
      
      if (data.error) {
        return { success: false, error: data.error.message };
      }
      
      return { success: true, data: data.data as InstagramMedia[] };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown Meta error' };
    }
  },

  /**
   * SECTION: Profile Data Synchronization
   * Updates the FUZO profile with data from the connected social account.
   */
  async syncMetaProfile(userId: string, provider: 'facebook' | 'instagram'): Promise<MetaSyncResult> {
    const client = supabase;
    if (!client) return { success: false, error: 'Supabase unavailable' };

    // This logic assumes the OAuth handshake has already populated the identity metadata
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: userError?.message || 'User not found' };
    }

    const metadata = user.user_metadata || {};
    const profileUpdate: any = {};

    if (provider === 'facebook') {
      if (metadata.full_name) profileUpdate.name = metadata.full_name;
      if (metadata.avatar_url) profileUpdate.avatar_url = metadata.avatar_url;
    }

    const { error: updateError } = await client
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  }
};
