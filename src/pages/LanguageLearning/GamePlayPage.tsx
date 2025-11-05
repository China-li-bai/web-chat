import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Space, message, Progress } from 'antd';
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { GameDifficulty } from '@/types/game';
import { useAppStore } from '@/store/useAppStore';
import { createLearningSessionForWordbook, processStudyResponse } from '@/services/learningService';
import { initializeDatabase, isDatabaseInitialized } from '@/services/dataInitService';
import ImmediateFeedback, {
  useImmediateFeedback,
} from '@/components/language-learning/ImmediateFeedback';

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
  phonetic?: string;
  example?: string;
  learningProgress?: {
    stability: number;
    retrievability: number;
    difficulty: number;
    state: string;
    reviewCount: number;
  };
  options: string[]; // 固定的选项数组
  correctIndex: number; // 正确答案的索引
}

export const GamePlayPage: React.FC<GamePlayPageProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useAppStore();
  
  // 接收来自 GameHomePage 的参数
  const gameParams: GameParams = location.state;
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
  const [answerStartTime, setAnswerStartTime] = useState<number | null>(null); // 记录答题开始时间

  // 简易难度记忆匹配游戏状态
  const [gamePhase, setGamePhase] = useState<'waiting' | 'memory' | 'matching' | 'playing' | 'finished'>('waiting');
  const [memoryWords, setMemoryWords] = useState<WordData[]>([]);
  const [shuffledTranslations, setShuffledTranslations] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [selectedWord, setSelectedWord] = useState<WordData | null>(null);
  const [selectedTranslation, setSelectedTranslation] = useState<string | null>(null);
  const [matchingAttempts, setMatchingAttempts] = useState(0);
  const [memoryTimeRemaining, setMemoryTimeRemaining] = useState(30); // 记忆阶段30秒

  // 沉浸式体验hooks
  const { feedbackTrigger, triggerFeedback, clearFeedback } =
    useImmediateFeedback();

  // 获取难度配置
  const getDifficultyConfig = (difficulty: GameDifficulty) => {
    const configs = {
      easy: { timeLimit: 45, points: 10, gameMode: 'memory' }, // choice: 选择题, memory: 记忆匹配
      medium: { timeLimit: 30, points: 15, gameMode: 'choice' },
      hard: { timeLimit: 20, points: 25, gameMode: 'choice' },
      expert: { timeLimit: 15, points: 40, gameMode: 'choice' }
    };
    return configs[difficulty] || configs.medium;
  };

  // 检查是否为记忆匹配模式
  const isMemoryMatchMode = (difficulty: GameDifficulty) => {
    const config = getDifficultyConfig(difficulty);
    return difficulty === 'easy' && config.gameMode === 'memory';
  };

  // 倒计时器
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    // 记忆阶段倒计时
    if (gamePhase === 'memory' && memoryTimeRemaining > 0) {
      timer = setTimeout(() => {
        setMemoryTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (gamePhase === 'memory' && memoryTimeRemaining === 0) {
      // 记忆时间结束，开始匹配阶段
      startMatchingPhase();
      return;
    }
    
    // 选择题阶段倒计时
    if (gamePhase === 'playing' && gameStarted && !gameEnded && timeRemaining > 0 && !showFeedback) {
      timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (gamePhase === 'playing' && timeRemaining === 0 && !showFeedback) {
      // 时间到，自动提交（错误答案）
      handleAnswer('');
    }
    
    return () => clearTimeout(timer);
  }, [gameStarted, gameEnded, timeRemaining, showFeedback, gamePhase, memoryTimeRemaining]);

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

  // 学习会话状态
  const [learningSession, setLearningSession] = useState<any>(null);

  // 加载单词数据
  useEffect(() => {
    const loadWords = async () => {
      if (!gameParams?.wordbookId) {
        setError('缺少词书参数');
        navigate('/game');
        return;
      }

      if (!userId) {
        setError('用户未登录');
        navigate('/game');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('=== GamePlayPage: 开始加载词书单词 ===');
        console.log('加载参数:', { 
          wordbookId: gameParams.wordbookId, 
          userId, 
          questionCount: gameParams.questionCount 
        });
        
        // 检查数据库是否已初始化
        console.log('检查数据库初始化状态...');
        const dbInitialized = await isDatabaseInitialized();
        
        if (!dbInitialized) {
          console.log('数据库未初始化，开始初始化...');
          message.loading({ content: '正在初始化数据库...', key: 'init' });
          try {
            await initializeDatabase(userId);
            console.log('数据库初始化成功');
            message.success({ content: '数据库初始化成功', key: 'init' });
          } catch (initError) {
            console.error('数据库初始化失败:', initError);
            message.error({ content: '数据库初始化失败', key: 'init' });
            throw initError;
          }
        } else {
          console.log('数据库已初始化');
        }
        
        // 从数据库获取真实单词数据
        const session = await createLearningSessionForWordbook(gameParams.wordbookId, userId);
        setLearningSession(session);
        
        console.log('学习会话创建成功:', { 
          totalItems: session.items.length,
          sampleItems: session.items.slice(0, 3) 
        });
        
        if (session.items.length === 0) {
          setError('该词书中没有需要复习的单词');
          setLoading(false);
          return;
        }
        
        // 随机选择指定数量的单词
        const shuffled = [...session.items].sort(() => Math.random() - 0.5);
        const selectedWords = shuffled.slice(0, gameParams.questionCount || 5);
        
        console.log('选择的单词:', selectedWords.map((w: any) => ({ 
          id: w.item.id, 
          word: w.item.content, 
          translation: w.item.details?.translation || w.item.details?.definition
        })));
        
        // 为每个单词生成固定的选项
        const wordsWithOptions = selectedWords.map((sessionItem: any) => {
          const wordData = sessionItem.item;
          const translation = wordData.details?.translation || wordData.details?.definition;
          const allTranslations = selectedWords.map((w: any) => w.item.details?.translation || w.item.details?.definition);
          const options = generateFixedOptions(translation, allTranslations);
          const correctIndex = options.indexOf(translation);
          
          return {
            id: Number(wordData.id),
            word: wordData.content,
            translation: translation,
            definition: wordData.details?.definition,
            phonetic: wordData.details?.phonetic,
            example: wordData.details?.example,
            learningProgress: {
              stability: wordData.details?.stability || 0,
              retrievability: wordData.details?.retrievability || 1,
              difficulty: wordData.difficulty || 0.3,
              state: wordData.details?.state || 'new',
              reviewCount: 0
            },
            options,
            correctIndex
          };
        });
        
        console.log('=== GamePlayPage: 单词数据加载完成 ===');
        console.log('最终题目数据:', wordsWithOptions.map(w => ({
          word: w.word,
          translation: w.translation,
          options: w.options.map((opt, idx) => `${idx}:${opt}${idx === w.correctIndex ? ' ✓' : ''}`)
        })));
        
        setWords(wordsWithOptions);
        setLoading(false);
      } catch (error) {
        console.error('加载单词失败:', error);
        const errorMessage = error instanceof Error ? error.message : '加载单词失败';
        setError(errorMessage);
        message.error(errorMessage);
        setLoading(false);
      }
    };

    loadWords();
  }, [gameParams, userId, navigate]);

  // 开始游戏
  const startGame = () => {
    setGameStartTime(new Date());
    
    if (isMemoryMatchMode(gameParams.difficulty)) {
      // 简易难度记忆匹配模式
      const memoryWordList = words.slice(0, 5); // 取前5个单词
      setMemoryWords(memoryWordList);
      setGamePhase('memory');
      setMemoryTimeRemaining(30);
      
      console.log('=== 记忆匹配模式开始 ===');
      console.log('记忆单词:', memoryWordList.map(w => `${w.word} -> ${w.translation}`));
    } else {
      // 普通选择题模式
      setGameStarted(true);
      setGamePhase('playing');
      setAnswerStartTime(Date.now());
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
    }
  };

  // 开始匹配阶段
  const startMatchingPhase = () => {
    const translations = memoryWords.map(w => w.translation);
    const shuffled = [...translations].sort(() => Math.random() - 0.5);
    
    setShuffledTranslations(shuffled);
    setGamePhase('matching');
    setSelectedWord(null);
    setSelectedTranslation(null);
    setMatchedPairs(new Set());
    setMatchingAttempts(0);
    
    console.log('=== 匹配阶段开始 ===');
    console.log('打乱后的翻译:', shuffled);
  };

  // 处理记忆匹配选择
  const handleMemoryMatchSelect = (type: 'word' | 'translation', item: WordData | string) => {
    if (gamePhase !== 'matching') return;
    
    if (type === 'word') {
      setSelectedWord(item as WordData);
    } else {
      setSelectedTranslation(item as string);
    }
    
    // 检查是否两个都选中了
    if ((type === 'word' && selectedTranslation) || (type === 'translation' && selectedWord)) {
      checkMatch(type === 'word' ? item as WordData : selectedWord, type === 'word' ? selectedTranslation : item as string);
    }
  };

  // 检查匹配
  const checkMatch = async (word: WordData, translation: string) => {
    setMatchingAttempts(prev => prev + 1);
    
    const isMatch = word.translation === translation;
    
    if (isMatch) {
      // 匹配成功
      const newMatchedPairs = new Set(matchedPairs);
      newMatchedPairs.add(word.id.toString());
      setMatchedPairs(newMatchedPairs);
      
      message.success(`✅ 正确匹配: ${word.word} -> ${translation}`);
      
      // 触发成功反馈
      triggerFeedback({
        type: 'success',
        duration: 1000,
        intensity: 'medium',
        haptic: true,
        sound: true,
      });
      
      // 记录学习结果
      try {
        await processStudyResponse(
          learningSession,
          String(word.id),
          'good' as 'again' | 'hard' | 'good' | 'easy',
          0,
          userId!
        );
        console.log('学习结果记录成功:', {
          wordId: word.id,
          word: word.word,
          isCorrect: true,
          response: 'good'
        });
      } catch (error) {
        console.error('记录学习结果失败:', error);
      }
      
      setScore(prev => prev + 15); // 匹配成功得分
      setCorrectAnswers(prev => prev + 1);
      
    } else {
      // 匹配失败
      message.error(`❌ 匹配错误，请重新选择`);
      
      // 触发重试反馈
      triggerFeedback({
        type: 'retry',
        duration: 1000,
        intensity: 'light',
        haptic: true,
        sound: false,
      });
    }
    
    // 清除选择
    setTimeout(() => {
      setSelectedWord(null);
      setSelectedTranslation(null);
      
      // 检查是否完成所有匹配
      if (isMatch && matchedPairs.size + 1 === memoryWords.length) {
        // 完成所有匹配
        setTimeout(() => {
          setGamePhase('finished');
        }, 1000);
      }
    }, 1000);
  };

  // 处理答案
  const handleAnswer = async (answerIndex: number) => {
    if (showFeedback || !gameStarted) return;
    
    const currentWord = words[currentQuestionIndex];
    const isAnswerCorrect = answerIndex === currentWord.correctIndex;
    const responseTime = answerStartTime ? Date.now() - answerStartTime : 0;
    
    setSelectedAnswer(currentWord.options[answerIndex]);
    setIsCorrect(isAnswerCorrect);
    setShowFeedback(true);
    
    // 记录学习结果
    try {
      const response = isAnswerCorrect ? 'good' : 'again';
      await processStudyResponse(
        learningSession,
        String(currentWord.id),
        response as 'again' | 'hard' | 'good' | 'easy',
        responseTime,
        userId!
      );
      console.log('学习结果记录成功:', {
        wordId: currentWord.id,
        word: currentWord.word,
        isCorrect: isAnswerCorrect,
        responseTime,
        response
      });
    } catch (error) {
      console.error('记录学习结果失败:', error);
      // 不阻塞游戏流程，只记录错误
    }
    
    if (isAnswerCorrect) {
      setScore(prev => prev + getDifficultyConfig(gameParams.difficulty).points);
      setCorrectAnswers(prev => prev + 1);
      message.success('正确！+ ' + getDifficultyConfig(gameParams.difficulty).points + ' 分');
      
      // 触发成功反馈
      triggerFeedback({
        type: 'success',
        duration: 1500,
        intensity: 'medium',
        haptic: true,
        sound: true,
      });
    } else {
      message.error(`错误！正确答案是：${currentWord.translation}`);
      
      // 触发重试反馈
      triggerFeedback({
        type: 'retry',
        duration: 1500,
        intensity: 'light',
        haptic: true,
        sound: false,
      });
    }

    // 2秒后进入下一题或结束游戏
    setTimeout(() => {
      if (currentQuestionIndex < words.length - 1) {
        // 下一题
        setCurrentQuestionIndex(prev => prev + 1);
        setTimeRemaining(getDifficultyConfig(gameParams.difficulty).timeLimit);
        setSelectedAnswer(null);
        setShowFeedback(false);
        setAnswerStartTime(Date.now()); // 重置答题开始时间
      } else {
        // 游戏结束
        setGameEnded(true);
      }
    }, 2000);
  };


  // 计算游戏统计
  const getGameStats = () => {
    const totalItems = isMemoryMatchMode(gameParams.difficulty) ? memoryWords.length : words.length;
    const accuracy = totalItems > 0 ? (correctAnswers / totalItems) * 100 : 0;
    const gameTime = gameStartTime ? (new Date().getTime() - gameStartTime.getTime()) / 1000 : 0;
    
    return {
      accuracy: Math.round(accuracy),
      totalTime: Math.round(gameTime),
      score,
      attempts: isMemoryMatchMode(gameParams.difficulty) ? matchingAttempts : 0
    };
  };

  // 如果没有参数，返回首页
  if (!gameParams) {
    return (
      <>
        {/* 即时反馈层 */}
        <ImmediateFeedback trigger={feedbackTrigger} onComplete={clearFeedback} />
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
      </>
    );
  }

  // 加载中
  if (loading) {
    return (
      <>
        {/* 即时反馈层 */}
        <ImmediateFeedback trigger={feedbackTrigger} onComplete={clearFeedback} />
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
      </>
    );
  }

  // 错误处理
  if (error) {
    return (
      <>
        {/* 即时反馈层 */}
        <ImmediateFeedback trigger={feedbackTrigger} onComplete={clearFeedback} />
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '20px'
        }}>
          <Card style={{ maxWidth: '500px', textAlign: 'center' }}>
            <Title level={3} style={{ color: '#ff4d4f' }}>⚠️ 加载失败</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: '20px' }}>
              {error}
            </Text>
            <Space>
              <Button onClick={() => navigate('/game')}>
                返回游戏首页
              </Button>
              <Button type="primary" onClick={() => {
                setError(null);
                setLoading(true);
                window.location.reload();
              }}>
                重试
              </Button>
            </Space>
          </Card>
        </div>
      </>
    );
  }

  // 游戏结束页面
  if (gameEnded || gamePhase === 'finished') {
    const stats = getGameStats();
    const isMemoryMode = isMemoryMatchMode(gameParams.difficulty);
    return (
      <>
        {/* 即时反馈层 */}
        <ImmediateFeedback trigger={feedbackTrigger} onComplete={clearFeedback} />
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
                <Title level={4} style={{ margin: 0 }}>
                  {isMemoryMode ? `${correctAnswers}/${memoryWords.length}` : `${correctAnswers}/${words.length}`}
                </Title>
                <Text type="secondary">{isMemoryMode ? '匹配对数' : '正确题数'}</Text>
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>{stats.accuracy}%</Title>
                <Text type="secondary">正确率</Text>
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>{stats.totalTime}s</Title>
                <Text type="secondary">游戏时间</Text>
              </div>
              {isMemoryMode && (
                <div>
                  <Title level={4} style={{ margin: 0 }}>{stats.attempts}</Title>
                  <Text type="secondary">尝试次数</Text>
                </div>
              )}
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
      </>
    );
  }

  // 游戏开始前
  if (!gameStarted && gamePhase === 'waiting') {
    return (
      <>
        {/* 即时反馈层 */}
        <ImmediateFeedback trigger={feedbackTrigger} onComplete={clearFeedback} />
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
            {isMemoryMatchMode(gameParams.difficulty) ? (
              <Text type="secondary">
                游戏模式: 记忆匹配 (先记忆30秒，然后匹配英文和中文)
              </Text>
            ) : (
              <Text type="secondary">
                游戏模式: 英文单词 → 中文意思 (选择题)
              </Text>
            )}
          </div>

          <div style={{ marginBottom: '30px' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>难度级别: </Text>
                <Text>{gameParams.difficulty}</Text>
              </div>
              {isMemoryMatchMode(gameParams.difficulty) ? (
                <>
                  <div>
                    <Text strong>游戏模式: </Text>
                    <Text>记忆匹配</Text>
                  </div>
                  <div>
                    <Text strong>记忆单词数: </Text>
                    <Text>5 个单词</Text>
                  </div>
                  <div>
                    <Text strong>记忆时间: </Text>
                    <Text>30 秒</Text>
                  </div>
                  <div>
                    <Text strong>匹配得分: </Text>
                    <Text>15 分/对</Text>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
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
      </>
    );
  }

  // 记忆阶段界面
  if (gamePhase === 'memory') {
    return (
      <>
        {/* 即时反馈层 */}
        <ImmediateFeedback trigger={feedbackTrigger} onComplete={clearFeedback} />

        <div style={{ 
          minHeight: '100vh', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Card style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <Title level={2}>🧠 记忆阶段</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: '20px' }}>
              请记住以下5个单词及其中文意思
            </Text>
            
            <div style={{ marginBottom: '30px' }}>
              <Text strong style={{ fontSize: '20px', color: memoryTimeRemaining <= 5 ? '#ff4d4f' : '#52c41a' }}>
                剩余时间: {memoryTimeRemaining}s
              </Text>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(1, 1fr)', 
              gap: '15px',
              marginBottom: '30px'
            }}>
              {memoryWords.map((word, index) => (
                <Card key={word.id} style={{ 
                  backgroundColor: '#f0f2f5',
                  border: '2px solid #d9d9d9'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'left' }}>
                      <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                        {word.word}
                      </Text>
                      {word.phonetic && (
                        <Text type="secondary" style={{ display: 'block', fontSize: '14px' }}>
                          {word.phonetic}
                        </Text>
                      )}
                    </div>
                    <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                      {word.translation}
                    </Text>
                  </div>
                  {word.example && (
                    <Text type="secondary" style={{ display: 'block', marginTop: '8px', fontStyle: 'italic' }}>
                      例句: {word.example}
                    </Text>
                  )}
                </Card>
              ))}
            </div>

            <Text type="secondary">
              时间结束后将进入匹配阶段，请准备好！
            </Text>
          </Card>
        </div>
      </>
    );
  }

  // 匹配阶段界面
  if (gamePhase === 'matching') {
    const isCompleted = matchedPairs.size === memoryWords.length;
    
    return (
      <>
        {/* 即时反馈层 */}
        <ImmediateFeedback trigger={feedbackTrigger} onComplete={clearFeedback} />

        <div style={{ 
          minHeight: '100vh', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px'
        }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          {/* 顶部状态栏 */}
          <Card style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <Text strong>
                匹配进度: {matchedPairs.size} / {memoryWords.length}
              </Text>
              <Text strong>
                得分: {score}
              </Text>
            </div>
            
            <Progress percent={(matchedPairs.size / memoryWords.length) * 100} />
            
            <div style={{ marginTop: '15px' }}>
              <Text type="secondary">尝试次数: {matchingAttempts}</Text>
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: '400px' }}>
            {/* 英文单词列 */}
            <Card title="英文单词" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {memoryWords.map((word) => {
                  const isMatched = matchedPairs.has(word.id.toString());
                  const isSelected = selectedWord?.id === word.id;
                  
                  return (
                    <Button
                      key={word.id}
                      style={{
                        padding: '15px',
                        height: 'auto',
                        minHeight: '50px',
                        backgroundColor: isMatched ? '#f6ffed' : isSelected ? '#e6f7ff' : '#ffffff',
                        borderColor: isMatched ? '#52c41a' : isSelected ? '#1890ff' : '#d9d9d9',
                        color: isMatched ? '#52c41a' : '#000000',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                      onClick={() => !isMatched && handleMemoryMatchSelect('word', word)}
                      disabled={isMatched}
                    >
                      {word.word}
                      {isMatched && <CheckOutlined style={{ marginLeft: '8px', color: '#52c41a' }} />}
                    </Button>
                  );
                })}
              </div>
            </Card>

            {/* 中文翻译列 */}
            <Card title="中文翻译" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {shuffledTranslations.map((translation, index) => {
                  const isUsed = Array.from(matchedPairs).some(pairId => {
                    const word = memoryWords.find(w => w.id.toString() === pairId);
                    return word?.translation === translation;
                  });
                  const isSelected = selectedTranslation === translation;
                  
                  return (
                    <Button
                      key={index}
                      style={{
                        padding: '15px',
                        height: 'auto',
                        minHeight: '50px',
                        backgroundColor: isUsed ? '#f6ffed' : isSelected ? '#e6f7ff' : '#ffffff',
                        borderColor: isUsed ? '#52c41a' : isSelected ? '#1890ff' : '#d9d9d9',
                        color: isUsed ? '#52c41a' : '#000000',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                      onClick={() => !isUsed && handleMemoryMatchSelect('translation', translation)}
                      disabled={isUsed}
                    >
                      {translation}
                      {isUsed && <CheckOutlined style={{ marginLeft: '8px', color: '#52c41a' }} />}
                    </Button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* 底部控制 */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Button onClick={() => navigate('/game')}>
              <ArrowLeftOutlined /> 返回首页
            </Button>
          </div>

          {/* 完成提示 */}
          {isCompleted && (
            <div style={{ 
              position: 'fixed', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              zIndex: 1000
            }}>
              <Card style={{ textAlign: 'center', padding: '40px' }}>
                <Title level={2} style={{ color: '#52c41a' }}>🎉 匹配完成！</Title>
                <Text>所有单词都匹配正确！</Text>
              </Card>
            </div>
          )}
        </div>
      </div>
      </>
    );
  }

  // 主游戏界面
  const currentWord = words[currentQuestionIndex];
  const options = currentWord.options; // 使用固定的选项
  const progress = ((currentQuestionIndex + 1) / words.length) * 100;

  return (
    <>
      {/* 即时反馈层 */}
      <ImmediateFeedback trigger={feedbackTrigger} onComplete={clearFeedback} />

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
    </>
  );
};

export default GamePlayPage;