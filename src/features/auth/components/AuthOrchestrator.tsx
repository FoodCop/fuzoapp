import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthView } from './AuthView';
import OnboardingV2Flow from './OnboardingV2Flow';
import { LandingPage as LandingView } from '../../landing/components/LandingView';
import type { OnboardingV2Payload } from '../types/onboarding';
import type { AuthUser } from '../types/auth';

/**
 * SECTION: AuthOrchestrator Component
 * The central logic hub for managing the transition between Landing, Authentication, and Onboarding.
 * It ensures that users are correctly gated and that their profile metadata is synchronized across
 * Supabase Auth and the public 'users' table.
 */
interface AuthOrchestratorProps {
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  showAuth: boolean;
  setAuthUser: (user: AuthUser | null) => void;
  setIsAuthenticated: (val: boolean) => void;
  setHasCompletedOnboarding: (val: boolean) => void;
  setShowAuth: (val: boolean) => void;
  setTab: (tab: string) => void;
  onboardingV2Enabled: boolean;
  appPath: string;
  homeUrl: string;
  homeRoute: boolean;
  appRoute: boolean;
  authCallbackRoute: boolean;
}

export const AuthOrchestrator: React.FC<AuthOrchestratorProps> = ({
  isAuthenticated,
  hasCompletedOnboarding,
  showAuth,
  setAuthUser,
  setIsAuthenticated,
  setHasCompletedOnboarding,
  setShowAuth,
  setTab,
  onboardingV2Enabled,
  appPath,
  homeUrl,
  homeRoute,
  appRoute,
  authCallbackRoute,
}) => {
  // STATE: Payload for the Onboarding V2 demo mode
  const [demoPayload, setDemoPayload] = useState<OnboardingV2Payload | null>(null);
  const [isOnboardingDemo, setIsOnboardingDemo] = useState(false);

  // LOGIC: Check if the application is in 'demo' mode via URL parameters
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location?.search);
    setIsOnboardingDemo(params.get('view') === 'onboarding-demo');
  }, []);

  /**
   * SECTION: handleOnboardingComplete
   * Finalizes the onboarding process by persisting user preferences to both Supabase Auth 
   * and the primary database. Synchronizes profiles types (Chef, Individual, etc.).
   */
  const handleOnboardingComplete = async (payload?: OnboardingV2Payload) => {
    if (supabase) {
      const metadataUpdate: Record<string, unknown> = {
        onboarding_completed: true,
        has_completed_onboarding: true,
      };

      if (payload) {
        // Normalizing the UI-friendly type IDs to database-friendly display names
        const typeMap: Record<string, string> = {
          'individual': 'Individual',
          'chef': 'Chef',
          'restaurant': 'Restaurant',
          'team': 'Culinary Team'
        };

        const profileType = typeMap[payload.userType] || 'Individual';
        
        // Constructing the complex metadata object for AI personalization
        metadataUpdate.onboarding_v2 = true;
        metadataUpdate.profile_type = profileType;
        metadataUpdate.profile_subtype = payload.quizResult || null;
        metadataUpdate.onboarding_v2_answers = payload.answers;
        metadataUpdate.quiz_result = payload.quizResult;
        metadataUpdate.phone = payload.phone || null;
        metadataUpdate.location = payload.locationLabel || null;
        metadataUpdate.onboarding_location = payload.location;

        try {
          // SUB-SECTION: Relational Sync
          // Updates the 'public.users' table to ensure community features (Leaderboard, Chat) 
          // have access to corrected profile metadata without needing an Auth Admin key.
          const { data: userResponse } = await supabase.auth.getUser();
          const userId = userResponse.user?.id;

          if (userId) {
            const { error: dbError } = await supabase
              .from('users')
              .update({
                profile_type: profileType,
                profile_subtype: payload.quizResult || null,
                phone: payload.phone || null,
                location: payload.locationLabel || null,
                cuisine_preferences: payload.answers?.cuisines || [],
                dietary_preferences: payload.answers?.dietary ? [payload.answers.dietary] : [],
                onboarding_completed: true,
                onboarding_v2_metadata: payload
              })
              .eq('id', userId);

            if (dbError) {
              console.error('Failed to sync onboarding to database:', dbError.message);
            }
          }
        } catch (err) {
          console.error('Database sync error:', err);
        }
      }

      // Final step: Persist to Supabase Auth User Metadata
      const { data, error } = await supabase.auth.updateUser({
        data: metadataUpdate,
      });

      if (error) {
        console.warn('Failed to persist onboarding metadata:', error.message);
      } else if (data.user) {
        setAuthUser(data.user as AuthUser);
      }
    }

    // SECTION: Post-Onboarding Transition
    setIsAuthenticated(true);
    setHasCompletedOnboarding(true);
    setShowAuth(false);
    setTab('feed');
    globalThis.history.replaceState(null, '', `${appPath}?view=feed`);
  };

  /**
   * SECTION: Conditional UI Rendering
   * Handles various states: Demo Mode, Landing Page, and the Auth/Onboarding Wizard.
   */

  // 1. Onboarding Demo View (Sanctity testing for the designer)
  if (isOnboardingDemo) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-6xl mx-auto px-6 pt-10 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[12px] font-black uppercase tracking-widest text-stone-400">Client Preview</p>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-stone-900">Onboarding V2 Demo</h1>
            </div>
            <button
              type="button"
              onClick={() => {
                setDemoPayload(null);
                setTab('feed');
                globalThis.history.replaceState(null, '', `${appPath}?view=feed`);
                setIsOnboardingDemo(false);
              }}
              className="px-4 py-2 rounded-2xl bg-stone-900 text-white text-[12px] font-black uppercase tracking-widest"
            >
              Exit Demo
            </button>
          </div>
        </div>

        <OnboardingV2Flow
          mode="demo"
          onComplete={(payload) => {
            setDemoPayload(payload);
          }}
        />

        {demoPayload && (
          <div className="max-w-3xl mx-auto px-6 pb-12">
            <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm">
              <p className="text-[12px] font-black uppercase tracking-widest text-stone-400 mb-3">Latest Demo Submission</p>
              <pre className="text-xs text-stone-700 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(demoPayload, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Landing Mode (Cinematic Intro)
  if (homeRoute && !showAuth) {
    return <LandingView onStart={() => setShowAuth(true)} />;
  }

  // 3. Auth/Onboarding Wizard
  if (showAuth && !hasCompletedOnboarding) {
    return (
      <AuthView
        initialStep={isAuthenticated ? 'onboarding' : 'signin'}
        useOnboardingV2={onboardingV2Enabled}
        onComplete={(payload) => {
          handleOnboardingComplete(payload).catch((error) => {
            console.warn('Onboarding completion failed:', error);
            setIsAuthenticated(true);
            setHasCompletedOnboarding(true);
            setShowAuth(false);
            setTab('feed');
            globalThis.history.replaceState(null, '', `${appPath}?view=feed`);
          });
        }}
      />
    );
  }

  return null;
};

export default AuthOrchestrator;
