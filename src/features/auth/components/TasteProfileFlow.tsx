import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, Check, ArrowRight } from 'lucide-react';
import { TASTE_PROFILE_MODULES } from '../constants/onboardingV2Data';
import type { TasteProfileModule } from '../types/onboarding';

interface TasteProfileFlowProps {
  onComplete: (tasteProfileData: any) => void;
  mode?: 'live' | 'demo';
}

export const TasteProfileFlow = ({
  onComplete,
  mode = 'live',
}: TasteProfileFlowProps) => {
  const [phase, setPhase] = useState<'hub' | 'module'>('hub');
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [moduleQuestionIndex, setModuleQuestionIndex] = useState(0);
  const [tasteProfileAnswers, setTasteProfileAnswers] = useState<Record<string, Record<string, any>>>({});

  const finalize = () => {
    onComplete(tasteProfileAnswers);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      
      {/* Background imagery - let's use a standard food background since we don't have userType here anymore, or just keep it minimal */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80" 
          className="w-full h-full object-cover blur-sm scale-110 opacity-30" 
          alt="Onboarding Background" 
        />
        <div className="absolute inset-0 bg-stone-950/60" />
      </div>

      <div className="w-full max-w-xl bg-white p-8 sm:p-12 md:p-16 rounded-[3rem] sm:rounded-[4rem] shadow-2xl border-4 border-white space-y-8 relative z-10 min-h-[600px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          
          {phase === 'hub' ? (
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
                        setPhase('module');
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
          
          ) : phase === 'module' ? (
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
                    setPhase('hub');
                  }
                };

                return (
                  <>
                    <div className="flex justify-between items-center">
                      <button onClick={() => setPhase('hub')} className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 flex items-center gap-1">
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
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TasteProfileFlow;
