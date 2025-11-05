import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Space, message, Progress } from 'antd';
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { GameQuestion, GameDifficulty } from '@/types/game';

const { Title, Text } = Typography;

interface GamePlayPageProps {}

interface GameParams {
  wordbookId: number;
  gameType: 'vocabulary-match' | 'definition-match';
  difficulty: GameDifficulty;
  questionCount: number;
}

interface WordData {
  id: number;
  word: string;
  translation: string;
  definition: string;
  options: string[]; // 固定的选项数组
  correctIndex: number; // 正确答案的索引
}

export const GamePlayPage: React.FC<GamePlayPageProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 接收来自 GameHomePage 的参数
  const gameParams: GameParams = location.state;
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  
  // 游戏状态
  const [words, setWords] = useState<WordData[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30); // 每题30秒
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);

  // 获取难度配置
  const getDifficultyConfig = (difficulty: GameDifficulty) => {
    const configs = {
      easy: { timeLimit: 45, points: 10 },
      medium: { timeLimit: 30, points: 15 },
      hard: { timeLimit: 20, points: 25 },
      expert: { timeLimit: 15, points: 40 }
    };
    return configs[difficulty] || configs.medium;
  };

  // 倒计时器
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameStarted && !gameEnded && timeRemaining > 0 && !showFeedback) {
      timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && !showFeedback) {
      // 时间到，自动提交（错误答案）
      handleAnswer('');
    }
    return () => clearTimeout(timer);
  }, [gameStarted, gameEnded, timeRemaining, showFeedback]);

  // 生成固定选项的函数
  const generateFixedOptions = (correctTranslation: string, allTranslations: string[]) => {
    const options = [correctTranslation];
    const wrongOptions = allTranslations.filter(t => t !== correctTranslation);
    
    // 随机选择3个错误选项
    while (options.length < 4 && wrongOptions.length > 0) {
      const randomIndex = Math.floor(Math.random() * wrongOptions.length);
      const wrongOption = wrongOptions.splice(randomIndex, 1)[0];
      if (!options.includes(wrongOption)) {
        options.push(wrongOption);
      }
    }
    
    // 打乱选项顺序，但一旦打乱就保持不变
    return options.sort(() => Math.random() - 0.5);
  };

  // 加载单词数据
  useEffect(() => {
    const loadWords = async () => {
      if (!gameParams?.wordbookId) {
        message.error('缺少词书参数');
        navigate('/game');
        return;
      }

      try {
        setLoading(true);
        // 模拟从数据库加载单词数据（实际应该调用 API）
        const mockWords: WordData[] = [
          { id: 1, word: 'apple', translation: '苹果', definition: '一种水果' },
          { id: 2, word: 'book', translation: '书', definition: '阅读材料' },
          { id: 3, word: 'computer', translation: '计算机', definition: '电子设备' },
          { id: 4, word: 'water', translation: '水', definition: '生命之源' },
          { id: 5, word: 'house', translation: '房子', definition: '居住建筑' },
          { id: 6, word: 'car', translation: '汽车', definition: '交通工具' },
          { id: 7, word: 'phone', translation: '电话', definition: '通讯设备' },
          { id: 8, word: 'music', translation: '音乐', definition: '艺术形式' },
          { id: 9, word: 'food', translation: '食物', definition: '营养来源' },
          { id: 10, word: 'school', translation: '学校', definition: '教育机构' }
        ];

        // 随机选择5个单词
        const shuffled = mockWords.sort(() => Math.random() - 0.5);
        const selectedWords = shuffled.slice(0, gameParams.questionCount || 5);
        
        // 为每个单词生成固定的选项
        const wordsWithOptions = selectedWords.map(word => {
          const allTranslations = selectedWords.map(w => w.translation);
          const options = generateFixedOptions(word.translation, allTranslations);
          const correctIndex = options.indexOf(word.translation);
          
          return {
            ...word,
            options,
            correctIndex
          };
        });
        
        setWords(wordsWithOptions);
        setLoading(false);
      } catch (error) {
        console.error('加载单词失败:', error);
        message.error('加载单词失败');
        navigate('/game');
      }
    };

    loadWords();
  }, [gameParams, navigate]);

  // 开始游戏
  const startGame = () => {
    setGameStarted(true);
    setGameStartTime(new Date());
    const config = getDifficultyConfig(gameParams.difficulty);
    setTimeRemaining(config.timeLimit);
    
    // 调试：记录每个题目的选项位置
    console.log('=== 游戏开始 - 题目选项位置 ===');
    words.forEach((word, index) => {
      console.log(`题目 ${index + 1}: ${word.word} -> ${word.translation}`);
      console.log(`选项位置: ${word.options.map((option, i) => 
        `${i}:${option}${i === word.correctIndex ? ' ✓' : ''}`
      ).join(', ')}`);
    });
  };

  // 处理答案
  const handleAnswer = (answerIndex: number) => {
    if (showFeedback || !gameStarted) return;
    
    const currentWord = words[currentQuestionIndex];
    const isAnswerCorrect = answerIndex === currentWord.correctIndex;
    
    setSelectedAnswer(currentWord.options[answerIndex]);
    setIsCorrect(isAnswerCorrect);
    setShowFeedback(true);
    
    if (isAnswerCorrect) {
      setScore(prev => prev + getDifficultyConfig(gameParams.difficulty).points);
      setCorrectAnswers(prev => prev + 1);
      message.success('正确！+ ' + getDifficultyConfig(gameParams.difficulty).points + ' 分');
    } else {
      message.error(`错误！正确答案是：${currentWord.translation}`);
    }

    // 2秒后进入下一题或结束游戏
    setTimeout(() => {
      if (currentQuestionIndex < words.length - 1) {
        // 下一题
        setCurrentQuestionIndex(prev => prev + 1);
        setTimeRemaining(getDifficultyConfig(gameParams.difficulty).timeLimit);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        // 游戏结束
        setGameEnded(true);
      }
    }, 2000);
  };


  // 计算游戏统计
  const getGameStats = () => {
    const accuracy = words.length > 0 ? (correctAnswers / words.length) * 100 : 0;
    const gameTime = gameStartTime ? (new Date().getTime() - gameStartTime.getTime()) / 1000 : 0;
    
    return {
      accuracy: Math.round(accuracy),
      totalTime: Math.round(gameTime),
      score
    };
  };

  // 如果没有参数，返回首页
  if (!gameParams) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <Title level={3}>缺少游戏参数</Title>
        <Button type="primary" onClick={() => navigate('/game')}>
          返回游戏首页
        </Button>
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <Title level={3}>加载中...</Title>
        <Text type="secondary">正在准备游戏题目</Text>
      </div>
    );
  }

  // 游戏结束页面
  if (gameEnded) {
    const stats = getGameStats();
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Card style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <Title level={2}>🎉 游戏完成！</Title>
          
          <div style={{ margin: '30px 0' }}>
            <div style={{ marginBottom: '20px' }}>
              <Text strong style={{ fontSize: '18px' }}>最终得分: {stats.score}</Text>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>{correctAnswers}/{words.length}</Title>
                <Text type="secondary">正确题数</Text>
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>{stats.accuracy}%</Title>
                <Text type="secondary">正确率</Text>
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>{stats.totalTime}s</Title>
                <Text type="secondary">游戏时间</Text>
              </div>
            </div>

            <Progress 
              percent={stats.accuracy} 
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              format={(percent) => `正确率 ${percent}%`}
            />
          </div>

          <Space>
            <Button type="primary" onClick={() => navigate('/game')}>
              重新开始
            </Button>
            <Button onClick={() => navigate('/wordbooks')}>
              词书管理
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  // 游戏开始前
  if (!gameStarted) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Card style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <div style={{ marginBottom: '30px' }}>
            <Title level={2}>🎮 单词游戏</Title>
            <Text type="secondary">
              游戏模式: 英文单词 → 中文意思
            </Text>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>难度级别: </Text>
                <Text>{gameParams.difficulty}</Text>
              </div>
              <div>
                <Text strong>题目数量: </Text>
                <Text>{gameParams.questionCount} 题</Text>
              </div>
              <div>
                <Text strong>时间限制: </Text>
                <Text>{getDifficultyConfig(gameParams.difficulty).timeLimit} 秒/题</Text>
              </div>
              <div>
                <Text strong>基础得分: </Text>
                <Text>{getDifficultyConfig(gameParams.difficulty).points} 分/题</Text>
              </div>
            </Space>
          </div>

          <Space>
            <Button onClick={() => navigate('/game')}>
              <ArrowLeftOutlined /> 返回
            </Button>
            <Button type="primary" size="large" onClick={startGame}>
              开始游戏
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  // 主游戏界面
  const currentWord = words[currentQuestionIndex];
  const options = currentWord.options; // 使用固定的选项
  const progress = ((currentQuestionIndex + 1) / words.length) * 100;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* 顶部状态栏 */}
        <Card style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <Text strong>
              题目 {currentQuestionIndex + 1} / {words.length}
            </Text>
            <Text strong>
              得分: {score}
            </Text>
          </div>
          
          <Progress percent={progress} />
          
          <div style={{ marginTop: '15px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <Text type="secondary">难度: {gameParams.difficulty}</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Text type="secondary">剩余时间:</Text>
                <Text style={{ 
                  color: timeRemaining <= 5 ? '#ff4d4f' : '#52c41a',
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  {timeRemaining}s
                </Text>
              </div>
            </div>
          </div>
        </Card>

        {/* 主题目卡片 */}
        <Card style={{ textAlign: 'center', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '30px' }}>
            <Title level={1} style={{ margin: 0, color: '#1890ff' }}>
              {currentWord.word}
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              请选择正确的中文意思:
            </Text>
          </div>

          {/* 选项按钮 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '15px',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            {options.map((option, index) => {
              let buttonStyle: React.CSSProperties = {
                padding: '20px',
                fontSize: '16px',
                height: 'auto',
                minHeight: '60px'
              };

              if (showFeedback) {
                if (index === currentWord.correctIndex) {
                  // 正确答案
                  buttonStyle = {
                    ...buttonStyle,
                    backgroundColor: '#f6ffed',
                    borderColor: '#52c41a',
                    color: '#52c41a'
                  };
                } else if (index !== currentWord.correctIndex && selectedAnswer === option) {
                  // 选错的答案
                  buttonStyle = {
                    ...buttonStyle,
                    backgroundColor: '#fff2f0',
                    borderColor: '#ff4d4f',
                    color: '#ff4d4f'
                  };
                } else {
                  // 其他选项
                  buttonStyle = {
                    ...buttonStyle,
                    opacity: 0.6
                  };
                }
              } else if (selectedAnswer === option) {
                // 选中的选项
                buttonStyle = {
                  ...buttonStyle,
                  backgroundColor: '#e6f7ff',
                  borderColor: '#1890ff'
                };
              }

              return (
                <Button
                  key={index}
                  style={buttonStyle}
                  onClick={() => handleAnswer(index)}
                  disabled={showFeedback}
                  block
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span>{option}</span>
                    {showFeedback && index === currentWord.correctIndex && (
                      <CheckOutlined style={{ color: '#52c41a' }} />
                    )}
                    {showFeedback && selectedAnswer === option && index !== currentWord.correctIndex && (
                      <CloseOutlined style={{ color: '#ff4d4f' }} />
                    )}
                  </div>
                </Button>
              );
            })}
          </div>

          {/* 反馈信息 */}
          {showFeedback && (
            <div style={{ 
              marginTop: '30px',
              padding: '15px',
              backgroundColor: isCorrect ? '#f6ffed' : '#fff2f0',
              borderRadius: '8px',
              border: `1px solid ${isCorrect ? '#b7eb8f' : '#ffccc7'}`
            }}>
              <Text style={{ 
                color: isCorrect ? '#52c41a' : '#ff4d4f',
                fontWeight: 'bold'
              }}>
                {isCorrect ? '✅ 正确！' : '❌ 错误！'}
              </Text>
              {!isCorrect && (
                <Text type="secondary" style={{ display: 'block', marginTop: '5px' }}>
                  正确答案是: {currentWord.translation}
                </Text>
              )}
              {isCorrect && (
                <Text type="secondary" style={{ display: 'block', marginTop: '5px' }}>
                  获得 {getDifficultyConfig(gameParams.difficulty).points} 分
                </Text>
              )}
            </div>
          )}
        </Card>

        {/* 底部控制 */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Button onClick={() => navigate('/game')}>
            <ArrowLeftOutlined /> 返回首页
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GamePlayPage;