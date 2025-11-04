import React, { useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import ErrorBoundary from '@/components/LanguageLearning/ErrorBoundary';
import { SessionHeader } from '@/components/language-learning/session/SessionHeader';
import { QuestionArea } from '@/components/language-learning/session/QuestionArea';
import { ResponseControls } from '@/components/language-learning/session/ResponseControls';
import { SessionSummaryModal } from '@/components/language-learning/SessionSummaryModal';
import { useLearningSessionStore } from '@/store/useLearningSessionStore';
import { useAppStore } from '@/store/useAppStore';
import { processStudyResponse } from '@/services/learningService';
import { useSessionState } from '@/hooks/useSessionState';
import { useSessionHandlers } from '@/hooks/useSessionHandlers';
import { useSessionKeyboardShortcuts } from '@/hooks/useSessionKeyboardShortcuts';
import './LearningSessionPage.refactor.css';

// 类型定义
type SetLastWordbookId = (id: string) => void;

const LearningSessionPageRefactor: React.FC = () => {
  // 路由和用户状态
  const { wordbookId } = useParams<{ wordbookId: string }>();
  const navigate = useNavigate();
  const userId = useAppStore((state) => state.userId);
  const setLastWordbookId = useAppStore((state) => state.setLastWordbookId as SetLastWordbookId);
  
  // 会话状态
  const {
    session,
    segmentQueue,
    currentItemIndex,
    isFlipped,
    sessionStats,
    questionMode,
    responseTimesRef,
    setIsFlipped,
    setShowSummary,
    updateSessionStats,
    addResponseTime,
    setQuestionMode,
    advanceToNext,
    showSummary,
    summaryItems,
    summaryStats,
    isLoading,
    error
  } = useLearningSessionStore();

  // 初始化会话
  useSessionState({ wordbookId });

  // 响应开始时间追踪
  const responseStartTime = useRef<number>(0);

  // 当前项目
  const currentItem = useMemo(() => 
    segmentQueue[currentItemIndex], 
    [segmentQueue, currentItemIndex]
  );

  // 问题类型逻辑
  const questionType = useMemo(() => {
    if (questionMode === 'flashcard-only') return 'flashcard';
    
    const baseCycle: string[] = ['flashcard', 'choice', 'spelling', 'listening'];
    if (questionMode === 'mixed') {
      return baseCycle[currentItemIndex % baseCycle.length] as any;
    }
    
    return 'flashcard'; // 简化自适应逻辑
  }, [questionMode, currentItemIndex]);

  // 业务逻辑处理器
  const sessionHandlers = useSessionHandlers({
    currentItem,
    responseStartTime,
    responseTimesRef,
    onResponse: async (response: 'again' | 'hard' | 'good' | 'easy') => {
      if (!session || !currentItem) {
        message.error('无法处理响应：会话或当前项目未加载');
        return;
      }

      const responseTime = Date.now() - responseStartTime.current;
      const isCorrect = response === 'good' || response === 'easy';

      // 添加响应时间
      addResponseTime(responseTime);

      // 验证响应时间
      if (responseTime < 100) {
        console.warn('Unusually fast response time detected:', responseTime);
      }

      try {
        // 更新会话统计
        updateSessionStats(response);
        
        // 处理学习响应
        const result = await processStudyResponse(session, currentItem.item.id, response, responseTime, userId);
        
        // 更新最后学习词书ID
        if (wordbookId) {
          setLastWordbookId(wordbookId);
        }
      } catch (e: any) {
        console.error(`Failed to process response: ${e.message}`);
        message.error('Failed to save your progress. Please try again.');
      }

      // 检查是否完成当前段落
      if (currentItemIndex < segmentQueue.length - 1) {
        advanceToNext();
      } else {
        // 段落到下一段或结束会话
        const localTotal = sessionStats.total + 1;
        const localCorrect = sessionStats.correct + (isCorrect ? 1 : 0);
        const accuracy = localTotal > 0 ? Math.round((localCorrect / localTotal) * 100) : 0;
        
        message.success(`段落完成! ${localCorrect}/${localTotal} 正确 (${accuracy}%)`);
        setShowSummary(true);
      }
    }
  });

  // 键盘快捷键
  useSessionKeyboardShortcuts({
    onFlip: sessionHandlers.handleFlip,
    onResponse: sessionHandlers.handleResponse
  });

  // 早期返回状态
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>正在加载学习会话...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>加载失败</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/language-learning')}>
          返回词书列表
        </button>
      </div>
    );
  }

  if (!session || session.items.length === 0) {
    return (
      <div className="empty-container">
        <h2>学习完成！</h2>
        <p>本次没有需要学习的单词，稍后再来吧！</p>
        <button onClick={() => navigate('/language-learning')}>
          返回词书列表
        </button>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="warning-container">
        <h2>加载异常</h2>
        <p>无法加载当前学习项目</p>
        <button onClick={() => window.location.reload()}>
          重新加载
        </button>
      </div>
    </div>
  );
  }

  return (
    <ErrorBoundary>
      <div className="learning-session-container">
        {/* 头部状态栏 */}
        <SessionHeader 
          wordbookId={wordbookId || ''} 
          onBack={() => navigate('/language-learning')}
          sessionStats={sessionStats}
          currentItemIndex={currentItemIndex}
          segmentQueueLength={segmentQueue.length}
          questionMode={questionMode}
        />

        {/* 主要内容区域 */}
        <main className="session-main">
          {/* 问题显示区域 */}
          <QuestionArea
            currentItem={currentItem}
            questionType={questionType}
            isFlipped={isFlipped}
            onFlip={sessionHandlers.handleFlip}
            onSwipeLeft={() => isFlipped && sessionHandlers.handleResponse('hard')}
            onSwipeRight={() => isFlipped && sessionHandlers.handleResponse('easy')}
          />

          {/* 响应控制区域 */}
          <ResponseControls
            isFlipped={isFlipped}
            onFlip={sessionHandlers.handleFlip}
            onResponse={sessionHandlers.handleResponse}
          />
        </main>

        {/* 会话总结模态框 */}
        {showSummary && (
          <SessionSummaryModal
            visible={showSummary}
            onClose={() => setShowSummary(false)}
            accuracy={sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}
            sessionDuration={Math.round((Date.now() - sessionStats.startTime) / 1000 / 60)}
            totalItems={sessionStats.total}
            summaryItems={summaryItems}
            summaryStats={summaryStats}
            onContinue={() => {
              setShowSummary(false);
              navigate('/language-learning');
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default LearningSessionPageRefactor;