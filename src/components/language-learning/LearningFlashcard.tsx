import React, { useEffect, useRef } from 'react';
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
}

export const LearningFlashcard: React.FC<LearningFlashcardProps> = ({ 
  frontContent, 
  backContent, 
  isFlipped, 
  onFlip,
  width = '100%',
  height = 300,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div 
      ref={containerRef}
      className={`learning-flashcard-container ${className}`} 
      onClick={onFlip}
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
    </div>
  );
};