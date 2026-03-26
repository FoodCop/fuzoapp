import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { Badge } from '../../../shared/ui/Badge';
import { SocialButton, type SocialProvider } from '../../../shared/ui/SocialButton';
import { AuthService } from '../services/authService';
import { getOAuthRedirectUrl, authDebugLog } from '../lib/oauthRedirect';
import type { AuthUser } from '../types/auth';
import OnboardingV2Flow from './OnboardingV2Flow';
import type { OnboardingV2Payload } from '../types/onboarding';

const AUTH_ONBOARDING_DATA = [
  {
    title: "Culinary Identity",
    desc: "Define your role in the neural dining ecosystem.",
    options: ["Home Enthusiast", "Professional Chef", "Food Architect", "Restaurant Critic"]
  },
  {
    title: "Flavor Profile",
    desc: "Calibrate your taste buds for personalized discovery.",
    options: ["High-Tech Fusion", "Sustainable Organic", "Traditional Heritage", "Experimental Labs"]
  },
  {
    title: "Discovery Mode",
    desc: "How do you prefer to explore the world of food?",
    options: ["Visual First", "Data-Driven", "Community Rated", "Neural Recommended"]
  }
];

export const AuthView = ({
  onComplete,
  initialStep = 'signin',
  useOnboardingV2 = false,
}: {
  onComplete: (payload?: OnboardingV2Payload) => void;
  initialStep?: 'signin' | 'signup' | 'onboarding';
  useOnboardingV2?: boolean;
}) => {
  const [step, setStep] = useState<'signin' | 'signup' | 'onboarding'>(initialStep);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  const userNeedsOnboarding = (user: { user_metadata?: Record<string, unknown> } | null | undefined): boolean => {
    const metadata = user?.user_metadata;
    if (!metadata || typeof metadata !== 'object') return true;
    return !Boolean(metadata.onboarding_completed || metadata.has_completed_onboarding);
  };

  const handleSocialSignIn = async (provider: SocialProvider) => {
    setAuthError('');
    setAuthMessage('');
    setAuthLoading(true);
    try {
      await AuthService.signInWithOAuth(provider);
    } catch (error: any) {
      setAuthError(error.message);
      setAuthLoading(false);
    }
  };

  const completeEmailAuth = async () => {
    if (!supabase) return;
    
    setAuthError('');
    setAuthMessage('');
    setAuthLoading(true);

    try {
      if (step === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) {
          if (userNeedsOnboarding(data.session.user)) setStep('onboarding');
          else onComplete();
        }
      } else {
        if (!name.trim()) throw new Error('Please enter your display name.');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name.trim(), full_name: name.trim() } },
        });
        if (error) throw error;
        if (data.session) setStep('onboarding');
        else {
          setAuthMessage('Account created. Please verify your email, then sign in.');
          setStep('signin');
        }
      }
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  if (step === 'onboarding') {
    if (useOnboardingV2) {
      return <OnboardingV2Flow onComplete={onComplete} />;
    }

    const current = AUTH_ONBOARDING_DATA[onboardingStep];
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <motion.div 
          key={onboardingStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-xl bg-white p-12 md:p-16 rounded-[4rem] shadow-2xl border-4 border-white space-y-10"
        >
          <div className="flex justify-between items-center">
            <Badge color="yellow">Step {onboardingStep + 1} of 3</Badge>
            <div className="flex gap-1">
              {[0,1,2].map(i => <div key={i} className={`w-8 h-1.5 rounded-full ${i <= onboardingStep ? 'bg-yellow-400' : 'bg-stone-100'}`} />)}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{current.title}</h2>
            <p className="text-stone-400 font-bold text-lg">{current.desc}</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {current.options.map(opt => (
              <button 
                key={opt}
                onClick={async () => {
                  if (onboardingStep < 2) setOnboardingStep(onboardingStep + 1);
                  else {
                    // Update metadata as completed
                    if (supabase) {
                      await supabase.auth.updateUser({
                        data: { onboarding_completed: true }
                      });
                    }
                    onComplete();
                  }
                }}
                className="p-8 bg-stone-50 rounded-[2.5rem] border-2 border-transparent hover:border-yellow-400 hover:bg-white transition-all text-left group"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black uppercase tracking-widest text-sm">{opt}</span>
                  <ChevronRight size={20} className="text-stone-200 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#facc15_0%,transparent_70%)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white p-12 md:p-16 rounded-[4rem] shadow-2xl relative z-10 space-y-10"
      >
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-stone-900 rounded-3xl flex items-center justify-center text-yellow-400 shadow-xl mx-auto mb-8 rotate-3">
            <ChefHat size={40} />
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">
            {step === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-stone-400 font-bold text-sm">Access your neural culinary studio.</p>
        </div>

        {/* Social Auth Hub */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <SocialButton 
              provider="google" 
              onClick={() => handleSocialSignIn('google')}
              isLoading={authLoading}
            />
            <div className="grid grid-cols-2 gap-4">
              <SocialButton 
                provider="apple" 
                onClick={() => handleSocialSignIn('apple')}
                isLoading={authLoading}
              />
              <SocialButton 
                provider="facebook" 
                onClick={() => handleSocialSignIn('facebook')}
                isLoading={authLoading}
              />
            </div>
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-100" /></div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="bg-white px-4 text-stone-300">Or continue with email</span>
            </div>
          </div>

          <div className="space-y-4">
            {step === 'signup' && (
              <input 
                type="text" 
                placeholder="DISPLAY NAME" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full px-8 py-5 bg-stone-50 rounded-[2rem] border-2 border-transparent focus:border-yellow-400 focus:bg-white transition-all font-black uppercase tracking-widest text-[10px] outline-none"
              />
            )}
            <input 
              type="email" 
              placeholder="EMAIL ADDRESS" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full px-8 py-5 bg-stone-50 rounded-[2rem] border-2 border-transparent focus:border-yellow-400 focus:bg-white transition-all font-black uppercase tracking-widest text-[10px] outline-none"
            />
            <input 
              type="password" 
              placeholder="PASSWORD" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full px-8 py-5 bg-stone-50 rounded-[2rem] border-2 border-transparent focus:border-yellow-400 focus:bg-white transition-all font-black uppercase tracking-widest text-[10px] outline-none"
            />
            
            {authError && (
              <p className="text-red-500 font-black uppercase tracking-widest text-[9px] text-center px-4">
                {authError}
              </p>
            )}
            {authMessage && (
              <p className="text-emerald-500 font-black uppercase tracking-widest text-[9px] text-center px-4">
                {authMessage}
              </p>
            )}

            <button 
              onClick={completeEmailAuth}
              disabled={authLoading}
              className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              {authLoading ? <Loader2 className="animate-spin" size={16} /> : (step === 'signin' ? 'Secure Login' : 'Create Studio')}
            </button>
          </div>
        </div>

        <div className="text-center pt-4">
          <button 
            onClick={() => setStep(step === 'signin' ? 'signup' : 'signin')}
            className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors"
          >
            {step === 'signin' ? "Don't have an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
