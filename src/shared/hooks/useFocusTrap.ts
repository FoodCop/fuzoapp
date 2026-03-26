import { useEffect, useRef } from 'react';

/**
 * A hook to trap focus within a given element.
 * Useful for modals and other overlays to ensure keyboard navigation stays within the component.
 */
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) { // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else { // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Initial focus on the first element if nothing within the trap is focused
    const currentActive = document.activeElement;
    if (!containerRef.current?.contains(currentActive)) {
      const firstElement = containerRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstElement?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
};
