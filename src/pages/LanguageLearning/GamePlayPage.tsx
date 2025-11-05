import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Typography, Space, Button, Progress, Row, Col, message } from 'antd';
import { 
  PauseOutlined, 
  PlayCircleOutlined, 
  HomeOutlined,
  TrophyOutlined,
  FireOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useGameStore } from '@/store/game';
import { useAppStore } from '@/store/useAppStore';

import CountdownTimer from '@/components/language-learning/game/CountdownTimer';
import GameQuestionCard from '@/components/language-learning/game/GameQuestionCard';
import AchievementNotification from '@/components/language-learning/game/AchievementNotification';
import GameResultModal from '@/components/language-learning/game/GameResultModal';
import type { GameResult, GameFeedback } from '@/types/game';

const { Title, Text } = Typography;

export const GamePlayPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { 
    currentSession, 
    startGame, 
    pauseGame, 
    resumeGame, 
    finishGame,
    answerQuestion,
    skipQuestion,
    useHint,
    settings
  } = useGameStore();

  const [showAchievements, setShowAchievements] = useState<any[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  // 从路由状态获取游戏参数
  const gameParams = location.state as {
    wordbookId: number;
    gameType: string;
    difficulty: string;
    questionCount: number;
  };

  useEffect(() => {
    if (!gameParams) {
      message.error('游戏参数错误');
      navigate('/game');
      return;
    }

    // 初始化游戏
    startGame({
      wordbookId: gameParams.wordbookId,
      gameType: gameParams.gameType as any,
      difficulty: gameParams.difficulty as any,
      questionCount: gameParams.questionCount,
      customSettings: settings
    });

    setQuestionStartTime(Date.now());
  }, [gameParams, startGame, navigate, settings]);

  // 处理答案
  const handleAnswer = useCallback((questionId: string, answerIndex: number, responseTime: number) => {
    const feedback = answerQuestion(questionId, answerIndex, responseTime);
    setQuestionStartTime(Date.now());
    
    // 显示即时反馈消息
    if (feedback.isCorrect) {
      message.success(feedback.message, 1.5);
    } else {
      message.error(feedback.message, 2);
    }

    return feedback;
  }, [answerQuestion]);

  // 处理跳过
  const handleSkip = useCallback(() => {
    skipQuestion();
    setQuestionStartTime(Date.now());
    message.info('已跳过本题', 1);
  }, [skipQuestion]);

  // 处理提示
  const handleHint = useCallback(() => {
    useHint();
    message.info('已使用提示功能', 1);
  }, [useHint]);

  // 倒计时完成
  const handleTimeUp = useCallback(() => {
    if (currentSession) {
      // 自动跳过超时题目
      const currentQuestion = currentSession.questions[currentSession.currentQuestionIndex];
      if (currentQuestion) {
        handleSkip();
      }
    }
  }, [currentSession, handleSkip]);

  // 暂停/继续游戏
  const togglePause = useCallback(() => {
    if (currentSession?.status === 'playing') {
      pauseGame();
    } else if (currentSession?.status === 'paused') {
      resumeGame();
      setQuestionStartTime(Date.now());
    }
  }, [currentSession, pauseGame, resumeGame]);

  // 结束游戏
  const handleFinishGame = useCallback(async () => {
    try {
      await finishGame();
      // 结果会在finishGame后通过状态更新显示
    } catch (error) {
      message.error('结束游戏失败');
    }
  }, [finishGame]);

  // 游戏结束处理
  useEffect(() => {
    if (currentSession && 
        (currentSession.currentQuestionIndex >= currentSession.questions.length || 
         currentSession.timeRemaining <= 0)) {
      handleFinishGame();
    }
  }, [currentSession, handleFinishGame]);

  // 如果没有当前会话，显示加载状态
  if (!currentSession) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Card>
          <Space direction="vertical" align="center">
            <Text>正在初始化游戏...</Text>
          </Space>
        </Card>
      </div>
    );
  }

  const currentQuestion = currentSession.questions[currentSession.currentQuestionIndex];
  const progressPercent = (currentSession.currentQuestionIndex / currentSession.questions.length) * 100;
  const isLastQuestion = currentSession.currentQuestionIndex >= currentSession.questions.length - 1;

  // 游戏已结束，显示结果
  if (currentSession.status === 'finished' || gameResult) {
    return (
      <GameResultModal
        result={gameResult!}
        achievements={showAchievements}
        statistics={{} as any} // TODO: 传递实际统计
        onPlayAgain={() => navigate('/game')}
        onBackToMenu={() => navigate('/game')}
        onViewStatistics={() => navigate('/statistics')}
      />
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* 游戏状态栏 */}
        <Card style={{ marginBottom: 20 }}>
          <Row align="middle" gutter={[16, 8]}>
            <Col xs={24} sm={12} md={8}>
              <Space>
                <Text strong>进度:</Text>
                <Progress 
                  percent={Math.round(progressPercent)} 
                  size="small" 
                  style={{ minWidth: 120 }}
                  format={(percent) => `${currentSession.currentQuestionIndex + 1}/${currentSession.questions.length}`}
                />
              </Space>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Space>
                <StarOutlined style={{ color: '#faad14' }} />
                <Text strong>{currentSession.totalScore}</Text>
              </Space>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Space>
                <FireOutlined style={{ color: '#ff4d4f' }} />
                <Text strong>{currentSession.streak}</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Space>
                {currentSession.status === 'playing' ? (
                  <Button 
                    icon={<PauseOutlined />} 
                    onClick={togglePause}
                    size="small"
                  >
                    暂停
                  </Button>
                ) : (
                  <Button 
                    type="primary"
                    icon={<PlayCircleOutlined />} 
                    onClick={togglePause}
                    size="small"
                  >
                    继续
                  </Button>
                )}
                <Button 
                  icon={<TrophyOutlined />} 
                  onClick={handleFinishGame}
                  size="small"
                >
                  结束游戏
                </Button>
                <Button 
                  icon={<HomeOutlined />} 
                  onClick={() => navigate('/game')}
                  size="small"
                >
                  返回首页
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 倒计时器 */}
        {currentSession.status === 'playing' && (
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <CountdownTimer
              duration={currentQuestion?.timeLimit || 15000}
              onComplete={handleTimeUp}
              running={currentSession.status === 'playing'}
              onTick={(remaining) => {
                // 更新时间剩余
              }}
              size="large"
              showProgress={true}
            />
          </div>
        )}

        {/* 当前问题 */}
        {currentSession.status === 'playing' && currentQuestion && (
          <GameQuestionCard
            question={currentQuestion}
            timeRemaining={currentSession.timeRemaining}
            onAnswer={handleAnswer}
            onSkip={handleSkip}
            onHint={handleHint}
            canUseHint={true}
            showFeedback={true}
            feedback={{} as GameFeedback} // 将在handleAnswer中更新
          />
        )}

        {/* 暂停遮罩 */}
        {currentSession.status === 'paused' && (
          <Card style={{ 
            textAlign: 'center', 
            marginTop: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.9)'
          }}>
            <Space direction="vertical" size="large">
              <Title level={2} style={{ margin: 0 }}>游戏已暂停</Title>
              <Button 
                type="primary" 
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={togglePause}
                style={{ 
                  background: 'linear-gradient(45deg, #1890ff, #52c41a)',
                  border: 'none'
                }}
              >
                继续游戏
              </Button>
            </Space>
          </Card>
        )}

        {/* 成就通知 */}
        {showAchievements.map((achievement, index) => (
          <AchievementNotification
            key={achievement.id}
            achievement={achievement}
            onClose={() => {
              setShowAchievements(prev => prev.filter(a => a.id !== achievement.id));
            }}
            duration={5000}
          />
        ))}

        {/* 游戏提示 */}
        {currentSession.status === 'playing' && (
          <Card style={{ marginTop: 20, backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
            <Row gutter={[16, 8]}>
              <Col xs={24} sm={12}>
                <Text type="secondary">
                  提示：快速回答可获得时间奖励，连续正确可获得连击奖励
                </Text>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">
                  当前难度：{currentSession.difficulty} | 
                  剩余时间：{Math.ceil(currentSession.timeRemaining / 1000)}s
                </Text>
              </Col>
            </Row>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GamePlayPage;