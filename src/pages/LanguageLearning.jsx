import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Progress,
  Alert,
  Divider,
  Row,
  Col,
  Tag,
  Modal,
  Spin,
  Select,
  Switch,
  Tooltip,
  message,
  Statistic,
  Badge,
  List,
  Avatar,
  Rate
} from 'antd';
import {
  BookOutlined,
  BulbOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  SoundOutlined,
  ReloadOutlined,
  BarChartOutlined,
  FireOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  FolderOutlined
} from '@ant-design/icons';

// 导入记忆学习算法栈
import { MemoryLearningManager } from '../lib/memo/MemoryLearningManager';
// 导入数据服务层
import learningDataService from '../services/learningDataServiceSQLite';
import dataMigrationService from '../services/dataMigrationToSQLite';
import { wordbookService } from '../services/wordbookService';
import WordbookSelector from '../components/WordbookSelector';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const LanguageLearning = () => {
  // 记忆学习系统状态
  const [memoryManager, setMemoryManager] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [learningItems, setLearningItems] = useState([]);
  const [studyRecords, setStudyRecords] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  
  // 数据库初始化状态
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbInitializing, setDbInitializing] = useState(false);
  const [dbInitError, setDbInitError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRY_COUNT = 3;
  
  // 词书相关状态
  const [availableWordbooks, setAvailableWordbooks] = useState([]);
  const [selectedWordbookId, setSelectedWordbookId] = useState(null);
  
  // UI状态
  const [loading, setLoading] = useState(false);
  const [currentWord, setCurrentWord] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    itemsStudied: 0,
    correctAnswers: 0,
    totalTime: 0,
    streak: 0
  });
  
  // 学习模式
  const [learningMode, setLearningMode] = useState('vocabulary'); // vocabulary, grammar, listening
  const [difficultyLevel, setDifficultyLevel] = useState('intermediate');
  const [sessionDuration, setSessionDuration] = useState(1800); // 30分钟
  
  // 响应式布局
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // 等待页面完全加载后初始化数据库
  useEffect(() => {
    const initializeWhenReady = () => {
      if (document.readyState === 'complete') {
        // 页面已完全加载，延迟一点时间确保所有资源都准备好
        setTimeout(() => {
          initializeDatabase();
        }, 500);
      } else {
        // 页面还在加载，等待load事件
        const handleLoad = () => {
          setTimeout(() => {
            initializeDatabase();
          }, 500);
          window.removeEventListener('load', handleLoad);
        };
        window.addEventListener('load', handleLoad);
        
        // 清理函数
        return () => {
          window.removeEventListener('load', handleLoad);
        };
      }
    };

    initializeWhenReady();
    
    // 响应式布局监听
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 当选择的词书改变时，重新加载词汇
  useEffect(() => {
    if (selectedWordbookId) {
      loadVocabulariesFromWordbook(selectedWordbookId);
    }
  }, [selectedWordbookId]);

  // 数据库初始化函数（带重试机制）
  const initializeDatabase = async () => {
    if (dbInitialized || dbInitializing) {
      return;
    }

    setDbInitializing(true);
    setDbInitError(null);

    try {
      console.log('开始初始化数据库...');
      
      // 1. 检查并执行数据迁移
      await performDataMigration();
      
      // 2. 初始化系统
      initializeMemorySystem();
      
      // 3. 初始化示例数据（如果需要）
      await learningDataService.initializeWithSampleData();
      
      // 4. 加载用户数据
      loadUserData();
      
      setDbInitialized(true);
      setRetryCount(0);
      console.log('数据库初始化成功');
      
    } catch (error) {
      console.error('数据库初始化失败:', error);
      setDbInitError(error.message || '数据库初始化失败');
      
      // 自动重试机制
      if (retryCount < MAX_RETRY_COUNT) {
        console.log(`将在3秒后进行第${retryCount + 1}次重试...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          setDbInitializing(false);
          initializeDatabase();
        }, 3000);
      } else {
        setDbInitializing(false);
        message.error('数据库初始化失败，请刷新页面重试');
      }
    }
  };

  // 手动重试数据库初始化
  const retryDatabaseInit = () => {
    setRetryCount(0);
    setDbInitError(null);
    initializeDatabase();
  };

  const initializeMemorySystem = () => {
    try {
      const manager = new MemoryLearningManager();
      setMemoryManager(manager);
      console.log('记忆学习系统初始化成功');
    } catch (error) {
      console.error('记忆学习系统初始化失败:', error);
      message.error('系统初始化失败，请刷新页面重试');
    }
  };



  // 从指定词书加载词汇
  const loadVocabulariesFromWordbook = async (wordbookId) => {
    try {
      console.log(`开始加载单词本 ${wordbookId} 的词汇`);
      
      // 使用统一的 wordbookService 获取词汇数据
      const vocabularies = await wordbookService.getVocabularyByWordbook(wordbookId);
      console.log(`从 wordbookService 获取到 ${vocabularies.length} 个词汇`);
      
      if (vocabularies.length === 0) {
        console.warn(`单词本 ${wordbookId} 中没有词汇数据`);
        setLearningItems([]);
        return;
      }

      // 转换为学习项目格式
      const learningItems = vocabularies.map(vocab => ({
        id: vocab.id,
        word: vocab.word,
        pronunciation: vocab.pronunciation || '',
        meaning: vocab.meaning,
        example: vocab.example || '',
        difficulty: vocab.difficulty || 'beginner',
        masteryLevel: vocab.masteryLevel || 0,
        lastReviewed: vocab.lastReviewed,
        reviewCount: vocab.reviewCount || 0,
        tags: vocab.tags || []
      }));

      setLearningItems(learningItems);
      console.log(`成功加载 ${learningItems.length} 个学习项目`);
      
    } catch (error) {
      console.error('加载词汇失败:', error);
      // 如果加载失败，初始化默认词汇
      initializeDefaultVocabulary();
    }
  };

  // 将Vocabulary转换为LearningItem格式
  const vocabularyToLearningItem = (vocabulary) => {
    return {
      id: vocabulary.id,
      content: vocabulary.word,
      type: 'vocabulary',
      difficulty: vocabulary.difficulty,
      createdAt: new Date(vocabulary.createdAt),
      metadata: {
        definition: vocabulary.meaning,
        pronunciation: vocabulary.pronunciation || '',
        example: vocabulary.example || '',
        synonyms: [], // 可以后续扩展
        category: vocabulary.difficulty > 0.7 ? 'advanced' : vocabulary.difficulty > 0.4 ? 'intermediate' : 'beginner',
        wordbookId: vocabulary.wordbookId,
        masteryLevel: vocabulary.masteryLevel,
        reviewCount: vocabulary.reviewCount
      }
    };
  };

  // 执行数据迁移
  const performDataMigration = async () => {
    try {
      // 根据用户要求，不需要迁移数据，直接使用本地数据库的数据
      console.log('跳过数据迁移，直接使用本地数据库数据');
    } catch (error) {
      console.error('数据迁移过程中发生错误:', error);
      message.error('数据迁移失败，但不影响正常使用');
    }
  };

  const loadUserData = () => {
    try {
      // 从localStorage加载用户数据（保持向后兼容）
      const savedRecords = localStorage.getItem('language_learning_records');
      const savedSessions = localStorage.getItem('language_learning_sessions');
      
      if (savedRecords) {
        setStudyRecords(JSON.parse(savedRecords));
      }
      
      if (savedSessions) {
        setStudySessions(JSON.parse(savedSessions));
      }

      // 如果没有选择词书，使用默认词汇（向后兼容）
      if (!selectedWordbookId) {
        const savedItems = localStorage.getItem('language_learning_items');
        if (savedItems) {
          setLearningItems(JSON.parse(savedItems));
        } else {
          initializeDefaultVocabulary();
        }
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
      initializeDefaultVocabulary();
    }
  };

  const initializeDefaultVocabulary = () => {
    const defaultWords = [
      {
        id: 'word_1',
        content: 'Serendipity',
        type: 'vocabulary',
        difficulty: 0.7,
        createdAt: new Date(),
        metadata: {
          definition: 'The occurrence of events by chance in a happy way',
          pronunciation: '/ˌserənˈdɪpəti/',
          example: 'Meeting my best friend was pure serendipity.',
          synonyms: ['chance', 'fortune', 'luck'],
          category: 'advanced'
        }
      },
      {
        id: 'word_2',
        content: 'Ephemeral',
        type: 'vocabulary',
        difficulty: 0.6,
        createdAt: new Date(),
        metadata: {
          definition: 'Lasting for a very short time',
          pronunciation: '/ɪˈfem(ə)rəl/',
          example: 'The beauty of cherry blossoms is ephemeral.',
          synonyms: ['temporary', 'brief', 'fleeting'],
          category: 'advanced'
        }
      },
      {
        id: 'word_3',
        content: 'Resilience',
        type: 'vocabulary',
        difficulty: 0.5,
        createdAt: new Date(),
        metadata: {
          definition: 'The ability to recover quickly from difficulties',
          pronunciation: '/rɪˈzɪljəns/',
          example: 'Her resilience helped her overcome the challenges.',
          synonyms: ['toughness', 'strength', 'flexibility'],
          category: 'intermediate'
        }
      },
      {
        id: 'word_4',
        content: 'Ubiquitous',
        type: 'vocabulary',
        difficulty: 0.8,
        createdAt: new Date(),
        metadata: {
          definition: 'Present, appearing, or found everywhere',
          pronunciation: '/juːˈbɪkwɪtəs/',
          example: 'Smartphones have become ubiquitous in modern society.',
          synonyms: ['omnipresent', 'pervasive', 'universal'],
          category: 'advanced'
        }
      },
      {
        id: 'word_5',
        content: 'Paradigm',
        type: 'vocabulary',
        difficulty: 0.6,
        createdAt: new Date(),
        metadata: {
          definition: 'A typical example or pattern of something',
          pronunciation: '/ˈpærədaɪm/',
          example: 'The new theory represents a paradigm shift in physics.',
          synonyms: ['model', 'framework', 'pattern'],
          category: 'academic'
        }
      }
    ];
    
    setLearningItems(defaultWords);
    localStorage.setItem('language_learning_items', JSON.stringify(defaultWords));
  };

  // 开始学习会话
  const startLearningSession = async () => {
    if (!memoryManager || learningItems.length === 0) {
      message.error('系统未准备就绪，请稍后重试');
      return;
    }

    setLoading(true);
    try {
      const userId = 'user_001'; // 实际应用中应该从用户系统获取
      
      // 创建个性化学习会话
      const session = await memoryManager.createLearningSession(
        userId,
        learningItems,
        studyRecords,
        studySessions,
        sessionDuration
      );

      setCurrentSession(session);
      
      // 创建基本用户档案（从MemoryLearningManager获取）
      const profile = {
        cognitiveCapacity: 0.7,
        learningSpeed: 0.6,
        retentionRate: 0.8,
        studyStreak: 0,
        totalStudyTime: 0,
        averageResponseTime: 0
      };
      setUserProfile(profile);

      // 开始第一个学习项目
      if (session.items && session.items.length > 0) {
        setCurrentWord(session.items[0].item);
        setShowAnswer(false);
        
        message.success(`开始学习会话！本次将学习 ${session.items.length} 个项目`);
      } else {
        message.warning('没有找到需要复习的项目');
      }
      
    } catch (error) {
      console.error('创建学习会话失败:', error);
      message.error('创建学习会话失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理学习响应
  const handleStudyResponse = async (response) => {
    if (!currentSession || !currentWord || !memoryManager) return;

    const responseTime = Date.now() - (currentSession.startTime?.getTime() || Date.now());
    const confidence = getConfidenceFromResponse(response);

    try {
      // 记录学习响应
      const result = await memoryManager.processStudyResponse(
        currentSession,
        currentWord.id,
        response,
        responseTime,
        confidence
      );

      // 更新当前会话（processStudyResponse会直接修改传入的session对象）
      setCurrentSession({...currentSession});

      // 保存学习记录到新的数据服务层
      if (selectedWordbookId && currentWord.metadata?.wordbookId) {
        try {
          // 创建学习会话（如果还没有）
          if (!currentSession.dataServiceSessionId) {
            const dataSession = await learningDataService.createLearningSession(selectedWordbookId);
            currentSession.dataServiceSessionId = dataSession.id;
          }

          // 创建学习记录
          await learningDataService.createLearningRecord({
            wordbookId: selectedWordbookId,
            vocabularyId: currentWord.id,
            sessionId: currentSession.dataServiceSessionId,
            result: response === 'easy' || response === 'good' ? 'correct' : 'incorrect',
            timeSpent: Math.round(responseTime / 1000), // 转换为秒
            timestamp: new Date().toISOString()
          });

          console.log('学习记录已保存到数据服务层');
        } catch (error) {
          console.error('保存学习记录到数据服务层失败:', error);
          // 不影响学习流程，继续使用原有的localStorage保存
        }
      }

      // 更新学习记录（保持向后兼容）
      const newRecord = {
        itemId: currentWord.id,
        timestamp: new Date(),
        response,
        responseTime,
        confidence
      };

      const updatedRecords = [...studyRecords, newRecord];
      setStudyRecords(updatedRecords);
      localStorage.setItem('language_learning_records', JSON.stringify(updatedRecords));

      // 更新会话统计
      setSessionStats(prev => ({
        ...prev,
        itemsStudied: prev.itemsStudied + 1,
        correctAnswers: prev.correctAnswers + (response === 'easy' || response === 'good' ? 1 : 0),
        totalTime: prev.totalTime + responseTime,
        streak: response === 'easy' || response === 'good' ? prev.streak + 1 : 0
      }));

      // 移动到下一个项目
      const currentIndex = currentSession.items.findIndex(item => item.item.id === currentWord.id);
      if (currentIndex < currentSession.items.length - 1) {
        setCurrentWord(currentSession.items[currentIndex + 1].item);
        setShowAnswer(false);
      } else {
        // 会话完成
        completeSession(currentSession);
      }

    } catch (error) {
      console.error('处理学习响应失败:', error);
      message.error('处理响应失败，请重试');
    }
  };

  const getConfidenceFromResponse = (response) => {
    switch (response) {
      case 'easy': return 0.9;
      case 'good': return 0.7;
      case 'hard': return 0.4;
      case 'again': return 0.2;
      default: return 0.5;
    }
  };

  // 完成学习会话
  const completeSession = async (session) => {
    try {
      const completedSession = await memoryManager.completeSession(session);
      
      // 保存会话记录
      const updatedSessions = [...studySessions, completedSession];
      setStudySessions(updatedSessions);
      localStorage.setItem('language_learning_sessions', JSON.stringify(updatedSessions));

      // 显示完成统计
      Modal.success({
        title: '🎉 学习会话完成！',
        content: (
          <div>
            <p>本次学习统计：</p>
            <ul>
              <li>学习项目：{sessionStats.itemsStudied} 个</li>
              <li>正确率：{Math.round((sessionStats.correctAnswers / sessionStats.itemsStudied) * 100)}%</li>
              <li>平均响应时间：{Math.round(sessionStats.totalTime / sessionStats.itemsStudied / 1000)} 秒</li>
              <li>连续正确：{sessionStats.streak} 个</li>
            </ul>
          </div>
        ),
        onOk: () => {
          setCurrentSession(null);
          setCurrentWord(null);
          setSessionStats({ itemsStudied: 0, correctAnswers: 0, totalTime: 0, streak: 0 });
        }
      });

    } catch (error) {
      console.error('完成会话失败:', error);
      message.error('完成会话失败');
    }
  };

  // 显示答案
  const showWordAnswer = () => {
    setShowAnswer(true);
  };

  // 播放发音
  const playPronunciation = (word) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    } else {
      message.info('您的浏览器不支持语音合成功能');
    }
  };

  // 渲染学习卡片
  const renderLearningCard = () => {
    if (!currentWord) return null;

    return (
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📚 学习卡片</span>
            <Button 
              type="text" 
              icon={<SoundOutlined />}
              onClick={() => playPronunciation(currentWord.content)}
            >
              发音
            </Button>
          </div>
        }
        style={{ minHeight: '400px' }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: '24px' }}>
            {currentWord.content}
          </Title>
          
          {currentWord.metadata?.pronunciation && (
            <Text type="secondary" style={{ fontSize: '16px', display: 'block', marginBottom: '16px' }}>
              {currentWord.metadata.pronunciation}
            </Text>
          )}

          {!showAnswer ? (
            <div>
              <Paragraph style={{ fontSize: '16px', marginBottom: '32px' }}>
                你知道这个单词的意思吗？
              </Paragraph>
              <Button type="primary" size="large" onClick={showWordAnswer}>
                显示答案
              </Button>
            </div>
          ) : (
            <div>
              <Alert
                message="定义"
                description={currentWord.metadata?.definition}
                type="info"
                style={{ marginBottom: '16px', textAlign: 'left' }}
              />
              
              {currentWord.metadata?.example && (
                <Alert
                  message="例句"
                  description={currentWord.metadata.example}
                  type="success"
                  style={{ marginBottom: '16px', textAlign: 'left' }}
                />
              )}

              {currentWord.metadata?.synonyms && (
                <div style={{ marginBottom: '24px' }}>
                  <Text strong>同义词：</Text>
                  <div style={{ marginTop: '8px' }}>
                    {currentWord.metadata.synonyms.map(synonym => (
                      <Tag key={synonym} color="blue">{synonym}</Tag>
                    ))}
                  </div>
                </div>
              )}

              <Divider />
              
              <div>
                <Text strong style={{ display: 'block', marginBottom: '16px' }}>
                  你掌握得如何？
                </Text>
                <Space size="large">
                  <Button 
                    type="primary" 
                    onClick={() => handleStudyResponse('easy')}
                    style={{ backgroundColor: '#52c41a' }}
                  >
                    😊 简单
                  </Button>
                  <Button 
                    type="primary" 
                    onClick={() => handleStudyResponse('good')}
                  >
                    👍 良好
                  </Button>
                  <Button 
                    onClick={() => handleStudyResponse('hard')}
                  >
                    😅 困难
                  </Button>
                  <Button 
                    danger 
                    onClick={() => handleStudyResponse('again')}
                  >
                    😵 重来
                  </Button>
                </Space>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  // 渲染学习统计
  const renderLearningStats = () => {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="已学习"
              value={sessionStats.itemsStudied}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="正确率"
              value={sessionStats.itemsStudied > 0 ? Math.round((sessionStats.correctAnswers / sessionStats.itemsStudied) * 100) : 0}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="连续正确"
              value={sessionStats.streak}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="平均用时"
              value={sessionStats.itemsStudied > 0 ? Math.round(sessionStats.totalTime / sessionStats.itemsStudied / 1000) : 0}
              suffix="秒"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 渲染用户档案
  const renderUserProfile = () => {
    if (!userProfile) return null;

    return (
      <Card title="📊 学习档案" size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <div>
              <Text strong>认知容量</Text>
              <Progress 
                percent={Math.round(userProfile.cognitiveCapacity * 100)} 
                size="small"
                strokeColor="#1890ff"
              />
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div>
              <Text strong>学习速度</Text>
              <Progress 
                percent={Math.round(userProfile.learningSpeed * 100)} 
                size="small"
                strokeColor="#52c41a"
              />
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div>
              <Text strong>保持率</Text>
              <Progress 
                percent={Math.round(userProfile.retentionRate * 100)} 
                size="small"
                strokeColor="#fa8c16"
              />
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <Card>
        {/* 数据库初始化状态显示 */}
        {!dbInitialized && (
          <div style={{ marginBottom: '24px' }}>
            {dbInitializing ? (
              <Alert
                message="正在初始化数据库..."
                description={
                  <div>
                    <Spin size="small" style={{ marginRight: '8px' }} />
                    请稍候，正在加载学习数据
                    {retryCount > 0 && (
                      <div style={{ marginTop: '8px', color: '#666' }}>
                        重试次数: {retryCount}/{MAX_RETRY_COUNT}
                      </div>
                    )}
                  </div>
                }
                type="info"
                showIcon
              />
            ) : dbInitError ? (
              <Alert
                message="数据库初始化失败"
                description={
                  <div>
                    <div style={{ marginBottom: '12px' }}>
                      错误信息: {dbInitError}
                    </div>
                    <div>
                      <Button 
                        type="primary" 
                        size="small" 
                        onClick={retryDatabaseInit}
                        loading={dbInitializing}
                      >
                        重试初始化
                      </Button>
                      <Button 
                        type="link" 
                        size="small" 
                        onClick={() => window.location.reload()}
                        style={{ marginLeft: '8px' }}
                      >
                        刷新页面
                      </Button>
                    </div>
                  </div>
                }
                type="error"
                showIcon
              />
            ) : null}
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center',
          marginBottom: '24px',
          gap: isMobile ? '16px' : '0'
        }}>
          <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>
            <BookOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
            智能语言学习
          </Title>
          <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
            <Space>
              <WordbookSelector
                value={selectedWordbookId}
                onChange={setSelectedWordbookId}
                placeholder="选择词书"
                style={{ width: isMobile ? '120px' : '150px' }}
                size={isMobile ? 'small' : 'default'}
                disabled={!dbInitialized}
                onLoad={(wordbooks) => {
                  setAvailableWordbooks(wordbooks);
                  // 如果有词书且没有选择，默认选择第一个激活的词书
                  if (wordbooks.length > 0 && !selectedWordbookId) {
                    const activeWordbook = wordbooks.find(wb => wb.isActive) || wordbooks[0];
                    setSelectedWordbookId(activeWordbook.id);
                  }
                }}
              />
              <Select
                value={learningMode}
                onChange={setLearningMode}
                style={{ width: isMobile ? '100px' : '120px' }}
                size={isMobile ? 'small' : 'default'}
                disabled={!dbInitialized}
              >
                <Option value="vocabulary">词汇</Option>
                <Option value="grammar">语法</Option>
                <Option value="listening">听力</Option>
              </Select>
              <Select
                value={difficultyLevel}
                onChange={setDifficultyLevel}
                style={{ width: isMobile ? '100px' : '120px' }}
                size={isMobile ? 'small' : 'default'}
                disabled={!dbInitialized}
              >
                <Option value="beginner">初级</Option>
                <Option value="intermediate">中级</Option>
                <Option value="advanced">高级</Option>
              </Select>
            </Space>
            <Space>
              <Button 
                type="link" 
                icon={<LineChartOutlined />}
                onClick={() => window.location.href = '/long-term-statistics'}
                size={isMobile ? 'small' : 'default'}
                disabled={!dbInitialized}
              >
                长期统计
              </Button>
              <Button 
                type="link" 
                icon={<FolderOutlined />}
                onClick={() => window.location.href = '/wordbook-manager'}
                size={isMobile ? 'small' : 'default'}
                disabled={!dbInitialized}
              >
                单词本管理
              </Button>
            </Space>
          </Space>
        </div>

        {/* 用户档案 */}
        {userProfile && dbInitialized && (
          <div style={{ marginBottom: '24px' }}>
            {renderUserProfile()}
          </div>
        )}

        {/* 学习统计 */}
        {currentSession && dbInitialized && (
          <div style={{ marginBottom: '24px' }}>
            {renderLearningStats()}
          </div>
        )}

        <Divider />

        {/* 主要内容区域 - 只有在数据库初始化完成后才显示 */}
        {dbInitialized ? (
          !currentSession ? (
            // 开始学习界面
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ marginBottom: '32px' }}>
                <BookOutlined style={{ fontSize: '64px', color: '#1890ff' }} />
              </div>
              <Title level={3}>准备开始智能学习</Title>
              <Paragraph style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
                基于记忆科学的个性化学习系统，让学习更高效
              </Paragraph>
              
              {/* 词书选择提示 */}
              {!selectedWordbookId && (
                <Alert
                  message="请先选择词书"
                  description="在页面顶部选择一个词书开始学习"
                  type="warning"
                  showIcon
                  style={{ marginBottom: '24px', textAlign: 'left' }}
                />
              )}
              
              {/* 词书信息显示 */}
              {selectedWordbookId && (
                <div style={{ marginBottom: '24px' }}>
                  <Text strong>当前词书：</Text>
                  <Tag color="blue" style={{ marginLeft: '8px' }}>
                    {availableWordbooks.find(wb => wb.id === selectedWordbookId)?.name || '未知词书'}
                  </Tag>
                  <br />
                  <Text type="secondary">
                    词汇数量：{learningItems.length} 个
                  </Text>
                </div>
              )}
              
              <div style={{ marginBottom: '32px' }}>
                <Text strong>会话时长：</Text>
                <Select
                  value={sessionDuration}
                  onChange={setSessionDuration}
                  style={{ width: 150, marginLeft: '12px' }}
                >
                  <Option value={900}>15分钟</Option>
                  <Option value={1800}>30分钟</Option>
                  <Option value={2700}>45分钟</Option>
                  <Option value={3600}>60分钟</Option>
                </Select>
              </div>

              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={startLearningSession}
                loading={loading}
                disabled={!selectedWordbookId || learningItems.length === 0}
                style={{ minWidth: '200px' }}
              >
                开始智能学习
              </Button>

              <div style={{ marginTop: '32px' }}>
                <Alert
                  message="智能学习特色"
                  description={
                    <ul style={{ textAlign: 'left', marginTop: '12px' }}>
                      <li>🧠 基于FSRS算法的科学复习调度</li>
                      <li>📊 个性化难度自适应调整</li>
                      <li>🎯 主动检索策略优化记忆</li>
                      <li>📈 实时学习档案分析</li>
                    </ul>
                  }
                  type="info"
                  showIcon
                />
              </div>
            </div>
          ) : (
            // 学习进行中界面
            <div>
              {currentWord && renderLearningCard()}
              
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Space>
                  <Text>
                    进度: {sessionStats.itemsStudied} / {currentSession.items?.length || 0}
                  </Text>
                  <Progress 
                    percent={Math.round((sessionStats.itemsStudied / (currentSession.items?.length || 1)) * 100)}
                    style={{ width: '200px' }}
                  />
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: '确认结束学习？',
                        content: '当前学习进度将会保存',
                        onOk: () => {
                          setCurrentSession(null);
                          setCurrentWord(null);
                          setSessionStats({ itemsStudied: 0, correctAnswers: 0, totalTime: 0, streak: 0 });
                        }
                      });
                    }}
                  >
                    结束学习
                  </Button>
                </Space>
              </div>
            </div>
          )
        ) : (
          // 数据库未初始化时显示的占位内容
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ marginBottom: '24px' }}>
              <BookOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
            </div>
            <Title level={4} type="secondary">系统准备中...</Title>
            <Paragraph type="secondary">
              正在初始化学习系统，请稍候
            </Paragraph>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LanguageLearning;