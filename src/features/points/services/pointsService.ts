/**
 * ============================================================================
 * GAMIFICATION & POINTS SERVICE — Platform Incentives
 * ============================================================================
 * 
 * This service manages the user incentive layer, rewarding culinary social 
 * actions (posting, saving, sharing) with points and experience levels. 
 * It also orchestrates the global and friend-based leaderboards.
 * 
 * Core Design Pattern:
 * 1. Double-Entry Safety: Points are awarded via Supabase RPC functions 
 *    to ensure atomic updates and prevent client-side manipulation.
 * 2. Multi-channel Leaderboards: Supports Global, Regional (City), and 
 *    Social (Friends) ranking views.
 */

import { supabase } from '../../../services/supabaseClient';

/**
 * SECTION: Domain Entities & Types
 */
export type PointsActionType = 'save_item' | 'share_item' | 'snap_post';

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  username: string;
  pointsTotal: number;
  pointsLevel: number;
  avatarUrl: string | null;
}

interface PointsSummary {
  total: number;
  level: number;
}

interface AwardPointsResult extends PointsSummary {
  pointsAwarded: number;
  wasDuplicate: boolean;
}

interface PointsServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type AwardRpcRow = {
  points_awarded: number;
  points_total: number;
  points_level: number;
  was_duplicate: boolean;
};

export const PointsService = {
  /**
   * SECTION: Leaderboard Orchestration
   * Logic: Fetches users ranked by points. Supports diverse filtering 
   * (Global vs. Friends vs. Regional).
   */
  async getLeaderboard(limit = 50): Promise<PointsServiceResult<LeaderboardEntry[]>> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, username, points_total, points_level, avatar_url')
      .order('points_total', { ascending: false })
      .order('points_level', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    const rows = (data || []) as Array<{
      id: string;
      display_name: string | null;
      username: string | null;
      points_total: number | null;
      points_level: number | null;
      avatar_url: string | null;
    }>;

    return {
      success: true,
      data: rows.map(row => ({
        id: row.id,
        displayName: row.display_name || 'Chef Studio',
        username: row.username || 'fuzo_user',
        pointsTotal: row.points_total ?? 0,
        pointsLevel: row.points_level ?? 1,
        avatarUrl: row.avatar_url,
      })),
    };
  },

  async getFilteredLeaderboard(params: {
    filter: 'global' | 'friends' | 'local';
    userIds?: string[];
    city?: string;
    limit?: number;
  }): Promise<PointsServiceResult<LeaderboardEntry[]>> {
    const { filter, userIds, city, limit = 50 } = params;
    
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    let query = supabase
      .from('users')
      .select('id, display_name, username, points_total, points_level, avatar_url')
      .order('points_total', { ascending: false })
      .order('points_level', { ascending: false })
      .limit(limit);

    if (filter === 'friends' && userIds && userIds.length > 0) {
      query = query.in('id', userIds);
    } else if (filter === 'local' && city) {
      query = query.ilike('location_city', `%${city}%`);
    } else if (filter === 'friends' && (!userIds || userIds.length === 0)) {
      return { success: true, data: [] };
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    const rows = (data || []) as Array<{
      id: string;
      display_name: string | null;
      username: string | null;
      points_total: number | null;
      points_level: number | null;
      avatar_url: string | null;
    }>;

    return {
      success: true,
      data: rows.map(row => ({
        id: row.id,
        displayName: row.display_name || 'Chef Studio',
        username: row.username || 'fuzo_user',
        pointsTotal: row.points_total ?? 0,
        pointsLevel: row.points_level ?? 1,
        avatarUrl: row.avatar_url,
      })),
    };
  },

  /**
   * SECTION: Identity Points Retrieval
   * Fetches the specific points/level for a given authenticated user.
   */
  async getCurrentUserPoints(): Promise<PointsServiceResult<PointsSummary>> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return { success: false, error: authError.message };
    }

    const user = authData?.user;
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('users')
      .select('points_total, points_level')
      .eq('id', user.id)
      .maybeSingle<{ points_total: number | null; points_level: number | null }>();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        total: data?.points_total ?? 0,
        level: data?.points_level ?? 1,
      },
    };
  },

  /**
   * SECTION: Point Awarding Logic (RPC)
   * Broadcasts a social action to the Supabase backend for point calculation.
   * Logic: Relies on the database 'award_user_points' function to handle 
   * duplicate prevention and leveling up thresholds.
   */
  async awardActionPoints(params: {
    actionType: PointsActionType;
    sourceEntityType?: string;
    sourceEntityId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<PointsServiceResult<AwardPointsResult>> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    const { data, error } = await supabase.rpc('award_user_points', {
      p_action_type: params.actionType,
      p_source_entity_type: params.sourceEntityType || null,
      p_source_entity_id: params.sourceEntityId || null,
      p_metadata: params.metadata || {},
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const row = (Array.isArray(data) ? data[0] : data) as AwardRpcRow | null;
    if (!row) {
      return { success: false, error: 'No points result returned' };
    }

    return {
      success: true,
      data: {
        pointsAwarded: row.points_awarded ?? 0,
        total: row.points_total ?? 0,
        level: row.points_level ?? 1,
        wasDuplicate: Boolean(row.was_duplicate),
      },
    };
  },

  /**
   * SECTION: Ranking & Competitive Analytics
   */
  async getUserRank(userId: string): Promise<PointsServiceResult<{ rank: number; level: number }>> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    const { data: userStats, error: statsError } = await supabase
      .from('users')
      .select('points_total, points_level')
      .eq('id', userId)
      .maybeSingle<{ points_total: number | null; points_level: number | null }>();

    if (statsError) {
      return { success: false, error: statsError.message };
    }

    const currentPoints = userStats?.points_total ?? 0;
    const currentLevel = userStats?.points_level ?? 1;

    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('points_total', currentPoints);

    if (countError) {
      return { success: false, error: countError.message };
    }

    return { 
      success: true, 
      data: {
        rank: (count ?? 0) + 1,
        level: currentLevel
      }
    };
  },
};

