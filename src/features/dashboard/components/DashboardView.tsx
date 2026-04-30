import React from 'react';
import { Camera, MapPin, ChefHat, PlayCircle, LayoutGrid, Bot, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '../../../shared/ui/Badge';

interface DashboardViewProps {
  setTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setTab }) => {
  const CTAs = [
    {
      id: 'snap',
      title: 'SNAP Studio',
      description: 'Take a snap of a new discovery',
      icon: Camera,
      tab: 'snap',
      color: 'bg-yellow-400 text-stone-900',
      badge: 'Capture',
    },
    {
      id: 'scout',
      title: 'Scout Map',
      description: 'Pin a new discovery to the map',
      icon: MapPin,
      tab: 'scout',
      color: 'bg-emerald-500 text-white',
      badge: 'Discover',
    },
    {
      id: 'bites',
      title: 'AI Bites Studio',
      description: 'Upload your own recipe',
      icon: ChefHat,
      tab: 'bites',
      color: 'bg-orange-500 text-white',
      badge: 'Cook',
    },
    {
      id: 'trims',
      title: 'AI Trims Studio',
      description: 'Share a Video',
      icon: PlayCircle,
      tab: 'trims',
      color: 'bg-rose-500 text-white',
      badge: 'Watch',
    },
    {
      id: 'feed',
      title: 'Fuzo Feed',
      description: 'Discover posts from users',
      icon: LayoutGrid,
      tab: 'feed',
      color: 'bg-blue-500 text-white',
      badge: 'Explore',
    },
    {
      id: 'chef',
      title: 'AI Chef',
      description: 'Make a plan',
      icon: Bot,
      tab: 'chef',
      color: 'bg-purple-500 text-white',
      badge: 'Plan',
    },
  ];

  return (
    <div className="min-h-full bg-stone-50 pb-32">
      {/* Header section */}
      <div className="bg-stone-900 pt-16 pb-20 px-6 md:px-10 rounded-b-[3rem] shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-yellow-400 blur-3xl"></div>
          <div className="absolute top-32 -left-24 w-48 h-48 rounded-full bg-purple-500 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <Badge color="yellow" className="mb-4 inline-flex">Welcome to Fuzo</Badge>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
              Dashboard <Sparkles className="text-yellow-400" size={32} />
            </h1>
            <p className="text-stone-400 mt-2 text-sm font-bold tracking-widest uppercase max-w-md">
              What would you like to create or explore today?
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-10 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CTAs.map((cta, index) => {
            const Icon = cta.icon;
            return (
              <motion.button
                key={cta.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setTab(cta.tab)}
                className="group relative bg-white rounded-3xl p-6 shadow-xl shadow-stone-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden flex flex-col justify-between min-h-[180px] border border-stone-100"
              >
                {/* Background decorative blob */}
                <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 blur-2xl transition-transform group-hover:scale-150 duration-500 ${cta.color.split(' ')[0]}`}></div>
                
                <div className="relative z-10 flex justify-between items-start">
                  <div className={`p-4 rounded-2xl ${cta.color} shadow-lg shadow-stone-900/10`}>
                    <Icon size={28} strokeWidth={2.5} />
                  </div>
                  <Badge color={cta.color.includes('yellow') ? 'yellow' : 'stone'} className="opacity-80">
                    {cta.badge}
                  </Badge>
                </div>

                <div className="relative z-10 mt-6 flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-stone-900 group-hover:text-stone-700 transition-colors">
                      {cta.title}
                    </h3>
                    <p className="text-xs font-bold tracking-widest uppercase text-stone-400 mt-1">
                      {cta.description}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-colors">
                    <ArrowRight size={18} strokeWidth={3} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
