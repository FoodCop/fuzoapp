import React from 'react';
import { 
  Bell, X, MessageSquare, UserPlus, Trophy, 
  Settings, CheckCheck, Clock 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  type: 'message' | 'friend_request' | 'system' | 'achievement';
  title: string;
  description: string;
  time: string;
  unread: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'message',
    title: 'New Message',
    description: 'Chef Marco sent you a recipe for Truffle Pasta.',
    time: '2m ago',
    unread: true,
  },
  {
    id: '2',
    type: 'friend_request',
    title: 'Connection Request',
    description: 'Sarah Wants to join your Culinary Crew.',
    time: '1h ago',
    unread: true,
  },
  {
    id: '3',
    type: 'achievement',
    title: 'New Badge Unlocked',
    description: 'You earned the "Local Legend" status in Toronto!',
    time: '3h ago',
    unread: false,
  },
  {
    id: '4',
    type: 'system',
    title: 'System Update',
    description: 'New seasonal ingredients added to the explorer.',
    time: '5h ago',
    unread: false,
  }
];

interface NotificationsViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsView = ({ isOpen, onClose }: NotificationsViewProps) => {
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
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-md z-[300]"
          />

          {/* Sidebar/Drawer */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[301] shadow-2xl flex flex-col"
          >
            <header className="p-8 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center text-yellow-400">
                  <Bell size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-stone-900">Notifications</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Stay updated with FUZO</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-stone-50 rounded-2xl text-stone-400 hover:text-stone-900 transition-colors"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-grow overflow-y-auto p-6 space-y-4 hide-scrollbar">
              {MOCK_NOTIFICATIONS.map((notif) => (
                <div 
                  key={notif.id}
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
                        <Clock size={10} className="text-stone-300" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-300">{notif.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <footer className="p-8 border-t border-stone-100 bg-stone-50/50">
              <button className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                <CheckCheck size={18} />
                Mark All As Read
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
