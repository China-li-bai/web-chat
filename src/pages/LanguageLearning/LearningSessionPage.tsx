import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Flashcard } from '@/components/language-learning/Flashcard';
import { Button, Space, Spin, Result, Typography, message, Progress } from 'antd';
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
      message.success('Session finished!');
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

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '500px', position: 'absolute', top: '20px' }}>
        <Progress percent={progressPercent} showInfo={false} />
      </div>
      
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
          <Space style={{ width: '100%' }}>
            <Button danger onClick={() => handleResponse('again')} block size="large">Again</Button>
            <Button onClick={() => handleResponse('hard')} block size="large">Hard</Button>
            <Button onClick={() => handleResponse('good')} block size="large">Good</Button>
            <Button type="primary" ghost onClick={() => handleResponse('easy')} block size="large">Easy</Button>
          </Space>
        )}
      </div>
    </div>
  );
};

export default LearningSessionPage;