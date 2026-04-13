import React, { useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface NeuralRevealProps {
  onNext: () => void;
  title?: string;
  subtitle?: string;
  duration?: number;
}

/**
 * Shared Neural Reveal component for immersive UGC loading states.
 * Standardized across Snap, Bites, and Trims studios.
 */
export const NeuralReveal = ({ 
  onNext, 
  title = "Neural Synthesis", 
  subtitle = "Mapping Data Points...",
  duration = 2500 
}: NeuralRevealProps) => {
  useEffect(() => {
    const timer = setTimeout(onNext, duration);
    return () => clearTimeout(timer);
  }, [onNext, duration]);

  return (
    <div className="fixed inset-0 z-[250] bg-stone-950 flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in zoom-in-95 duration-700">
      <Sparkles size={80} className="text-yellow-400 animate-pulse" />
      <h2 className="text-5xl font-black uppercase tracking-tighter italic text-white leading-none">
        {title}
      </h2>
      <div className="flex flex-col items-center gap-4">
        <div className="flex justify-center gap-1">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" 
              style={{ animationDelay: `${i * 0.2}s` }} 
            />
          ))}
        </div>
        {subtitle && (
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 animate-pulse">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
