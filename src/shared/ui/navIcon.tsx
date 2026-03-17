import type { NavIconProps } from '../types/ui';

export const NavIcon = ({ icon: Icon, active, onClick, label: _label }: NavIconProps) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-stone-900' : 'text-stone-300 hover:text-stone-500'}`}
  >
    <div className={`p-2.5 rounded-2xl transition-all ${active ? 'bg-yellow-400 shadow-lg' : ''}`}>
      <Icon size={25} strokeWidth={active ? 3 : 2} />
    </div>
  </button>
);
