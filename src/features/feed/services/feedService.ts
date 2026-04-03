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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase.from('fuzo_feed').insert({
        type: item.itemType || item.type || 'recipe',
        metadata: item,
        user_id: userId,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('FeedService.publishToFeed failed:', error);
      return { success: false, error: error.message };
    }
  },

  async generateFeed(params: { pageSize: number; userLocation?: { lat: number; lng: number } }) {
    if (!hasSupabaseConfig || !supabase) {
      return [] as FeedCard[];
    }

    try {
      const { data, error } = await supabase
        .from('fuzo_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(params.pageSize || 12);

      if (error) throw error;

      return (data || []).map(row => ({
        ...(typeof row.metadata === 'object' ? row.metadata : {}),
        id: row.id,
        type: row.type,
        authorUserId: row.user_id,
        createdAt: row.created_at,
      })) as FeedCard[];
    } catch (error) {
      console.error('FeedService.generateFeed failed:', error);
      return [] as FeedCard[];
    }
  },
};
