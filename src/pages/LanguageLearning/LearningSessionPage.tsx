import React, { useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Result, Typography, message, Select } from 'antd';
import ErrorBoundary from '@/components/LanguageLearning/ErrorBoundary';
import { SessionSummaryModal } from '@/components/language-learning/SessionSummaryModal';
import { SessionHeader } from '@/components/language-learning/session/SessionHeader';
import { QuestionTypeRenderer } from '@/components/language-learning/session/QuestionTypeRenderer';
import { SessionActions } from '@/components/language-learning/session/SessionActions';
import { useLearningSessionStore } from '@/store/useLearningSessionStore';
import { useSessionState } from '@/hooks/useSessionState';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { useAppStore } from '@/store/useAppStore';
import { processStudyResponse, schedulePlannedReviews, aggregateDailyStudyAndUpdateProgress } from '@/services/learningService';
import { evaluateRewardsOnEvent, addDailyFocusProgress } from '@/services/rewardService';
import { finalizeSessionStatistics } from '@/services/statsService';
import { importWordbook } from '@/services/wordbookService';
import { selectNextQuestionType, type QuestionType } from '@/modules/qts';
import { selectNextFromFsrs } from '@/modules/fsrs/select-next';
import type { ScheduledItem } from '@/lib/memo/types';
import './LearningSessionPage.css';

const SessionEndFeedback = lazy(() => import('../../components/LanguageLearning/SessionEndFeedback'));

type SetLastWordbookId = (id: string) => void;

const LearningSessionPage: React.FC = () => {
  const { wordbookId } = useParams<{ wordbookId: string }>();
  const navigate = useNavigate();
  const userId = useAppStore((state) => state.userId);
  const setLastWordbookId = useAppStore((state) => state.setLastWordbookId as SetLastWordbookId);
  
  // Zustand store
  const {
    session,
    segmentQueue,
    currentItemIndex,
    isFlipped,
    isLoading,
    error,
    sessionStats,
    showSummary,
    showEndFeedback,
    summaryCounts,
    summaryItems,
    summaryStats,
    segmentPolicy,
    questionMode,
    responseTimesRef,
    setIsFlipped,
    setCurrentItemIndex,
    setShowSummary,
    setShowEndFeedback,
    updateSessionStats,
    addSummaryItem,
    setSummaryStats,
    addResponseTime,
    setQuestionMode,
    advanceToNext
  } = useLearningSessionStore();

  // Response start time ref
  const responseStartTime = useRef<number>(0);
  const advancingRef = useRef<boolean>(false);

  // Initialize session
  useSessionState({ wordbookId });

  // Current item
  const currentItem = useMemo(() => 
    segmentQueue[currentItemIndex], 
    [segmentQueue, currentItemIndex]
  );

  // Question type selection logic (simplified from original)
  const questionType: QuestionType = useMemo(() => {
    if (questionMode === 'flashcard-only') return 'flashcard';
    
    const baseCycle: QuestionType[] = ['flashcard', 'choice', 'spelling', 'listening'];
    if (questionMode === 'mixed') {
      return baseCycle[currentItemIndex % baseCycle.length];
    }
    
    // Adaptive mode - simplified fallback
    try {
      const decision = selectNextQuestionType({
        currentItem,
        currentItemIndex,
        segmentWeights: segmentPolicy.weights,
        rollingAcc: undefined, // Simplified
        recentRTs: responseTimesRef
      });
      return decision.type;
    } catch {
      return 'flashcard'; // Fallback
    }
  }, [questionMode, currentItemIndex, currentItem, segmentPolicy.weights, responseTimesRef]);

  // Handle flip
  const handleFlip = useCallback(() => {
    if (!isFlipped) {
      responseStartTime.current = Date.now();
    }
    setIsFlipped(!isFlipped);
  }, [isFlipped, setIsFlipped]);

  // Handle response - core business logic
  const handleResponse = useCallback(async (response: 'again' | 'hard' | 'good' | 'easy') => {
    if (!session || !currentItem) {
      message.error('无法处理响应：会话或当前项目未加载');
      return;
    }

    let lastEntry: { id: string; content: string; response: 'again'|'hard'|'good'|'easy'; retrievability: number; nextReview?: Date } | null = null;
    const responseTime = Date.now() - responseStartTime.current;
    const isCorrect = response === 'good' || response === 'easy';

    // Add response time
    addResponseTime(responseTime);

    // Validate response time
    if (responseTime < 100) {
      console.warn('Unusually fast response time detected:', responseTime);
    }

    try {
      // Update session statistics via zustand
      updateSessionStats(response);
      
      // Process study response
      const result = await processStudyResponse(session, currentItem.item.id, response, responseTime, userId);
      const ms: any = result?.updatedMemoryStrength || {};
      const retrievability = typeof ms.newRetrievability === 'number' ? ms.newRetrievability : (typeof ms.retrievability === 'number' ? ms.retrievability : 0);
      const nextReview: Date | undefined = ms.newDueDate || ms.nextReview;
      lastEntry = { id: String(currentItem.item.id), content: String(currentItem.item.content), response, retrievability, nextReview };
      
      if (lastEntry) {
        addSummaryItem(lastEntry);
      }
    } catch (e: any) {
      console.error(`Failed to process response: ${e.message}`);
      message.error('Failed to save your progress. Please try again.');
    }

    try {
      if (currentItemIndex < segmentQueue.length - 1) {
        advanceToNext();
      } else {
        // Session completion logic
        const localTotal = sessionStats.total + 1;
        const localCorrect = sessionStats.correct + (isCorrect ? 1 : 0);
        const elapsedMs = Date.now() - sessionStats.startTime;
        const minutes = Math.floor(elapsedMs / 60000);
        const sessionDurationText = minutes >= 1 ? `${minutes} minutes` : `${Math.ceil(elapsedMs / 1000)} seconds`;
        const localAccuracy = localTotal > 0 ? Math.round((localCorrect / localTotal) * 100) : 0;
        message.success(`Session completed! ${localCorrect}/${localTotal} correct (${localAccuracy}%) in ${sessionDurationText}`);
        
        // Record daily focus progress
        try {
          await addDailyFocusProgress(userId, new Date().toISOString(), localTotal);
        } catch (err) {
          console.error('record daily focus count failed', err);
        }
        
        // Evaluate rewards
        try {
          const evalRes = evaluateRewardsOnEvent({ userId, eventType: 'sessionCompleted', dailyQuota: 60 });
          if (Array.isArray(evalRes.granted) && evalRes.granted.length > 0) {
            message.success(`🎖 获得新的奖励 ${evalRes.granted.length} 项`);
          }
        } catch (err) {
          console.error('evaluate rewards failed', err);
        }
        
        // Collect session statistics
        try {
          const manager = (session as any)?.manager;
          if (manager && typeof (manager as any).getSessionStatistics === 'function') {
            (manager as any).completeSession(session as any);
            const stats = (manager as any).getSessionStatistics(session as any);
            if (stats && typeof (stats as any).estimatedRetention === 'number') {
              const rawLoad = (stats as any).cognitiveLoadActual ?? (stats as any).cognitiveLoad;
              const acc = localTotal > 0 ? localCorrect / localTotal : 0;
              const rts = responseTimesRef;
              const N = Math.min(50, rts.length);
              const avgRT = N > 0 ? rts.slice(-N).reduce((a, b) => a + b, 0) / N : 0;
              const normRT = Math.max(0, Math.min(1, (avgRT - 900) / 1500));
              const fallbackLoad = Math.max(0, Math.min(1, 0.65 * (1 - acc) + 0.35 * normRT));
              const useFallback = !(typeof rawLoad === 'number' && isFinite(rawLoad)) || (rawLoad >= 0.48 && rawLoad <= 0.50);
              setSummaryStats({
                estimatedRetention: (stats as any).estimatedRetention,
                cognitiveLoad: useFallback ? fallbackLoad : rawLoad
              });
            }
          }
        } catch (err) {
          console.error('collect session stats failed', err);
        }
        
        setShowEndFeedback(true);
      }
    } catch (error) {
      console.error('Error during session progression:', error);
      message.error('处理学习进度时出错，请重试');
    }
  }, [session, currentItem, currentItemIndex, sessionStats, userId, addResponseTime, updateSessionStats, addSummaryItem, setSummaryStats, advanceToNext, setShowEndFeedback, responseTimesRef, segmentQueue]);

  // Swipe handlers
  const handleSwipeLeft = useCallback(() => {
    if (isFlipped) handleResponse('hard');
  }, [isFlipped, handleResponse]);

  const handleSwipeRight = useCallback(() => {
    if (isFlipped) handleResponse('easy');
  }, [isFlipped, handleResponse]);

  // Hooks
  useKeyboardShortcuts({ onFlip: handleFlip, onResponse: handleResponse });
  const { handleTouchStart, handleTouchEnd } = useTouchGestures({ 
    onFlip: handleFlip, 
    onResponse: handleResponse 
  });

  // Segment dots
  const segmentDots = useMemo(() => {
    try {
      if (!segmentQueue || segmentQueue.length === 0) return [];
      return Array.from({ length: Math.min(segmentQueue.length, 10) }, (_, i) => {
        let dotClass = 'segment-dot';
        if (i < currentItemIndex) dotClass += ' completed';
        else if (i === currentItemIndex) dotClass += ' active';
        return <div key={i} className={dotClass} />;
      });
    } catch (error) {
      console.error('Error creating segment dots:', error);
      return [];
    }
  }, [segmentQueue.length, currentItemIndex]);

  // Early returns
  if (isLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <Spin size="large" tip="Loading session..." />
    </div>;
  }

  if (error) {
    return <Result status="error" title="Error" subTitle={error} />;
  }

  if (!session || session.items.length === 0) {
    return <Result
      status="success"
      title="All Caught Up!"
      subTitle="You have no words to study in this session. Come back later!"
      extra={
        <button type="button" onClick={() => navigate('/language-learning')}>
          Back to Wordbooks
        </button>
      }
    />;
  }

  if (!currentItem) {
    return <Result status="warning" title="No current item" subTitle="Unable to load current learning item." />;
  }

  return (
    <ErrorBoundary>
      <div className="learning-session-container">
        <SessionHeader 
          wordbookId={wordbookId || ''} 
          onBack={() => navigate('/language-learning')} 
        />

        <div className="session-main">
          {/* Question mode selector */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '8px 0' }}>
            <Select
              size="small"
              value={questionMode}
              style={{ width: 180 }}
              onChange={(v) => setQuestionMode(v as any)}
              options={[
                { label: '题型：仅闪卡', value: 'flashcard-only' },
                { label: '题型：混合', value: 'mixed' },
                { label: '题型：自适应', value: 'adaptive' },
              ]}
            />
          </div>

          {/* Segment indicator */}
          <div className="segment-indicator">
            {segmentDots}
          </div>
          
          {/* Question area */}
          <div
            className="session-card-area"
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(e, () => { if (!isFlipped) handleFlip(); })}
          >
            <ErrorBoundary fallback={<div className="card-error">卡片加载失败</div>}>
              <QuestionTypeRenderer
                currentItem={currentItem}
                questionType={questionType}
                onResponse={handleResponse}
                onFlip={handleFlip}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
              />
            </ErrorBoundary>
          </div>

          {/* Action buttons */}
          <SessionActions
            onFlip={handleFlip}
            onResponse={handleResponse}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        {/* End feedback */}
        <Suspense fallback={<Spin size="large" tip="Loading..." />}>
          <SessionEndFeedback
            visible={showEndFeedback}
            onClose={() => setShowEndFeedback(false)}
            onComplete={async () => {
              setShowEndFeedback(false);
              try {
                const day = new Date().toISOString().split('T')[0];
                const resStats = await finalizeSessionStatistics(userId, day);
                await aggregateDailyStudyAndUpdateProgress({ userId, date: day } as any);
                if (resStats && resStats.ok) {
                  message.success('批量统计已更新');
                } else {
                  message.error('批量统计更新失败');
                }
              } catch (e: any) {
                console.error('Finalize session stats failed:', e?.message || e);
                message.error('批量统计更新失败，请稍后重试');
              }
              setShowSummary(true);
            }}
            sessionStats={{
              totalItems: sessionStats.total,
              correct: sessionStats.correct,
              accuracy: sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0,
              duration: Math.round((Date.now() - sessionStats.startTime) / 1000 / 60)
            }}
          />
        </Suspense>

        {/* Summary modal */}
        <Suspense fallback={<Spin size="large" tip="Loading..." />}>
          <SessionSummaryModal
            visible={showSummary}
            onClose={() => setShowSummary(false)}
            accuracy={sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}
            sessionDuration={Math.round((Date.now() - sessionStats.startTime) / 1000 / 60)}
            totalItems={sessionStats.total}
            summaryCounts={summaryCounts}
            summaryStats={summaryStats}
            onReviewWeakItems={() => {
              try {
                const weakIds = new Set(
                  summaryItems
                    .filter(si => si.response === 'hard' || si.response === 'again' || si.retrievability < 0.85)
                    .map(si => String(si.id))
                );
                const allItems = session?.items || [];
                const weakItems = allItems.filter(si => weakIds.has(String(si.item.id)));
                if (weakItems.length === 0) {
                  message.info('本次没有可复习的弱项，建议查看统计或返回词书。');
                } else {
                  // TODO: Implement weak items review with zustand
                  message.success(`已进入弱项微复习，共 ${weakItems.length} 个词`);
                }
              } catch (error) {
                console.error('Error during weak items review:', error);
                message.error('开始弱项复习时出错，请重试');
              }
            }}
            onScheduleNextReview={async () => {
              try {
                type Category = 'mastered' | 'shaky' | 'forgotten';
                const classify = (si: { response: 'again'|'hard'|'good'|'easy'; retrievability: number }): Category => {
                  if (si.response === 'again' || si.retrievability < 0.6) return 'forgotten';
                  if (si.response === 'hard' || (si.retrievability >= 0.6 && si.retrievability < 0.85)) return 'shaky';
                  return 'mastered';
                };
                
                if (!summaryItems || summaryItems.length === 0) {
                  message.warning('没有可安排复习的项目');
                  return;
                }
                
                const planned: { itemId: string; category: Category; nextReview: Date }[] = summaryItems.map(si => ({
                  itemId: String(si.id),
                  category: classify(si as any),
                  nextReview: si.nextReview ? si.nextReview : new Date(Date.now() + 24 * 60 * 60 * 1000)
                }));
                
                if (!wordbookId) {
                  message.error('词书ID缺失，无法安排复习');
                  return;
                }
                
                const res = await schedulePlannedReviews({
                  userId,
                  wordbookId: Number(wordbookId),
                  planned
                });
                
                if (res && typeof res.updated === 'number') {
                  message.success(`已安排下次复习（${res.updated} 项）`);
                } else {
                  message.success('已安排下次复习');
                }
              } catch (e: any) {
                console.error('Schedule next review error:', e);
                message.error(`安排复习失败: ${e?.message || '未知错误'}`);
              }
            }}
            onContinueLearning={() => { 
              setShowSummary(false); 
              navigate('/language-learning'); 
            }}
            onViewStatistics={() => { 
              setShowSummary(false); 
              navigate('/statistics'); 
            }}
          />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default LearningSessionPage;