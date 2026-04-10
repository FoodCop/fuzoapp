import React, { useState, useRef } from 'react';
import { Check, X, Share2, Bookmark } from 'lucide-react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export type SwipePointerEvent = React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>;

export const SwipeCard = ({ children, onSwipe, active }: { children: React.ReactNode; onSwipe: (dir: SwipeDirection) => void; active: boolean }) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handleStart = (e: SwipePointerEvent) => {
    if (!active) return;
    const isTouch = e.type === 'touchstart';
    const clientX = isTouch ? (e as React.TouchEvent<HTMLDivElement>).touches[0].clientX : (e as React.MouseEvent<HTMLDivElement>).clientX;
    const clientY = isTouch ? (e as React.TouchEvent<HTMLDivElement>).touches[0].clientY : (e as React.MouseEvent<HTMLDivElement>).clientY;
    startPos.current = { x: clientX, y: clientY };
    setIsSwiping(true);
  };

  const handleMove = (e: SwipePointerEvent) => {
    if (!isSwiping || !active) return;
    const isTouch = e.type === 'touchmove';
    const clientX = isTouch ? (e as React.TouchEvent<HTMLDivElement>).touches[0].clientX : (e as React.MouseEvent<HTMLDivElement>).clientX;
    const clientY = isTouch ? (e as React.TouchEvent<HTMLDivElement>).touches[0].clientY : (e as React.MouseEvent<HTMLDivElement>).clientY;
    setOffset({ x: clientX - startPos.current.x, y: clientY - startPos.current.y });
  };

  const handleEnd = () => {
    if (!isSwiping || !active) return;
    const threshold = 120;
    if (Math.abs(offset.x) > threshold) onSwipe(offset.x > 0 ? 'right' : 'left');
    else if (Math.abs(offset.y) > threshold) onSwipe(offset.y > 0 ? 'down' : 'up');
    else setOffset({ x: 0, y: 0 });
    setIsSwiping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!active) return;
    if (e.key === 'ArrowRight') onSwipe('right');
    if (e.key === 'ArrowLeft') onSwipe('left');
    if (e.key === 'ArrowUp') onSwipe('up');
    if (e.key === 'ArrowDown') onSwipe('down');
  };

  const rotation = offset.x * 0.05;
  const opacity = Math.min(Math.max(Math.abs(offset.x), Math.abs(offset.y)) / 150, 0.6);

  return (
    <div
      role="button"
      className={`absolute inset-0 w-full h-full rounded-[1.75rem] border-4 border-white shadow-2xl overflow-hidden transition-transform duration-300 ${isSwiping ? 'ease-none' : 'ease-out'} select-none`}
      style={{ 
        transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
        zIndex: active ? 10 : 1,
        touchAction: 'none'
      }}
      tabIndex={active ? 0 : -1}
      aria-label="Swipe discovery card"
      onKeyDown={handleKeyDown}
      onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
      onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
    >
      {offset.x > 50 && <div className="absolute inset-0 bg-emerald-500 z-20 flex items-center justify-center pointer-events-none" style={{ opacity }}><Check size={120} strokeWidth={4} className="text-white" /></div>}
      {offset.x < -50 && <div className="absolute inset-0 bg-red-500 z-20 flex items-center justify-center pointer-events-none" style={{ opacity }}><X size={120} strokeWidth={4} className="text-white" /></div>}
      {offset.y < -50 && <div className="absolute inset-0 bg-yellow-400 z-20 flex items-center justify-center pointer-events-none" style={{ opacity }}><Share2 size={120} strokeWidth={4} className="text-stone-900" /></div>}
      {offset.y > 50 && <div className="absolute inset-0 bg-blue-500 z-20 flex items-center justify-center pointer-events-none" style={{ opacity }}><Bookmark size={120} strokeWidth={4} className="text-white" /></div>}
      {children}
    </div>
  );
};
