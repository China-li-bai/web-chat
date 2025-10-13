import React, { useEffect, useRef, memo } from 'react';
import { Card } from 'antd';
import './LearningFlashcard.css';

interface LearningFlashcardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
  width?: number | string;
  height?: number | string;
  className?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const LearningFlashcard: React.FC<LearningFlashcardProps> = memo(({ 
  frontContent, 
  backContent, 
  isFlipped, 
  onFlip,
  width = '100%',
  height = 300,
  className = '',
  onSwipeLeft,
  onSwipeRight
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onFlip();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onFlip]);

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    // 记录触摸起始位置和时间
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isDragging.current = false;
    
    // 添加轻微的振动反馈（如果设备支持）
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartTime.current) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;
    
    // 如果水平移动距离大于垂直移动距离，标记为拖动
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      isDragging.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartTime.current) return;
    
    const touchDuration = Date.now() - touchStartTime.current;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const diffX = endX - touchStartX.current;
    const diffY = endY - touchStartY.current;
    const moveDistance = Math.sqrt(diffX * diffX + diffY * diffY);
    
    // 检测水平滑动
    if (moveDistance > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      // 水平滑动
      if (diffX > 0 && onSwipeRight) {
        // 向右滑动
        onSwipeRight();
        if ('vibrate' in navigator) {
          navigator.vibrate(20);
        }
      } else if (diffX < 0 && onSwipeLeft) {
        // 向左滑动
        onSwipeLeft();
        if ('vibrate' in navigator) {
          navigator.vibrate(20);
        }
      }
    } 
    // 检测点击
    else if (touchDuration < 300 && moveDistance < 10 && !isDragging.current) {
      onFlip();
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
    
    // 重置触摸状态
    touchStartTime.current = 0;
    isDragging.current = false;
  };

  return (
    <div 
      ref={containerRef}
      className={`learning-flashcard-container ${className}`} 
      onClick={onFlip}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ width, height }}
    >
      <div className={`learning-flashcard ${isFlipped ? 'is-flipped' : ''}`}>
        <Card className="flashcard-face flashcard-front" bordered={false}>
          <div className="flashcard-content">
            {frontContent}
          </div>
        </Card>
        <Card className="flashcard-face flashcard-back" bordered={false}>
          <div className="flashcard-content">
            {backContent}
          </div>
        </Card>
      </div>
      <div className="flashcard-hint">
        {isFlipped ? '点击或按空格键返回' : '点击或按空格键查看答案'}
      </div>
      {onSwipeLeft || onSwipeRight ? (
        <div className="flashcard-swipe-hint">
          {onSwipeLeft && <span className="swipe-hint-left">← 左滑</span>}
          {onSwipeRight && <span className="swipe-hint-right">右滑 →</span>}
        </div>
      ) : null}
    </div>
  );
});