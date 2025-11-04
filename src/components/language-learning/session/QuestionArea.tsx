import React, { useMemo } from 'react';
import type { ScheduledItem } from '@/lib/memo/types';

interface QuestionAreaProps {
  currentItem: ScheduledItem;
  questionType: string;
  isFlipped: boolean;
  onFlip: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  currentItemIndex: number;
  segmentQueueLength: number;
}

export const QuestionArea: React.FC<QuestionAreaProps> = ({
  currentItem,
  questionType,
  isFlipped,
  onFlip,
  onSwipeLeft,
  onSwipeRight,
  currentItemIndex,
  segmentQueueLength
}) => {
  // 提取单词 - 乔布斯式极简，只取核心
  const word = useMemo(() => 
    String(currentItem.item.content || ''), 
    [currentItem]
  );

  const details = useMemo(() => 
    (currentItem.item as any)?.details || {}, 
    [currentItem]
  );

  // 乔布斯式纯净卡片：正面只有单词，背面显示完整释义
  const definition = useMemo(() => 
    String(details?.definition || ''), 
    [details]
  );

  const translation = useMemo(() => 
    String(details?.translation || ''), 
    [details]
  );

  // 处理触摸滑动 - 乔布斯式直观交互
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    (e.currentTarget as any).touchStartX = touch.clientX;
    (e.currentTarget as any).touchStartY = touch.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isFlipped) return; // 只有翻面后才响应滑动
    
    const touch = e.changedTouches[0];
    const startX = (e.currentTarget as any).touchStartX;
    const deltaX = touch.clientX - startX;
    const minSwipeDistance = 60;

    if (Math.abs(deltaX) > minSwipeDistance) {
      e.preventDefault();
      if (deltaX > 0) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }
    }
  };


  return (
    
      <div 
        className="question-area-jobs"
        onClick={!isFlipped ? onFlip : undefined}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="card-jobs">
          {/* 简化的实现：显示/隐藏切换 */}
          {!isFlipped ? (
            // 正面：纯净的单词展示
            <div className="word-front-jobs">
              <div className="word-main-jobs">{word}</div>
              <div className="tap-hint-jobs">轻触翻转</div>
            </div>
          ) : (
            // 背面：完整的释义展示
            <div className="definition-jobs">
              <div className="word-jobs">{word}</div>
              <div className="meaning-content">
                {definition && (
                  <div className="english-definition">
                    {definition}
                  </div>
                )}
                {translation && (
                  <div className="chinese-translation">
                    {translation}
                  </div>
                )}
                {!definition && !translation && (
                  <div className="no-definition">暂无释义</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  );
};