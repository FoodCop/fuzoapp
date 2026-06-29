/**
 * ============================================================================
 * SUPABASE CLIENT ORCHESTRATOR — Data & Auth Gateway
 * ============================================================================
 * 
 * This module initializes the singleton Supabase client used throughout the 
 * application. It handles environment variable sanitization and specifies 
 * the persistence strategy for user sessions.
 */

import { createClient } from '@supabase/supabase-js';

import { cleanEnv } from '../shared/lib/env';

const SUPABASE_URL = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_ANON_KEY = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

/**
 * SECTION: Client Initialization
 * Configures the Supabase client with auto-refresh and diagnostic logging.
 */
export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!hasSupabaseConfig) {
  console.warn('⚠️ [Supabase] Client configuration is missing or invalid. Check your .env file.');
} else {
  console.log('✅ [Supabase] Client configuration detected. Initializing...');
}

export const supabase = hasSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storageKey: 'fuzo-auth-session',
      },
    })
  : null;

export { SUPABASE_URL, SUPABASE_ANON_KEY };

