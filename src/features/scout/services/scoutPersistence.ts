/**
 * ============================================================================
 * SCOUT PERSISTENCE SERVICE — Geospatial Knowledge Synchronization
 * ============================================================================
 * 
 * This service manages the lifecycle of a 'Scout Discovery' (Map Pin). 
 * It ensures that a single user action (creating a pin) is broadcasted 
 * across the platform's social and knowledge layers.
 * 
 * Core Capabilities:
 * 1. Social Broadcast: Creates a public discovery post (`posts` table).
 * 2. Map Dataset Update: populates the collaborative `fuzo_locations` table.
 * 3. Personal Sync: Saves the discovery to the user's private Plate collection.
 */

import { supabase, hasSupabaseConfig } from '../../../services/supabaseClient';
import { PlateService } from '../../../services/plateService';

/**
 * SECTION: Domain Data Structures
 */
export interface ScoutFindData {
  name: string;
  category: string;
  lat: number;
  lng: number;
  address: string;
  notes?: string;
  tags?: string[];
  photos?: string[];
  timings?: Record<string, string>;
  rating?: number;
}

/**
 * SECTION: Multi-Channel Record Orchestrator
 * The primary entry point for saving a new location discovery from the Scout Map.
 */
export const ScoutPersistence = {
  async saveScoutFind(userId: string, find: ScoutFindData) {
    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      // 1. CHANNEL A: Public Feed Post
      // Logic: Creates a social engagement point so other users can see the discovery.
      const contentParts = [`New Discovery: ${find.name}`, find.category];
      if (find.notes) contentParts.push(find.notes);
      
      const { data: createdPost, error: postError } = await supabase.from('posts').insert({
        user_id: userId,
        content: contentParts.join('\n'),
        latitude: find.lat,
        longitude: find.lng,
        rating: find.rating || 0,
        images: find.photos || [],
        image_url: find.photos?.[0] || '',
        created_at: new Date().toISOString(),
      }).select('id').single();

      if (postError) {
        console.warn('Scout find post persistence skipped:', postError.message);
      }

      // 2. CHANNEL B: Fuzo Map Dataset (Global Knowledge Base)
      // Logic: Powers the interactive map for all users (geospatial search).
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
        photos: find.photos || [],
        timings: find.timings || {},
        rating: find.rating || 0,
      });

      if (datasetError) {
        console.warn('Scout find global dataset persistence failed:', datasetError.message);
      }

      // 3. CHANNEL C: Personal Plate Sync (Private Collection)
      // Logic: Adds the location to the user's private "Saved" plate list.
      const metadata = {
        name: find.name,
        cat: find.category,
        address: find.address,
        lat: find.lat,
        lng: find.lng,
        notes: find.notes,
        photos: find.photos || [],
        timings: find.timings || {},
        rating: find.rating || 0,
        source: 'scout_pin',
      };

      const plateResult = await PlateService.saveToPlate({
        itemId: `pin-${Date.now()}`,
        itemType: 'restaurant', 
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
