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
  // 乔布斯式极简：显示进度，确保数据显示
  const progress = segmentQueueLength > 0 
    ? `${currentItemIndex + 1} / ${segmentQueueLength}` 
    : `${currentItemIndex + 1} / --`;

  return (
    <header className="session-header-jobs">
      {/* 主要操作：返回 */}
      <button 
        className="back-button-jobs"
        onClick={onBack}
        aria-label="返回词书列表"
      >
        <ArrowLeftOutlined />
        <span className="back-text-jobs">学习</span>
      </button>

      {/* 核心信息：当前进度 */}
      <div className="progress-jobs">
        <div className="progress-text-jobs">
          {progress}
        </div>
      </div>
    </header>
  );
};