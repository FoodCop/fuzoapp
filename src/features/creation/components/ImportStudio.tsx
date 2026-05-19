/**
 * ============================================================================
 * IMPORT STUDIO — AI-Assisted Pinterest/Gallery Ingestion
 * ============================================================================
 * 
 * A high-fidelity flow for converting static screenshots into interactive 
 * Feed Cards. Uses Gemini Vision to extract culinary metadata.
 */

import React, { useState } from 'react';
import { 
  X, Check, Image as ImageIcon, Loader2, Send, 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../../../shared/ui/Badge';
import { GeminiService } from '../../../services/geminiService';
import { FeedService } from '../../feed';
import { parseAiJson, loadUploadedImage } from '../../../shared/lib/studioHelpers';
import { NeuralReveal } from '../../../shared/ui/NeuralReveal';
import type { AppItem } from '../../../shared/types/appItem';

interface ImportStudioProps {
  onClose: () => void;
  onPost: (item: AppItem) => void;
}

export const ImportStudio = ({ onClose, onPost }: ImportStudioProps) => {
  const [step, setStep] = useState<'source' | 'analysis' | 'review' | 'success'>('source');
  const [image, setImage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadUploadedImage(file, setImage, () => {
        setStep('analysis');
        runAnalysis();
      });
    }
  };

  const runAnalysis = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      // Simulate minimal UX buffer
      await new Promise(r => setTimeout(r, 2000));
      
      const result = await GeminiService.analyzeScreenshot(image);
      const parsed = parseAiJson(result);
      
      setMetadata(parsed || {
        name: 'Culinary Discovery',
        cat: 'Pinterest Import',
        description: 'A beautiful culinary inspiration captured from my gallery.',
        tags: ['#foodie', '#inspiration'],
        restaurant: 'Gallery Import'
      });
      
      setStep('review');
    } catch (error) {
      console.error('Analysis failed:', error);
      // Fallback
      setMetadata({
        name: 'Culinary Discovery',
        cat: 'Pinterest Import',
        description: 'A beautiful culinary inspiration captured from my gallery.',
        tags: ['#foodie', '#inspiration'],
        restaurant: 'Gallery Import'
      });
      setStep('review');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePublish = async () => {
    if (!image || !metadata) return;
    setIsPosting(true);
    
    const item: AppItem = {
      id: `import-${Date.now()}`,
      itemType: 'photo',
      itemId: `imp-${Date.now()}`,
      name: metadata.name || 'Culinary Discovery',
      cat: metadata.cat || 'Inspiration',
      img: image,
      metadata: {
        ...metadata,
        source: 'Import'
      }
    };

    try {
      const result = await FeedService.publishToFeed(item);
      if (result.success) {
        setStep('success');
        onPost(item);
      }
    } catch (error) {
      console.error('Publish failed:', error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-stone-950 flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple-500 blur-[120px]" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-emerald-500 blur-[120px]" />
      </div>

      <header className="absolute top-0 inset-x-0 p-8 flex justify-between items-center z-10">
        <div>
          <Badge color="indigo">Photo Import</Badge>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white mt-1">AI Studio</h2>
        </div>
        <button 
          onClick={onClose}
          className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white hover:bg-white/20 transition-all"
        >
          <X size={24} />
        </button>
      </header>

      <div className="w-full max-w-lg relative z-10">
        <AnimatePresence mode="wait">
          {step === 'source' && (
            <motion.div 
              key="source"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[4rem] p-12 text-center space-y-8 shadow-2xl"
            >
              <div className="w-24 h-24 bg-purple-500 rounded-[2rem] flex items-center justify-center text-white shadow-xl mx-auto rotate-3">
                <ImageIcon size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-stone-900">Import Inspiration</h3>
                <p className="text-stone-400 font-bold text-sm px-4">Upload a Pinterest screenshot or a photo from your gallery to create a neural feed card.</p>
              </div>
              <label className="block w-full py-6 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[12px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer">
                Choose Image
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </motion.div>
          )}

          {step === 'analysis' && (
            <motion.div key="analysis" className="w-full flex items-center justify-center">
               <NeuralReveal onNext={() => {}} />
            </motion.div>
          )}

          {step === 'review' && metadata && (
            <motion.div 
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="relative aspect-[9/16] rounded-[3rem] overflow-hidden bg-stone-900 shadow-2xl border-[8px] border-white max-h-[60vh] mx-auto">
                <img src={image!} alt="Imported discovery" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute top-8 left-8">
                  <Badge color="indigo">{metadata.cat}</Badge>
                </div>
                <div className="absolute bottom-12 left-8 right-8 text-white space-y-2">
                  <h4 className="text-2xl font-black uppercase tracking-tighter leading-none">{metadata.name}</h4>
                  <p className="text-xs font-bold opacity-80 italic">"{metadata.description}"</p>
                  <div className="flex gap-2 pt-2">
                    {metadata.tags?.map((t: string) => (
                      <span key={t} className="text-[10px] font-black uppercase tracking-widest opacity-60">{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep('source')} className="px-8 py-6 bg-white/10 text-white rounded-[2rem] font-black uppercase tracking-widest text-[12px] border border-white/20">Edit</button>
                <button 
                  onClick={handlePublish}
                  disabled={isPosting}
                  className="flex-grow py-6 bg-purple-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-[12px] shadow-xl flex items-center justify-center gap-3 hover:bg-purple-600 transition-all"
                >
                  {isPosting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Syndicate to Feed
                </button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500 rounded-[4rem] p-16 text-center space-y-8 shadow-2xl text-white"
            >
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-xl mx-auto">
                <Check size={64} strokeWidth={4} />
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black uppercase tracking-tighter italic">Import Locked</h3>
                <p className="text-emerald-100 font-bold text-sm uppercase tracking-widest">Successfully posted to the feed</p>
              </div>
              <button 
                onClick={onClose}
                className="w-full py-6 bg-white text-emerald-600 rounded-[2rem] font-black uppercase tracking-widest text-[12px] shadow-xl hover:scale-[1.02] transition-all"
              >
                Continue
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
