import React, { useMemo } from 'react';
import { Button, Progress, Tag, Tooltip } from 'antd';
import { ArrowLeftOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useLearningSessionStore } from '@/store/useLearningSessionStore';
import type { ScheduledItem } from '@/lib/memo/types';

interface SessionHeaderProps {
  wordbookId: string;
  onBack: () => void;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  wordbookId,
  onBack
}) => {
  const {
    activeItems,
    session,
    segmentQueue,
    currentItemIndex,
    sessionStats,
    questionMode,
    rolling
  } = useLearningSessionStore();

  const currentItem = useMemo(() => 
    segmentQueue[currentItemIndex], 
    [segmentQueue, currentItemIndex]
  );

  const currentStrategyDisplay = useMemo(() => {
    const rawType = (currentItem as any)?.strategy?.type as string | undefined;
    const rawDiff = (currentItem as any)?.strategy?.difficulty as string | undefined;
    const currentStrategyLabel = rawType === 'recognition' ? '识别'
      : rawType === 'cued_recall' ? '提示回忆'
      : rawType === 'free_recall' ? '自由回忆'
      : rawType === 'elaborative_retrieval' ? '精细回忆'
      : '检索';
    return rawDiff ? `${currentStrategyLabel} · ${rawDiff}` : currentStrategyLabel;
  }, [currentItem]);

  const baseTotal = useMemo(() => {
    try {
      const total = (session && Array.isArray(session.items)) ? session.items.length : (segmentQueue ? segmentQueue.length : 0);
      return total;
    } catch {
      return (segmentQueue ? segmentQueue.length : 0);
    }
  }, [session, segmentQueue.length]);

  const progressPercent = useMemo(() =>
    (baseTotal && baseTotal > 0) ? (currentItemIndex / baseTotal) * 100 : 0,
    [baseTotal, currentItemIndex]
  );

  const sessionDuration = useMemo(() =>
    Math.round((Date.now() - sessionStats.startTime) / 1000 / 60),
    [sessionStats.startTime]
  );

  const accuracy = useMemo(() =>
    sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0,
    [sessionStats.correct, sessionStats.total]
  );

  const rollingAccuracy = useMemo(() => {
    if (!rolling.length) return undefined as number | undefined;
    const n = Math.min(20, rolling.length);
    const slice = rolling.slice(-n);
    return slice.reduce((a, b) => a + (b ? 1 : 0), 0) / n;
  }, [rolling]);

  const qtsDifficultyTarget = 'medium'; // Placeholder for QTS decision
  const questionType = 'flashcard'; // Placeholder for current question type
  const qtsReason = 'adaptive selection'; // Placeholder for QTS reason

  return (
    <div className="session-header">
      <div className="session-header-content">
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={onBack}
          type="text"
        >
          返回
        </Button>
        
        <div className="session-progress">
          <div className="session-progress-bar">
            <Progress 
              percent={progressPercent} 
              showInfo={false} 
              strokeColor="#1890ff"
              size="small"
            />
          </div>
          <div className="session-progress-text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{currentItemIndex + 1} / {baseTotal} · {currentStrategyDisplay}</span>
            {(activeItems && session?.items && activeItems.length > 0 && activeItems.length !== session.items.length) && (
              <Tag color="volcano" style={{ marginLeft: 8 }}>
                弱项子集 {activeItems.length}/{session.items.length}
              </Tag>
            )}
            {questionMode === 'adaptive' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Tag color="geekblue">{qtsDifficultyTarget}</Tag>
                <Tag>{questionType}</Tag>
                <Tooltip title={qtsReason}>
                  <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
                </Tooltip>
              </span>
            )}
          </div>
        </div>
        
        <div className="session-stats">
          <div className="session-stat">
            <div className="session-stat-value" style={{ color: accuracy >= 80 ? '#52c41a' : accuracy >= 60 ? '#fa8c16' : '#ff4d4f' }}>
              {accuracy}%
            </div>
            <div className="session-stat-label">准确率</div>
          </div>
          <div className="session-stat">
            <div className="session-stat-value">{sessionDuration}</div>
            <div className="session-stat-label">分钟</div>
          </div>
          <div className="session-stat">
            <div className="session-stat-value">{sessionStats.total}/{baseTotal}</div>
            <div className="session-stat-label">进度</div>
          </div>
        </div>
      </div>
    </div>
  );
};