import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, Bell } from 'lucide-react';
import { GeminiService } from '../../../services/geminiService';
import { CHEF_SUGGESTED_PROMPTS } from '../constants/prompts';

/**
 * ChefAIView - AI Chat interface for culinary expertise.
 * Extracted from index.tsx as part of the modularization effort.
 */
export const ChefAIView = ({ onShowNotifications }: { onShowNotifications?: () => void }) => {
  const [messages, setMessages] = useState([{ role: 'ai', text: 'Chef FUZO here. What culinary secrets shall we unlock?' }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (overrideText?: string) => {
    const outgoing = (overrideText ?? input).trim();
    if (!outgoing) return;
    const txt = outgoing;
    if (!overrideText) {
      setInput("");
    }
    setMessages(prev => [...prev, { role: 'user', text: txt }]);
    setLoading(true);
    
    try {
      const res = await GeminiService.generateContent({
        model: 'gemini-3-flash-preview',
        contents: txt,
        config: { systemInstruction: "You are TAKO, an elite AAA culinary expert AI within the FUZO ecosystem. Be bold, concise, and professional." },
      });

      if (res.success && res.data?.text) {
        setMessages(prev => [...prev, { role: 'ai', text: res.data?.text || 'Chef FUZO is thinking. Try again.' }]);
      } else {
        throw new Error(res.error || 'Gemini unavailable');
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Studio signal weak. Check connection.' }]);
    }
    finally { setLoading(false); }
  };

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const handleSuggestedPrompt = useCallback((prompt: string) => {
    sendMessage(prompt).catch(() => {
      setMessages(prev => [...prev, { role: 'ai', text: 'Studio signal weak. Check connection.' }]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto h-[75vh] flex flex-col bg-white rounded-[1.75rem] shadow-2xl border-4 border-white overflow-hidden">
      <header className="p-8 border-b bg-stone-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center text-yellow-400 shadow-xl"><Bot size={24} /></div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest">TAKO AI</h4>
            <p className="text-[11px] text-emerald-500 font-bold uppercase tracking-widest">Online</p>
          </div>
        </div>
        <button 
          onClick={onShowNotifications}
          className="p-3 bg-white text-stone-400 rounded-2xl shadow-sm border border-stone-100 active:scale-90 transition-transform relative"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" aria-hidden="true" />
        </button>
      </header>
      <div className="flex-grow p-8 overflow-y-auto hide-scrollbar space-y-6">
        <div className="flex flex-wrap gap-2">
          {CHEF_SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSuggestedPrompt(prompt)}
              className="px-4 py-2 rounded-full bg-stone-100 hover:bg-yellow-400 text-stone-900 text-[12px] font-black uppercase tracking-widest transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
        {messages.map((m) => (
          <div key={`${m.role}-${m.text}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-6 rounded-[2.5rem] font-bold text-sm shadow-sm ${m.role === 'user' ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-900'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 p-6">
            <div className="w-2 h-2 bg-stone-200 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-stone-200 rounded-full animate-bounce delay-100" />
          </div>
        )}
        <div ref={endRef} />
      </div>
      <footer className="p-6 border-t flex gap-3 bg-white">
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && sendMessage()} 
          placeholder="Consult the Chef..." 
          className="flex-grow bg-stone-50 px-8 py-5 rounded-[2rem] font-black text-xs uppercase outline-none focus:ring-4 focus:ring-yellow-400/10 transition-all" 
        />
        <button 
          onClick={() => { sendMessage().catch(() => undefined); }} 
          className="w-16 h-16 bg-yellow-400 rounded-3xl flex items-center justify-center shadow-xl active:scale-95 transition-transform"
        >
          <Send size={24} />
        </button>
      </footer>
    </div>
  );
};
