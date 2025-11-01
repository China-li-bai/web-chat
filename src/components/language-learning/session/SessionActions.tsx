import React from 'react';
import { Button } from 'antd';
import { useLearningSessionStore } from '@/store/useLearningSessionStore';

interface SessionActionsProps {
  onFlip: () => void;
  onResponse: (response: 'again' | 'hard' | 'good' | 'easy') => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent, action: () => void) => void;
}

export const SessionActions: React.FC<SessionActionsProps> = ({
  onFlip,
  onResponse,
  onTouchStart,
  onTouchEnd
}) => {
  const { isFlipped } = useLearningSessionStore();

  if (!isFlipped) {
    return (
      <div className="session-actions">
        <Button 
          type="primary" 
          onClick={onFlip} 
          onTouchStart={onTouchStart}
          onTouchEnd={(e) => onTouchEnd(e, onFlip)}
          block 
          size="large"
          className="session-action-button"
        >
          显示答案 (空格键)
        </Button>
      </div>
    );
  }

  return (
    <div className="session-actions">
      <div className="session-response-buttons">
        <Button 
          danger 
          onClick={() => onResponse('again')} 
          onTouchStart={onTouchStart}
          onTouchEnd={(e) => onTouchEnd(e, () => onResponse('again'))}
          className="session-response-button again"
        >
          再学<br/>1
        </Button>
        <Button 
          onClick={() => onResponse('hard')} 
          onTouchStart={onTouchStart}
          onTouchEnd={(e) => onTouchEnd(e, () => onResponse('hard'))}
          className="session-response-button hard"
        >
          困难<br/>2
        </Button>
        <Button 
          type="primary" 
          onClick={() => onResponse('good')} 
          onTouchStart={onTouchStart}
          onTouchEnd={(e) => onTouchEnd(e, () => onResponse('good'))}
          className="session-response-button good"
        >
          掌握<br/>3
        </Button>
        <Button 
          type="primary" 
          ghost 
          onClick={() => onResponse('easy')} 
          onTouchStart={onTouchStart}
          onTouchEnd={(e) => onTouchEnd(e, () => onResponse('easy'))}
          className="session-response-button easy"
        >
          简单<br/>4
        </Button>
      </div>
    </div>
  );
};