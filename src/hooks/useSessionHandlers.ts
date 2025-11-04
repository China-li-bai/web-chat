import { useCallback } from 'react';

interface UseSessionHandlersOptions {
  currentItem: any;
  responseStartTime: React.MutableRefObject<number>;
  responseTimesRef: React.MutableRefObject<number[]>;
  setIsFlipped: (flipped: boolean) => void;
  onResponse: (response: 'again' | 'hard' | 'easy') => Promise<void>;
}

export const useSessionHandlers = ({
  currentItem,
  responseStartTime,
  responseTimesRef,
  setIsFlipped,
  onResponse
}: UseSessionHandlersOptions) => {
  // 翻转卡片
  const handleFlip = useCallback(() => {
    if (!currentItem) return;
    
    if (responseStartTime.current === 0) {
      responseStartTime.current = Date.now();
    }
    
    setIsFlipped(true);
  }, [currentItem, setIsFlipped]);

  // 处理响应
  const handleResponse = useCallback(async (response: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentItem) return;
    
    const responseTime = Date.now() - responseStartTime.current;
    
    // 记录响应时间
    responseTimesRef.current = [
      ...responseTimesRef.current.slice(-49), // 保持最近50次记录
      responseTime
    ];
    
    try {
      await onResponse(response);
      
      // 重置响应时间和卡片状态
      responseStartTime.current = 0;
      setIsFlipped(false);
      
    } catch (error) {
      console.error('Failed to handle response:', error);
    }
  }, [currentItem, responseTimesRef, setIsFlipped, onResponse]);

  return {
    handleFlip,
    handleResponse
  };
};