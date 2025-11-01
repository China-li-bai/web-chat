import { useRef, useCallback } from 'react';
import { useLearningSessionStore } from '@/store/useLearningSessionStore';

interface UseTouchGesturesOptions {
  onFlip: () => void;
  onResponse: (response: 'again' | 'hard' | 'good' | 'easy') => void;
  enabled?: boolean;
}

export const useTouchGestures = ({
  onFlip,
  onResponse,
  enabled = true
}: UseTouchGesturesOptions) => {
  const { isFlipped } = useLearningSessionStore();
  
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchStartTime = useRef<number>(0);

  const handleSwipeLeft = useCallback(() => {
    if (isFlipped) {
      onResponse('hard');
    }
  }, [isFlipped, onResponse]);

  const handleSwipeRight = useCallback(() => {
    if (isFlipped) {
      onResponse('easy');
    }
  }, [isFlipped, onResponse]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    
    touchStartPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    touchStartTime.current = Date.now();
  }, [enabled]);

  const handleTouchEnd = useCallback((e: React.TouchEvent, action?: () => void) => {
    if (!enabled || !touchStartPos.current || !touchStartTime.current) return;
    
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime.current;
    
    // Get touch end position
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStartPos.current.x;
    const dy = endY - touchStartPos.current.y;
    const moveDistance = Math.sqrt(dx * dx + dy * dy);
    
    const isSwipe = touchDuration < 500 && moveDistance > 50;
    const isTap = touchDuration < 300 && moveDistance < 10;
    
    if (isSwipe) {
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe: left/right
        if (dx > 0) handleSwipeRight();
        else handleSwipeLeft();
      } else {
        // Vertical swipe: up=good, down=again; if not flipped, flip first
        if (dy < 0) {
          if (isFlipped) onResponse('good');
          else onFlip();
        } else {
          if (isFlipped) onResponse('again');
          else onFlip();
        }
      }
    } else if (isTap) {
      if (action) {
        action();
      }
    }
    
    // Reset touch state
    touchStartPos.current = null;
    touchStartTime.current = 0;
  }, [enabled, isFlipped, onFlip, handleSwipeLeft, handleSwipeRight, onResponse]);

  return {
    handleTouchStart,
    handleTouchEnd,
    touchEnabled: enabled
  };
};