import { supabase, hasSupabaseConfig } from '../../../services/supabaseClient';
import { PlateService } from '../../../services/plateService';
import { ScoutPlace } from '../types/scoutUi';

export interface ScoutFindData {
  name: string;
  category: string;
  lat: number;
  lng: number;
  address: string;
  notes?: string;
  tags?: string[];
}

export const ScoutPersistence = {
  async saveScoutFind(userId: string, find: ScoutFindData) {
    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      // 1. Create a Post for the Feed
      const contentParts = [`New Discovery: ${find.name}`, find.category];
      if (find.notes) contentParts.push(find.notes);
      
      const { data: createdPost, error: postError } = await supabase.from('posts').insert({
        user_id: userId,
        content: contentParts.join('\n'),
        latitude: find.lat,
        longitude: find.lng,
        created_at: new Date().toISOString(),
      }).select('id').single();

      if (postError) {
        console.warn('Scout find post persistence skipped:', postError.message);
      }

      // 2. Add to Fuzo Map Dataset (Global)
      const { error: datasetError } = await supabase.from('fuzo_locations').insert({
        user_id: userId,
        source_post_id: createdPost?.id || null,
        location_name: find.name,
        restaurant_name: find.name,
        cuisine: find.category,
        latitude: find.lat,
        longitude: find.lng,
        address: find.address,
        notes: find.notes || '',
        tags: find.tags || [],
      });

      if (datasetError) {
        console.warn('Scout find global dataset persistence failed:', datasetError.message);
      }

      // 3. Save to personal Plate (Collection)
      const metadata = {
        name: find.name,
        cat: find.category,
        address: find.address,
        lat: find.lat,
        lng: find.lng,
        notes: find.notes,
        source: 'scout_pin',
      };

      const plateResult = await PlateService.saveToPlate({
        itemId: `pin-${Date.now()}`,
        itemType: 'restaurant', // Using restaurant as primary place type
        metadata,
      });

      return {
        success: !datasetError,
        error: datasetError?.message,
        data: plateResult.success ? plateResult.data : null
      };

    } catch (err) {
      console.error('Scout find persistence error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
};
