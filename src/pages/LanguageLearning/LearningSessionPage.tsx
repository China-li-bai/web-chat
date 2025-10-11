import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Flashcard } from '@/components/language-learning/Flashcard';
import { Button, Space, Spin, Result, Typography, message, Progress, Card, Statistic, Row, Col, Modal } from 'antd';
import { ArrowLeftOutlined, TrophyOutlined, ClockCircleOutlined, BookOutlined } from '@ant-design/icons';
import { createLearningSessionForWordbook, processStudyResponse, schedulePlannedReviews, startSessionFromTodayPlan } from '@/services/learningService';
import { evaluateRewardsOnEvent, addDailyFocusProgress } from '@/services/rewardService';
import { importWordbook } from '@/services/wordbookService';
import { useAppStore } from '@/store/useAppStore';
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
      // 后台自动生成“下次复习词书”并写入 lastWordbookId（最小增量，弱项为主）
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
  const progressPercent = ()=>itemsSource.length > 0 ? (currentItemIndex / itemsSource.length) * 100 : 0;
  const sessionDuration = Math.round((Date.now() - sessionStats.startTime) / 1000 / 60);
  const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
  
  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Header with stats */}
      <Card style={{ margin: '16px', marginBottom: '24px' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/language-learning')}
              type="text"
            >
              Back to Wordbooks
            </Button>
          </Col>
          <Col flex={1} style={{ margin: '0 24px' }}>
            <Progress 
              percent={progressPercent()} 
              showInfo={false} 
              strokeColor="#1890ff"
              size="small"
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {currentItemIndex + 1} of {itemsSource.length} words · Strategy: {currentStrategyDisplay}
            </Text>
          </Col>
          <Col>
            <Row gutter={16}>
              <Col>
                <Statistic
                  title="Accuracy"
                  value={accuracy}
                  suffix="%"
                  prefix={<TrophyOutlined />}
                  valueStyle={{ fontSize: '16px', color: accuracy >= 80 ? '#52c41a' : accuracy >= 60 ? '#fa8c16' : '#ff4d4f' }}
                />
              </Col>
              <Col>
                <Statistic
                  title="Time"
                  value={sessionDuration}
                  suffix="min"
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col>
                <Statistic
                  title="Progress"
                  value={`${sessionStats.total}/${itemsSource.length}`}
                  prefix={<BookOutlined />}
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Main learning area */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', minHeight: 'calc(100vh - 200px)' }}>
      
      <Flashcard
        frontContent={frontContent}
        backContent={backContent}
        isFlipped={isFlipped}
        onFlip={handleFlip}
      />

        <div style={{ marginTop: '24px', width: '100%', maxWidth: '500px' }}>
          {!isFlipped ? (
            <Button type="primary" onClick={handleFlip} block size="large">
              Show Answer
            </Button>
          ) : (
            <Row gutter={8} style={{ width: '100%' }}>
              <Col span={6}>
                <Button danger onClick={() => handleResponse('again')} block size="large">
                  Again
                </Button>
              </Col>
              <Col span={6}>
                <Button onClick={() => handleResponse('hard')} block size="large">
                  Hard
                </Button>
              </Col>
              <Col span={6}>
                <Button type="primary" onClick={() => handleResponse('good')} block size="large">
                  Good
                </Button>
              </Col>
              <Col span={6}>
                <Button type="primary" ghost onClick={() => handleResponse('easy')} block size="large">
                  Easy
                </Button>
              </Col>
            </Row>
          )}
        </div>
      </div>

      <Modal
        open={showSummary}
        title="学习总结"
        onCancel={() => setShowSummary(false)}
        footer={[
          <Button key="micro" onClick={() => {
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
          }}>
            立即复习弱项
          </Button>,
          <Button key="plan" onClick={async () => {
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
          }}>
            安排下次复习
          </Button>,
          <Button key="continue" type="primary" onClick={() => { setShowSummary(false); navigate('/language-learning'); }}>
            继续学习
          </Button>,
          <Button key="stats" onClick={() => { setShowSummary(false); navigate('/statistics'); }}>
            查看统计
          </Button>,
        ]}
        bodyStyle={{ backdropFilter: 'blur(8px)' }}
        style={{ background: 'rgba(255,255,255,0.6)' }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Statistic title="准确率" value={accuracy} suffix="%" />
          </Col>
          <Col span={8}>
            <Statistic title="用时" value={sessionDuration} suffix="min" />
          </Col>
          <Col span={8}>
            <Statistic title="总题数" value={sessionStats.total} />
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 12 }}>
          <Col span={12}>
            <Card size="small" title="预计保持率">
              <Text>{summaryStats ? `${Math.round(summaryStats.estimatedRetention * 100)}%` : '-'}</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="实际认知负荷">
              <Text>{summaryStats ? Number(summaryStats.cognitiveLoad).toFixed(2) : '-'}</Text>
            </Card>
          </Col>
        </Row>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            提示：预计保持率基于本次正确率与实际认知负荷估算；若本次全错或未作答则显示 0%。实际认知负荷由题目难度、用时与错误率综合计算，范围 0–1（建议控制在 0.8 以下）。
          </Text>
        </div>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Card size="small" title="已掌握">
              <Text>{summaryCounts.mastered} 个</Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="生疏">
              <Text>{summaryCounts.shaky} 个</Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="遗忘">
              <Text>{summaryCounts.forgotten} 个</Text>
            </Card>
          </Col>
        </Row>
      </Modal>
    </div>
  );
};

export default LearningSessionPage;