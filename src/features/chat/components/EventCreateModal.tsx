import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Check, Sparkles } from 'lucide-react';
import { Badge } from '../../../shared/ui/Badge';

interface EventCreateModalProps {
  onClose: () => void;
  onSubmit: (eventData: {
    name: string;
    date: string;
    time: string;
    location: string;
    description: string;
  }) => void;
}

export const EventCreateModal = ({ onClose, onSubmit }: EventCreateModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    description: '',
  });

  const isValid = formData.name && formData.date && formData.time && formData.location;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 md:p-8 bg-stone-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-white rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
        {/* Header */}
        <header className="p-8 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center text-stone-900 shadow-lg shadow-yellow-400/20">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Create Social Event</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Host a culinary meetup</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors">
            <X size={24} />
          </button>
        </header>

        {/* Form */}
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 ml-4">Event Name</label>
            <input 
              autoFocus
              placeholder="e.g. Pasta Night at Luigi's"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-stone-50 border-2 border-transparent px-8 py-5 rounded-2xl font-bold text-lg outline-none focus:border-stone-900 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 ml-4">Date</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300" />
                <input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-stone-50 border-2 border-transparent pl-16 pr-8 py-5 rounded-2xl font-bold outline-none focus:border-stone-900 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 ml-4">Time</label>
              <div className="relative">
                <Clock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300" />
                <input 
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full bg-stone-50 border-2 border-transparent pl-16 pr-8 py-5 rounded-2xl font-bold outline-none focus:border-stone-900 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 ml-4">Location</label>
            <div className="relative">
              <MapPin size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300" />
              <input 
                placeholder="Where is it happening?"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-stone-50 border-2 border-transparent pl-16 pr-8 py-5 rounded-2xl font-bold outline-none focus:border-stone-900 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 ml-4">Description (Optional)</label>
            <textarea 
              placeholder="Tell them why they should join..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-stone-50 border-2 border-transparent px-8 py-5 rounded-2xl font-medium outline-none focus:border-stone-900 focus:bg-white transition-all h-24 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="p-8 bg-stone-50 border-t flex gap-4">
          <button 
            onClick={onClose}
            className="w-1/3 py-5 bg-white border border-stone-200 text-stone-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-stone-900 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSubmit(formData)}
            disabled={!isValid}
            className={`
              flex-grow py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all
              ${isValid ? 'bg-stone-900 text-white hover:scale-[1.02] active:scale-95' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}
            `}
          >
            Send Invite <Check size={18} />
          </button>
        </footer>
      </div>
    </div>
  );
};
