/**
 * ============================================================================
 * USER PROFILE SERVICE — Identity Synchronization
 * ============================================================================
 * 
 * This service ensures that user metadata from the Supabase Auth layer is 
 * mirrored and normalized into the public `users` database table.
 * 
 * Core Capabilities:
 * 1. Metadata Normalization: Maps fragmented OAuth metadata (Google, etc.) 
 *    into a unified structure.
 * 2. Identity Derivation: Generates fallback usernames from emails if missing.
 * 3. Atomic Upserts: Idempotent synchronization of the user profile record.
 */

import { supabase } from './supabaseClient';

/**
 * SECTION: Domain Types & Interfaces
 */
type AuthLikeUser = {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

interface ServiceResult {
  success: boolean;
  error?: string;
}

/**
 * SECTION: Identity Derivation Utilities
 * Provides sanitization for display names and handles the logic for 
 * generating predictable, searchable usernames from email strings.
 */
const toSafeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const deriveUsername = (email: string | undefined): string | null => {
  if (!email) return null;
  const base = email.split('@')[0] || '';
  const cleaned = base.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  return cleaned.length > 0 ? cleaned.slice(0, 32) : null;
};

/**
 * SECTION: Profile Upsert Orchestrator
 * The primary entry point for ensuring a record exists in the public schema 
 * after a successful login or metabolic change.
 */
export const UserProfileService = {
  async ensureCurrentUserProfile(authUser: AuthLikeUser | null): Promise<ServiceResult> {
    if (!authUser?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    // 1. Map prioritized metadata fields
    const metadata = authUser.user_metadata || {};
    const displayName =
      toSafeString(metadata.full_name)
      || toSafeString(metadata.name)
      || toSafeString(metadata.user_name)
      || toSafeString(metadata.username);

    const username = toSafeString(metadata.username) || deriveUsername(authUser.email);

    // 2. Perform Idempotent Upsert
    const { error } = await supabase
      .from('users')
      .upsert({
        id: authUser.id,
        email: authUser.email || null,
        display_name: displayName,
        username,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },
};
