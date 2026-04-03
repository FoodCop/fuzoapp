import React from 'react';
import { Check } from 'lucide-react';

interface StudioStepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export const StudioStepper: React.FC<StudioStepperProps> = ({ steps, currentStep, className = '' }) => {
  return (
    <div className={`flex items-center justify-between w-full max-w-2xl mx-auto px-4 ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <React.Fragment key={step}>
            {/* Step Circle */}
            <div className="flex flex-col items-center relative group">
              <div 
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                  isCompleted 
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                    : isActive 
                      ? 'bg-white border-white text-stone-900 shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-110' 
                      : 'bg-stone-900 border-stone-800 text-stone-600'
                }`}
              >
                {isCompleted ? (
                  <Check size={20} strokeWidth={3} />
                ) : (
                  <span className="text-[12px] font-black">{index + 1}</span>
                )}
              </div>
              
              <span 
                className={`absolute -bottom-8 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${
                  isActive ? 'text-white' : 'text-stone-600'
                }`}
              >
                {step}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-grow mx-4 h-[2px] bg-stone-900 rounded-full overflow-hidden relative">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-in-out"
                  style={{ 
                    transform: `translateX(${isCompleted ? '0%' : '-100%'})`,
                  }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
