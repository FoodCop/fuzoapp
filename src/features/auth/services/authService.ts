import { supabase } from '../../../services/supabaseClient';
import { getOAuthRedirectUrl, authDebugLog } from '../lib/oauthRedirect';

export type AuthProvider = 'google' | 'apple' | 'facebook';

export const AuthService = {
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

  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
};
