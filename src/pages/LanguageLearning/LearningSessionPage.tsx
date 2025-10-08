import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Flashcard } from '@/components/language-learning/Flashcard';
import { Button, Space, Spin, Result, Typography, message, Progress, Card, Statistic, Row, Col } from 'antd';
import { ArrowLeftOutlined, TrophyOutlined, ClockCircleOutlined, BookOutlined } from '@ant-design/icons';
import { createLearningSessionForWordbook, processStudyResponse } from '@/services/learningService';
import type { LearningSession, ScheduledItem } from '@/lib/memo/types';

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
  const responseStartTime = useRef<number>(0);

  useEffect(() => {
    if (!wordbookId) {
      setError('Wordbook ID is missing.');
      setIsLoading(false);
      return;
    }

    async function setupSession() {
      try {
        const newSession = await createLearningSessionForWordbook(Number(wordbookId));
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

    try {
      await processStudyResponse(session, currentItem.item.id, response, responseTime);
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
      navigate('/language-learning');
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
    </div>
  );
};

export default LearningSessionPage;