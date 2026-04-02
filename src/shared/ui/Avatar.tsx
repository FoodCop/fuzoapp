import React from 'react';
import { getInitials, getAvatarColor } from '../lib/avatarHelpers';

interface AvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Renders a user avatar with initials as fallback
 */
export const Avatar = ({ 
  src, 
  name, 
  className = '', 
  size = 'md' 
}: AvatarProps) => {
  const initials = getInitials(name || '??');
  const baseClasses = `rounded-[2.5rem] overflow-hidden flex items-center justify-center shrink-0 ${className}`;
  
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  if (src && src.trim() !== '') {
    return (
      <div className={`${baseClasses} ${sizeClasses[size]}`}>
        <img 
          src={src} 
          alt={name || 'Avatar'} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.classList.add(getAvatarColor(name || '??'));
            (e.target as HTMLImageElement).parentElement!.innerText = initials;
          }}
        />
      </div>
    );
  }

  const bgColor = getAvatarColor(name || '??');
  const fontSize = size === 'xl' ? 'text-2xl' : size === 'lg' ? 'text-xl' : 'text-xs';

  return (
    <div className={`${baseClasses} ${sizeClasses[size]} ${bgColor} font-black uppercase tracking-widest text-stone-600 ${fontSize}`}>
      {initials}
    </div>
  );
};
