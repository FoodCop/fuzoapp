import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export type SocialProvider = 'google' | 'apple' | 'facebook';

interface SocialButtonProps {
  provider: SocialProvider;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const BRAND_CONFIG = {
  google: {
    label: 'Sign in with Google',
    bgColor: 'bg-white',
    textColor: 'text-stone-900',
    borderColor: 'border-stone-100',
    icon: (
      <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    )
  },
  apple: {
    label: 'Continue with Apple',
    bgColor: 'bg-black',
    textColor: 'text-white',
    borderColor: 'border-transparent',
    icon: (
      <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.05 20.28c-.96.95-2.44 1.78-3.99 1.77-2.26 0-3.75-1.38-5.74-1.38-1.99 0-3.69 1.35-5.64 1.35-1.5 0-3.14-.94-4.13-2.03-2.1-2.31-2.9-6.32-1.31-9.17 1.05-1.89 2.89-3.08 4.88-3.08 1.4 0 2.5 1 3.29 1 .79 0 2.21-1.25 3.9-1.25.7 0 2.68.25 3.95 2.1-.11.07-2.37 1.37-2.34 4.09 0 3.2 2.67 4.31 2.67 4.31-.03.09-1.12 3.19-2.54 5.28M12.03 7.25c-.02-1.1.63-2.23 1.22-2.89.71-.79 1.83-1.42 2.87-1.42.13 1.15-.4 2.35-1.07 3.14-.69.83-1.91 1.48-3.02 1.17" />
      </svg>
    )
  },
  facebook: {
    label: 'Sign in with Meta',
    bgColor: 'bg-[#1877F2]',
    textColor: 'text-white',
    borderColor: 'border-transparent',
    icon: (
      <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    )
  }
};

export const SocialButton = ({ provider, onClick, isLoading, disabled }: SocialButtonProps) => {
  const config = BRAND_CONFIG[provider];

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`relative w-full py-5 rounded-[2.5rem] border-2 flex items-center justify-center gap-4 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group ${config.bgColor} ${config.borderColor} ${config.textColor}`}
    >
      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-inherit opacity-40" />
      ) : (
        <>
          <span className="shrink-0 transition-transform group-hover:scale-110 duration-300">
            {config.icon}
          </span>
          <span className="font-black uppercase tracking-[0.15em] text-[10px] md:text-xs">
            {config.label}
          </span>
        </>
      )}
    </motion.button>
  );
};
