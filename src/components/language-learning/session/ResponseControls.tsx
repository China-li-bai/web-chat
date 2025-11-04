import React from 'react';

interface ResponseControlsProps {
  isFlipped: boolean;
  onFlip: () => void;
  onResponse: (response: 'again' | 'hard' | 'easy') => void;
}

export const ResponseControls: React.FC<ResponseControlsProps> = ({
  isFlipped,
  onFlip,
  onResponse
}) => {
  // 响应按钮配置 - 乔布斯式极简设计
  const responseButtons = [
    { 
      key: 'again', 
      text: '不会', 
      color: '#ff4d4f', 
      bgColor: '#fff2f0',
      keyboard: ['1'],
      description: '完全不会，需要重新学习'
    },
    { 
      key: 'hard', 
      text: '会一点', 
      color: '#fa8c16', 
      bgColor: '#fff7e6',
      keyboard: ['2'],
      description: '有点印象，但不确定'
    },
    { 
      key: 'easy', 
      text: '会了', 
      color: '#52c41a', 
      bgColor: '#f6ffed',
      keyboard: ['3'],
      description: '完全掌握，可以继续'
    }
  ] as const;

  if (!isFlipped) {
    // 显示翻转按钮
    return (
      <div className="flip-controls">
        <button 
          className="flip-button"
          onClick={onFlip}
          aria-label="翻转卡片查看答案"
        >
          <div className="flip-icon">↻</div>
          <div className="flip-text">点击翻转</div>
          <div className="flip-hint">或按空格键</div>
        </button>
        
        {/* 键盘快捷键提示 */}
        <div className="keyboard-hints">
          <div className="hint-row">
            <span className="hint-key">空格</span>
            <span className="hint-action">翻转</span>
          </div>
          <div className="hint-row">
            <span className="hint-keys">1 2 3</span>
            <span className="hint-action">直接响应</span>
          </div>
        </div>
      </div>
    );
  }

  // 显示响应按钮
  return (
    <div className="response-controls">
      <div className="controls-header">
        <h3 className="controls-title">你的理解程度</h3>
        <p className="controls-subtitle">
          选择最适合的选项来优化学习效果
        </p>
      </div>

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
            aria-label={`${button.text} - ${button.description}`}
            title={`${button.description} (快捷键: ${button.keyboard.join(', ')})`}
          >
            <div className="button-content">
              <div className="button-main">
                <div className="button-label">{button.text}</div>
                <div className="button-description">{button.description}</div>
              </div>
              <div className="button-keys">
                {button.keyboard.map((key) => (
                  <kbd 
                    key={key} 
                    className="key-hint"
                    style={{ borderColor: button.color }}
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 响应说明 */}
      <div className="response-help">
        <div className="help-section">
          <h4 className="help-title">如何选择？</h4>
          <ul className="help-list">
            <li><strong>不会</strong>：这个词完全不熟悉，需要重新学习</li>
            <li><strong>会一点</strong>：有印象但想不起来，需要多次复习</li>
            <li><strong>会了</strong>：完全掌握，可以减少复习频率</li>
          </ul>
        </div>
      </div>
    </div>
  );
};