/**
 * ============================================================================
 * REWARDS MODULE — Gamification & Redemption
 * ============================================================================
 * 
 * Component Architecture:
 * 1. Rewards State: Static list of unlockable platform tiers/badges.
 * 2. Theme Engine: Color-coded UI classes for different reward types.
 * 3. Redemption logic: Handling point-based unlocking (placeholder).
 */

import React from 'react';
import { Gift, Star, Sparkles, Bot, MapPin } from 'lucide-react';
import type { IconComponent } from '../../../shared/types/ui';

/**
 * COMPONENT: RewardsView
 * Interface for viewing and redeeming culinary points for Studio upgrades.
 */
export const RewardsView = () => {
  type RewardColor = 'yellow' | 'indigo' | 'emerald' | 'blue';
  
  // SECTION: Theme Definition
  const REWARD_COLOR_CLASSES: Record<RewardColor, string> = {
    yellow: 'bg-yellow-100 text-yellow-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  // SECTION: Rewards Registry
  const rewards = [
    { id: 1, title: "Studio Pro Badge", desc: "Unlock exclusive profile flair", cost: 5000, icon: Star, color: "yellow" },
    { id: 2, title: "Neural Filter Pack", desc: "New AI styles for your snaps", cost: 12000, icon: Sparkles, color: "indigo" },
    { id: 3, title: "Chef Consultation", desc: "1-on-1 session with Chef AI Pro", cost: 25000, icon: Bot, color: "emerald" },
    { id: 4, title: "Priority Scouting", desc: "Early access to hidden gems", cost: 40000, icon: MapPin, color: "blue" },
  ] as const satisfies ReadonlyArray<{
    id: number;
    title: string;
    desc: string;
    cost: number;
    icon: IconComponent;
    color: RewardColor;
  }>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in pb-32">
      <header className="text-center space-y-4 py-8">
        <div className="inline-flex p-4 bg-emerald-500 rounded-3xl text-white shadow-2xl -rotate-3 mb-4">
          <Gift size={32} strokeWidth={2.5} />
        </div>
        <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">Studio Rewards</h2>
        <p className="text-stone-400 font-bold uppercase tracking-widest text-[12px]">Redeem your culinary points</p>
      </header>

      <div className="grid grid-cols-1 gap-6 px-4">
        {rewards.map((reward) => (
          <div key={reward.id} className="bg-white rounded-[3rem] p-8 border-4 border-white shadow-xl flex items-center justify-between group hover:shadow-2xl transition-all">
            <div className="flex items-center gap-6">
              <div className={`p-5 rounded-[2rem] group-hover:scale-110 transition-transform ${REWARD_COLOR_CLASSES[reward.color]}`}>
                <reward.icon size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-stone-900">{reward.title}</h3>
                <p className="text-stone-400 font-bold text-sm">{reward.desc}</p>
              </div>
            </div>
            <button className="px-8 py-4 bg-stone-900 text-white rounded-2xl font-black uppercase text-[12px] tracking-widest hover:bg-stone-800 transition-colors">
              {reward.cost.toLocaleString()} Pts
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
