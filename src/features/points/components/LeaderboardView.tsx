import { Trophy, Star, Award } from 'lucide-react';
import type { LeaderboardEntry } from '../services/pointsService';
import { Avatar } from '../../../shared/ui/Avatar';
import type { AuthUser } from '../../auth/types/auth';

export const LeaderboardView = ({ 
  userPoints, 
  userLevel, 
  leaderboardUsers, 
  onOpenUserProfile,
  authUser
}: { 
  userPoints: number; 
  userLevel: number; 
  leaderboardUsers: LeaderboardEntry[]; 
  onOpenUserProfile: (userId: string) => void;
  authUser: AuthUser | null;
}) => {
  const medalClassByRank = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-stone-400';
    return 'text-orange-400';
  };

  const medalLabelByRank = (rank: number) => {
    return null; // Using Lucide icons now
  };

  const leaders = leaderboardUsers.slice(0, 25).map((leader, index) => ({
    id: leader.id,
    name: leader.displayName,
    username: leader.username,
    points: leader.pointsTotal,
    level: leader.pointsLevel,
    avatar: leader.avatarUrl,
    rank: index + 1,
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in pb-12">
      <header className="text-center space-y-4 py-8">
        <div className="inline-flex p-4 bg-yellow-400 rounded-3xl text-stone-900 shadow-2xl rotate-3 mb-4">
          <Trophy size={32} strokeWidth={2.5} />
        </div>
        <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">Studio Elite</h2>
        <p className="text-stone-400 font-bold uppercase tracking-widest text-[12px]">Global Leaderboard</p>
      </header>

      <div className="bg-white rounded-[3rem] border-4 border-white shadow-2xl overflow-hidden divide-y">
        {leaders.map((leader) => (
          <button key={leader.id} onClick={() => onOpenUserProfile(leader.id)} className="w-full p-8 flex items-center justify-between hover:bg-stone-50 transition-colors text-left">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 flex items-center justify-center">
                {leader.rank === 1 ? (
                  <div className="p-3 bg-yellow-50 rounded-2xl text-yellow-500 shadow-sm border border-yellow-100">
                    <Trophy size={24} strokeWidth={3} />
                  </div>
                ) : leader.rank === 2 ? (
                  <div className="p-3 bg-stone-50 rounded-2xl text-stone-400 shadow-sm border border-stone-100">
                    <Award size={24} strokeWidth={3} />
                  </div>
                ) : leader.rank === 3 ? (
                  <div className="p-3 bg-orange-50 rounded-2xl text-orange-400 shadow-sm border border-orange-100">
                    <Star size={24} strokeWidth={3} />
                  </div>
                ) : (
                  <span className="text-lg font-black text-stone-200">#{leader.rank}</span>
                )}
              </div>
              <Avatar 
                src={leader.avatar} 
                name={leader.name} 
                size="md" 
                className="w-16 h-16 rounded-2xl border-2 border-stone-100 shadow-sm"
              />
              <div>
                <p className="font-black uppercase text-sm tracking-tighter text-stone-900">{leader.name}</p>
                <p className="text-[12px] font-bold text-stone-400 uppercase tracking-widest">@{leader.username} • Level {leader.level}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-stone-900">{leader.points.toLocaleString()}</p>
              <p className="text-[12px] font-black uppercase tracking-widest text-stone-500">Points</p>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-stone-900 rounded-[3rem] p-10 text-white flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-6">
          <Avatar 
            src={(authUser?.user_metadata?.avatar_url as string) || null} 
            name={(authUser?.user_metadata?.full_name as string) || (authUser?.user_metadata?.name as string) || 'Me'} 
            size="md" 
            className="w-16 h-16 rounded-2xl border-2 border-white/20 shadow-sm"
          />
          <div>
            <p className="font-black uppercase text-sm tracking-tighter">Your Rank</p>
            <p className="text-stone-400 text-[12px] font-bold uppercase tracking-widest">Studio Apprentice</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-yellow-400">{userPoints.toLocaleString()}</p>
          <p className="text-[12px] font-black uppercase tracking-widest text-white/40">Level {userLevel}</p>
        </div>
      </div>
    </div>
  );
};
