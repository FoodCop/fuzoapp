import React from 'react';

export type BadgeColor = 'yellow' | 'stone' | 'blue' | 'emerald' | 'indigo' | 'red' | 'white';

export const BADGE_COLOR_CLASSES: Record<BadgeColor, string> = {
  yellow: 'bg-yellow-400/10 text-yellow-600',
  stone: 'bg-stone-100 text-stone-600',
  blue: 'bg-blue-400/10 text-blue-600',
  emerald: 'bg-emerald-400/10 text-emerald-600',
  indigo: 'bg-indigo-400/10 text-indigo-600',
  red: 'bg-red-400/10 text-red-600',
  white: 'bg-white text-stone-900',
};

export const Badge = ({ children, color = 'yellow' }: { children: React.ReactNode; color?: BadgeColor }) => (
  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${BADGE_COLOR_CLASSES[color]}`}>
    {children}
  </span>
);
