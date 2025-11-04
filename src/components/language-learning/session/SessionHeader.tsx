import React from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';

interface SessionHeaderProps {
  wordbookId: string;
  onBack: () => void;
  currentItemIndex: number;
  segmentQueueLength: number;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  wordbookId,
  onBack,
  currentItemIndex,
  segmentQueueLength
}) => {
  // 强制显示进度信息，确保可见
  const progress = `进度: ${currentItemIndex + 1} / ${segmentQueueLength || '--'}`;
  
  console.log('SessionHeader debug:', { currentItemIndex, segmentQueueLength, progress });

  return (
    <header className="session-header-jobs" style={{
      background: '#ffffff',
      borderBottom: '2px solid #1890ff',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      position: 'relative',
      zIndex: 9999
    }}>
      {/* 主要操作：返回 */}
      <button 
        className="back-button-jobs"
        onClick={onBack}
        aria-label="返回词书列表"
        style={{
          background: 'none',
          border: 'none',
          color: '#007AFF',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        <ArrowLeftOutlined />
        <span className="back-text-jobs">学习</span>
      </button>

      {/* 核心信息：当前进度 - 强制显示 */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1890ff',
          background: '#e6f7ff',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '2px solid #1890ff'
        }}>
          {progress}
        </div>
      </div>
      
      {/* 占位符保持布局平衡 */}
      <div style={{ width: '60px' }}></div>
    </header>
  );
};