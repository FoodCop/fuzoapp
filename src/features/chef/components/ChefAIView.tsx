import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, Bell } from 'lucide-react';
import { GeminiService } from '../../../services/geminiService';
import { CHEF_SUGGESTED_PROMPTS } from '../constants/prompts';

interface ChefStructuredResponse {
  speech: string;
  bullets?: string[];
  cards?: {
    title: string;
    description: string;
    meta?: string;
    suggestion: string;
  }[];
  actions?: {
    label: string;
    command: string;
  }[];
  suggestions?: string[];
}

const parseChefResponse = (text: string): ChefStructuredResponse | null => {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && typeof parsed.speech === 'string') {
      return parsed as ChefStructuredResponse;
    }
  } catch {
    try {
      const match = trimmed.match(/^```json\s*([\s\S]*?)\s*```$/);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1].trim());
        if (parsed && typeof parsed === 'object' && typeof parsed.speech === 'string') {
          return parsed as ChefStructuredResponse;
        }
      }
    } catch {
      // Ignored
    }
  }
  return null;
};

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
    if (loading) return;
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
        config: {
          systemInstruction: "You are TAKO, an elite AAA culinary expert AI within the FUZO ecosystem. Be bold, extremely concise, and professional. You MUST always respond in structured JSON format according to the provided schema. Never output markdown outside the JSON, and never include long narrative paragraphs. Focus on bullet points, selectable option cards, concise action commands, and quick follow-up suggestions.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              speech: { 
                type: 'string', 
                description: 'A very concise greeting, summary, or introduction in 1 short sentence (max 15 words). Required.' 
              },
              bullets: {
                type: 'array',
                items: { type: 'string' },
                description: '2-4 concise, punchy bullet points.'
              },
              cards: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Culinary name of the card. Max 25 characters.' },
                    description: { type: 'string', description: 'Short 1-sentence description. Max 10 words.' },
                    meta: { type: 'string', description: 'Brief tags like "Prep: 15m | 350 kcal" or "Keto | 4.8★".' },
                    suggestion: { type: 'string', description: 'Prompt to send when user selects this card (e.g. "How to make Keto Salmon Bowl").' }
                  },
                  required: ['title', 'description', 'suggestion']
                },
                description: '1-3 interactive gourmet/dish cards.'
              },
              actions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string', description: 'Action button text. E.g. "Get Recipe", "List Ingredients". Max 15 chars.' },
                    command: { type: 'string', description: 'The exact user query/command to trigger when this action is clicked.' }
                  },
                  required: ['label', 'command']
                },
                description: '1-2 concise action steps.'
              },
              suggestions: {
                type: 'array',
                items: { type: 'string' },
                description: '2-3 quick follow-up prompt chips.'
              }
            },
            required: ['speech']
          }
        },
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

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt).catch(() => {
      setMessages(prev => [...prev, { role: 'ai', text: 'Studio signal weak. Check connection.' }]);
      setLoading(false);
    });
  };

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
        {messages.map((m, idx) => {
          if (m.role === 'user') {
            return (
              <div key={`user-${idx}`} className="flex justify-end">
                <div className="max-w-[85%] p-6 rounded-[2.5rem] font-bold text-sm shadow-sm bg-stone-900 text-white">
                  {m.text}
                </div>
              </div>
            );
          }

          const parsed = parseChefResponse(m.text);
          if (parsed) {
            return (
              <div key={`ai-${idx}`} className="flex justify-start w-full">
                <div className="w-full max-w-[90%] p-6 rounded-[2rem] bg-stone-50 border border-stone-100/50 shadow-sm space-y-4">
                  {/* Header/Speech */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-stone-900 flex items-center justify-center text-yellow-400 shrink-0 shadow-sm">
                      <Bot size={16} />
                    </div>
                    <div className="flex-grow pt-1">
                      <p className="text-stone-800 text-sm font-black leading-relaxed">
                        {parsed.speech}
                      </p>
                    </div>
                  </div>
                  
                  {/* Bullet Points */}
                  {parsed.bullets && parsed.bullets.length > 0 && (
                    <div className="pl-11 space-y-2">
                      {parsed.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2.5 text-stone-600 text-xs font-bold leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0 mt-1.5" />
                          <span>{bullet}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selectable Cards (Grid Stack) */}
                  {parsed.cards && parsed.cards.length > 0 && (
                    <div className="pl-11 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {parsed.cards.map((card, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => handleSuggestedPrompt(card.suggestion)}
                          className="flex flex-col text-left p-4 rounded-2xl bg-white border border-stone-200 hover:border-yellow-400 hover:shadow-md hover:scale-[1.01] active:scale-95 transition-all group"
                        >
                          <span className="font-black text-xs uppercase tracking-wider text-stone-900 group-hover:text-yellow-500 transition-colors mb-1">
                            {card.title}
                          </span>
                          <span className="text-[11px] text-stone-500 font-bold leading-normal mb-2">
                            {card.description}
                          </span>
                          {card.meta && (
                            <span className="inline-block mt-auto w-fit text-[9px] uppercase tracking-widest font-black bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                              {card.meta}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {parsed.actions && parsed.actions.length > 0 && (
                    <div className="pl-11 flex flex-wrap gap-2">
                      {parsed.actions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          type="button"
                          onClick={() => handleSuggestedPrompt(act.command)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-black uppercase tracking-widest shadow-sm hover:shadow-md active:scale-95 transition-all"
                        >
                          <span>{act.label}</span>
                          <span className="text-[10px] text-yellow-400">➔</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Suggestions pills */}
                  {parsed.suggestions && parsed.suggestions.length > 0 && (
                    <div className="pl-11 pt-3 border-t border-stone-200/50 flex flex-wrap gap-2">
                      {parsed.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleSuggestedPrompt(sug)}
                          className="px-3 py-1.5 rounded-full border border-stone-200 hover:border-yellow-400 hover:bg-yellow-50 text-stone-600 hover:text-stone-900 text-[10px] font-extrabold uppercase tracking-widest active:scale-95 transition-all"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={`ai-fallback-${idx}`} className="flex justify-start">
              <div className="max-w-[85%] p-6 rounded-[2.5rem] font-bold text-sm shadow-sm bg-stone-50 text-stone-900">
                {m.text}
              </div>
            </div>
          );
        })}
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
