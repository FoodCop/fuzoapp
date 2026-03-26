import { useState, useRef } from 'react';

export const useModalSwipeToClose = (onClose: () => void) => {
  const dragStartYRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (event: React.TouchEvent<HTMLButtonElement>) => {
    dragStartYRef.current = event.touches[0]?.clientY ?? null;
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLButtonElement>) => {
    if (dragStartYRef.current === null) {
      return;
    }

    const nextOffset = Math.max(0, (event.touches[0]?.clientY ?? dragStartYRef.current) - dragStartYRef.current);
    setDragOffset(nextOffset);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (dragOffset > 120) {
      onClose();
    }

    dragStartYRef.current = null;
    setDragOffset(0);
  };

  return {
    dragOffset,
    isDragging,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};
