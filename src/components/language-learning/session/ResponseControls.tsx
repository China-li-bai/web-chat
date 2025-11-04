import React from 'react';

interface ResponseControlsProps {
  isFlipped: boolean;
  onResponse: (response: 'again' | 'hard' | 'easy') => void;
}

export const ResponseControls: React.FC<ResponseControlsProps> = ({
  isFlipped,
  onResponse
}) => {
  // 乔布斯式极简：三个英文按钮
  const responseButtons = [
    { key: 'again', text: 'Again', color: '#ff4d4f', bgColor: '#fff2f0' },
    { key: 'hard', text: 'Hard', color: '#fa8c16', bgColor: '#fff7e6' },
    { key: 'easy', text: 'Easy', color: '#52c41a', bgColor: '#f6ffed' }
  ] as const;

  if (!isFlipped) {
    // 翻转前：极致简洁
    return (
      <div className="flip-controls">
        <div className="flip-hint-message">
          <div className="hint-icon">👆</div>
        </div>
      </div>
    );
  }

  // 翻转后：纯按钮，无键盘快捷键
  return (
    <div className="response-controls">
      <div className="response-buttons">
        {responseButtons.map((button) => (
          <button
            key={button.key}
            className={`response-button ${button.key}`}
            style={{
              backgroundColor: button.bgColor,
              borderColor: button.color,
              color: button.color
            }}
            onClick={() => onResponse(button.key)}
          >
            <div className="button-content">
              <div className="button-label">{button.text}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};