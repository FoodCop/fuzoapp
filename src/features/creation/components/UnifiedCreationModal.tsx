/**
 * ============================================================================
 * UNIFIED CREATION MODAL — Studio Entry Point
 * ============================================================================
 * 
 * This component acts as the high-fidelity gateway for all user-generated 
 * content flows. It allows users to choose between manual 'Snaps' or 
 * AI-assisted 'Bites' and 'Trims' studios.
 * 
 * Core Capabilities:
 * 1. Studio Selection: Visual cards for navigating into different creation modes.
 * 2. Visual Polish: Uses Framer Motion for cinematic backdrop blurs and entry 
 *    animations.
 * 3. Branding: Displays the "Powered by Gemini" neural intelligence layer.
 */

import React from 'react';
import { 
  Camera, ChefHat, PlayCircle, X, 
  Sparkles, Zap, ArrowRight, Image as ImageIcon, Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UnifiedCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'snap' | 'bites-ai' | 'trim-ai' | 'import-ai' | 'scout' | 'link-ai') => void;
}

export const UnifiedCreationModal = ({ isOpen, onClose, onSelectOption }: UnifiedCreationModalProps) => {
  const options = [
    {
      id: 'trim-ai',
      title: 'A Video',
      icon: PlayCircle,
      color: 'bg-rose-500',
      isAi: true
    },
    {
      id: 'bites-ai',
      title: 'A Recipe',
      icon: ChefHat,
      color: 'bg-yellow-400',
      isAi: true
    },
    {
      id: 'snap',
      title: 'A Discovery',
      icon: Camera,
      color: 'bg-emerald-500',
    },
    {
      id: 'link-ai',
      title: 'Share A Link',
      icon: Link,
      color: 'bg-sky-500',
      isAi: true
    },
    {
      id: 'import-ai',
      title: 'Import',
      icon: ImageIcon,
      color: 'bg-purple-500',
      isAi: true
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/90 backdrop-blur-2xl"
          />

          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            className="relative w-full max-w-xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-stone-50 text-stone-400 rounded-full hover:bg-stone-100 hover:text-stone-900 transition-colors z-10"
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <div className="p-10 md:p-14 text-center">
              <header className="mb-12 space-y-2">
                <h2 className="text-4xl font-black uppercase tracking-tighter text-stone-900 leading-none">
                  What do you want <br/> to create?
                </h2>
                <div className="flex justify-center gap-1">
                  <div className="h-1 w-8 bg-yellow-400 rounded-full" />
                  <div className="h-1 w-2 bg-stone-200 rounded-full" />
                </div>
              </header>

              <div className="grid grid-cols-2 gap-4">
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      onSelectOption(option.id as any);
                      onClose();
                    }}
                    className="group flex flex-col items-center justify-center p-8 bg-stone-50 rounded-[2.5rem] hover:bg-stone-900 transition-all duration-300 active:scale-95"
                  >
                    <div className={`w-16 h-16 ${option.color} rounded-3xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all`}>
                      <option.icon size={32} strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest text-stone-900 group-hover:text-white transition-colors">
                      {option.title}
                    </span>
                    {option.isAi && (
                      <div className="mt-2 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                        <Sparkles size={8} /> AI Neural
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button 
                onClick={onClose}
                className="mt-10 text-xs font-black uppercase tracking-[0.3em] text-stone-400 hover:text-stone-900 transition-colors"
              >
                Close Studio
              </button>
            </div>
            
            {/* Minimal Gemini Branding */}
            <div className="py-4 bg-stone-50 flex items-center justify-center gap-2 border-t border-stone-100">
               <Zap size={10} className="text-yellow-500" />
               <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">Powered by Gemini Neural V2</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
