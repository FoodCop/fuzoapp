/**
 * ============================================================================
 * AUTH SESSION ORCHESTRATION HOOK — Identity Management
 * ============================================================================
 * 
 * This hook acts as the primary bridge between the Supabase Authentication 
 * engine and the React UI state. It ensures that the user's session is 
 * synchronized across tabs and browser refreshes.
 * 
 * Core Capabilities:
 * 1. Session Bootstrapping: Checks for existing local storage sessions on mount.
 * 2. Real-time Sync: Subscribes to auth state changes (SignIn, SignOut, Refresh).
 * 3. Onboarding Guard: Derives the user's onboarding completion status 
 *    directly from OAuth metadata.
 */

import { useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import type { AuthUser } from '../../features/auth/types/auth';

/**
 * SECTION: Identity Normalization
 * Logic: Checks if the user has finalized their culinary profile.
 * Supports legacy and V2 metadata keys for maximum compatibility.
 */
const isOnboardingCompleted = (user: AuthUser | null | undefined): boolean => {
  const metadata = user?.user_metadata;
  if (!metadata || typeof metadata !== 'object') {
    return false;
  }

  return Boolean(
    metadata.onboarding_completed
    || metadata.has_completed_onboarding,
  );
};

/**
 * SECTION: Synchronization Logic
 * Orchestrates the auth sequence: Bootstrap -> Subscription -> Cleanup.
 */
export const useAuthSessionSync = ({
  setAuthBooting,
  setIsAuthenticated,
  setAuthUser,
  setShowAuth,
  setHasCompletedOnboarding,
}: {
  setAuthBooting: (value: boolean) => void;
  setIsAuthenticated: (value: boolean) => void;
  setAuthUser: (value: AuthUser | null) => void;
  setShowAuth: (value: boolean) => void;
  setHasCompletedOnboarding: (value: boolean) => void;
}) => {
  useEffect(() => {
    if (!supabase) {
      setAuthBooting(false);
      return;
    }

    let active = true;

    // 1. Bootstrap: Fetch the current session from local storage asynchronously
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const hasSession = !!data.session;
      const completedOnboarding = isOnboardingCompleted(data.session?.user);
      setIsAuthenticated(hasSession);
      setAuthUser(data.session?.user ?? null);
      setHasCompletedOnboarding(hasSession && completedOnboarding);
      setShowAuth(hasSession && !completedOnboarding);
      setAuthBooting(false);
    });

    // 2. Real-time Subscription: Listen for changes across other tabs or auth actions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      
      const hasSession = !!session;
      const completedOnboarding = isOnboardingCompleted(session?.user);
      setIsAuthenticated(hasSession);
      setAuthUser(session?.user ?? null);
      setHasCompletedOnboarding(hasSession && completedOnboarding);
      setShowAuth(hasSession && !completedOnboarding);
    });

    // 3. Cleanup: Unsubscribe to prevent memory leaks and redundant state updates
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [setAuthBooting, setAuthUser, setHasCompletedOnboarding, setIsAuthenticated, setShowAuth]);
};
