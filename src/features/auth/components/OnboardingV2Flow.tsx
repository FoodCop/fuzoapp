import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, MapPin, Phone, RefreshCw } from 'lucide-react';
import { AUTH_ONBOARDING_V2_DATA } from '../constants/onboardingV2Data';
import type { OnboardingLocation, OnboardingV2Payload } from '../types/onboarding';

const defaultLocation: OnboardingLocation = {
  country: '',
  state: '',
  city: '',
  detected: false,
};

const ONBOARDING_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80", // Discovery (Slide 1)
  "https://images.unsplash.com/photo-1550317138-10000687ad32?auto=format&fit=crop&w=1200&q=80", // Bites (Slide 2)
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80", // Scout (Slide 3)
];

export const OnboardingV2Flow = ({
  onComplete,
  mode = 'live',
}: {
  onComplete: (payload: OnboardingV2Payload) => void;
  mode?: 'live' | 'demo';
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState<OnboardingLocation>(defaultLocation);
  const [isDetecting, setIsDetecting] = useState(false);

  const totalSteps = AUTH_ONBOARDING_V2_DATA.length;
  const current = AUTH_ONBOARDING_V2_DATA[stepIndex];

  const detectLocation = () => {
    if (!globalThis.navigator?.geolocation) {
      return;
    }

    setIsDetecting(true);
    globalThis.navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation((prev) => ({
          ...prev,
          detected: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          city: prev.city || 'Detected City',
          country: prev.country || 'Detected Country',
        }));
        setIsDetecting(false);
      },
      () => {
        setIsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const locationLabel = useMemo(() => {
    const city = location.city.trim();
    const state = location.state.trim();
    const country = location.country.trim();
    return [city, state, country].filter(Boolean).join(', ');
  }, [location]);

  const finalize = () => {
    onComplete({
      answers,
      phone: phone.trim(),
      location,
      locationLabel: locationLabel || 'local',
    });
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Cinematic Backdrop */}
      <AnimatePresence mode="wait">
        <motion.div
           key={`bg-${stepIndex}`}
           initial={{ opacity: 0 }}
           animate={{ opacity: 0.3 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 1 }}
           className="absolute inset-0 z-0"
        >
          <img 
            src={ONBOARDING_BACKGROUNDS[stepIndex] || ONBOARDING_BACKGROUNDS[0]} 
            className="w-full h-full object-cover blur-sm" 
            alt="" 
          />
          <div className="absolute inset-0 bg-stone-950/60" />
        </motion.div>
      </AnimatePresence>

      <div className="w-full max-w-xl bg-white p-8 sm:p-12 md:p-16 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl border-4 border-white space-y-8 md:space-y-10 relative z-10">
        <div className="flex justify-between items-center">
          <span className="px-2.5 py-1 rounded-full text-[12px] font-black uppercase tracking-widest bg-yellow-100 text-yellow-800 whitespace-nowrap">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <div className="flex gap-1">
            {AUTH_ONBOARDING_V2_DATA.map((step, i) => (
              <div key={step.id} className={`w-6 sm:w-8 h-1.5 rounded-full ${i <= stepIndex ? 'bg-yellow-400' : 'bg-stone-100'}`} />
            ))}
          </div>
        </div>

        {mode === 'demo' && (
          <div className="px-4 py-3 rounded-2xl bg-blue-50 border border-blue-100 text-[12px] font-black uppercase tracking-widest text-blue-700">
            Demo mode enabled: this does not gate app access.
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">{current.title}</h2>
          <p className="text-stone-400 font-bold text-base sm:text-lg">{current.desc}</p>
        </div>

        {current.type === 'choice' && (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {current.options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setAnswers((prev) => ({ ...prev, [current.id]: opt }));
                  if (stepIndex < totalSteps - 1) {
                    setStepIndex((prev) => prev + 1);
                  } else {
                    finalize();
                  }
                }}
                className="p-6 sm:p-8 bg-stone-50 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-transparent hover:border-yellow-400 hover:bg-white transition-all text-left group"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black uppercase tracking-widest text-xs sm:text-sm">{opt}</span>
                  <ChevronRight size={20} className="text-stone-200 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        )}

        {current.type === 'phone' && (
          <div className="space-y-6">
            <div className="relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400">
                <Phone size={20} />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-stone-50 pl-16 pr-8 py-6 rounded-[2rem] font-bold outline-none border-2 border-transparent focus:border-yellow-400 transition-all text-lg"
              />
            </div>
            <button
              disabled={phone.trim().length < 8}
              onClick={() => setStepIndex((prev) => prev + 1)}
              className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl transition-all ${phone.trim().length >= 8 ? 'bg-stone-900 text-white hover:scale-[1.02] active:scale-95' : 'bg-stone-100 text-stone-300 cursor-not-allowed'}`}
            >
              Continue
            </button>
          </div>
        )}

        {current.type === 'location' && (
          <div className="space-y-8">
            {location.detected ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="p-8 bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-100 flex items-center gap-6">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <p className="text-[12px] font-black uppercase tracking-widest text-emerald-600/60">Detected</p>
                    <p className="text-xl font-black text-emerald-900">{locationLabel || 'Detected location'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={detectLocation}
                disabled={isDetecting}
                className="w-full p-12 bg-stone-50 rounded-[3rem] border-4 border-dashed border-stone-200 flex flex-col items-center justify-center gap-4 group hover:border-yellow-400 transition-all"
              >
                <div className={`p-6 rounded-3xl ${isDetecting ? 'bg-yellow-400 text-stone-900 animate-pulse' : 'bg-white text-stone-400 group-hover:text-yellow-400 shadow-xl'}`}>
                  {isDetecting ? <RefreshCw className="animate-spin" size={32} /> : <MapPin size={32} />}
                </div>
                <p className="font-black uppercase tracking-widest text-xs">{isDetecting ? 'Detecting Grid...' : 'Auto-Detect Location'}</p>
              </button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="onboarding-v2-country" className="text-[12px] font-black uppercase tracking-widest text-stone-400 px-4">Country</label>
                <input
                  id="onboarding-v2-country"
                  value={location.country}
                  onChange={(event) => setLocation((prev) => ({ ...prev, country: event.target.value }))}
                  className="w-full bg-stone-50 px-6 py-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-yellow-400 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="onboarding-v2-state" className="text-[12px] font-black uppercase tracking-widest text-stone-400 px-4">State</label>
                <input
                  id="onboarding-v2-state"
                  value={location.state}
                  onChange={(event) => setLocation((prev) => ({ ...prev, state: event.target.value }))}
                  className="w-full bg-stone-50 px-6 py-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-yellow-400 transition-all"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="onboarding-v2-city" className="text-[12px] font-black uppercase tracking-widest text-stone-400 px-4">City</label>
                <input
                  id="onboarding-v2-city"
                  value={location.city}
                  onChange={(event) => setLocation((prev) => ({ ...prev, city: event.target.value, detected: true }))}
                  className="w-full bg-stone-50 px-6 py-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-yellow-400 transition-all"
                />
              </div>
            </div>

            <button
              onClick={finalize}
              className="w-full py-6 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
            >
              Finalize Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingV2Flow;
