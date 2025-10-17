import React, { memo } from 'react';
import { Card } from 'antd';
import './Flashcard.css';

interface FlashcardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
  translation?: string; // 中文释义（可选）
}

export const Flashcard: React.FC<FlashcardProps> = memo(({ frontContent, backContent, isFlipped, onFlip, translation }) => {
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
            {translation ? (
              <div className="mt-4 text-base text-gray-700">
                <span className="font-medium">中文释义：</span>
                <span>{translation}</span>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
});