/**
 * ============================================================================
 * DISCOVERY FEED SERVICE — Neural Content Orchestration
 * ============================================================================
 * 
 * This service manages the global Discovery Feed, handling both the ingestion 
 * of user posts and the personalized derivation of feed content.
 * 
 * Core Capabilities:
 * 1. Content Ingestion: Publishes snippets from AI Studios to the global ‘fuzo_feed’.
 * 2. Relational Aggregation: Joins feed data with user profiles for rich authorship.
 * 3. Neural Prioritization: A weighted scoring engine that ranks content based 
 *    on user preferences, dietary alignment, and profile affinity.
 */

import { hasSupabaseConfig, supabase } from '../../../services/supabaseClient';
import type { AppItem } from '../../../shared/types/appItem';
import type { FeedCard } from '../../../shared/types/feed';

export const FeedService = {
  /**
   * SECTION: Content Ingestion (Publish)
   * Broadcasts a processed item (Snap, Bite, or Trim) to the global feed.
   * Logic:
   * - Flattens metadata for efficient JSONB querying in Postgres.
   * - Associates the post with the authenticated user UUID.
   */
  async publishToFeed(item: AppItem) {
    if (!hasSupabaseConfig || !supabase) {
      console.warn('FeedService: Supabase not configured, cannot publish');
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('[FeedService] Attempting to publish item to fuzo_feed:', item.title || item.name || 'Untitled');
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        console.warn('[FeedService] No authenticated user found, attempting anonymous post');
      }

      // Robust metadata flattening to ensure high-fidelity JSONB storage
      const { metadata: existingMetadata, ...topLevelFields } = item as any;
      const cleanMetadata = {
        ...topLevelFields,
        ...(typeof existingMetadata === 'object' ? existingMetadata : {})
      };

      console.log('[FeedService] Insertion payload:', { type: item.itemType || item.type || 'recipe', user_id: userId });

      const { data, error } = await supabase.from('fuzo_feed').insert({
        type: item.itemType || item.type || 'recipe',
        metadata: cleanMetadata,
        user_id: userId || null,
      }).select();

      if (error) {
        console.error('[FeedService] Supabase insert error:', error);
        throw error;
      }
      
      console.log('[FeedService] Successfully published to feed. Record ID:', data?.[0]?.id);
      return { success: true, data };
    } catch (error: any) {
      console.error('[FeedService] publishToFeed failed:', error);
      return { success: false, error: error.message || 'Unknown database error' };
    }
  },

  /**
   * SECTION: Neural Discovery Engine (Generate)
   * Fetches and ranks feed content using a multi-factor weighting algorithm.
   * 
   * Weighting Logic (Relevance Score):
   * 🥇 Cuisine Match: +100 per user preference match.
   * 🥈 Dietary Safety: Strong penalties (-500 to -1000) for mismatches (e.g., meat in a veg feed).
   * 🥉 Profile Affinity: +50 for content from similar user types (e.g., Chef to Chef).
   * ⚡ Organic Boost: +200 for posts created by humans vs. curated seeds.
   */
  async generateFeed(params: { 
    pageSize: number; 
    userLocation?: { lat: number; lng: number };
    preferences?: {
      cuisines?: string[];
      dietary?: string[];
      profileType?: string;
    }
  }) {
    if (!hasSupabaseConfig || !supabase) {
      return [] as FeedCard[];
    }

    try {
      // 1. Relational Fetch
      console.log('[FeedService] Fetching feed content from Supabase...');
      const { data, error } = await supabase
        .from('fuzo_feed')
        .select(`
          *,
          author:users(
            username,
            display_name,
            avatar_url,
            profile_type
          )
        `)
        .order('created_at', { ascending: false })
        .limit(params.pageSize || 12);

      if (error) {
        console.error('[FeedService] DB Query Error:', error);
        throw error;
      }

      console.log(`[FeedService] Raw DB response: ${data?.length || 0} rows fetched.`);

      // 2. Score Calculation (Neural Pass)
      const items = (data || []).map(row => {
        const authorData = (row as any).author;
        const metadata = typeof row.metadata === 'object' ? row.metadata : {};
        
        let score = 0;
        
        if (params.preferences) {
          const { cuisines = [], dietary = [] } = params.preferences;
          
          // A. Cuisine Match logic
          const itemCuisines = metadata.cuisines || [metadata.cat];
          if (Array.isArray(itemCuisines)) {
            const matches = itemCuisines.filter((c: string) => 
              cuisines.some(p => c?.toLowerCase().includes(p.toLowerCase()))
            );
            score += matches.length * 100;
          }

          // B. Dietary Guardrails
          if (dietary.includes('Vegetarian') && metadata.isVeg === false) score -= 500;
          if (dietary.includes('Vegan') && metadata.isVegan === false) score -= 1000;
          
          // C. Identity Match
          if (params.preferences.profileType === authorData?.profile_type) {
            score += 50;
          }
        }

        // D. Human Authenticity Boost
        if (row.user_id) score += 200;

        // 3. Entity Transformation
        return {
          ...metadata,
          id: row.id,
          type: row.type,
          authorUserId: row.user_id,
          authorName: authorData?.display_name || authorData?.username,
          authorAvatar: authorData?.avatar_url,
          authorType: authorData?.profile_type,
          createdAt: row.created_at,
          relevanceScore: score,
        };
      }) as (FeedCard & { relevanceScore: number })[];

      // 4. Final Ranking
      return items.sort((a, b) => b.relevanceScore - a.relevanceScore) as FeedCard[];
      
    } catch (error) {
      console.error('FeedService.generateFeed failed:', error);
      return [] as FeedCard[];
    }
  },
};
