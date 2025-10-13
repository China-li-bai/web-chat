import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LearningFlashcard } from '@/components/language-learning/LearningFlashcard';
import { SessionSummaryModal } from '@/components/language-learning/SessionSummaryModal';
import { Button, Space, Spin, Result, Typography, message, Progress } from 'antd';
import { ArrowLeftOutlined, TrophyOutlined, ClockCircleOutlined, BookOutlined } from '@ant-design/icons';
import { createLearningSessionForWordbook, processStudyResponse, schedulePlannedReviews, startSessionFromTodayPlan } from '@/services/learningService';
import { evaluateRewardsOnEvent, addDailyFocusProgress } from '@/services/rewardService';
import { importWordbook } from '@/services/wordbookService';
import { useAppStore } from '@/store/useAppStore';
import './LearningSessionPage.css';

type SetLastWordbookId = (id: string) => void;
import type { ScheduledItem } from '@/lib/memo/types';
import type { LearningSession } from '@/lib/memo/MemoryLearningManager';

const { Title, Text, Paragraph } = Typography;

const LearningSessionPage: React.FC = () => {
  const { wordbookId } = useParams<{ wordbookId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<LearningSession | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0, startTime: Date.now() });
  const [showSummary, setShowSummary] = useState(false);
  const [summaryCounts, setSummaryCounts] = useState({ mastered: 0, shaky: 0, forgotten: 0 });
  const [summaryItems, setSummaryItems] = useState<Array<{ id: string; content: string; response: 'again'|'hard'|'good'|'easy'; retrievability: number; nextReview?: Date }>>([]);
  const [summaryStats, setSummaryStats] = useState<{ estimatedRetention: number; cognitiveLoad: number } | null>(null);
  const [activeItems, setActiveItems] = useState<ScheduledItem[]>([]);
  const responseStartTime = useRef<number>(0);
  const userId = useAppStore((state) => state.userId);
  const setLastWordbookId = useAppStore((state) => state.setLastWordbookId as SetLastWordbookId);

  useEffect(() => {
    if (!wordbookId) {
      setError('Wordbook ID is missing.');
      setIsLoading(false);
      return;
    }

    async function setupSession() {
      try {
        if (wordbookId === 'global') {
          const raw = sessionStorage.getItem('todayPlan');
          if (!raw) {
            setError('未找到今日计划，请先在复习计划页生成。');
          } else {
            const plan = JSON.parse(raw);
            const s = await startSessionFromTodayPlan({
              userId,
              plan,
              targetDurationSeconds: 1800
            });
            setSession(s);
          }
        } else {
          const newSession = await createLearningSessionForWordbook(Number(wordbookId), userId);
          setSession(newSession);
        }
      } catch (e: any) {
        setError(`Failed to create learning session: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    setupSession();
  }, [wordbookId]);

  useEffect(() => {
    if (session && Array.isArray(session.items)) {
      setActiveItems(session.items);
    }
  }, [session]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showSummary) return; // 总结模态框打开时不处理键盘事件
      
      if (!isFlipped) {
        if (e.code === 'Space') {
          e.preventDefault();
          handleFlip();
        }
      } else {
        switch (e.code) {
          case 'Digit1':
            e.preventDefault();
            handleResponse('again');
            break;
          case 'Digit2':
            e.preventDefault();
            handleResponse('hard');
            break;
          case 'Digit3':
            e.preventDefault();
            handleResponse('good');
            break;
          case 'Digit4':
            e.preventDefault();
            handleResponse('easy');
            break;
          case 'Space':
            e.preventDefault();
            handleFlip();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, showSummary]);

  const handleFlip = () => {
    if (!isFlipped) {
      responseStartTime.current = Date.now(); // Start timer when answer is shown
    }
    setIsFlipped(!isFlipped);
  };

  const handleResponse = async (response: 'again' | 'hard' | 'good' | 'easy') => {
    if (!session || !currentItem) return;

    // 本次答题的条目占位，放在函数顶部以确保各分支均可访问
    let lastEntry: { id: string; content: string; response: 'again'|'hard'|'good'|'easy'; retrievability: number; nextReview?: Date } | null = null;

    const responseTime = Date.now() - responseStartTime.current;
    const isCorrect = response === 'good' || response === 'easy';

    // Update session statistics
    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));
    // Update local summary counts by response category
    setSummaryCounts(prev => ({
      mastered: prev.mastered + (response === 'good' || response === 'easy' ? 1 : 0),
      shaky: prev.shaky + (response === 'hard' ? 1 : 0),
      forgotten: prev.forgotten + (response === 'again' ? 1 : 0),
    }));

    try {
      const result = await processStudyResponse(session, currentItem.item.id, response, responseTime, userId);
      const ms: any = result?.updatedMemoryStrength || {};
      const retrievability = typeof ms.newRetrievability === 'number' ? ms.newRetrievability : (typeof ms.retrievability === 'number' ? ms.retrievability : 0);
      const nextReview: Date | undefined = ms.newDueDate || ms.nextReview;
      lastEntry = { id: String(currentItem.item.id), content: String(currentItem.item.content), response, retrievability, nextReview };
      setSummaryItems(prev => [...prev, lastEntry]);
    } catch (e: any) {
      console.error(`Failed to process response: ${e.message}`);
      message.error('Failed to save your progress. Please try again.');
    }

    if (currentItemIndex < activeItems.length - 1) {
      setCurrentItemIndex((prev)=>prev + 1);
      setIsFlipped(false);
    } else {
      // 使用本地最终值，避免因状态异步导致提示显示上一拍的数据
      const localTotal = sessionStats.total + 1;
      const localCorrect = sessionStats.correct + (isCorrect ? 1 : 0);
      const elapsedMs = Date.now() - sessionStats.startTime;
      const minutes = Math.floor(elapsedMs / 60000);
      const sessionDurationText = minutes >= 1 ? `${minutes} minutes` : `${Math.ceil(elapsedMs / 1000)} seconds`;
      const localAccuracy = localTotal > 0 ? Math.round((localCorrect / localTotal) * 100) : 0;
      message.success(`Session completed! ${localCorrect}/${localTotal} correct (${localAccuracy}%) in ${sessionDurationText}`);
      // 记录当日完成计数并评估奖励
      try {
        addDailyFocusProgress(userId, new Date().toISOString(), localTotal);
      } catch (err) {
        console.error('record daily focus count failed', err);
      }
      try {
        const evalRes = evaluateRewardsOnEvent({ userId, eventType: 'sessionCompleted', dailyQuota: 60 });
        if (Array.isArray(evalRes.granted) && evalRes.granted.length > 0) {
          message.success(`🎖 获得新的奖励 ${evalRes.granted.length} 项`);
        }
      } catch (err) {
        console.error('evaluate rewards failed', err);
      }
      // FSRS + 评分分类（阈值：mastered ≥0.85；shaky [0.6,0.85)；forgotten <0.6）
      const localSummary = lastEntry ? [...summaryItems, lastEntry] : summaryItems;
      const mastered = localSummary.filter(si => (si.response === 'good' || si.response === 'easy') && si.retrievability >= 0.85).length;
      const shaky = localSummary.filter(si => si.response === 'hard' || (si.retrievability >= 0.6 && si.retrievability < 0.85)).length;
      const forgotten = localSummary.filter(si => si.response === 'again' || si.retrievability < 0.6).length;
      setSummaryCounts({ mastered, shaky, forgotten });
      // 收集会话统计（预计保持率/实际认知负荷）
      try {
        const manager = (session as any)?.manager;
        if (manager && typeof (manager as any).getSessionStatistics === 'function') {
          (manager as any).completeSession(session as any);
          const stats = (manager as any).getSessionStatistics(session as any);
          if (stats && typeof (stats as any).estimatedRetention === 'number') {
            setSummaryStats({
              estimatedRetention: (stats as any).estimatedRetention,
              cognitiveLoad: (stats as any).cognitiveLoadActual ?? (stats as any).cognitiveLoad ?? 0
            });
          }
        }
      } catch (err) {
        console.error('collect session stats failed', err);
      }
      // 后台自动生成"下次复习词书"并写入 lastWordbookId（最小增量，弱项为主）
      try {
        const weakIds = new Set(
          (lastEntry ? [...summaryItems, lastEntry] : summaryItems)
            .filter(si => si.response === 'hard' || si.response === 'again' || si.retrievability < 0.85)
            .map(si => String(si.id))
        );
        const allItems = session?.items || [];
        const weakItems = allItems.filter(si => weakIds.has(String(si.item.id)));
        if (weakItems.length > 0) {
          const name = `Next Review - ${new Date().toLocaleDateString()}`;
          const description = `Auto-generated review list from session ${wordbookId}`;
          const words = weakItems.map((si) => ({
            word: String(si.item.content),
            type: (si.item as any).type || 'word',
            phonetic: (si.item as any).details?.phonetic || null,
            definition: (si.item as any).details?.definition || '',
            example: (si.item as any).details?.example || null
          }));
          const payload = JSON.stringify({ name, description, words });
          const result = await importWordbook(payload, userId);
          const newWordbookId = result.wordbookId;
          setLastWordbookId(String(newWordbookId));
        }
      } catch (e: any) {
        console.error('Auto-create next review wordbook failed:', e?.message || e);
      }
      // Show summary modal instead of immediate navigation
      setShowSummary(true);
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><Spin size="large" tip="Loading session..." /></div>;
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
        <Button type="primary" onClick={() => navigate('/language-learning')}>
          Back to Wordbooks
        </Button>
      }
    />;
  }

  const itemsSource: ScheduledItem[] = (activeItems && activeItems.length > 0) ? activeItems : (session?.items || []);
  const currentItem = itemsSource[currentItemIndex] as ScheduledItem & { item: { details?: any }};
  const details = (currentItem.item as any).details || {};

  const frontContent = <Title level={2}>{currentItem.item.content}</Title>;
  const backContent = (
    <div>
      <Title level={4}>{currentItem.item.content}</Title>
      <Text type="secondary">{details?.phonetic || ''}</Text>
      <hr style={{ margin: '12px 0' }} />
      <Paragraph>{details?.definition || 'No definition provided.'}</Paragraph>
      {details?.example && <Paragraph type="secondary">e.g., {details.example}</Paragraph>}
    </div>
  );
  
  const rawType = (currentItem as any)?.strategy?.type as string | undefined;
  const rawDiff = (currentItem as any)?.strategy?.difficulty as string | undefined;
  const currentStrategyLabel = rawType === 'recognition' ? '识别'
    : rawType === 'cued_recall' ? '提示回忆'
    : rawType === 'free_recall' ? '自由回忆'
    : rawType === 'elaborative_retrieval' ? '精细回忆'
    : '检索';
  const currentStrategyDisplay = rawDiff ? `${currentStrategyLabel} · ${rawDiff}` : currentStrategyLabel;
  const progressPercent = itemsSource.length > 0 ? (currentItemIndex / itemsSource.length) * 100 : 0;
  const sessionDuration = Math.round((Date.now() - sessionStats.startTime) / 1000 / 60);
  const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
  
  // 创建分段进度指示器
  const segmentDots = Array.from({ length: Math.min(itemsSource.length, 10) }, (_, i) => {
    let dotClass = 'segment-dot';
    if (i < currentItemIndex) {
      dotClass += ' completed';
    } else if (i === currentItemIndex) {
      dotClass += ' active';
    }
    return <div key={i} className={dotClass} />;
  });

  return (
    <div className="learning-session-container">
      {/* 顶部状态栏 */}
      <div className="session-header">
        <div className="session-header-content">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/language-learning')}
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
            <div className="session-progress-text">
              {currentItemIndex + 1} / {itemsSource.length} · {currentStrategyDisplay}
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
              <div className="session-stat-value">{sessionStats.total}/{itemsSource.length}</div>
              <div className="session-stat-label">进度</div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="session-main">
        {/* 分段进度指示器 */}
        <div className="segment-indicator">
          {segmentDots}
        </div>
        
        {/* 卡片区域 */}
        <div className="session-card-area">
          <LearningFlashcard
            frontContent={frontContent}
            backContent={backContent}
            isFlipped={isFlipped}
            onFlip={handleFlip}
          />
        </div>

        {/* 操作按钮区域 */}
        <div className="session-actions">
          {!isFlipped ? (
            <Button 
              type="primary" 
              onClick={handleFlip} 
              block 
              size="large"
              className="session-action-button"
            >
              显示答案 (空格键)
            </Button>
          ) : (
            <div className="session-response-buttons">
              <Button 
                danger 
                onClick={() => handleResponse('again')} 
                className="session-response-button again"
              >
                再学<br/>1
              </Button>
              <Button 
                onClick={() => handleResponse('hard')} 
                className="session-response-button hard"
              >
                困难<br/>2
              </Button>
              <Button 
                type="primary" 
                onClick={() => handleResponse('good')} 
                className="session-response-button good"
              >
                掌握<br/>3
              </Button>
              <Button 
                type="primary" 
                ghost 
                onClick={() => handleResponse('easy')} 
                className="session-response-button easy"
              >
                简单<br/>4
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 学习总结模态框 */}
      <SessionSummaryModal
        visible={showSummary}
        onClose={() => setShowSummary(false)}
        accuracy={accuracy}
        sessionDuration={sessionDuration}
        totalItems={sessionStats.total}
        summaryCounts={summaryCounts}
        summaryStats={summaryStats}
        onReviewWeakItems={() => {
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
            setActiveItems(weakItems);
            setCurrentItemIndex(0);
            setIsFlipped(false);
            setSessionStats({ correct: 0, total: 0, startTime: Date.now() });
            setShowSummary(false);
            message.success(`已进入弱项微复习，共 ${weakItems.length} 个词`);
          }
        }}
        onScheduleNextReview={async () => {
          const classify = (si: { response: 'again'|'hard'|'good'|'easy'; retrievability: number }) => {
            if (si.response === 'again' || si.retrievability < 0.6) return 'forgotten';
            if (si.response === 'hard' || (si.retrievability >= 0.6 && si.retrievability < 0.85)) return 'shaky';
            return 'mastered';
          };
          const planned = summaryItems.map(si => ({
            itemId: String(si.id),
            category: classify(si as any),
            nextReview: si.nextReview ? si.nextReview : new Date(Date.now() + 24 * 60 * 60 * 1000)
          }));
          try {
            const res = await schedulePlannedReviews({
              userId,
              wordbookId: Number(wordbookId),
              planned
            });
            message.success(`已安排下次复习（${res.updated} 项）`);
          } catch (e: any) {
            console.error(e);
            message.error('安排复习失败，请稍后重试');
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
    </div>
  );
};

export default LearningSessionPage;