import React, { memo } from 'react';
import { Card } from 'antd';
import './Flashcard.css';

interface FlashcardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = memo(({ frontContent, backContent, isFlipped, onFlip }) => {
  return (
    <div className="flashcard-container" onClick={onFlip}>
      <div className={`flashcard ${isFlipped ? 'is-flipped' : ''}`}>
        <Card className="flashcard-face flashcard-front">
          <div className="flex items-center justify-center h-full text-3xl font-bold">
            {frontContent}
          </div>
        </Card>
        <Card className="flashcard-face flashcard-back">
          <div className="p-6">
            {backContent}
          </div>
        </Card>
      </div>
    </div>
  );
});