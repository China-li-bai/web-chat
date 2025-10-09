import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Flashcard } from '@/components/language-learning/Flashcard';
import { Button, Space, Spin, Result, Typography, message, Progress, Card, Statistic, Row, Col, Modal } from 'antd';
import { ArrowLeftOutlined, TrophyOutlined, ClockCircleOutlined, BookOutlined } from '@ant-design/icons';
import { createLearningSessionForWordbook, processStudyResponse, updateLearningStatistics } from '@/services/learningService';
import { useAppStore } from '@/store/useAppStore';
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
  const responseStartTime = useRef<number>(0);
  const userId = useAppStore((state) => state.userId);

  useEffect(() => {
    if (!wordbookId) {
      setError('Wordbook ID is missing.');
      setIsLoading(false);
      return;
    }

    async function setupSession() {
      try {
        const newSession = await createLearningSessionForWordbook(Number(wordbookId), userId);
        setSession(newSession);
      } catch (e: any) {
        setError(`Failed to create learning session: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    setupSession();
  }, [wordbookId]);

  const handleFlip = () => {
    if (!isFlipped) {
      responseStartTime.current = Date.now(); // Start timer when answer is shown
    }
    setIsFlipped(!isFlipped);
  };

  const handleResponse = async (response: 'again' | 'hard' | 'good' | 'easy') => {
    if (!session || !currentItem) return;

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
      setSummaryItems(prev => [
        ...prev,
        { id: String(currentItem.item.id), content: String(currentItem.item.content), response, retrievability, nextReview }
      ]);
    } catch (e: any) {
      console.error(`Failed to process response: ${e.message}`);
      message.error('Failed to save your progress. Please try again.');
    }

    if (currentItemIndex < session.items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      setIsFlipped(false);
    } else {
      const sessionDuration = Math.round((Date.now() - sessionStats.startTime) / 1000 / 60);
      const accuracy = Math.round((sessionStats.correct / sessionStats.total) * 100);
      message.success(`Session completed! ${sessionStats.correct}/${sessionStats.total} correct (${accuracy}%) in ${sessionDuration} minutes`);
      // FSRS + 评分分类（阈值：mastered ≥0.85；shaky [0.6,0.85)；forgotten <0.6）
      const mastered = summaryItems.filter(si => (si.response === 'good' || si.response === 'easy') && si.retrievability >= 0.85).length;
      const shaky = summaryItems.filter(si => si.response === 'hard' || (si.retrievability >= 0.6 && si.retrievability < 0.85)).length;
      const forgotten = summaryItems.filter(si => si.response === 'again' || si.retrievability < 0.6).length;
      setSummaryCounts({ mastered, shaky, forgotten });
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

  const currentItem = session.items[currentItemIndex] as ScheduledItem & { item: { details?: any }};
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
  
  const progressPercent = (currentItemIndex / session.items.length) * 100;
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
              percent={progressPercent} 
              showInfo={false} 
              strokeColor="#1890ff"
              size="small"
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {currentItemIndex + 1} of {session.items.length} words
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
                  title="Correct"
                  value={`${sessionStats.correct}/${sessionStats.total}`}
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