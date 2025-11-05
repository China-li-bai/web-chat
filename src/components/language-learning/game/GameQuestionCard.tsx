import React, { useState, useCallback, useMemo } from 'react';
import { Button, Card, Typography, Space, Row, Col, Tag, Tooltip } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  SkipOutlined, 
  BulbOutlined,
  TrophyOutlined 
} from '@ant-design/icons';
import type { GameQuestionCardProps, GameFeedback } from '@/types/game';

const { Title, Text, Paragraph } = Typography;

export const GameQuestionCard: React.FC<GameQuestionCardProps> = ({
  question,
  timeRemaining,
  onAnswer,
  onSkip,
  onHint,
  canUseHint = true,
  showFeedback = false,
  feedback
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  const handleAnswer = useCallback((answerIndex: number) => {
    if (hasAnswered) return;
    
    setSelectedAnswer(answerIndex);
    setHasAnswered(true);
    setShowResult(true);
    
    const responseTime = question.timeLimit - timeRemaining;
    const result = onAnswer(answerIndex, responseTime);
    
    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(result.isCorrect ? [100] : [200, 100, 200]);
    }
  }, [hasAnswered, onAnswer, question.timeLimit, timeRemaining]);

  const handleSkip = useCallback(() => {
    if (hasAnswered) return;
    
    setHasAnswered(true);
    setShowResult(true);
    onSkip?.();
  }, [hasAnswered, onSkip]);

  const handleHint = useCallback(() => {
    if (!canUseHint || hasAnswered) return;
    onHint?.();
  }, [canUseHint, hasAnswered, onHint]);

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: '#52c41a',
      medium: '#faad14', 
      hard: '#fa8c16',
      expert: '#f5222d'
    };
    return colors[difficulty as keyof typeof colors] || '#1890ff';
  };

  const getDifficultyText = (difficulty: string) => {
    const texts = {
      easy: '简单',
      medium: '中等',
      hard: '困难', 
      expert: '专家'
    };
    return texts[difficulty as keyof typeof texts] || difficulty;
  };

  const getOptionButtonStyle = (index: number) => {
    let style: React.CSSProperties = {
      padding: '16px 20px',
      height: 'auto',
      minHeight: '60px',
      textAlign: 'left',
      fontSize: '16px',
      lineHeight: '1.4',
      wordBreak: 'break-word',
      whiteSpace: 'normal'
    };

    if (showResult) {
      if (index === question.correctAnswer) {
        style = {
          ...style,
          backgroundColor: '#f6ffed',
          borderColor: '#52c41a',
          color: '#389e0d'
        };
      } else if (index === selectedAnswer && index !== question.correctAnswer) {
        style = {
          ...style,
          backgroundColor: '#fff2f0',
          borderColor: '#ff4d4f',
          color: '#cf1322'
        };
      } else {
        style = {
          ...style,
          opacity: 0.6
        };
      }
    } else if (selectedAnswer === index) {
      style = {
        ...style,
        backgroundColor: '#e6f7ff',
        borderColor: '#1890ff'
      };
    }

    return style;
  };

  const formatPoints = (points: number) => {
    return points > 0 ? `+${points}` : '0';
  };

  // 计算时间奖励倍数
  const timeBonusMultiplier = useMemo(() => {
    const timeRatio = timeRemaining / question.timeLimit;
    if (timeRatio > 0.8) return 2;
    if (timeRatio > 0.6) return 1.5;
    if (timeRatio > 0.4) return 1.2;
    return 1;
  }, [timeRemaining, question.timeLimit]);

  return (
    <Card 
      style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        borderRadius: '12px'
      }}
      bodyStyle={{ padding: '24px' }}
    >
      {/* 题目标头 */}
      <div style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
          <Col>
            <Space>
              <Tag color={getDifficultyColor(question.difficulty)}>
                {getDifficultyText(question.difficulty)}
              </Tag>
              <Text type="secondary">
                基础分: {formatPoints(question.points)}
              </Text>
              {timeBonusMultiplier > 1 && (
                <Tag color="blue">
                  速度奖励: {timeBonusMultiplier}x
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            <Text type="secondary" style={{ fontSize: 12 }}>
              第 {question.id.split('-').pop()} 题
            </Text>
          </Col>
        </Row>

        <Title level={2} style={{ margin: 0, textAlign: 'center' }}>
          {question.word}
        </Title>

        {question.phonetic && (
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 4 }}>
            {question.phonetic}
          </Text>
        )}

        <Paragraph style={{ 
          margin: '16px 0 0 0', 
          textAlign: 'center', 
          fontSize: '16px',
          color: '#666'
        }}>
          请选择正确的中文意思：
        </Paragraph>
      </div>

      {/* 选项 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {question.options.map((option, index) => (
          <Col xs={24} sm={12} key={index}>
            <Button
              block
              style={getOptionButtonStyle(index)}
              onClick={() => handleAnswer(index)}
              disabled={hasAnswered}
            >
              <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text style={{ flex: 1 }}>{option}</Text>
                {showResult && index === question.correctAnswer && (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                )}
                {showResult && index === selectedAnswer && index !== question.correctAnswer && (
                  <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                )}
              </Space>
            </Button>
          </Col>
        ))}
      </Row>

      {/* 操作按钮 */}
      {!hasAnswered && (
        <div style={{ textAlign: 'center' }}>
          <Space size="middle">
            <Tooltip title="跳过本题（不扣分）">
              <Button 
                icon={<SkipOutlined />} 
                onClick={handleSkip}
                disabled={hasAnswered}
              >
                跳过
              </Button>
            </Tooltip>
            {canUseHint && (
              <Tooltip title="消耗提示来排除一个错误选项">
                <Button 
                  icon={<BulbOutlined />} 
                  onClick={handleHint}
                  disabled={hasAnswered}
                >
                  提示
                </Button>
              </Tooltip>
            )}
          </Space>
        </div>
      )}

      {/* 反馈信息 */}
      {showFeedback && feedback && (
        <div style={{ 
          marginTop: 20, 
          padding: '16px', 
          borderRadius: '8px',
          backgroundColor: feedback.type === 'success' ? '#f6ffed' : '#fff2f0',
          border: `1px solid ${feedback.type === 'success' ? '#b7eb8f' : '#ffccc7'}`
        }}>
          <Space align="start" style={{ width: '100%' }}>
            {feedback.isCorrect ? (
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
            ) : (
              <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
            )}
            <div style={{ flex: 1 }}>
              <Text strong style={{ 
                color: feedback.isCorrect ? '#389e0d' : '#cf1322' 
              }}>
                {feedback.message}
              </Text>
              <div style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 14 }}>
                  获得分数: <Text strong>{formatPoints(feedback.points)}</Text>
                </Text>
                {feedback.timeBonus && feedback.timeBonus > 0 && (
                  <Text style={{ fontSize: 14, marginLeft: 12 }}>
                    时间奖励: +{feedback.timeBonus}
                  </Text>
                )}
                {feedback.streakBonus && feedback.streakBonus > 0 && (
                  <Text style={{ fontSize: 14, marginLeft: 12 }}>
                    连击奖励: +{feedback.streakBonus}
                  </Text>
                )}
              </div>
              {!feedback.isCorrect && feedback.correctAnswer && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  正确答案: {feedback.correctAnswer}
                </Text>
              )}
              {feedback.explanation && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  {feedback.explanation}
                </Text>
              )}
            </div>
          </Space>
        </div>
      )}

      {/* 成就提示 */}
      {feedback?.streakBonus && feedback.streakBonus > 0 && (
        <div style={{ 
          marginTop: 12, 
          textAlign: 'center',
          animation: 'bounce 1s ease-in-out'
        }}>
          <TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} />
          <Text style={{ 
            marginLeft: 8, 
            color: '#faad14',
            fontWeight: 'bold'
          }}>
            连击奖励！保持下去！
          </Text>
        </div>
      )}
    </Card>
  );
};

export default GameQuestionCard;