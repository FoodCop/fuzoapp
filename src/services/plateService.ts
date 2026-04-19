/**
 * ============================================================================
 * PERSONAL PLATE SERVICE — Collection Synchronization
 * ============================================================================
 * 
 * This service manages the user's private 'Plate' (Personal Collection).
 * It enables users to save recipes, snaps, and restaurant pins into a 
 * synchronized, cross-device personal list.
 * 
 * Core Capabilities:
 * 1. Unified Persistence: Saves diverse item types (Recipe, Photo, Restaurant) 
 *    under a single schema.
 * 2. Idempotent Writes: Uses the IdempotencyService to prevent duplicate 
 *    entries during network retries.
 * 3. Tenant Isolation: Multi-tenant safety using `tenant_id` scoping.
 */

import { supabase } from './supabaseClient';
import { IdempotencyService } from './idempotencyService';

/**
 * SECTION: Domain Entities & Types
 */
const APP_TENANT_ID = '00000000-0000-4000-8000-000000000001';

export type PlateItemType = 'restaurant' | 'recipe' | 'photo' | 'video' | 'other';

export interface SavedPlateItem {
  id: string;
  user_id: string;
  item_type: PlateItemType;
  item_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SavePlateParams {
  itemId: string;
  itemType: PlateItemType;
  metadata?: Record<string, unknown>;
}

export interface RemovePlateParams {
  itemId: string;
  itemType: PlateItemType;
}

interface PlateServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const PlateService = {
  /**
   * SECTION: Data Retrieval Logic
   * Fetches the user's personal collection from the `saved_items` table.
   */
  async listSavedItems(): Promise<PlateServiceResult<SavedPlateItem[]>> {
    const client = supabase;
    if (!client) {
      return { success: false, error: 'Supabase is not configured' };
    }

    const { data: authData } = await client.auth.getUser();
    const user = authData?.user;
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await client
      .from('saved_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data || []) as SavedPlateItem[],
    };
  },

  async listSavedItemsByUserId(userId: string): Promise<PlateServiceResult<SavedPlateItem[]>> {
    const client = supabase;
    if (!client) {
      return { success: false, error: 'Supabase is not configured' };
    }

    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      return { success: false, error: 'User id is required' };
    }

    const { data, error } = await client
      .from('saved_items')
      .select('*')
      .eq('user_id', trimmedUserId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data || []) as SavedPlateItem[],
    };
  },

  /**
   * SECTION: Persistence Orchestrator
   * Saves an item to the plate with strict idempotency checks.
   * Logic:
   * - Uses `IdempotencyService` to track and lock the write operation.
   * - Performs a Postgres `upsert` on the unique conflict of (tenant, user, type, id).
   */
  async saveToPlate(params: SavePlateParams): Promise<PlateServiceResult<SavedPlateItem>> {
    const client = supabase;
    if (!client) {
      return { success: false, error: 'Supabase is not configured' };
    }

    if (!params.itemId || !params.itemType) {
      return { success: false, error: 'itemId and itemType are required' };
    }

    const { data: authData } = await client.auth.getUser();
    const user = authData?.user;
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const saved = await IdempotencyService.executeSaveOperation(
        'save_to_plate',
        params.itemId,
        params.itemType,
        async () => {
          const { data, error } = await client
            .from('saved_items')
            .upsert({
              user_id: user.id,
              item_type: params.itemType,
              item_id: params.itemId,
              metadata: params.metadata || {},
              tenant_id: APP_TENANT_ID,
            }, {
              onConflict: 'tenant_id,user_id,item_type,item_id',
            })
            .select()
            .single();

          if (error) {
            throw new Error(error.message);
          }

          return data as SavedPlateItem;
        },
      );

      return {
        success: true,
        data: saved,
        message: `${params.itemType} saved to plate`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save to plate',
      };
    }
  },

  /**
   * SECTION: Cleanup Logic
   * Removes a specific item from the user's personal collection.
   */
  async removeFromPlate(params: RemovePlateParams): Promise<PlateServiceResult<null>> {
    const client = supabase;
    if (!client) {
      return { success: false, error: 'Supabase is not configured' };
    }

    if (!params.itemId || !params.itemType) {
      return { success: false, error: 'itemId and itemType are required' };
    }

    const { data: authData } = await client.auth.getUser();
    const user = authData?.user;
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await client
      .from('saved_items')
      .delete()
      .eq('user_id', user.id)
      .eq('item_type', params.itemType)
      .eq('item_id', params.itemId);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: null,
      message: `${params.itemType} removed from plate`,
    };
  },
};

export default PlateService;
