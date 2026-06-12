/**
 * ============================================================================
 * AUTHENTICATION SERVICE — Supabase Bridge
 * ============================================================================
 * 
 * This service orchestrates user identification via Supabase Auth.
 * Core Responsibilities:
 * 1. Social OAuth lifecycle (Google, Apple, Facebook).
 * 2. Redirection and state logging for debugging deep-link auth flows.
 * 3. Session cleanup (Sign out).
 */

import { supabase } from '../../../services/supabaseClient';
import { getOAuthRedirectUrl, authDebugLog } from '../lib/oauthRedirect';

/**
 * AUTH ENTITIES
 * Supported social identity providers.
 */
export type AuthProvider = 'google' | 'apple' | 'facebook';

export const AuthService = {
  /**
   * SECTION: OAuth Lifecycle
   * Initiates the handshake with third-party providers.
   * Logic:
   * - Resolves the dynamic redirect URL (Local vs Prod).
   * - Injects 'offline' access for Google to support persistence.
   * - Logs events for audit trails.
   */
  async signInWithOAuth(provider: AuthProvider) {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const redirectTo = getOAuthRedirectUrl();
    
    authDebugLog(`${provider}_signin_start`, {
      path: globalThis.location?.pathname,
      search: globalThis.location?.search,
      redirectTo,
    });

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: provider === 'google' ? {
          access_type: 'offline',
          prompt: 'consent',
        } : undefined,
      },
    });

    if (error) {
      authDebugLog(`${provider}_signin_error`, { error: error.message });
      throw error;
    }
  },

  /**
   * SECTION: Incremental Auth
   * Triggered specifically to get YouTube scopes.
   */
  async signInForYouTubeSync() {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const baseRedirect = getOAuthRedirectUrl();
    const separator = baseRedirect.includes('?') ? '&' : '?';
    const redirectTo = `${baseRedirect}${separator}youtube_sync=true`;
    
    authDebugLog('youtube_sync_signin_start', { redirectTo });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          scope: 'https://www.googleapis.com/auth/youtube.readonly email profile',
        },
      },
    });

    if (error) {
      authDebugLog('youtube_sync_signin_error', { error: error.message });
      throw error;
    }
  },

  /**
   * SECTION: Session Management
   * Terminates the active Supabase session and clears persistence keys.
   */
  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
};
