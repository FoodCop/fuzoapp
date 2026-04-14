import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthView } from './AuthView';
import OnboardingV2Flow from './OnboardingV2Flow';
import { LandingPage as LandingView } from '../../landing/components/LandingView';
import type { OnboardingV2Payload } from '../types/onboarding';
import type { AuthUser } from '../types/auth';

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
  const [demoPayload, setDemoPayload] = useState<OnboardingV2Payload | null>(null);
  const [isOnboardingDemo, setIsOnboardingDemo] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location?.search);
    setIsOnboardingDemo(params.get('view') === 'onboarding-demo');
  }, []);

  const handleOnboardingComplete = async (payload?: OnboardingV2Payload) => {
    if (supabase) {
      const metadataUpdate: Record<string, unknown> = {
        onboarding_completed: true,
        has_completed_onboarding: true,
      };

      if (payload) {
        const typeMap: Record<string, string> = {
          'individual': 'Individual',
          'chef': 'Chef',
          'restaurant': 'Restaurant',
          'team': 'Culinary Team'
        };

        const profileType = typeMap[payload.userType] || 'Individual';
        
        metadataUpdate.onboarding_v2 = true;
        metadataUpdate.profile_type = profileType;
        metadataUpdate.profile_subtype = payload.quizResult || null;
        metadataUpdate.onboarding_v2_answers = payload.answers;
        metadataUpdate.quiz_result = payload.quizResult;
        metadataUpdate.phone = payload.phone || null;
        metadataUpdate.location = payload.locationLabel || null;
        metadataUpdate.onboarding_location = payload.location;

        try {
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

      const { data, error } = await supabase.auth.updateUser({
        data: metadataUpdate,
      });

      if (error) {
        console.warn('Failed to persist onboarding metadata:', error.message);
      } else if (data.user) {
        setAuthUser(data.user as AuthUser);
      }
    }

    setIsAuthenticated(true);
    setHasCompletedOnboarding(true);
    setShowAuth(false);
    setTab('feed');
    globalThis.history.replaceState(null, '', `${appPath}?view=feed`);
  };

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

  if (homeRoute && !showAuth) {
    return <LandingView onStart={() => setShowAuth(true)} />;
  }

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
