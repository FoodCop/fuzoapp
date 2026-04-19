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
  Sparkles, Zap, ArrowRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UnifiedCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'snap' | 'bites-ai' | 'trim-ai') => void;
}

export const UnifiedCreationModal = ({ isOpen, onClose, onSelectOption }: UnifiedCreationModalProps) => {
  /**
   * SECTION: Studio Registry
   * Definition of the available creation 'transmissions'.
   */
  const options = [
    {
      id: 'snap',
      title: 'Standard Snap',
      description: 'Capture and tag your culinary moment manually.',
      icon: Camera,
      color: 'bg-emerald-500',
      tag: 'Classic'
    },
    {
      id: 'bites-ai',
      title: 'AI Bites Studio',
      description: 'Generate a stunning recipe card from just a photo.',
      icon: ChefHat,
      color: 'bg-yellow-400',
      tag: 'AI Powered',
      isAi: true
    },
    {
      id: 'trim-ai',
      title: 'AI Trim Studio',
      description: 'Auto-crop and edit your food videos in seconds.',
      icon: PlayCircle,
      color: 'bg-stone-900',
      tag: 'AI Powered',
      isAi: true
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6">
          {/* SECTION: Backdrop Layer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-xl"
          />

          {/* SECTION: Modal Container */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[4rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 md:p-12">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter text-stone-900 italic">Create</h2>
                  <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-stone-400 mt-1">Select your creative transmission</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* SECTION: Feature Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      onSelectOption(option.id as any);
                      onClose();
                    }}
                    className="group relative flex flex-col p-8 bg-stone-50 rounded-[3rem] border border-stone-100 text-left hover:bg-white hover:shadow-2xl hover:scale-[1.02] transition-all duration-500"
                  >
                    <div className={`w-14 h-14 ${option.color} rounded-2xl flex items-center justify-center ${option.color === 'bg-stone-900' ? 'text-white' : 'text-stone-900'} mb-8 shadow-lg group-hover:rotate-6 transition-transform`}>
                      <option.icon size={28} />
                    </div>

                    <div className="flex-grow space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-white border border-stone-100 rounded-full text-[11px] font-black uppercase tracking-widest text-stone-400">
                          {option.tag}
                        </span>
                        {option.isAi && <Sparkles size={12} className="text-yellow-500" />}
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tighter text-stone-900 leading-tight">
                        {option.title}
                      </h3>
                      <p className="text-xs font-bold text-stone-400 leading-relaxed group-hover:text-stone-500 transition-colors">
                        {option.description}
                      </p>
                    </div>

                    <div className="mt-8 flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-stone-500 group-hover:text-stone-900 transition-colors">
                      Begin Flow <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION: Branding & Footer */}
            <div className="p-8 bg-stone-50 border-t border-stone-100 flex items-center justify-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-yellow-500 shadow-sm border border-stone-100">
                  <Zap size={14} />
                </div>
                <p className="text-[12px] font-black uppercase tracking-widest text-stone-400">Powered by Gemini Ultra V2</p>
              </div>
              <div className="h-4 w-px bg-stone-200" />
              <button onClick={onClose} className="text-[12px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors">
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
