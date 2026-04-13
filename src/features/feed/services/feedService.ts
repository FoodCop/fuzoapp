import { hasSupabaseConfig, supabase } from '../../../services/supabaseClient';
import type { AppItem } from '../../../shared/types/appItem';
import type { FeedCard } from '../../../shared/types/feed';

export const FeedService = {
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

      // Flatten metadata to prevent double-nesting in the database
      const { metadata: nestedMetadata, ...topLevelFields } = item as any;
      const cleanMetadata = {
        ...topLevelFields,
        ...(typeof nestedMetadata === 'object' ? nestedMetadata : {})
      };

      const { data, error } = await supabase.from('fuzo_feed').insert({
        type: item.itemType || item.type || 'recipe',
        metadata: cleanMetadata,
        user_id: userId || null,
      }).select();

      if (error) {
        console.error('[FeedService] Supabase insert error:', error);
        throw error;
      }
      
      console.log('[FeedService] Successfully published to feed:', data);
      return { success: true, data };
    } catch (error: any) {
      console.error('[FeedService] publishToFeed failed:', error);
      return { success: false, error: error.message || 'Unknown database error' };
    }
  },

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

      if (error) throw error;

      const items = (data || []).map(row => {
        const authorData = (row as any).author;
        const metadata = typeof row.metadata === 'object' ? row.metadata : {};
        
        // --- AI Prioritization Logic ---
        let score = 0;
        
        if (params.preferences) {
          const { cuisines = [], dietary = [] } = params.preferences;
          
          // 1. Cuisine Match (+100 per match)
          const itemCuisines = metadata.cuisines || [metadata.cat];
          if (Array.isArray(itemCuisines)) {
            const matches = itemCuisines.filter((c: string) => 
              cuisines.some(p => c?.toLowerCase().includes(p.toLowerCase()))
            );
            score += matches.length * 100;
          }

          // 2. Dietary Compatibility (Penalty if mismatch)
          if (dietary.includes('Vegetarian') && metadata.isVeg === false) score -= 500;
          if (dietary.includes('Vegan') && metadata.isVegan === false) score -= 1000;
          
          // 3. User Type Affinity (+50 for related profiles)
          if (params.preferences.profileType === authorData?.profile_type) {
            score += 50;
          }
        }

        // 4. Organic Boost (+200 for posts from actual users)
        if (row.user_id) score += 200;

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

      // Sort by score (DESC) then by date (inherent from query)
      return items.sort((a, b) => b.relevanceScore - a.relevanceScore) as FeedCard[];
      
    } catch (error) {
      console.error('FeedService.generateFeed failed:', error);
      return [] as FeedCard[];
    }
  },
};
