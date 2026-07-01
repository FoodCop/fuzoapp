import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, MapPin, Phone, RefreshCw, ChefHat, Utensils, Users, ArrowRight, Check, Upload, Image, FileText } from 'lucide-react';
import { 
  ONBOARDING_USER_TYPES, 
  INDIVIDUAL_PATH, 
  CHEF_PATH, 
  PRIVATE_CHEF_PATH,
  RESTAURANT_PATH, 
  TEAM_PATH,
  TASTE_PROFILE_MODULES,
  type OnboardingV2Step,
  type OnboardingV2FormStep,
  type OnboardingV2MediaStep
} from '../constants/onboardingV2Data';
import { AuthService } from '../services/authService';
import type { OnboardingLocation, OnboardingV2Payload, UserType, TasteProfileAnswers } from '../types/onboarding';
import { InstagramMark, FacebookMark } from '../../../shared/ui/SocialIcons';

/**
 * SECTION: OnboardingV2 Constants & Initial State
 * Defines the default location and high-fidelity background imagery for each persona.
 */
const defaultLocation: OnboardingLocation = {
  country: '',
  state: '',
  city: '',
  detected: false,
};

const ONBOARDING_BACKGROUNDS = {
  individual: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
  chef: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80",
  private_chef: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80",
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  culinary_team: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&w=1200&q=80",
};

/**
 * SECTION: TasteProfileFlow Component
 * A multi-stage immersive wizard that configures the user's "Culinary DNA".
 * Handles persona selection, custom questionnaire paths, media uploads, and geolocation.
 */

interface TasteProfileFlowProps {
  onComplete: (payload: OnboardingV2Payload) => void;
  mode?: 'live' | 'demo'; // demo mode bypasses final sync
}

export const TasteProfileFlow = ({ 
  onComplete,
  mode = 'live'
}: TasteProfileFlowProps) => {
  // --- STATE: Flow Coordination ---
  const [phase, setPhase] = useState<'location' | 'type_selection' | 'path' | 'taste_profile_hub' | 'taste_profile_module'>('location');
  const [userType, setUserType] = useState<UserType | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  
  // --- STATE: Data Collection ---
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [tasteProfileAnswers, setTasteProfileAnswers] = useState<TasteProfileAnswers>({});
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [moduleQuestionIndex, setModuleQuestionIndex] = useState(0);
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState<OnboardingLocation>(defaultLocation);
  
  // --- STATE: Feedback & Animation ---
  const [isDetecting, setIsDetecting] = useState(false);
  const [mediaUploaded, setMediaUploaded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // LOGIC: Selects the feature path based on user persona (Individual vs Pro)
  const currentPath = useMemo(() => {
    if (!userType) return [];
    if (userType === 'individual') return INDIVIDUAL_PATH;
    if (userType === 'chef') return CHEF_PATH;
    if (userType === 'private_chef') return PRIVATE_CHEF_PATH;
    if (userType === 'restaurant') return RESTAURANT_PATH;
    return TEAM_PATH;
  }, [userType]);

  const currentStep = currentPath[stepIndex] || currentPath[currentPath.length - 1];

  // LOGIC: Browser Geolocation Integration
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

  /**
   * SECTION: finalize Logic
   * Aggregates all collected data and calculated personality results into a single payload
   * for the AuthOrchestrator to persist.
   */
  const finalize = () => {
    let quizResult = '';
    if (userType === 'individual') {
      const allVals = Object.values(tasteProfileAnswers.discovery || {}).concat(Object.values(tasteProfileAnswers.mood || {}));
      const counts: Record<string, number> = {};
      allVals.forEach(val => {
        if (typeof val === 'string') counts[val] = (counts[val] || 0) + 1;
        if (Array.isArray(val)) val.forEach(v => counts[v] = (counts[v] || 0) + 1);
      });
      const top = Object.entries(counts).sort((a,b) => b[1] - a[1])[0]?.[0];
      quizResult = top ? 'Flavor Explorer 🌶' : 'Culinary Curator 🍱';
    }

    onComplete({
      userType: userType!,
      answers,
      phone: phone.trim(),
      location,
      quizResult,
      locationLabel: [location.city, location.country].filter(Boolean).join(', ') || 'local',
      tasteProfile: tasteProfileAnswers,
    });
  };

  /**
   * SECTION: Navigation Engine
   * Manages transitions between the 4 major phases: Selection -> Feature Path -> Quiz -> Location.
   */
  const handleNext = () => {
    if (phase === 'location') {
      setPhase('type_selection');
    } else if (phase === 'type_selection') {
      setPhase('path');
      setStepIndex(0);
    } else if (phase === 'path') {
      setStepIndex(prev => {
        if (prev < currentPath.length - 1) {
          return prev + 1;
        } else {
          // If already at the end, transition to next phase
          if (userType === 'individual') {
            setPhase('taste_profile_hub');
          } else {
            finalize();
          }
          return prev;
        }
      });
    }
  };

  // UI HELPER: Mapping icon strings to Lucide components
  const renderIcon = (iconName: string, active: boolean) => {
    const props = { size: 24, className: active ? 'text-yellow-400' : 'text-stone-400' };
    if (iconName === 'ChefHat') return <ChefHat {...props} />;
    if (iconName === 'Utensils') return <Utensils {...props} />;
    if (iconName === 'Users') return <Users {...props} />;
    return <Utensils {...props} />;
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      
      {/* SECTION: Dynamic Backdrop 
          Changes theme based on the selected persona to provide instant visual feedback.
      */}
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
            alt="Onboarding Background" 
          />
          <div className="absolute inset-0 bg-stone-950/60" />
        </motion.div>
      </AnimatePresence>

      <div className="w-full max-w-xl bg-white p-8 sm:p-12 md:p-16 rounded-[3rem] sm:rounded-[4rem] shadow-2xl border-4 border-white space-y-8 relative z-10">
        <AnimatePresence mode="wait">
          
          {/* PHASE 1: Persona Selection */}
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
          
          /* PHASE 2: Linear Step-by-Step Configuration */
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
                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{currentStep?.title}</h2>
                <p className="text-stone-400 font-bold">{currentStep?.desc}</p>
              </div>

              {/* Sub-Type: Single-Choice Selection */}
              {currentStep?.type === 'choice' && (
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

              {/* Sub-Type: Multi-Choice Selection (Array persistence) */}
              {currentStep?.type === 'multichoice' && (
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

              {/* Sub-Type: Form Data Collection */}
              {currentStep?.type === 'form' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-5">
                    {(currentStep as OnboardingV2FormStep).fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">
                          {field.label}
                        </label>
                        <div className="relative">
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={answers[field.id] || ''}
                            onChange={(e) => {
                              setAnswers(prev => ({ ...prev, [field.id]: e.target.value }));
                            }}
                            className="w-full p-5 pl-12 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-stone-900 focus:bg-white transition-all text-sm font-bold placeholder:text-stone-300 outline-none"
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                            {field.id.includes('name') || field.id.includes('contact') ? <Users size={18} /> : 
                             field.id.includes('cuisine') || field.id.includes('specialty') ? <Utensils size={18} /> : 
                             <FileText size={18} />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleNext}
                    disabled={!(currentStep as OnboardingV2FormStep).fields.every(f => answers[f.id]?.trim().length > 0)}
                    className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Sub-Type: Media Portfolio / CV Sync */}
              {currentStep?.type === 'media' && (
                <div className="space-y-6">
                  <div 
                    onClick={() => {
                      if (mediaUploaded) return;
                      // Simulation of secure file upload logic
                      setUploadProgress(10);
                      const interval = setInterval(() => {
                        setUploadProgress(prev => {
                          if (prev >= 100) {
                            clearInterval(interval);
                            setMediaUploaded(true);
                            return 100;
                          }
                          return prev + 15;
                        });
                      }, 200);
                    }}
                    className={`group relative p-10 bg-stone-50 rounded-[3rem] border-4 border-dashed transition-all flex flex-col items-center justify-center gap-4 cursor-pointer ${mediaUploaded ? 'border-green-400 bg-green-50/20' : 'border-stone-200 hover:border-yellow-400'}`}
                  >
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-[2.8rem] z-20">
                        <div className="w-1/2 h-2 bg-stone-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            className="h-full bg-stone-900"
                          />
                        </div>
                      </div>
                    )}

                    <div className={`p-6 rounded-3xl transition-transform group-hover:scale-110 ${mediaUploaded ? 'bg-green-400 text-white' : 'bg-white text-stone-400 shadow-sm group-hover:text-yellow-400'}`}>
                      {mediaUploaded ? <Check size={32} strokeWidth={3} /> : <Upload size={32} />}
                    </div>
                    
                    <div className="text-center">
                      <p className="font-black uppercase tracking-widest text-[10px] text-stone-900">
                        {mediaUploaded ? 'Assets Received' : 'Select Media Files'}
                      </p>
                      <p className="text-[10px] text-stone-400 font-bold mt-1">
                        {mediaUploaded ? 'Signatures and portfolios synced' : 'Drag & drop photos or PDFs'}
                      </p>
                    </div>

                    {mediaUploaded && (
                      <div className="mt-4 flex gap-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-10 h-10 rounded-lg bg-stone-200 animate-pulse" />
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setMediaUploaded(false);
                      setUploadProgress(0);
                      handleNext();
                    }}
                    disabled={!mediaUploaded}
                    className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>Sync Portfolio</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* Sub-Type: Social Sync (Meta API) */}
              {currentStep?.type === 'social' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-4">
                    {currentStep.providers.includes('instagram') && (
                      <button
                        onClick={async () => {
                          try {
                            // Instagram is often handled via Facebook Login for Business or Basic Display
                            // Here we use the Facebook provider which usually includes Instagram permissions
                            await AuthService.signInWithOAuth('facebook');
                          } catch (err) {
                            console.error('Social sync error:', err);
                          }
                        }}
                        className="p-8 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white rounded-[2.5rem] shadow-xl hover:scale-[1.02] transition-all flex items-center gap-6 group"
                      >
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                          <InstagramMark className="w-8 h-8 fill-white" />
                        </div>
                        <div className="text-left">
                          <p className="font-black uppercase tracking-widest text-sm">Sync with Instagram</p>
                          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1 italic">Pull bio, avatar & name</p>
                        </div>
                        <ArrowRight size={20} className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}

                    {currentStep.providers.includes('facebook') && (
                      <button
                        onClick={async () => {
                          try {
                            await AuthService.signInWithOAuth('facebook');
                          } catch (err) {
                            console.error('Social sync error:', err);
                          }
                        }}
                        className="p-8 bg-[#1877F2] text-white rounded-[2.5rem] shadow-xl hover:scale-[1.02] transition-all flex items-center gap-6 group"
                      >
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                          <FacebookMark className="w-8 h-8 fill-white" />
                        </div>
                        <div className="text-left">
                          <p className="font-black uppercase tracking-widest text-sm">Connect Facebook</p>
                          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1 italic">Enrich profile data</p>
                        </div>
                        <ArrowRight size={20} className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleNext}
                    className="w-full py-4 text-stone-400 font-black uppercase tracking-widest text-[10px] hover:text-stone-900 transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              )}
            </motion.div>
          
          /* PHASE 3: Taste Profile Hub & Modules */
          ) : phase === 'taste_profile_hub' ? (
            <motion.div key="hub" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-stone-900 shadow-sm"><Check size={20} strokeWidth={3} /></div>
                  <h2 className="text-2xl font-black uppercase tracking-widest text-stone-300">Taste Profile</h2>
                </div>
                <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">Map your palate.</h3>
                <p className="text-stone-400 font-bold">Complete modules to enhance your food recommendations.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TASTE_PROFILE_MODULES.map((mod) => {
                  const modAnswers = tasteProfileAnswers[mod.key] || {};
                  const answeredCount = Object.keys(modAnswers).length;
                  const totalCount = mod.questions.length;
                  const isComplete = answeredCount === totalCount;
                  
                  return (
                    <button
                      key={mod.id}
                      onClick={() => {
                        setActiveModuleId(mod.id);
                        setModuleQuestionIndex(0);
                        setPhase('taste_profile_module');
                      }}
                      className="p-6 bg-stone-50 rounded-[2rem] border-2 border-transparent hover:border-yellow-400 hover:bg-white transition-all text-left flex flex-col gap-2 group"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-3xl">{mod.emoji}</span>
                        {isComplete && <CheckCircle2 size={24} className="text-green-500" />}
                      </div>
                      <span className="font-black uppercase tracking-widest text-xs mt-2">{mod.title}</span>
                      <span className="text-[10px] text-stone-400 font-bold">{isComplete ? 'Complete' : `${answeredCount}/${totalCount} Questions`}</span>
                    </button>
                  );
                })}
              </div>
              
              <div className="pt-4 border-t border-stone-100">
                <button
                  onClick={() => finalize()}
                  className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors"
                >
                  <span>Finish & Go Live</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          
          ) : phase === 'taste_profile_module' ? (
            <motion.div key={`module-${activeModuleId}-${moduleQuestionIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              {(() => {
                const mod = TASTE_PROFILE_MODULES.find(m => m.id === activeModuleId);
                const q = mod?.questions[moduleQuestionIndex];
                if (!mod || !q) return null;
                
                const currentAns = tasteProfileAnswers[mod.key]?.[q.id];
                
                const handleAnswer = (val: any) => {
                  setTasteProfileAnswers(prev => ({
                    ...prev,
                    [mod.key]: {
                      ...(prev[mod.key] || {}),
                      [q.id]: val
                    }
                  }));
                };
                
                const handleNextQuestion = () => {
                  if (moduleQuestionIndex < mod.questions.length - 1) {
                    setModuleQuestionIndex(prev => prev + 1);
                  } else {
                    setPhase('taste_profile_hub');
                  }
                };

                return (
                  <>
                    <div className="flex justify-between items-center">
                      <button onClick={() => setPhase('taste_profile_hub')} className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 flex items-center gap-1">
                        ← Back to Hub
                      </button>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-stone-100 text-stone-500">
                        {mod.title} • Q{moduleQuestionIndex + 1}/{mod.questions.length}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-3xl font-black uppercase tracking-tighter leading-tight">{q.text}</h3>
                      {('helper' in q) && q.helper && <p className="text-stone-400 font-bold">{q.helper}</p>}
                    </div>
                    
                    {q.type === 'single' && (
                      <div className="grid grid-cols-1 gap-3">
                        {q.options.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => {
                              handleAnswer(opt);
                              setTimeout(handleNextQuestion, 250);
                            }}
                            className={`p-6 rounded-[2rem] border-2 transition-all text-left flex justify-between items-center group ${currentAns === opt ? 'bg-stone-900 border-stone-900 text-white' : 'bg-stone-50 border-transparent hover:border-yellow-400 hover:bg-white text-stone-900'}`}
                          >
                            <span className="font-black uppercase tracking-widest text-xs">{opt}</span>
                            <ChevronRight size={18} className={currentAns === opt ? 'text-white' : 'text-stone-300 group-hover:text-yellow-400'} />
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {q.type === 'multi' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                          {q.options.map((opt) => {
                            const ansArray: string[] = Array.isArray(currentAns) ? currentAns : [];
                            const isSelected = ansArray.includes(opt);
                            const atMax = !isSelected && ansArray.length >= q.max;
                            return (
                              <button
                                key={opt}
                                disabled={atMax}
                                onClick={() => {
                                  const next = isSelected ? ansArray.filter(v => v !== opt) : [...ansArray, opt];
                                  handleAnswer(next);
                                }}
                                className={`p-4 rounded-2xl border-2 transition-all text-center ${isSelected ? 'bg-stone-900 border-stone-900 text-white' : atMax ? 'bg-stone-50 border-transparent opacity-50 cursor-not-allowed' : 'bg-stone-50 border-transparent hover:border-stone-200'}`}
                              >
                                <span className="font-black uppercase tracking-widest text-[10px]">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={handleNextQuestion}
                          disabled={q.requireExact ? (Array.isArray(currentAns) ? currentAns.length !== q.max : true) : (Array.isArray(currentAns) ? currentAns.length === 0 : true)}
                          className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50"
                        >
                          Continue
                        </button>
                      </div>
                    )}

                    {q.type === 'scale' && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center bg-stone-50 p-6 rounded-[2rem]">
                          {['1','2','3','4','5'].map(val => (
                            <button
                              key={val}
                              onClick={() => handleAnswer(val)}
                              className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg transition-all ${currentAns === val ? 'bg-yellow-400 text-stone-900 scale-110 shadow-lg' : 'bg-white text-stone-400 hover:bg-stone-200 shadow-sm'}`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between text-stone-400 text-[10px] font-black uppercase tracking-widest px-4">
                          <span>Not likely</span>
                          <span>Very likely</span>
                        </div>
                        <button
                          onClick={handleNextQuestion}
                          disabled={!currentAns}
                          className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50 mt-4"
                        >
                          Continue
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          
          /* PHASE 4: Final Layer - Location & Persistence */
          ) : (
            <motion.div key="location" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Initial Setup</h2>
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Phone Number (Required)</label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-5 pl-12 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-stone-900 focus:bg-white transition-all text-sm font-bold placeholder:text-stone-300 outline-none"
                    />
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                  </div>
                </div>
                
                {!location.detected && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Country of Origin (Required)</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. United States"
                        value={location.country || ''}
                        onChange={(e) => setLocation(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full p-5 pl-12 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-stone-900 focus:bg-white transition-all text-sm font-bold placeholder:text-stone-300 outline-none"
                      />
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-6">
                <button
                  onClick={handleNext}
                  disabled={!phone.trim() || (!location.detected && !location.country?.trim())}
                  className="w-full py-6 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default TasteProfileFlow;
