import React from 'react';
import { HeroCarousel } from './HeroCarousel';

export const LandingPage = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="h-screen bg-stone-950 text-white overflow-hidden selection:bg-yellow-400 selection:text-stone-900">
      <HeroCarousel onStart={onStart} />
    </div>
  );
};

export default LandingPage;
