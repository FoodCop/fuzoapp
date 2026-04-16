import React, { useMemo } from 'react';
import { 
  Bell, X, MessageSquare, UserPlus, Trophy, 
  Settings, CheckCheck, Clock 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../../../shared/hooks/useFocusTrap';
import type { ChatInboxItem } from '../../chat/types/chatUi';

interface AppNotification {
  id: string;
  type: 'message' | 'friend_request' | 'system' | 'achievement';
  title: string;
  description: string;
  time: string;
  unread: boolean;
  originalType?: 'dm' | 'group';
}

interface NotificationsViewProps {
  isOpen: boolean;
  onClose: () => void;
  friends: ChatInboxItem[];
  onOpenChat: (id: string, type: 'dm' | 'group') => void;
}

export const NotificationsView = ({ isOpen, onClose, friends, onOpenChat }: NotificationsViewProps) => {
  const containerRef = useFocusTrap(isOpen);

  const notifications = useMemo<AppNotification[]>(() => {
    return friends
      .filter(f => (f.unreadCount ?? 0) > 0 || (f.type === 'dm' && 'requestStatus' in f && f.requestStatus === 'pending'))
      .map(f => {
        const isRequest = f.type === 'dm' && 'requestStatus' in f && f.requestStatus === 'pending';
        return {
          id: String(f.id),
          type: isRequest ? 'friend_request' : 'message',
          title: isRequest ? 'Connection Request' : 'New Message',
          description: isRequest 
            ? `${f.name} wants to join your Culinary Crew.`
            : `You have ${f.unreadCount} unread message${(f.unreadCount ?? 0) > 1 ? 's' : ''} from ${f.name}.`,
          time: f.time || 'now',
          unread: true,
          originalType: f.type || 'dm'
        };
      });
  }, [friends]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-md z-[300]" aria-hidden="true"
          />

          {/* Sidebar/Drawer */}
          <motion.div 
            ref={containerRef as any}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[301] shadow-2xl flex flex-col"
            role="dialog" aria-modal="true" aria-label="Notifications"
          >
            <header className="p-8 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center text-yellow-400">
                  <Bell size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-stone-900">Notifications</h2>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-stone-500">Stay updated with FUZO</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                aria-label="Close notifications"
                className="p-4 bg-stone-50 rounded-2xl text-stone-400 hover:text-stone-900 transition-colors min-w-[54px] min-h-[54px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-grow overflow-y-auto p-6 space-y-4 hide-scrollbar">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => {
                      if (notif.type === 'message' || notif.type === 'friend_request') {
                        onOpenChat(notif.id, notif.originalType || 'dm');
                      }
                    }}
                    className={`p-6 rounded-[2.5rem] border transition-all cursor-pointer group active:scale-[0.98] ${notif.unread ? 'bg-stone-50 border-stone-100 shadow-sm' : 'bg-white border-transparent hover:bg-stone-50'}`}
                  >
                    <div className="flex gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        notif.type === 'message' ? 'bg-blue-100 text-blue-600' :
                        notif.type === 'friend_request' ? 'bg-emerald-100 text-emerald-600' :
                        notif.type === 'achievement' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-stone-100 text-stone-600'
                      }`}>
                        {notif.type === 'message' && <MessageSquare size={20} />}
                        {notif.type === 'friend_request' && <UserPlus size={20} />}
                        {notif.type === 'achievement' && <Trophy size={20} />}
                        {notif.type === 'system' && <Settings size={20} />}
                      </div>

                      <div className="space-y-1 flex-grow">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black uppercase text-xs tracking-widest text-stone-900">{notif.title}</h4>
                          {notif.unread && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                        </div>
                        <p className="text-xs font-bold text-stone-500 leading-relaxed pr-8">{notif.description}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <Clock size={12} className="text-stone-500" />
                          <span className="text-[12px] font-black uppercase tracking-widest text-stone-500">{notif.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="w-20 h-20 rounded-[2rem] bg-stone-50 flex items-center justify-center text-stone-300">
                    <Bell size={32} />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tighter text-stone-900">All Caught Up</h3>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-stone-400">You have no new notifications.</p>
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <footer className="p-8 border-t border-stone-100 bg-stone-50/50 pb-[calc(2rem+env(safe-area-inset-bottom))]">
                <button 
                  aria-label="Mark all notifications as read"
                  className="w-full min-h-[56px] bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <CheckCheck size={18} />
                  Mark All As Read
                </button>
              </footer>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
