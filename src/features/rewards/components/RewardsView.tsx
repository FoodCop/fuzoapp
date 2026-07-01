import React, { useState, useEffect } from 'react';
import { CheckCircle2, Lock, ArrowRight, ChevronDown, ChevronUp, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import type { GamificationState } from '../types/gamification';
import { XP_ACTIONS, OTHER_ACTIONS, MANUAL_FLAGS, ROLES, ACHIEVEMENTS } from '../constants/gamificationData';
import {
  getLevel,
  getLevelProgress,
  reqProgress,
  isReqDone,
  isBadgeEarned,
  roleEarnedCount,
  roleRankLabel,
  getNewlyUnlockedKeys,
  XP_PER_LEVEL
} from '../utils/progressionEngine';

const initialStats = () => ({
  restaurantsVisited: 0, placesSaved: 0, locationsPinned: 0, cuisinesExplored: 0,
  reviewsWritten: 0, photosUploaded: 0, videosUploaded: 0, recipesUploaded: 0,
  likesReceived: 0, followers: 0, helpfulVotes: 0, bookmarksReceived: 0, followsGiven: 0,
  neighborhoodsExplored: 0, hiddenGemsVisited: 0, citiesExplored: 0, countriesVisited: 0,
  kmTraveled: 0, monthsActive: 0, posts: 0, profileVisits: 0, likesOnPosts: 0,
  travelStoriesPosted: 0, tutorialsPublished: 0, reviewAvgLength: 0,
  cafesVisited: 0, pizzaPlaces: 0, sushiTimes: 0, burgerVisits: 0, spicyReviews: 0,
  dessertsShared: 0, veganVisits: 0, streetFoodCheckins: 0,
  tasteProfileComplete: false, topReviewerInCity: false,
  invitationOrQualityBlogger: false, communityRecognitionTravel: false,
  highEngagementRecipe: false, invitationOrQualityInstructor: false
});

const RingSvg = ({ fraction, size, stroke, color, trackColor }: { fraction: number, size: number, stroke: number, color: string, trackColor: string }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, fraction)));
  const center = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={center} cy={center} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
      <circle
        cx={center} cy={center} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
};

export const RewardsView = () => {
  const [state, setState] = useState<GamificationState>({
    xp: 0,
    stats: initialStats(),
    activeRole: 'explorer',
    earnedBefore: {}
  });
  
  const [simOpen, setSimOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number, title: string, reward: string } | null>(null);
  let toastIdCounter = 0;

  const showToast = (title: string, reward: string) => {
    const id = ++toastIdCounter;
    setToast({ id, title, reward });
    setTimeout(() => {
      setToast(prev => (prev?.id === id ? null : prev));
    }, 3000);
  };

  const applyEffect = (effect: Record<string, number | boolean>) => {
    setState(prev => {
      const nextStats = { ...prev.stats };
      Object.keys(effect).forEach(k => {
        if (typeof effect[k] === 'number') {
          nextStats[k] = (nextStats[k] as number || 0) + (effect[k] as number);
        } else {
          nextStats[k] = effect[k];
        }
      });
      return { ...prev, stats: nextStats };
    });
  };

  const simulateXpAction = (key: string) => {
    const action = XP_ACTIONS.find(a => a.key === key);
    if (!action) return;
    setState(prev => ({ ...prev, xp: prev.xp + action.xp }));
    applyEffect(action.effect);
  };

  const simulateOtherAction = (key: string) => {
    const action = OTHER_ACTIONS.find(a => a.key === key);
    if (action) applyEffect(action.effect);
  };

  const toggleManualFlag = (key: string) => {
    setState(prev => ({
      ...prev,
      stats: { ...prev.stats, [key]: !prev.stats[key] }
    }));
  };

  // Check for new unlocks when state changes
  useEffect(() => {
    const { keys, unlocked } = getNewlyUnlockedKeys(state, ROLES, ACHIEVEMENTS);
    if (unlocked.length > 0) {
      setState(prev => ({ ...prev, earnedBefore: { ...prev.earnedBefore, ...keys } }));
      unlocked.forEach((u, i) => {
        setTimeout(() => showToast(u.title, u.reward), i * 1000);
      });
    }
  }, [state.stats, state.xp]);

  const level = getLevel(state.xp);
  const pct = getLevelProgress(state.xp);
  const activeRoleData = ROLES.find(r => r.key === state.activeRole)!;
  const roleEarned = roleEarnedCount(activeRoleData, state.stats);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in pb-32">
      {/* HEADER */}
      <header className="text-left space-y-2 py-4 px-4">
        <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Rewards & Rank</h2>
        <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Your universal level grows from everything you do.</p>
      </header>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-50 bg-yellow-400 text-stone-900 px-6 py-4 rounded-3xl shadow-2xl text-center border-4 border-stone-900"
          >
            <span className="text-2xl block mb-1">🎉</span>
            <div className="font-black uppercase tracking-tighter text-lg leading-tight">{toast.title} Unlocked!</div>
            <div className="font-bold text-[10px] tracking-widest opacity-80 uppercase">{toast.reward}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEVEL CARD */}
      <div className="mx-4 bg-stone-900 text-white rounded-[2rem] p-6 shadow-xl flex items-center gap-6">
        <div className="relative w-20 h-20 flex-shrink-0">
          <RingSvg fraction={pct} size={80} stroke={8} color="#facc15" trackColor="#292524" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black">{level}</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">Level</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-black uppercase tracking-tighter">Your Fuzo Progress</h3>
          <p className="text-yellow-400 font-black uppercase tracking-widest text-[10px] mt-1">{roleRankLabel(activeRoleData, state.stats)}</p>
          <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest mt-4">
            Taste Score: {state.xp.toLocaleString()} XP &bull; {state.xp % XP_PER_LEVEL}/{XP_PER_LEVEL} to next
          </p>
          <div className="h-2 bg-stone-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-yellow-400 transition-all duration-500 ease-out" style={{ width: `${pct * 100}%` }} />
          </div>
        </div>
      </div>

      {/* ROLE SWITCHER */}
      <div className="px-4">
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {ROLES.map(r => (
            <button
              key={r.key}
              onClick={() => setState(prev => ({ ...prev, activeRole: r.key }))}
              className={`flex-shrink-0 px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border-2 ${
                state.activeRole === r.key 
                  ? 'bg-stone-900 text-white border-stone-900 shadow-lg' 
                  : 'bg-white text-stone-400 border-stone-200 hover:border-stone-900 hover:text-stone-900'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* BADGE TRACK */}
      <div className="px-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xl font-black uppercase tracking-tighter">{activeRoleData.label} Badges</h3>
          <span className="text-stone-400 font-black uppercase tracking-widest text-[10px]">{roleEarned}/{activeRoleData.badges.length} Earned</span>
        </div>

        <div className="space-y-4">
          {activeRoleData.badges.map((b, i) => {
            const earned = isBadgeEarned(b, state.stats);
            return (
              <div key={i} className={`p-5 rounded-[2rem] border-4 transition-all flex gap-4 ${earned ? 'bg-yellow-50 border-yellow-400' : 'bg-white border-stone-100'}`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl flex-shrink-0 ${earned ? 'bg-white shadow-sm' : 'bg-stone-100 grayscale opacity-50'}`}>
                  {b.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black uppercase tracking-tighter text-sm">{i + 1}. {b.title}</h4>
                    <span className={`px-3 py-1 rounded-full font-black uppercase tracking-widest text-[8px] ${earned ? 'bg-yellow-400 text-stone-900' : 'bg-stone-100 text-stone-400'}`}>
                      {earned ? 'Earned ✓' : 'Locked'}
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-3">
                    {b.reqs.map((req, j) => {
                      const p = reqProgress(req, state.stats);
                      const isBool = req.target === true;
                      const valText = isBool ? (state.stats[req.stat] ? 'Done' : 'Not yet') : `${Math.min((state.stats[req.stat] as number) || 0, req.target as number)}/${req.target}`;
                      return (
                        <div key={j}>
                          <div className={`flex justify-between text-[10px] font-bold tracking-wide mb-1 ${p >= 1 ? 'text-green-600' : 'text-stone-400'}`}>
                            <span>{p >= 1 ? '✓ ' : ''}{req.label}</span>
                            <span>{valText}</span>
                          </div>
                          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${earned ? 'bg-yellow-400' : 'bg-stone-900'}`} style={{ width: `${p * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2 flex items-center gap-1">
                    <PartyPopper size={12} /> Reward: {b.reward}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACHIEVEMENTS */}
      <div className="px-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xl font-black uppercase tracking-tighter">Milestones</h3>
          <span className="text-stone-400 font-black uppercase tracking-widest text-[10px]">
            {ACHIEVEMENTS.filter(a => !a.future && (state.stats[a.stat!] as number || 0) >= a.target!).length}/{ACHIEVEMENTS.length - 1} Unlocked
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {ACHIEVEMENTS.map((a, i) => {
            if (a.future) {
              return (
                <div key={i} className="bg-stone-50 border-2 border-stone-100 rounded-[2rem] p-4 text-center opacity-50">
                  <div className="relative w-12 h-12 mx-auto mb-3">
                    <RingSvg fraction={0} size={48} stroke={4} color="#e7e5e4" trackColor="#f5f5f4" />
                    <span className="absolute inset-0 flex items-center justify-center text-xl">{a.emoji}</span>
                  </div>
                  <h4 className="font-black uppercase tracking-tighter text-[10px] leading-tight h-8">{a.title}</h4>
                  <div className="text-[8px] font-bold uppercase tracking-widest text-stone-400 mt-1">Coming Soon</div>
                </div>
              );
            }
            const val = (state.stats[a.stat!] as number) || 0;
            const p = Math.max(0, Math.min(1, val / a.target!));
            const done = val >= a.target!;
            return (
              <div key={i} className={`bg-white border-2 rounded-[2rem] p-4 text-center transition-all ${done ? 'border-yellow-400 shadow-md' : 'border-stone-100 grayscale opacity-75'}`}>
                <div className="relative w-12 h-12 mx-auto mb-3">
                  <RingSvg fraction={p} size={48} stroke={4} color={done ? '#facc15' : '#1c1917'} trackColor="#f5f5f4" />
                  <span className="absolute inset-0 flex items-center justify-center text-xl">{a.emoji}</span>
                </div>
                <h4 className="font-black uppercase tracking-tighter text-[10px] leading-tight h-8">{a.title}</h4>
                <div className={`text-[8px] font-black uppercase tracking-widest mt-1 ${done ? 'text-yellow-600' : 'text-stone-400'}`}>
                  {done ? 'Unlocked ✓' : `${Math.min(val, a.target!)}/${a.target}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SIMULATOR */}
      <div className="px-4 pb-8">
        <button
          onClick={() => setSimOpen(!simOpen)}
          className="w-full py-4 bg-stone-100 rounded-2xl flex items-center justify-between px-6 font-black uppercase tracking-widest text-[10px] text-stone-500 hover:bg-stone-200 transition-colors"
        >
          <span>🧪 Demo Simulator (Local Only)</span>
          {simOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        <AnimatePresence>
          {simOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-6">
                <div>
                  <h4 className="font-black uppercase tracking-widest text-[10px] text-stone-400 mb-3">XP Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    {XP_ACTIONS.map(a => (
                      <button key={a.key} onClick={() => simulateXpAction(a.key)} className="px-3 py-2 bg-stone-900 text-yellow-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-stone-800 active:scale-95 transition-all">
                        {a.label} (+{a.xp})
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-black uppercase tracking-widest text-[10px] text-stone-400 mb-3">Other Actions (Feeds Badges)</h4>
                  <div className="flex flex-wrap gap-2">
                    {OTHER_ACTIONS.map(a => (
                      <button key={a.key} onClick={() => simulateOtherAction(a.key)} className="px-3 py-2 bg-stone-100 text-stone-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-stone-200 active:scale-95 transition-all">
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-black uppercase tracking-widest text-[10px] text-stone-400 mb-3">Manual / Judgment Flags</h4>
                  <div className="flex flex-wrap gap-2">
                    {MANUAL_FLAGS.map(f => (
                      <button key={f.key} onClick={() => toggleManualFlag(f.key)} className={`px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all border-2 ${state.stats[f.key] ? 'bg-yellow-400 border-yellow-400 text-stone-900' : 'bg-white border-stone-200 text-stone-400'}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-stone-100 text-center">
                  <button onClick={() => setState({ xp: 0, stats: initialStats(), activeRole: 'explorer', earnedBefore: {} })} className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 underline">
                    Reset Demo Progress
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
