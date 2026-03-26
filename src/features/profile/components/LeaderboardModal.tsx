import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Users, Globe, MapPin, ArrowUpRight } from 'lucide-react';
import { Badge } from '../../../shared/ui/Badge';
import type { LeaderboardEntry } from '../../points/services/pointsService';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRank: number;
  leaderboardUsers: LeaderboardEntry[];
  currentUserId?: string;
}

export const LeaderboardModal = ({ 
  isOpen, 
  onClose, 
  currentUserRank, 
  leaderboardUsers,
  currentUserId 
}: LeaderboardModalProps) => {
  const [filter, setFilter] = useState<'global' | 'friends' | 'local'>('global');

  const filters = [
    { id: 'global', label: 'Global', icon: Globe },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'local', label: 'Local', icon: MapPin },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/60 backdrop-blur-md"
          />

          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-8 border-b border-stone-100 shrink-0">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center text-stone-900 shadow-lg rotate-3 uppercase font-black">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-stone-900">Leaderboard</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">Your Position: #{currentUserRank}</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Filters */}
              <div className="flex bg-stone-50 p-1.5 rounded-2xl gap-1">
                {filters.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f.id ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    <f.icon size={14} />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto p-8 space-y-4 hide-scrollbar">
              {leaderboardUsers.map((user, idx) => {
                const isCurrentUser = user.id === currentUserId;
                const rank = idx + 1;
                
                return (
                  <div 
                    key={user.id}
                    className={`flex items-center justify-between p-5 rounded-[2rem] transition-all ${isCurrentUser ? 'bg-yellow-400 shadow-xl scale-[1.02] border-none' : 'bg-stone-50 border border-stone-100 hover:bg-white hover:shadow-md'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${isCurrentUser ? 'bg-stone-900 text-white' : 'bg-white text-stone-400 border border-stone-100'}`}>
                        {rank}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white border-2 border-stone-100 overflow-hidden shadow-sm">
                          <img src={`https://i.pravatar.cc/100?u=${user.id}`} alt={user.displayName} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className={`font-black uppercase tracking-widest text-[11px] ${isCurrentUser ? 'text-stone-900' : 'text-stone-900'}`}>
                            {user.displayName}
                          </p>
                          <p className={`text-[9px] font-bold uppercase tracking-widest ${isCurrentUser ? 'text-stone-700' : 'text-stone-400'}`}>
                            @{user.username}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <p className={`text-sm font-black italic tracking-tighter ${isCurrentUser ? 'text-stone-900' : 'text-stone-900'}`}>
                        {user.pointsTotal.toLocaleString()} PTS
                      </p>
                      <Badge color={isCurrentUser ? 'white' : 'yellow'}>LVL {user.pointsLevel}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-8 bg-stone-50 border-t border-stone-100 shrink-0">
               <button className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl">
                 Share Achievement <ArrowUpRight size={16} />
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
