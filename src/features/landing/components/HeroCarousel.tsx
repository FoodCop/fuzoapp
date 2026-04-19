import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { LANDING_FEATURES } from '../constants/landingData';

/**
 * SECTION: PhoneMockup Component
 * A reusable UI frame that simulates a mobile device viewport.
 * Used to showcase feature-specific app screens in the landing experience.
 */
export const PhoneMockup = ({ image, className = "" }: { image: string, className?: string }) => (
  <div className={`relative w-64 h-[520px] bg-stone-950 rounded-[3rem] p-3 shadow-2xl border-4 border-stone-800/50 overflow-hidden ${className}`}>
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-stone-950 rounded-b-3xl z-20" />
    <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-stone-900">
      <img src={image} alt="" aria-hidden="true" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    </div>
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/20 rounded-full" />
  </div>
);

/**
 * SECTION: HeroCarousel Component
 * The main architectural hub for the "Cinematic Intro" experience.
 * Manages an immersive, timed carousel of high-fidelity feature spotlights.
 */
export const HeroCarousel = ({ onStart }: { onStart: () => void }) => {
  // STATE: The current active slide index
  const [index, setIndex] = useState(0);

  // LOGIC: Auto-rotation timer (8 seconds per slide)
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % LANDING_FEATURES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section key="hero-carousel-root" className="relative h-screen bg-stone-950 overflow-hidden">
      {/* SECTION: Slide Transition Engine */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          {/* SUB-SECTION: Immersion Background (Video/Solid) */}
          <div className="absolute inset-0 z-0 bg-stone-950">
             {LANDING_FEATURES[index].video && (
               <video
                 src={LANDING_FEATURES[index].video}
                 autoPlay
                 muted
                 loop
                 playsInline
                 className="w-full h-full object-cover opacity-60"
               />
             )}
             {/* Gradient Overlays for Aesthetic Depth & Text Readability */}
             <div className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-transparent to-stone-950/60 z-10" />
             <div className="absolute inset-0 bg-black/20 z-10" />
          </div>

          {/* SUB-SECTION: Feature Narrative (Typography & CTAs) */}
          <div className="relative z-20 h-full flex flex-col items-center justify-center p-6 md:p-20 text-center pt-24 md:pt-40">
            <div className="space-y-8 max-w-5xl mx-auto flex flex-col items-center">
              
              {/* Header Cluster: Subtitle Badge + Primary Title */}
              <div className="space-y-6 flex flex-col items-center">
                <motion.div 
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0.2 }}
                   className="inline-flex items-center px-6 py-2.5 bg-white/10 backdrop-blur-xl text-white rounded-full border border-white/20 shadow-2xl"
                >
                  <span className="text-[12px] font-black uppercase tracking-[0.2em]">{LANDING_FEATURES[index].subtitle}</span>
                </motion.div>
                
                <motion.h2 
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0.4 }}
                   className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.8] text-white text-center"
                >
                  {LANDING_FEATURES[index].title.split(' ').map((word, i) => (
                    <span key={i} className={word === 'UNDISCOVERED' || word === 'REWIRED' ? 'italic opacity-60' : ''}>
                      {word}{' '}
                    </span>
                  ))}
                </motion.h2>
              </div>

              {/* Main Description Copy */}
              <motion.p 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.6 }}
                 className="text-lg md:text-2xl font-bold leading-tight text-white/80 max-w-3xl text-center"
              >
                {LANDING_FEATURES[index].description}
              </motion.p>
              
              {/* Primary Entry Action (Calls onStart to transition to Auth/App) */}
              <motion.div 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.8 }}
                 className="pt-10"
              >
                <button
                  onClick={onStart}
                  className="px-14 py-7 bg-yellow-400 text-stone-900 rounded-[3rem] font-black uppercase tracking-widest text-sm hover:scale-105 hover:bg-white active:scale-95 transition-all shadow-[0_20px_50px_rgba(251,213,86,0.3)] flex items-center justify-center gap-3 group"
                >
                  Enter Experience
                  <ChevronRight size={22} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>

              {/* Secondary Micro-Branding Line */}
              <motion.p 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 0.4 }}
                 transition={{ delay: 1 }}
                 className="text-[10px] font-black uppercase tracking-[0.5em] text-white pt-16 text-center"
              >
                {LANDING_FEATURES[index].microline}
              </motion.p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* SECTION: Immersive Slider Controls
          Displays a dynamic progress bar for each feature spotlight.
      */}
      <div className="absolute bottom-16 inset-x-0 z-30 flex justify-center gap-6 items-center">
        {LANDING_FEATURES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`transition-all duration-700 ${index === i ? 'w-20 h-2 bg-yellow-400' : 'w-6 h-1.5 bg-white/20 hover:bg-white/40'} rounded-full`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

    </section>
  );
};
