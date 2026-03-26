import React from 'react';

export type BadgeColor = 'yellow' | 'stone' | 'blue' | 'emerald' | 'indigo' | 'red';

export const BADGE_COLOR_CLASSES: Record<BadgeColor, string> = {
  yellow: 'bg-yellow-100 text-yellow-800',
  stone: 'bg-stone-100 text-stone-800',
  blue: 'bg-blue-100 text-blue-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  red: 'bg-red-100 text-red-800',
};

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

export const Badge = ({ children, color = 'yellow', className = '' }: BadgeProps) => (
  <span className={`px-2.5 py-1 rounded-full text-[12px] font-black uppercase tracking-widest whitespace-nowrap ${BADGE_COLOR_CLASSES[color]} ${className}`}>
    {children}
  </span>
);
