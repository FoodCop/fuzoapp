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

/**
 * SECTION: Environment Sanitization
 * Logic: Ensures that VITE_ environment variables are stripped of accidental 
 * quotes or whitespace during the build process.
 */
const cleanEnv = (value: string | undefined) => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  const withoutLeading = (trimmed.startsWith('"') || trimmed.startsWith("'")) ? trimmed.slice(1) : trimmed;
  return (withoutLeading.endsWith('"') || withoutLeading.endsWith("'")) ? withoutLeading.slice(0, -1) : withoutLeading;
};

const SUPABASE_URL = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_ANON_KEY = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

/**
 * SECTION: Client Initialization
 * Configures the Supabase client with auto-refresh and browser storage keys.
 */
export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

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
