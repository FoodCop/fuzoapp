import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  MapPin, 
  ChefHat, 
  PlayCircle, 
  LayoutGrid, 
  Bot, 
  ArrowRight, 
  Sparkles, 
  Search, 
  TrendingUp, 
  Activity, 
  Plus, 
  Video, 
  Image as ImageIcon,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '../../../shared/ui/Badge';

interface DashboardViewProps {
  setTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setTab }) => {
  const [greeting, setGreeting] = useState('Welcome');
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic greeting based on real-time hour
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const stats = [
    { label: 'Total Posts', value: '38', icon: LayoutGrid, change: '+12%', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { label: 'Recipes Shared', value: '14', icon: ChefHat, change: '+4%', color: 'bg-orange-50 text-orange-600 border-orange-100' },
    { label: 'Videos Uploaded', value: '9', icon: PlayCircle, change: '+2%', color: 'bg-rose-50 text-rose-600 border-rose-100' },
    { label: 'Discoveries Added', value: '15', icon: MapPin, change: '+8%', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
  ];

  const quickActions = [
    { label: 'Add Recipe', tab: 'bites', icon: Plus, color: 'hover:bg-orange-50 hover:text-orange-600 border-stone-200' },
    { label: 'Upload Video', tab: 'trims', icon: Video, color: 'hover:bg-rose-50 hover:text-rose-600 border-stone-200' },
    { label: 'Take Snap', tab: 'snap', icon: Camera, color: 'hover:bg-yellow-50 hover:text-amber-600 border-stone-200' },
    { label: 'Open AI Chef', tab: 'chef', icon: Bot, color: 'hover:bg-purple-50 hover:text-purple-600 border-stone-200' }
  ];

  const CTAs = [
    {
      id: 'snap',
      title: 'SNAP Studio',
      description: 'Take a snap of a new discovery',
      icon: Camera,
      tab: 'snap',
      gradient: 'from-yellow-400/10 via-amber-300/5 to-transparent',
      borderColor: 'group-hover:border-yellow-400/70',
      iconColor: 'bg-yellow-400 text-stone-900',
      badge: 'Capture',
      colorTag: 'yellow'
    },
    {
      id: 'scout',
      title: 'Scout Map',
      description: 'Pin a new discovery to the map',
      icon: MapPin,
      tab: 'scout',
      gradient: 'from-emerald-400/10 via-teal-300/5 to-transparent',
      borderColor: 'group-hover:border-emerald-400/70',
      iconColor: 'bg-emerald-500 text-white',
      badge: 'Discover',
      colorTag: 'emerald'
    },
    {
      id: 'bites',
      title: 'AI Bites Studio',
      description: 'Upload your own recipe',
      icon: ChefHat,
      tab: 'bites',
      gradient: 'from-orange-400/10 via-red-300/5 to-transparent',
      borderColor: 'group-hover:border-orange-400/70',
      iconColor: 'bg-orange-500 text-white',
      badge: 'Cook',
      colorTag: 'orange'
    },
    {
      id: 'trims',
      title: 'AI Trims Studio',
      description: 'Share a Video',
      icon: PlayCircle,
      tab: 'trims',
      gradient: 'from-rose-400/10 via-pink-300/5 to-transparent',
      borderColor: 'group-hover:border-rose-400/70',
      iconColor: 'bg-rose-500 text-white',
      badge: 'Watch',
      colorTag: 'rose'
    },
    {
      id: 'feed',
      title: 'Fuzo Feed',
      description: 'Discover posts from users',
      icon: LayoutGrid,
      tab: 'feed',
      gradient: 'from-blue-400/10 via-indigo-300/5 to-transparent',
      borderColor: 'group-hover:border-blue-400/70',
      iconColor: 'bg-blue-500 text-white',
      badge: 'Explore',
      colorTag: 'blue'
    },
    {
      id: 'chef',
      title: 'AI Chef',
      description: 'Make a plan',
      icon: Bot,
      tab: 'chef',
      gradient: 'from-purple-400/10 via-violet-300/5 to-transparent',
      borderColor: 'group-hover:border-purple-400/70',
      iconColor: 'bg-purple-50 text-white',
      badge: 'Plan',
      colorTag: 'purple'
    },
  ];

  const recentActivities = [
    { user: 'Chef Marcus', action: 'pinned a new discovery near Downtown', time: '10m ago', item: 'Truffle Ramen Spot' },
    { user: 'You', action: 'uploaded a recipe video to AI Trims', time: '1h ago', item: 'Smoked Crispy Octopus' },
    { user: 'Sarah Jenkins', action: 'loved your shared dish', time: '3h ago', item: 'Hand-pulled Matcha Noodles' },
    { user: 'Fuzo System', action: 'awarded you 150 points for completing a Snap challenge', time: '1d ago', item: 'Snap & Score' }
  ];

  const trendingDiscoveries = [
    {
      title: 'Smoked Crispy Octopus Bar',
      location: 'Tokyo Bistro, Waterfront',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80',
      category: 'Experimental Fusion',
      rating: '4.9',
      saves: '218'
    },
    {
      title: 'Artisanal Sourdough & Truffle Honey',
      location: 'The Grain Laboratory, Midtown',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
      category: 'Rustic Heritage',
      rating: '4.8',
      saves: '143'
    },
    {
      title: 'Hand-pulled Spicy Matcha Noodles',
      location: 'Neo-Zen Dining Hall',
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80',
      category: 'Green Tech Fusion',
      rating: '5.0',
      saves: '320'
    }
  ];

  // Filter CTAs based on search query
  const filteredCTAs = CTAs.filter(cta => 
    cta.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    cta.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cta.badge.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full bg-stone-50 text-stone-800 pb-32 overflow-x-hidden selection:bg-yellow-400 selection:text-stone-900">
      
      {/* 1. HERO SECTION WITH SOFT PASTEL LIGHT GRADIENTS */}
      <div className="relative bg-white pt-20 pb-28 px-6 md:px-12 rounded-b-[4rem] border-b border-stone-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* Soft pastel ambient background glow */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[35rem] h-[35rem] rounded-full bg-gradient-to-br from-purple-100 via-indigo-50 to-pink-100 blur-[100px]"></div>
          <div className="absolute top-48 -left-32 w-[25rem] h-[25rem] rounded-full bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 blur-[90px]"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge color="yellow" className="inline-flex py-1 px-3 border border-yellow-400/30 bg-yellow-400/10 text-amber-800 uppercase tracking-widest text-[10px] font-black">
                  Premium Access
                </Badge>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Dev Live Session</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-stone-900 leading-none">
                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600">Explorer</span>
              </h1>
              <p className="text-stone-550 mt-3 text-sm font-semibold tracking-wide max-w-lg">
                Craft, share, and customize your culinary identity inside the ultimate creative environment.
              </p>
            </div>

            {/* Clean Light Search Bar */}
            <div className="w-full md:w-80 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-amber-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search studios, actions, feeds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50 pl-12 pr-4 py-4 rounded-2xl text-xs font-bold tracking-widest text-stone-800 placeholder-stone-400 outline-none border border-stone-200 focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5 transition-all duration-300 shadow-inner"
              />
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="border-t border-stone-150 pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-3">
              {quickActions.map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.label}
                    onClick={() => setTab(act.tab)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-stone-200 text-stone-700 text-xs font-black uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm ${act.color}`}
                  >
                    <Icon size={14} strokeWidth={2.5} />
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATS SECTION (ABOVE THE CTA CARDS) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-12 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-stone-200/80 backdrop-blur-xl p-5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-stone-300 transition-colors group relative overflow-hidden"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 group-hover:text-stone-500 transition-colors">
                    {stat.label}
                  </span>
                  <div className={`p-2.5 rounded-xl border ${stat.color}`}>
                    <Icon size={16} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black tracking-tight text-stone-900">{stat.value}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-0.5">
                    <TrendingUp size={8} /> {stat.change}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN CREATIVE STUDIOS GRID */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12 relative z-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
              <Sparkles size={16} />
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-stone-900">Creative Studios</h2>
          </div>
          {searchQuery && (
            <span className="text-xs font-bold text-stone-500">
              Found {filteredCTAs.length} results
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCTAs.map((cta, index) => {
            const Icon = cta.icon;
            return (
              <motion.button
                key={cta.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setTab(cta.tab)}
                className={`group relative bg-white border border-stone-200 rounded-[2.5rem] p-8 hover:bg-stone-50/50 text-left overflow-hidden flex flex-col justify-between min-h-[220px] transition-all duration-500 shadow-[0_12px_40px_rgba(0,0,0,0.03)] border-t border-t-stone-150 ${cta.borderColor}`}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Soft glow hover gradient accent */}
                <div className={`absolute right-0 top-0 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 blur-[40px] transition-all duration-700 pointer-events-none bg-gradient-to-bl ${cta.gradient}`}></div>
                
                <div className="relative z-10 flex justify-between items-start w-full">
                  <div className={`p-4 rounded-2xl ${cta.iconColor} shadow-md group-hover:scale-110 transition-transform duration-500`}>
                    <Icon size={24} strokeWidth={2.5} />
                  </div>
                  
                  <Badge color={cta.colorTag as any} className="opacity-95 font-black tracking-widest text-[9px] px-3.5 py-1 border border-stone-200/50 backdrop-blur-md">
                    {cta.badge}
                  </Badge>
                </div>

                <div className="relative z-10 mt-8 flex justify-between items-end w-full">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-stone-900 group-hover:text-amber-600 transition-colors duration-300">
                      {cta.title}
                    </h3>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-stone-400 mt-1.5 group-hover:text-stone-500 transition-colors">
                      {cta.description}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-300 shadow-sm group-hover:translate-x-1">
                    <ArrowRight size={16} strokeWidth={3} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {filteredCTAs.length === 0 && (
          <div className="text-center py-20 bg-white border border-stone-200 rounded-[2.5rem] p-10 mt-6 shadow-sm">
            <Bot className="mx-auto text-stone-300 mb-4 animate-bounce" size={48} />
            <h3 className="text-lg font-black uppercase tracking-widest text-stone-500">No Studios Found</h3>
            <p className="text-stone-400 mt-1 text-xs font-bold uppercase tracking-wider">Try adjusting your search query</p>
          </div>
        )}
      </div>

      {/* 4. DUAL COLUMN SECTION: TRENDING & RECENT ACTIVITIES */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-20">
        
        {/* TRENDING DISCOVERIES SECTION */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600">
                <Flame size={16} />
              </div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-stone-900">Trending Discoveries</h2>
            </div>
            <button 
              onClick={() => setTab('feed')} 
              className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-800 transition-colors flex items-center gap-1 group"
            >
              Explore Feed <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trendingDiscoveries.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white border border-stone-200/80 rounded-3xl overflow-hidden hover:border-stone-300 transition-all duration-300 group flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.015)]"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 to-transparent"></div>
                  <Badge color="stone" className="absolute top-3 left-3 bg-stone-900/80 border border-white/10 text-[8px] uppercase tracking-widest font-black text-white">
                    {item.category}
                  </Badge>
                </div>

                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-tight text-stone-900 leading-tight mt-1 line-clamp-1 group-hover:text-amber-600 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase tracking-wider line-clamp-1">{item.location}</p>
                  </div>

                  <div className="flex justify-between items-center border-t border-stone-100 mt-4 pt-3 text-[10px] font-black uppercase tracking-widest">
                    <span className="text-amber-600 flex items-center gap-1">★ {item.rating}</span>
                    <span className="text-stone-400">{item.saves} saves</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* RECENT ACTIVITY TIMELINE */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-650">
              <Activity size={16} />
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-stone-900">Recent Activity</h2>
          </div>

          <div className="bg-white border border-stone-200 rounded-3xl p-6 space-y-6 relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="absolute top-8 left-9 bottom-8 w-[2px] bg-stone-100"></div>

            {recentActivities.map((act, i) => (
              <div key={i} className="flex gap-4 relative z-10 group">
                <div className="w-6 h-6 rounded-full bg-white border-2 border-stone-300 flex items-center justify-center shrink-0 mt-1 group-hover:border-amber-500 transition-colors duration-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                </div>
                
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-stone-850">{act.user}</span>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{act.time}</span>
                  </div>
                  <p className="text-xs text-stone-500 font-semibold leading-relaxed">
                    {act.action} <span className="text-amber-600 font-bold">{act.item}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
