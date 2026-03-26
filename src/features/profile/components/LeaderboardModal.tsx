import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Users, Globe, MapPin, ArrowUpRight, Loader2 } from 'lucide-react';
import { Badge } from '../../../shared/ui/Badge';
import { PointsService } from '../../points/services/pointsService';
import type { LeaderboardEntry } from '../../points/services/pointsService';
import type { ChatInboxItem } from '../../chat/types/chatUi';
import type { AuthUser } from '../../auth/types/auth';
import { getMetadataString } from '../../../shared/lib/metadata';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRank: number;
  leaderboardUsers: LeaderboardEntry[]; // Initial global data
  currentUserId?: string;
  friends?: ChatInboxItem[];
  authUser?: AuthUser | null;
}

export const LeaderboardModal = ({ 
  isOpen, 
  onClose, 
  currentUserRank, 
  leaderboardUsers: initialUsers,
  currentUserId,
  friends = [],
  authUser
}: LeaderboardModalProps) => {
  const [filter, setFilter] = useState<'global' | 'friends' | 'local'>('global');
  const [displayUsers, setDisplayUsers] = useState<LeaderboardEntry[]>(initialUsers);
  const [loading, setLoading] = useState(false);

  const filters = [
    { id: 'global', label: 'Global', icon: Globe },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'local', label: 'Local', icon: MapPin },
  ] as const;

  const userCity = useMemo(() => {
    if (!authUser) return null;
    return getMetadataString(authUser, 'location_city') || getMetadataString(authUser, 'location') || null;
  }, [authUser]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchFilteredData = async () => {
      setLoading(true);
      try {
        let result;
        if (filter === 'global') {
          // Use initial users if available, or fetch fresh
          result = await PointsService.getLeaderboard();
        } else if (filter === 'friends') {
          const friendIds = friends.map(f => String(f.id));
          // Include current user in friends leaderboard
          if (currentUserId) friendIds.push(currentUserId);
          result = await PointsService.getFilteredLeaderboard({ 
            filter: 'friends', 
            userIds: friendIds 
          });
        } else if (filter === 'local') {
          result = await PointsService.getFilteredLeaderboard({ 
            filter: 'local', 
            city: userCity || undefined 
          });
        }

        if (result?.success && result.data) {
          setDisplayUsers(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredData();
  }, [filter, isOpen, friends, currentUserId, userCity]);

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
                  <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center text-stone-900 shadow-lg rotate-3">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-stone-900">Leaderboard</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">
                      {filter === 'local' && userCity ? `Top in ${userCity}` : `Your Position: #${currentUserRank}`}
                    </p>
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
                    onClick={() => setFilter(f.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f.id ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    <f.icon size={14} />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto p-8 space-y-4 hide-scrollbar min-h-[300px] relative">
              {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 gap-4">
                  <Loader2 className="animate-spin" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Updating Ranks...</p>
                </div>
              ) : displayUsers.length > 0 ? (
                displayUsers.map((user, idx) => {
                  const isCurrentUser = user.id === currentUserId;
                  const rank = idx + 1;
                  
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
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
                            <p className="font-black uppercase tracking-widest text-[11px] text-stone-900">
                              {user.displayName}
                            </p>
                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isCurrentUser ? 'text-stone-700' : 'text-stone-400'}`}>
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <p className="text-sm font-black italic tracking-tighter text-stone-900">
                          {user.pointsTotal.toLocaleString()} PTS
                        </p>
                        <Badge color={isCurrentUser ? 'white' : 'yellow'}>LVL {user.pointsLevel}</Badge>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-12 space-y-4">
                  <div className="w-16 h-16 bg-stone-50 rounded-3xl flex items-center justify-center text-stone-200">
                    {filter === 'friends' ? <Users size={32} /> : filter === 'local' ? <MapPin size={32} /> : <Trophy size={32} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tighter text-stone-400">No rankings found</h4>
                    <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest mt-1">
                      {filter === 'friends' ? "Invite friends to start competing" : filter === 'local' ? "Be the first in your city to top the charts" : "The board is currently clear"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 bg-stone-50 border-t border-stone-100 shrink-0">
               <button className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl group">
                 Share Achievement <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
