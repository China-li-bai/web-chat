import { useEffect } from 'react';

interface UseSessionKeyboardShortcutsOptions {
  onFlip: () => void;
  onResponse: (response: 'again' | 'hard' | 'easy') => void;
}

export const useSessionKeyboardShortcuts = ({
  onFlip,
  onResponse
}: UseSessionKeyboardShortcutsOptions) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 防止在输入框中触发
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case ' ': // 空格键翻转
        case 'Enter':
          event.preventDefault();
          onFlip();
          break;
          
        case '1': // 1-3 对应不同响应
          event.preventDefault();
          onResponse('again');
          break;
          
        case '2':
          event.preventDefault();
          onResponse('hard');
          break;
          
        case '3':
          event.preventDefault();
          onResponse('easy');
          break;
          
        case 'ArrowLeft': // 左箭头 = hard
          event.preventDefault();
          onResponse('hard');
          break;
          
        case 'ArrowRight': // 右箭头 = easy
          event.preventDefault();
          onResponse('easy');
          break;
          
        case 'ArrowDown': // 下箭头 = again
          event.preventDefault();
          onResponse('again');
          break;
          
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onFlip, onResponse]);
};