import React from 'react';
import { Instagram, Play, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import type { InstagramMedia } from '../../../services/metaService';

interface SocialGridProps {
  media: InstagramMedia[];
  isLoading?: boolean;
}

export const SocialGrid = ({ media, isLoading }: SocialGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="aspect-square bg-stone-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="p-12 bg-stone-50 rounded-[3rem] border-2 border-dashed border-stone-100 text-center space-y-4">
        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-stone-300 mx-auto shadow-sm">
          <Instagram size={32} />
        </div>
        <p className="text-[12px] font-black uppercase tracking-widest text-stone-400">
          No Instagram media synced yet
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {media.map((item, index) => (
        <motion.a
          key={item.id}
          href={item.permalink}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className="group relative aspect-square bg-stone-100 rounded-2xl overflow-hidden shadow-sm"
        >
          <img 
            src={item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url} 
            alt={item.caption || 'Instagram post'} 
            className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
          />
          
          {item.media_type === 'VIDEO' && (
            <div className="absolute top-2 right-2 p-1.5 bg-black/20 backdrop-blur-md rounded-lg text-white">
              <Play size={12} fill="currentColor" />
            </div>
          )}

          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
            <p className="text-[10px] text-white font-bold line-clamp-3 mb-3 leading-relaxed">
              {item.caption || 'View on Instagram'}
            </p>
            <ExternalLink size={16} className="text-yellow-400" />
          </div>
        </motion.a>
      ))}
    </div>
  );
};
