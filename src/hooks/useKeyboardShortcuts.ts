import { useEffect } from 'react';
import { useLearningSessionStore } from '@/store/useLearningSessionStore';

interface UseKeyboardShortcutsOptions {
  onFlip: () => void;
  onResponse: (response: 'again' | 'hard' | 'good' | 'easy') => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({
  onFlip,
  onResponse,
  enabled = true
}: UseKeyboardShortcutsOptions) => {
  const { isFlipped, showSummary } = useLearningSessionStore();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't handle keyboard events when summary modal is open
      if (showSummary) return;
      
      if (!isFlipped) {
        // When card is not flipped, only Space key works
        if (e.code === 'Space') {
          e.preventDefault();
          onFlip();
        }
      } else {
        // When card is flipped, handle response keys
        switch (e.code) {
          case 'Digit1':
            e.preventDefault();
            onResponse('again');
            break;
          case 'Digit2':
            e.preventDefault();
            onResponse('hard');
            break;
          case 'Digit3':
            e.preventDefault();
            onResponse('good');
            break;
          case 'Digit4':
            e.preventDefault();
            onResponse('easy');
            break;
          case 'Space':
            e.preventDefault();
            onFlip(); // Allow re-flipping with space
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isFlipped, showSummary, onFlip, onResponse, enabled]);

  return {
    // Return any additional keyboard-related state or functions if needed
    keyboardEnabled: enabled
  };
};