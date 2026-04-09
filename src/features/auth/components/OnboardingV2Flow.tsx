import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, MapPin, Phone, RefreshCw, ChefHat, Utensils, Users, ArrowRight, Check } from 'lucide-react';
import { 
  ONBOARDING_USER_TYPES, 
  INDIVIDUAL_PATH, 
  CHEF_PATH, 
  RESTAURANT_PATH, 
  TEAM_PATH,
  FOOD_PERSONALITY_QUIZ,
  type OnboardingV2Step,
  type OnboardingV2QuizStep
} from '../constants/onboardingV2Data';
import type { OnboardingLocation, OnboardingV2Payload, UserType } from '../types/onboarding';

const defaultLocation: OnboardingLocation = {
  country: '',
  state: '',
  city: '',
  detected: false,
};

const ONBOARDING_BACKGROUNDS = {
  individual: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
  chef: "https://images.unsplash.com/photo-1550317138-10000687ad32?auto=format&fit=crop&w=1200&q=80",
  restaurant: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
  culinary_team: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&w=1200&q=80",
};

export const OnboardingV2Flow = ({
  onComplete,
  mode = 'live',
}: {
  onComplete: (payload: OnboardingV2Payload) => void;
  mode?: 'live' | 'demo';
}) => {
  const [phase, setPhase] = useState<'type_selection' | 'path' | 'quiz' | 'location'>('type_selection');
  const [userType, setUserType] = useState<UserType | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState<OnboardingLocation>(defaultLocation);
  const [isDetecting, setIsDetecting] = useState(false);

  const currentPath = useMemo(() => {
    if (!userType) return [];
    if (userType === 'individual') return INDIVIDUAL_PATH;
    if (userType === 'chef') return CHEF_PATH;
    if (userType === 'restaurant') return RESTAURANT_PATH;
    return TEAM_PATH;
  }, [userType]);

  const currentStep = currentPath[stepIndex];

  const detectLocation = () => {
    if (!globalThis.navigator?.geolocation) return;
    setIsDetecting(true);
    globalThis.navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation((prev) => ({
          ...prev,
          detected: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
        setIsDetecting(false);
      },
      () => setIsDetecting(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const finalize = () => {
    // Determine personality result based on quiz answers
    let quizResult = '';
    if (userType === 'individual') {
      const counts: Record<string, number> = {};
      Object.values(quizAnswers).forEach(val => counts[val] = (counts[val] || 0) + 1);
      const top = Object.entries(counts).sort((a,b) => b[1] - a[1])[0]?.[0];
      quizResult = top === 'adventurer' ? 'Flavor Explorer 🌶' : 'Culinary Curator 🍱';
    }

    onComplete({
      userType: userType!,
      answers,
      phone: phone.trim(),
      location,
      quizResult,
      locationLabel: [location.city, location.country].filter(Boolean).join(', ') || 'local',
    });
  };

  const handleNext = () => {
    if (phase === 'type_selection') {
      setPhase('path');
      setStepIndex(0);
    } else if (phase === 'path') {
      if (stepIndex < currentPath.length - 1) {
        setStepIndex(prev => prev + 1);
      } else if (userType === 'individual') {
        setPhase('quiz');
      } else {
        setPhase('location');
      }
    } else if (phase === 'quiz') {
      if (quizIndex < FOOD_PERSONALITY_QUIZ.questions.length - 1) {
        setQuizIndex(prev => prev + 1);
      } else {
        setPhase('location');
      }
    }
  };

  const renderIcon = (iconName: string, active: boolean) => {
    const props = { size: 24, className: active ? 'text-yellow-400' : 'text-stone-400' };
    if (iconName === 'ChefHat') return <ChefHat {...props} />;
    if (iconName === 'Utensils') return <Utensils {...props} />;
    if (iconName === 'Users') return <Users {...props} />;
    return <Utensils {...props} />;
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Cinematic Backdrop */}
      <AnimatePresence mode="wait">
        <motion.div
           key={userType || 'initial'}
           initial={{ opacity: 0 }}
           animate={{ opacity: 0.3 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 1.5 }}
           className="absolute inset-0 z-0"
        >
          <img 
            src={userType ? ONBOARDING_BACKGROUNDS[userType] : "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80"} 
            className="w-full h-full object-cover blur-sm scale-110" 
            alt="" 
          />
          <div className="absolute inset-0 bg-stone-950/60" />
        </motion.div>
      </AnimatePresence>

      <div className="w-full max-w-xl bg-white p-8 sm:p-12 md:p-16 rounded-[3rem] sm:rounded-[4rem] shadow-2xl border-4 border-white space-y-8 relative z-10">
        <AnimatePresence mode="wait">
          {phase === 'type_selection' ? (
            <motion.div key="selection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">How will you use FUZO?</h2>
                <p className="text-stone-400 font-bold">Pick your starting grid.</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {ONBOARDING_USER_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => { setUserType(type.id as UserType); handleNext(); }}
                    className="p-6 bg-stone-50 rounded-[2rem] border-2 border-transparent hover:border-yellow-400 hover:bg-white transition-all text-left group flex items-center gap-6"
                  >
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-stone-900 transition-colors">
                      {renderIcon(type.icon, false)}
                    </div>
                    <div>
                      <span className="font-black uppercase tracking-widest text-sm block">{type.label}</span>
                      <span className="text-xs text-stone-400 font-bold">{type.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : phase === 'path' ? (
            <motion.div key={`step-${stepIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="flex justify-between items-center">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-stone-100 text-stone-500">
                  Step {stepIndex + 1} of {currentPath.length}
                </span>
                <div className="flex gap-1">
                  {currentPath.map((_, i) => (
                    <div key={i} className={`w-6 h-1 rounded-full ${i <= stepIndex ? 'bg-yellow-400' : 'bg-stone-100'}`} />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{currentStep.title}</h2>
                <p className="text-stone-400 font-bold">{currentStep.desc}</p>
              </div>

              {currentStep.type === 'choice' && (
                <div className="grid grid-cols-1 gap-3">
                  {currentStep.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setAnswers(prev => ({ ...prev, [currentStep.id]: opt }));
                        handleNext();
                      }}
                      className="p-6 bg-stone-50 rounded-[2rem] border-2 border-transparent hover:border-yellow-400 hover:bg-white transition-all text-left flex justify-between items-center group"
                    >
                      <span className="font-black uppercase tracking-widest text-xs">{opt}</span>
                      <ChevronRight size={18} className="text-stone-300 group-hover:text-yellow-400" />
                    </button>
                  ))}
                </div>
              )}

              {currentStep.type === 'multichoice' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    {currentStep.options.map((opt) => {
                      const isSelected = (answers[currentStep.id] || []).includes(opt);
                      return (
                        <button
                          key={opt}
                          onClick={() => {
                            const current = answers[currentStep.id] || [];
                            const next = isSelected ? current.filter((i: string) => i !== opt) : [...current, opt];
                            setAnswers(prev => ({ ...prev, [currentStep.id]: next }));
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all text-center ${isSelected ? 'bg-stone-900 border-stone-900 text-white' : 'bg-stone-50 border-transparent hover:border-stone-200'}`}
                        >
                          <span className="font-black uppercase tracking-widest text-[10px]">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleNext}
                    disabled={!(answers[currentStep.id]?.length > 0)}
                    className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              )}
            </motion.div>
          ) : phase === 'quiz' ? (
            <motion.div key={`quiz-${quizIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-stone-900 shadow-sm"><Check size={20} strokeWidth={3} /></div>
                  <h2 className="text-2xl font-black uppercase tracking-widest text-stone-300">Culinary DNA</h2>
                </div>
                <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">{FOOD_PERSONALITY_QUIZ.questions[quizIndex].question}</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {FOOD_PERSONALITY_QUIZ.questions[quizIndex].options.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      setQuizAnswers(prev => ({ ...prev, [FOOD_PERSONALITY_QUIZ.questions[quizIndex].id]: opt.value }));
                      handleNext();
                    }}
                    className="p-6 bg-stone-50 rounded-[2rem] border-2 border-transparent hover:border-stone-900 hover:bg-white transition-all text-left flex justify-between items-center group"
                  >
                    <span className="font-black uppercase tracking-widest text-xs">{opt.label}</span>
                    <ArrowRight size={18} className="text-stone-300 group-hover:text-stone-900" />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="location" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Last Grid</h2>
                <p className="text-stone-400 font-bold">Where are you scouting from?</p>
              </div>

              {location.detected ? (
                <div className="p-8 bg-stone-900 rounded-[2.5rem] border-2 border-stone-800 flex items-center gap-6 text-white shadow-2xl">
                  <div className="w-14 h-14 bg-yellow-400 rounded-2xl flex items-center justify-center text-stone-900">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Detected Grid</p>
                    <p className="text-xl font-black">Scouting locally</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={detectLocation}
                  disabled={isDetecting}
                  className="w-full p-10 bg-stone-50 rounded-[3rem] border-4 border-dashed border-stone-200 flex flex-col items-center justify-center gap-4 group hover:border-yellow-400 transition-all"
                >
                  <div className={`p-6 rounded-3xl ${isDetecting ? 'bg-yellow-400 text-stone-900 animate-pulse' : 'bg-white text-stone-400 group-hover:text-yellow-400 shadow-sm'}`}>
                    {isDetecting ? <RefreshCw className="animate-spin" size={32} /> : <MapPin size={32} />}
                  </div>
                  <p className="font-black uppercase tracking-widest text-[10px]">{isDetecting ? 'Detecting...' : 'Auto-Detect Grid'}</p>
                </button>
              )}

              <div className="space-y-4 pt-4">
                <button
                  onClick={finalize}
                  className="w-full py-6 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                >
                  Go Live
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default OnboardingV2Flow;
