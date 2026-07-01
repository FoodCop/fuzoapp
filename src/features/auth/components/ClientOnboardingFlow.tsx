import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, MapPin, Phone, RefreshCw, ArrowRight, Upload, Check, Users, Utensils, FileText } from 'lucide-react';
import {
  PATH_OPTS, A_TYPE_OPTS, B_TYPE_OPTS, C_TYPE_OPTS,
  FLAVORS, CUISINES, DIETARY, QUIZ_QUESTIONS, QUIZ_MAP, PERSONALITY,
  SPECIALTY_MAP, AUDIENCE, BUSINESS_IDENTITY, FOOD_CATEGORIES, INTEGRATIONS, CUSTOMER_MATCH
} from '../constants/clientOnboardingData';

export const ClientOnboardingFlow = ({
  onComplete,
  mode = 'live'
}: {
  onComplete: (payload: any, launchTasteProfile: boolean) => void;
  mode?: 'live' | 'demo';
}) => {
  const [step, setStep] = useState<string>('LOCATION');
  
  // States
  const [isDetecting, setIsDetecting] = useState(false);
  const [location, setLocation] = useState({ detected: false, country: '', city: '', lat: 0, lng: 0 });
  const [phone, setPhone] = useState('');
  
  const [pathChoice, setPathChoice] = useState<'A'|'B'|'C'|null>(null);
  
  // Generic Answers State
  const [answers, setAnswers] = useState<Record<string, any>>({
    a_type: '', a_flavors: [], a_cuisines: [], a_dietary: [], a_quiz: {},
    b_type: '', b_profile_name: '', b_profile_bio: '', b_specialty: [], b_audience: [],
    c_type: '', c_profile_name: '', c_profile_contact: '', c_cuisine: [], c_categories: [], c_identity: [], c_features: [], c_matching: []
  });

  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaUploaded, setMediaUploaded] = useState(false);

  // Compute Quiz Result
  const [quizResult, setQuizResult] = useState<string>('');

  const handleNext = () => {
    switch (step) {
      case 'LOCATION': setStep('PATH_SELECT'); break;
      case 'PATH_SELECT': 
        if (pathChoice === 'A') setStep('A_TYPE');
        else if (pathChoice === 'B') setStep('B_TYPE');
        else if (pathChoice === 'C') setStep('C_TYPE');
        break;
      
      // Path A
      case 'A_TYPE': setStep('A_FLAVORS'); break;
      case 'A_FLAVORS': setStep('A_CUISINES'); break;
      case 'A_CUISINES': setStep('A_DIETARY'); break;
      case 'A_DIETARY': setStep('A_QUIZ_0'); break;
      case 'A_QUIZ_0': setStep('A_QUIZ_1'); break;
      case 'A_QUIZ_1': setStep('A_QUIZ_2'); break;
      case 'A_QUIZ_2': setStep('A_QUIZ_3'); break;
      case 'A_QUIZ_3': setStep('A_QUIZ_4'); break;
      case 'A_QUIZ_4': 
        // Compute quiz result
        const scores: Record<string, number> = { comfort: 0, explorer: 0, health: 0, trend: 0 };
        Object.entries(answers.a_quiz).forEach(([k, v]) => {
          const trait = QUIZ_MAP[k]?.[v as string];
          if (trait) scores[trait] = (scores[trait] || 0) + 1;
        });
        const top = Object.entries(scores).sort((a,b) => b[1] - a[1])[0]?.[0] || 'explorer';
        setQuizResult(top);
        setStep('A_RESULT'); 
        break;
      case 'A_RESULT': setStep('INTERSTITIAL'); break;

      // Path B
      case 'B_TYPE': setStep('B_PROFILE'); break;
      case 'B_PROFILE': setStep('B_SPECIALTY'); break;
      case 'B_SPECIALTY': setStep('B_PORTFOLIO'); break;
      case 'B_PORTFOLIO': setStep('B_AUDIENCE'); break;
      case 'B_AUDIENCE': setStep('B_PREVIEW'); break;
      case 'B_PREVIEW': setStep('INTERSTITIAL'); break;

      // Path C
      case 'C_TYPE': setStep('C_PROFILE'); break;
      case 'C_PROFILE': setStep('C_CUISINE'); break;
      case 'C_CUISINE': setStep('C_MEDIA'); break;
      case 'C_MEDIA': setStep('C_IDENTITY'); break;
      case 'C_IDENTITY': setStep('C_FEATURES'); break;
      case 'C_FEATURES': setStep('C_MATCHING'); break;
      case 'C_MATCHING': setStep('C_PREVIEW'); break;
      case 'C_PREVIEW': setStep('INTERSTITIAL'); break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'PATH_SELECT': setStep('LOCATION'); break;
      case 'A_TYPE': case 'B_TYPE': case 'C_TYPE': setStep('PATH_SELECT'); break;
      case 'A_FLAVORS': setStep('A_TYPE'); break;
      case 'A_CUISINES': setStep('A_FLAVORS'); break;
      case 'A_DIETARY': setStep('A_CUISINES'); break;
      case 'A_QUIZ_0': setStep('A_DIETARY'); break;
      case 'A_QUIZ_1': setStep('A_QUIZ_0'); break;
      case 'A_QUIZ_2': setStep('A_QUIZ_1'); break;
      case 'A_QUIZ_3': setStep('A_QUIZ_2'); break;
      case 'A_QUIZ_4': setStep('A_QUIZ_3'); break;
      
      case 'B_PROFILE': setStep('B_TYPE'); break;
      case 'B_SPECIALTY': setStep('B_PROFILE'); break;
      case 'B_PORTFOLIO': setStep('B_SPECIALTY'); break;
      case 'B_AUDIENCE': setStep('B_PORTFOLIO'); break;
      case 'B_PREVIEW': setStep('B_AUDIENCE'); break;

      case 'C_PROFILE': setStep('C_TYPE'); break;
      case 'C_CUISINE': setStep('C_PROFILE'); break;
      case 'C_MEDIA': setStep('C_CUISINE'); break;
      case 'C_IDENTITY': setStep('C_MEDIA'); break;
      case 'C_FEATURES': setStep('C_IDENTITY'); break;
      case 'C_MATCHING': setStep('C_FEATURES'); break;
      case 'C_PREVIEW': setStep('C_MATCHING'); break;
    }
  };

  const detectLocation = () => {
    if (!globalThis.navigator?.geolocation) return;
    setIsDetecting(true);
    globalThis.navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation((prev) => ({ ...prev, detected: true, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setIsDetecting(false);
      },
      () => setIsDetecting(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const setAnswer = (key: string, val: any) => {
    setAnswers(prev => ({ ...prev, [key]: val }));
  };

  const toggleArrayAnswer = (key: string, val: string) => {
    setAnswers(prev => {
      const arr = prev[key] || [];
      return { ...prev, [key]: arr.includes(val) ? arr.filter((x: string) => x !== val) : [...arr, val] };
    });
  };

  const renderLayout = (content: React.ReactNode, indexText?: string, progress?: number, showBack = true, hideContinue = false, onContinueOverride?: () => void, continueDisabled = false) => (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 relative font-sans text-stone-900 overflow-hidden">
      <div className="w-full max-w-xl bg-white p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] shadow-2xl relative z-10 flex flex-col min-h-[600px] border-4 border-white">
        {/* Header */}
        {indexText && progress !== undefined && (
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-stone-900 text-white font-black flex items-center justify-center shrink-0">
              {indexText.split(' ')[1]}
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">{indexText}</div>
              <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 flex flex-col justify-center">
          {content}
        </div>

        {/* Nav */}
        <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-between">
          {showBack ? (
            <button onClick={handleBack} className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors">
              ← Back
            </button>
          ) : <div />}
          
          {!hideContinue && (
            <button 
              onClick={onContinueOverride || handleNext}
              disabled={continueDisabled}
              className="py-4 px-8 bg-stone-900 text-white rounded-full font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-stone-800 transition-all active:scale-95"
            >
              Continue <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // UI rendering based on step
  if (step === 'LOCATION') {
    return renderLayout(
      <div className="space-y-8">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">Initial Setup</h2>
          <p className="text-stone-400 font-bold">Where are you scouting from?</p>
        </div>
        {location.detected ? (
          <div className="p-8 bg-stone-900 rounded-[2rem] border-2 border-stone-800 flex items-center gap-6 text-white shadow-xl">
            <div className="w-14 h-14 bg-yellow-400 rounded-2xl flex items-center justify-center text-stone-900"><CheckCircle2 size={28} /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1">Detected Grid</p>
              <p className="text-xl font-black">Scouting locally</p>
            </div>
          </div>
        ) : (
          <button onClick={detectLocation} disabled={isDetecting} className="w-full p-10 bg-stone-50 rounded-[3rem] border-4 border-dashed border-stone-200 flex flex-col items-center justify-center gap-4 group hover:border-yellow-400 transition-all">
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
              <input type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-5 pl-12 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-stone-900 focus:bg-white transition-all text-sm font-bold placeholder:text-stone-300 outline-none" />
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
            </div>
          </div>
          {!location.detected && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Country of Origin (Required)</label>
              <div className="relative">
                <input type="text" placeholder="e.g. United States" value={location.country} onChange={e => setLocation({...location, country: e.target.value})} className="w-full p-5 pl-12 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-stone-900 focus:bg-white transition-all text-sm font-bold placeholder:text-stone-300 outline-none" />
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
              </div>
            </div>
          )}
        </div>
      </div>,
      undefined, undefined, false, false, handleNext, !phone || (!location.detected && !location.country)
    );
  }

  if (step === 'PATH_SELECT') {
    return renderLayout(
      <div className="space-y-8">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">How will you use Fuzo?</h2>
          <p className="text-stone-400 font-bold">Select your path.</p>
        </div>
        <div className="grid gap-4">
          {PATH_OPTS.map(opt => (
            <button key={opt.v} onClick={() => { setPathChoice(opt.v as any); setTimeout(handleNext, 100); }} className={`p-6 rounded-[2rem] border-2 text-left flex items-center gap-6 transition-all group ${pathChoice === opt.v ? 'bg-stone-900 border-stone-900 text-white shadow-xl' : 'bg-stone-50 border-transparent hover:border-yellow-400 hover:bg-white'}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${pathChoice === opt.v ? 'bg-stone-800' : 'bg-white group-hover:bg-stone-900 transition-colors'}`}>{opt.e}</div>
              <div>
                <div className="font-black uppercase tracking-widest text-sm mb-1">{opt.v === 'A' ? 'Food Lover' : opt.v === 'B' ? 'Creator' : 'Business'}</div>
                <div className={`text-xs font-bold leading-relaxed ${pathChoice === opt.v ? 'text-stone-400' : 'text-stone-500'}`}>{opt.d}</div>
              </div>
            </button>
          ))}
        </div>
      </div>,
      undefined, undefined, true, true
    );
  }

  // --- PATH A ---
  if (step === 'A_TYPE') {
    return renderLayout(
      <div className="space-y-8">
        <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">What best describes you?</h2>
        <div className="grid gap-4">
          {A_TYPE_OPTS.map(opt => (
            <button key={opt.v} onClick={() => { setAnswer('a_type', opt.v); setTimeout(handleNext, 100); }} className={`p-6 rounded-[2rem] border-2 text-left flex justify-between items-center group transition-all ${answers.a_type === opt.v ? 'bg-stone-900 border-stone-900 text-white shadow-xl' : 'bg-stone-50 border-transparent hover:border-yellow-400 hover:bg-white'}`}>
              <div className="flex gap-4 items-center">
                <div className="text-3xl">{opt.e}</div>
                <div>
                  <div className="font-black uppercase tracking-widest text-sm mb-1">{opt.v}</div>
                  <div className={`text-xs font-bold ${answers.a_type === opt.v ? 'text-stone-400' : 'text-stone-500'}`}>{opt.d}</div>
                </div>
              </div>
              <ChevronRight size={24} className={answers.a_type === opt.v ? 'text-white' : 'text-stone-300 group-hover:text-yellow-400'} />
            </button>
          ))}
        </div>
      </div>,
      'Step 1 of 6', 16, true, true
    );
  }

  if (step === 'A_FLAVORS' || step === 'A_CUISINES' || step === 'A_DIETARY') {
    const isFlavors = step === 'A_FLAVORS';
    const isCuisines = step === 'A_CUISINES';
    const title = isFlavors ? 'Favorite Flavors' : isCuisines ? 'Favorite Cuisines' : 'Dietary Preferences';
    const desc = 'Select all that apply';
    const options = isFlavors ? FLAVORS : isCuisines ? CUISINES : DIETARY;
    const ansKey = isFlavors ? 'a_flavors' : isCuisines ? 'a_cuisines' : 'a_dietary';
    const selected = answers[ansKey] || [];
    const stepNum = isFlavors ? 2 : isCuisines ? 3 : 4;

    return renderLayout(
      <div className="space-y-8">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">{title}</h2>
          <p className="text-stone-400 font-bold">{desc}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {options.map(opt => (
            <button key={opt} onClick={() => toggleArrayAnswer(ansKey, opt)} className={`px-5 py-4 rounded-xl border-2 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 ${selected.includes(opt) ? 'bg-stone-900 border-stone-900 text-white shadow-lg' : 'bg-stone-50 border-transparent hover:border-stone-200'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>,
      `Step ${stepNum} of 6`, Math.round((stepNum/6)*100), true, false, undefined, selected.length === 0
    );
  }

  if (step.startsWith('A_QUIZ_')) {
    const qIndex = parseInt(step.split('_')[2]);
    const q = QUIZ_QUESTIONS[qIndex];
    return renderLayout(
      <div className="space-y-8">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-tight">{q.q}</h2>
        </div>
        <div className="grid gap-4">
          {q.opts.map(opt => (
            <button key={opt} onClick={() => { 
              setAnswers(prev => ({...prev, a_quiz: {...prev.a_quiz, [q.key]: opt}}));
              setTimeout(handleNext, 150);
            }} className={`p-6 rounded-[2rem] border-2 text-left flex justify-between items-center group transition-all ${answers.a_quiz[q.key] === opt ? 'bg-stone-900 border-stone-900 text-white shadow-xl' : 'bg-stone-50 border-transparent hover:border-yellow-400 hover:bg-white'}`}>
              <span className="font-black uppercase tracking-widest text-sm">{opt}</span>
              <ChevronRight size={20} className={answers.a_quiz[q.key] === opt ? 'text-white' : 'text-stone-300 group-hover:text-yellow-400'} />
            </button>
          ))}
        </div>
      </div>,
      `Step 5 of 6 (Q${qIndex + 1})`, 83, true, true
    );
  }

  if (step === 'A_RESULT') {
    const res = PERSONALITY[quizResult] || PERSONALITY.explorer;
    return renderLayout(
      <div className="space-y-6 text-center py-12">
        <div className="text-8xl mb-8 animate-bounce">{res.emoji}</div>
        <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-6">{res.title}</h2>
        <p className="text-stone-500 font-bold leading-relaxed max-w-sm mx-auto">{res.desc}</p>
      </div>,
      'Step 6 of 6', 100, true, false, handleNext, false
    );
  }

  // --- PATH B ---
  if (step === 'B_TYPE') {
    return renderLayout(
      <div className="space-y-8">
        <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">What best describes you?</h2>
        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {B_TYPE_OPTS.map(opt => (
            <button key={opt.v} onClick={() => { setAnswer('b_type', opt.v); setTimeout(handleNext, 100); }} className={`p-5 rounded-[1.5rem] border-2 text-left flex items-center gap-6 group transition-all ${answers.b_type === opt.v ? 'bg-stone-900 border-stone-900 text-white shadow-xl' : 'bg-stone-50 border-transparent hover:border-yellow-400 hover:bg-white'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${answers.b_type === opt.v ? 'bg-stone-800' : 'bg-white group-hover:bg-stone-900 transition-colors'}`}>{opt.e}</div>
              <div>
                <div className="font-black uppercase tracking-widest text-xs mb-1">{opt.v}</div>
                <div className={`text-[10px] font-bold ${answers.b_type === opt.v ? 'text-stone-400' : 'text-stone-500'}`}>{opt.d}</div>
              </div>
            </button>
          ))}
        </div>
      </div>,
      'Step 1 of 5', 20, true, true
    );
  }

  if (step === 'B_PROFILE') {
    return renderLayout(
      <div className="space-y-8">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">Creator Profile</h2>
          <p className="text-stone-400 font-bold">Tell us about yourself.</p>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <input type="text" placeholder="Display Name" value={answers.b_profile_name} onChange={e => setAnswer('b_profile_name', e.target.value)} className="w-full p-5 pl-12 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-stone-900 focus:bg-white transition-all outline-none font-bold text-sm" />
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
          </div>
          <div className="relative">
            <textarea placeholder="Bio" value={answers.b_profile_bio} onChange={e => setAnswer('b_profile_bio', e.target.value)} className="w-full p-5 pl-12 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-stone-900 focus:bg-white transition-all outline-none font-bold text-sm h-32 resize-none" />
            <FileText className="absolute left-4 top-6 text-stone-300" size={18} />
          </div>
        </div>
      </div>,
      'Step 2 of 5', 40, true, false, undefined, !answers.b_profile_name
    );
  }

  if (step === 'B_SPECIALTY') {
    const opts = SPECIALTY_MAP[answers.b_type] || FLAVORS;
    return renderLayout(
      <div className="space-y-8">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">Content Specialty</h2>
          <p className="text-stone-400 font-bold">Select all that apply</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {opts.map(opt => (
            <button key={opt} onClick={() => toggleArrayAnswer('b_specialty', opt)} className={`px-5 py-4 rounded-xl border-2 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 ${answers.b_specialty.includes(opt) ? 'bg-stone-900 border-stone-900 text-white shadow-lg' : 'bg-stone-50 border-transparent hover:border-stone-200'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>,
      'Step 3 of 5', 60, true, false, undefined, answers.b_specialty.length === 0
    );
  }

  if (step === 'B_PORTFOLIO' || step === 'C_MEDIA') {
    return renderLayout(
      <div className="space-y-8">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">{step === 'B_PORTFOLIO' ? 'Portfolio' : 'Media Uploads'}</h2>
          <p className="text-stone-400 font-bold">Upload your best photos and assets.</p>
        </div>
        <div onClick={() => {
          if (mediaUploaded) return;
          setUploadProgress(10);
          const interval = setInterval(() => {
            setUploadProgress(prev => {
              if (prev >= 100) { clearInterval(interval); setMediaUploaded(true); return 100; }
              return prev + 15;
            });
          }, 200);
        }} className={`cursor-pointer group relative p-12 rounded-[3rem] border-4 border-dashed flex flex-col items-center gap-6 transition-all ${mediaUploaded ? 'border-green-400 bg-green-50/20' : 'border-stone-200 bg-stone-50 hover:border-yellow-400'}`}>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-[2.8rem] z-10 p-12">
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-stone-900" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
          <div className={`p-6 rounded-3xl transition-transform group-hover:scale-110 ${mediaUploaded ? 'bg-green-400 text-white' : 'bg-white text-stone-400 group-hover:text-yellow-400 shadow-sm'}`}>
            {mediaUploaded ? <Check size={36} strokeWidth={3} /> : <Upload size={36} />}
          </div>
          <div className="text-center">
            <p className="font-black uppercase tracking-widest text-xs text-stone-900 mb-2">{mediaUploaded ? 'Assets Received' : 'Select Media Files'}</p>
            <p className="text-[10px] font-bold text-stone-400">{mediaUploaded ? 'Signatures and portfolios synced' : 'Drag & drop photos or PDFs'}</p>
          </div>
        </div>
      </div>,
      step === 'B_PORTFOLIO' ? 'Step 4 of 5' : 'Step 4 of 8', step === 'B_PORTFOLIO' ? 80 : 50, true, false, handleNext, !mediaUploaded
    );
  }

  if (step === 'B_AUDIENCE' || step === 'C_MATCHING') {
    const opts = step === 'B_AUDIENCE' ? AUDIENCE : CUSTOMER_MATCH;
    const ansKey = step === 'B_AUDIENCE' ? 'b_audience' : 'c_matching';
    return renderLayout(
      <div className="space-y-8">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">{step === 'B_AUDIENCE' ? 'Target Audience' : 'Target Customers'}</h2>
          <p className="text-stone-400 font-bold">Select all that apply</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {opts.map(opt => (
            <button key={opt} onClick={() => toggleArrayAnswer(ansKey, opt)} className={`px-5 py-4 rounded-xl border-2 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 ${answers[ansKey].includes(opt) ? 'bg-stone-900 border-stone-900 text-white shadow-lg' : 'bg-stone-50 border-transparent hover:border-stone-200'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>,
      step === 'B_AUDIENCE' ? 'Step 5 of 5' : 'Step 7 of 8', step === 'B_AUDIENCE' ? 100 : 87, true, false, handleNext, answers[ansKey].length === 0
    );
  }

  if (step === 'B_PREVIEW' || step === 'C_PREVIEW') {
    return renderLayout(
      <div className="space-y-6 text-center py-12">
        <div className="w-24 h-24 bg-yellow-400 rounded-[2rem] mx-auto flex items-center justify-center text-stone-900 mb-8 shadow-xl"><CheckCircle2 size={48} /></div>
        <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-6">Profile Ready</h2>
        <p className="text-stone-500 font-bold leading-relaxed max-w-sm mx-auto">Your {step === 'B_PREVIEW' ? 'Creator' : 'Business'} profile has been assembled successfully. Time to go live.</p>
      </div>,
      step === 'B_PREVIEW' ? 'Setup Complete' : 'Step 8 of 8', 100, true, false, handleNext
    );
  }

  // --- PATH C ---
  if (step === 'C_TYPE') {
    return renderLayout(
      <div className="space-y-8">
        <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">Business Type</h2>
        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {C_TYPE_OPTS.map(opt => (
            <button key={opt.v} onClick={() => { setAnswer('c_type', opt.v); setTimeout(handleNext, 100); }} className={`p-5 rounded-[1.5rem] border-2 text-left flex items-center gap-6 group transition-all ${answers.c_type === opt.v ? 'bg-stone-900 border-stone-900 text-white shadow-xl' : 'bg-stone-50 border-transparent hover:border-yellow-400 hover:bg-white'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${answers.c_type === opt.v ? 'bg-stone-800' : 'bg-white group-hover:bg-stone-900 transition-colors'}`}>{opt.e}</div>
              <div>
                <div className="font-black uppercase tracking-widest text-xs mb-1">{opt.v}</div>
                <div className={`text-[10px] font-bold ${answers.c_type === opt.v ? 'text-stone-400' : 'text-stone-500'}`}>{opt.d}</div>
              </div>
            </button>
          ))}
        </div>
      </div>,
      'Step 1 of 8', 12, true, true
    );
  }

  if (step === 'C_PROFILE') {
    return renderLayout(
      <div className="space-y-8">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">Business Profile</h2>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <input type="text" placeholder="Business Name" value={answers.c_profile_name} onChange={e => setAnswer('c_profile_name', e.target.value)} className="w-full p-5 pl-12 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-stone-900 focus:bg-white transition-all outline-none font-bold text-sm" />
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
          </div>
          <div className="relative">
            <input type="text" placeholder="Contact Person" value={answers.c_profile_contact} onChange={e => setAnswer('c_profile_contact', e.target.value)} className="w-full p-5 pl-12 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-stone-900 focus:bg-white transition-all outline-none font-bold text-sm" />
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
          </div>
        </div>
      </div>,
      'Step 2 of 8', 25, true, false, undefined, !answers.c_profile_name
    );
  }

  if (step === 'C_CUISINE' || step === 'C_IDENTITY' || step === 'C_FEATURES') {
    const title = step === 'C_CUISINE' ? 'Cuisine & Categories' : step === 'C_IDENTITY' ? 'Business Identity' : 'Features & Integrations';
    const opts1 = step === 'C_CUISINE' ? CUISINES : step === 'C_IDENTITY' ? BUSINESS_IDENTITY : [ 'Reservations', 'Ordering', 'Catering Requests', 'Event Bookings' ];
    const opts2 = step === 'C_CUISINE' ? FOOD_CATEGORIES : step === 'C_FEATURES' ? INTEGRATIONS : [];
    const ansKey1 = step === 'C_CUISINE' ? 'c_cuisine' : step === 'C_IDENTITY' ? 'c_identity' : 'c_features';
    const ansKey2 = step === 'C_CUISINE' ? 'c_categories' : 'c_integrations';
    const stepNum = step === 'C_CUISINE' ? 3 : step === 'C_IDENTITY' ? 5 : 6;

    return renderLayout(
      <div className="space-y-8">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">{title}</h2>
        </div>
        
        <div className="space-y-8">
          <div className="flex flex-wrap gap-3">
            {opts1.map(opt => (
              <button key={opt} onClick={() => toggleArrayAnswer(ansKey1, opt)} className={`px-5 py-4 rounded-xl border-2 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 ${answers[ansKey1]?.includes(opt) ? 'bg-stone-900 border-stone-900 text-white shadow-lg' : 'bg-stone-50 border-transparent hover:border-stone-200'}`}>
                {opt}
              </button>
            ))}
          </div>

          {opts2.length > 0 && (
            <>
              <div className="w-full h-px bg-stone-100" />
              <div className="flex flex-wrap gap-3">
                {opts2.map(opt => (
                  <button key={opt} onClick={() => toggleArrayAnswer(ansKey2, opt)} className={`px-5 py-4 rounded-xl border-2 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 ${answers[ansKey2]?.includes(opt) ? 'bg-stone-900 border-stone-900 text-white shadow-lg' : 'bg-stone-50 border-transparent hover:border-stone-200'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>,
      `Step ${stepNum} of 8`, Math.round((stepNum/8)*100), true, false, undefined, answers[ansKey1]?.length === 0
    );
  }

  // --- INTERSTITIAL (End of onboarding) ---
  if (step === 'INTERSTITIAL') {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 relative font-sans text-stone-900">
        <div className="w-full max-w-xl bg-yellow-400 p-8 sm:p-12 rounded-[3rem] sm:rounded-[4rem] shadow-2xl text-center space-y-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-300 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 bg-white rounded-[2rem] mx-auto flex items-center justify-center shadow-lg mb-8">
              <Utensils size={40} className="text-stone-900" />
            </div>
            <h2 className="text-5xl font-black uppercase tracking-tighter leading-none mb-6">Map Your Palate?</h2>
            <p className="font-bold text-stone-800 leading-relaxed max-w-sm mx-auto text-lg">
              We can fine-tune your recommendations with our Taste Profile Engine. It takes just 2 minutes. You can also do it later in your profile.
            </p>
          </div>
          
          <div className="flex flex-col gap-4 relative z-10">
            <button 
              onClick={() => onComplete({ location, phone, pathChoice, answers, quizResult }, true)} 
              className="w-full py-6 bg-stone-900 text-white rounded-full font-black uppercase tracking-widest text-sm shadow-2xl active:scale-95 transition-all hover:bg-stone-800"
            >
              Map My Palate Now
            </button>
            <button 
              onClick={() => onComplete({ location, phone, pathChoice, answers, quizResult }, false)} 
              className="w-full py-6 bg-white/80 backdrop-blur-sm text-stone-900 rounded-full font-black uppercase tracking-widest text-sm active:scale-95 transition-all hover:bg-white"
            >
              Skip for Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ClientOnboardingFlow;
