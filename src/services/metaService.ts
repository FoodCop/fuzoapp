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

export interface MetaSyncResult<T = unknown> {
  success: boolean;
  data?: T;
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
   * SECTION: Profile Data Extraction
   * Extracts Facebook and Instagram handles using the Graph API and user's provider token.
   */
  async getMetaHandles(providerToken: string): Promise<MetaSyncResult> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name,link,instagram_business_account{username}&access_token=${providerToken}`
      );
      
      const data = await response.json();
      
      if (data.error) {
        return { success: false, error: data.error.message };
      }
      
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown Meta API error' };
    }
  },

  /**
   * SECTION: oEmbed Context
   * Fetches metadata for an Instagram Reel or Facebook Video/Post using the Graph API oEmbed endpoints.
   */
  // TODO: Move VITE_META_APP_TOKEN to a server-side proxy to avoid client-side exposure.
  // Currently kept as-is because Meta oEmbed requires a token and there is no edge function yet.
  async fetchMetaOEmbedContext(url: string): Promise<string> {
    const token = import.meta.env.VITE_META_APP_TOKEN;
    if (!token) return '';

    let endpoint = '';
    if (url.includes('instagram.com') || url.includes('instagr.am')) {
      endpoint = 'instagram_oembed';
    } else if (url.includes('facebook.com') || url.includes('fb.watch')) {
      // Use oembed_video for videos/reels, else fallback to oembed_post
      if (url.includes('/video') || url.includes('/watch') || url.includes('fb.watch') || url.includes('/reel/')) {
        endpoint = 'oembed_video';
      } else {
        endpoint = 'oembed_post';
      }
    }

    if (!endpoint) return '';

    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${endpoint}?url=${encodeURIComponent(url)}&access_token=${token}`
      );
      
      const data = await response.json();
      if (data.error) return '';

      const title = data.title || '';
      const author = data.author_name || '';
      const thumbnail = data.thumbnail_url || '';
      return `oEmbed title: ${title}\noEmbed author: ${author}\noEmbed thumbnail: ${thumbnail}`;
    } catch {
      return '';
    }
  }
};
