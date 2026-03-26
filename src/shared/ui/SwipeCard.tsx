import React, { useState, useRef } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export type SwipePointerEvent = React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>;

export const SwipeCard = ({ children, onSwipe, active }: { children: React.ReactNode; onSwipe: (dir: SwipeDirection) => void; active: boolean }) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handleStart = (e: SwipePointerEvent) => {
    if (!active) return;
    const isTouch = e.type === 'touchstart';
    const clientX = isTouch ? (e as React.TouchEvent<HTMLButtonElement>).touches[0].clientX : (e as React.MouseEvent<HTMLButtonElement>).clientX;
    const clientY = isTouch ? (e as React.TouchEvent<HTMLButtonElement>).touches[0].clientY : (e as React.MouseEvent<HTMLButtonElement>).clientY;
    startPos.current = { x: clientX, y: clientY };
    setIsSwiping(true);
  };

  const handleMove = (e: SwipePointerEvent) => {
    if (!isSwiping || !active) return;
    const isTouch = e.type === 'touchmove';
    const clientX = isTouch ? (e as React.TouchEvent<HTMLButtonElement>).touches[0].clientX : (e as React.MouseEvent<HTMLButtonElement>).clientX;
    const clientY = isTouch ? (e as React.TouchEvent<HTMLButtonElement>).touches[0].clientY : (e as React.MouseEvent<HTMLButtonElement>).clientY;
    
    setOffset({
      x: clientX - startPos.current.x,
      y: clientY - startPos.current.y
    });
  };

  const handleEnd = () => {
    if (!isSwiping || !active) return;
    setIsSwiping(false);

    const threshold = 100;
    if (Math.abs(offset.x) > threshold) {
      onSwipe(offset.x > 0 ? 'right' : 'left');
    } else if (Math.abs(offset.y) > threshold) {
      onSwipe(offset.y > 0 ? 'down' : 'up');
    }

    setOffset({ x: 0, y: 0 });
  };

  return (
    <button
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.x * 0.1}deg)`,
        transition: isSwiping ? 'none' : 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
      className="w-full h-full relative cursor-grab active:cursor-grabbing"
    >
      {children}
    </button>
  );
};
