import type React from 'react';
import { ChevronRight } from 'lucide-react';
import type { SettingsItemProps } from '../types/ui';

export const SettingsSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <h4 className="px-6 text-[12px] font-black uppercase tracking-[0.3em] text-stone-300">{title}</h4>
    <div className="bg-white rounded-[2.5rem] border-4 border-white overflow-hidden divide-y shadow-xl">
      {children}
    </div>
  </div>
);

export const SettingsItem = ({ icon: Icon, label, value, onClick, color = 'stone', action }: SettingsItemProps) => (
  <button
    onClick={onClick}
    className="w-full p-8 flex items-center justify-between hover:bg-stone-50 transition-colors group text-left"
  >
    <div className="flex items-center gap-6">
      <div className={`p-4 bg-${color}-100 rounded-2xl text-${color}-900 group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="font-black uppercase text-[12px] tracking-widest text-stone-400 leading-none mb-1.5">{label}</p>
        <p className="font-bold text-sm text-stone-900">{value}</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      {/* Optional action slot */}
      {action && (
        <div onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}
      <ChevronRight size={20} className="text-stone-200 group-hover:text-stone-400 transition-colors" />
    </div>
  </button>
);
