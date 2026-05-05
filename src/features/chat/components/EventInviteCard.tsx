import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, CheckCircle2, Loader2 } from 'lucide-react';
import type { AppItem } from '../../../shared/types/appItem';
import { RSVPService } from '../../../services/rsvpService';

interface EventInviteCardProps {
  messageId?: string;
  userId?: string;
  event: AppItem;
  role: 'user' | 'ai';
  onRSVP?: (status: 'going' | 'maybe' | 'not_going') => void;
}

export const EventInviteCard = ({ messageId, userId, event, role, onRSVP }: EventInviteCardProps) => {
  const isUser = role === 'user';
  const [status, setStatus] = useState<'going' | 'maybe' | 'not_going' | null>(null);
  const [counts, setCounts] = useState({ going: 0, maybe: 0, not_going: 0 });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!messageId) return;

    const loadRSVPs = async () => {
      const result = await RSVPService.getRSVPsForMessage(messageId);
      if (result.success && result.data) {
        setCounts(result.data);
        if (userId && result.raw) {
          const myRsvp = result.raw.find(r => r.user_id === userId);
          if (myRsvp) setStatus(myRsvp.status as any);
        }
      }
    };

    loadRSVPs();
  }, [messageId, userId]);

  const handleRSVP = async (newStatus: 'going' | 'maybe' | 'not_going') => {
    if (!messageId || !userId || isUpdating) return;

    setIsUpdating(true);
    const result = await RSVPService.submitRSVP(messageId, userId, newStatus);
    
    if (result.success) {
      setStatus(newStatus);
      // Refresh counts
      const countsResult = await RSVPService.getRSVPsForMessage(messageId);
      if (countsResult.success && countsResult.data) {
        setCounts(countsResult.data);
      }
      onRSVP?.(newStatus);
    }
    setIsUpdating(false);
  };

  return (
    <div className={`
      w-full max-w-[280px] md:max-w-[320px] rounded-[2rem] overflow-hidden shadow-2xl border
      ${isUser ? 'bg-stone-900 border-white/10 text-white' : 'bg-white border-stone-100 text-stone-900'}
    `}>
      {/* Visual Header */}
      <div className="relative aspect-[16/10] overflow-hidden bg-stone-800">
        <img 
          src={event.img || 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80'} 
          className="w-full h-full object-cover opacity-80" 
          alt="Event"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 to-transparent" />
        <div className="absolute bottom-4 left-6 right-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="px-2 py-0.5 bg-yellow-400 rounded-md text-[9px] font-black uppercase text-stone-900">Invite</div>
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Fuzo Social</span>
          </div>
          <h3 className="text-xl font-black uppercase tracking-tighter leading-tight line-clamp-2 italic">
            {event.name || 'Culinary Meetup'}
          </h3>
        </div>
      </div>

      {/* Details */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">When</p>
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-yellow-400" />
              <span className="text-[11px] font-bold truncate">{event.eventDate || 'Sat, 12 Oct'}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Time</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold">{event.eventTime || '19:00 PM'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Location</p>
          <div className="flex items-center gap-2">
            <MapPin size={12} className="text-yellow-400 shrink-0" />
            <span className="text-[11px] font-bold truncate">{event.eventLocation || 'Mama Mia\'s, Downtown'}</span>
          </div>
        </div>

        <div className="pt-4 space-y-3 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users size={12} className="opacity-40" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                {counts.going} Attending
              </span>
            </div>
            {status && (
              <div className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">{status}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['going', 'maybe', 'not_going'] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleRSVP(s)}
                disabled={isUpdating}
                className={`
                  py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center
                  ${status === s 
                    ? 'bg-yellow-400 text-stone-900' 
                    : isUser 
                      ? 'bg-white/5 text-white hover:bg-white/10' 
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}
                `}
              >
                {isUpdating && status === s ? <Loader2 size={10} className="animate-spin" /> : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
