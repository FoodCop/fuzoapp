import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ChevronRight, ChefHat, User, Globe, Users, Utensils } from 'lucide-react';
import type { PrimaryProfileType } from '../../profile/types/profile';

interface ProfileTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  type: 'primary' | 'subtype';
  options: string[];
  currentValue: string;
  title: string;
}

const ICON_MAP: Record<string, any> = {
  Chef: ChefHat,
  Individual: User,
  Restaurant: Globe,
  'Culinary Team': Users,
  'Private Chef': Utensils,
};

export const ProfileTypeModal = ({
  isOpen,
  onClose,
  onSelect,
  type,
  options,
  currentValue,
  title
}: ProfileTypeModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100]"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-end justify-center z-[101] pointer-events-none">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-xl bg-white rounded-t-[4rem] shadow-2xl p-10 pb-16 pointer-events-auto max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.4em] text-stone-300">Account Selection</p>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-stone-900">{title}</h3>
                </div>
                <button 
                  onClick={onClose}
                  className="p-4 bg-stone-50 rounded-full text-stone-400 hover:text-stone-900 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid gap-4">
                {options.map((option) => {
                  const Icon = type === 'primary' ? ICON_MAP[option] || User : null;
                  const isSelected = currentValue === option;

                  return (
                    <motion.button
                      key={option}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelect(option);
                        onClose();
                      }}
                      className={`w-full p-8 rounded-[2.5rem] flex items-center justify-between transition-all border-4 ${
                        isSelected 
                          ? 'bg-stone-900 border-stone-900 text-white shadow-xl scale-[1.02]' 
                          : 'bg-stone-50 border-transparent text-stone-900 hover:bg-stone-100 hover:translate-x-2'
                      }`}
                    >
                      <div className="flex items-center gap-6">
                        {Icon && (
                          <div className={`p-4 rounded-2xl ${isSelected ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                            <Icon size={24} className={isSelected ? 'text-white' : 'text-stone-400'} />
                          </div>
                        )}
                        <span className="text-lg font-black uppercase tracking-tight">{option}</span>
                      </div>
                      
                      {isSelected ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                          <Check size={18} />
                        </div>
                      ) : (
                        <ChevronRight size={20} className="text-stone-200" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <p className="mt-10 text-center text-[12px] font-bold text-stone-300 uppercase tracking-widest px-8">
                Select your specialized classification to personalize your discovery engine experience.
              </p>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
