import type { NavIconProps } from '../types/ui';

export const NavIcon = ({ icon: Icon, active, onClick, label }: NavIconProps) => (
  <button
    onClick={onClick}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
    className={`flex flex-col items-center gap-1 transition-all duration-300 min-w-[44px] min-h-[44px] ${active ? 'text-stone-900' : 'text-stone-500 hover:text-stone-800'}`}
  >
    <div className={`p-2.5 rounded-2xl transition-all ${active ? 'bg-yellow-400 shadow-lg' : ''}`}>
      <Icon size={25} strokeWidth={active ? 3 : 2} />
    </div>
    <span className="text-[11px] font-black uppercase tracking-widest" aria-hidden="true">{label}</span>
  </button>
);
