import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Typography, 
  Row, 
  Col, 
  Button, 
  Space, 
  Select,
  message
} from 'antd';
import { 
  PlayCircleOutlined, 
  TrophyOutlined, 
  BookOutlined
} from '@ant-design/icons';
import { useGameStore } from '@/store/game';
import { useAppStore } from '@/store/useAppStore';
import { databaseService } from '@/services/database';
import type { GameType, GameDifficulty } from '@/types/game';
import type { WordbookWithStats } from '@/types/wordbook';

const { Title, Text } = Typography;

export const GameHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { loadStatistics } = useGameStore();
  
  // 极简状态管理 - 只保留核心状态
  const [wordbooks, setWordbooks] = useState<WordbookWithStats[]>([]);
  const [selectedWordbook, setSelectedWordbook] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [messageApi, contextHolder] = message.useMessage();

  // 游戏配置状态 - 支持动态切换
  const [gameConfig, setGameConfig] = useState({
    gameType: 'vocabulary-match' as GameType,
    difficulty: 'easy' as GameDifficulty, // 默认改为easy，启用记忆匹配模式
    questionCount: 10
  });

  // 难度配置映射 - 乔布斯式简约设计
  const difficultyConfig = {
    easy: { 
      label: '简易', 
      description: '记忆匹配模式，先记30秒再匹配', 
      color: '#52c41a',
      icon: '🧠',
      gameMode: 'memory'
    },
    medium: { 
      label: '中等', 
      description: '选择题模式，快速反应', 
      color: '#1890ff',
      icon: '⚡',
      gameMode: 'choice'
    },
    hard: { 
      label: '困难', 
      description: '限时选择题，挑战速度', 
      color: '#fa8c16',
      icon: '🔥',
      gameMode: 'choice'
    },
    expert: { 
      label: '专家', 
      description: '超短时间，极限挑战', 
      color: '#f5222d',
      icon: '👑',
      gameMode: 'choice'
    }
  };

  // 获取难度标签
  const getDifficultyLabel = (difficulty: GameDifficulty) => {
    return difficultyConfig[difficulty]?.label || '中等';
  };

  // 获取游戏模式描述
  const getGameModeDescription = (difficulty: GameDifficulty) => {
    return difficultyConfig[difficulty]?.description || '';
  };

  // 加载词书数据
  const loadWordbooks = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const db = await databaseService.getConnection();
      
      // 直接查询词书列表和统计信息
      const books = await db.exec({
        sql: `
          SELECT 
            w.id,
            w.name,
            w.description,
            w.createdAt,
            COUNT(DISTINCT words.id) as wordCount,
            COUNT(CASE WHEN lp.state = 'review' THEN 1 END) as masteredCount,
            COUNT(CASE WHEN lp.nextReview <= ? THEN 1 END) as dueCount
          FROM wordbooks w
          LEFT JOIN words ON words.wordbookId = w.id AND words.userId = ?
          LEFT JOIN learning_progress lp ON lp.wordId = words.id AND lp.userId = ?
          GROUP BY w.id, w.name, w.description, w.createdAt
          ORDER BY w.createdAt DESC
        `,
        args: [new Date().toISOString(), user.id, user.id]
      }) as any[];
      
      const formattedBooks: WordbookWithStats[] = books.map(book => ({
        id: book.id,
        name: book.name,
        description: book.description,
        createdAt: book.createdAt,
        wordCount: Number(book.wordCount || 0),
        masteredCount: Number(book.masteredCount || 0),
        dueCount: Number(book.dueCount || 0),
        progress: book.wordCount > 0 ? (Number(book.masteredCount || 0) / Number(book.wordCount)) * 100 : 0
      }));
      
      setWordbooks(formattedBooks);
      
      // 自动选择第一个有单词的词书
      if (formattedBooks.length > 0) {
        const firstBookWithWords = formattedBooks.find(book => book.wordCount > 0);
        if (firstBookWithWords && !selectedWordbook) {
          setSelectedWordbook(firstBookWithWords.id);
        }
      }
    } catch (error) {
      console.error('Failed to load wordbooks:', error);
      messageApi.error('加载词书失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWordbooks();
  }, [user?.id]);

  useEffect(() => {
    if (selectedWordbook) {
      loadStatistics(selectedWordbook);
    }
  }, [selectedWordbook, loadStatistics]);

  // 性能优化：使用useCallback避免不必要的重渲染
  const handleStartGame = useCallback(() => {
    if (!selectedWordbook) {
      messageApi.warning('请选择一个词书');
      return;
    }
    
    console.log('=== GameHomePage: 开始游戏参数调试 ===');
    console.log('selectedWordbook:', selectedWordbook, typeof selectedWordbook);
    console.log('gameConfig:', gameConfig);
    
    navigate('/game/play', {
      state: {
        wordbookId: Number(selectedWordbook), // 确保转换为数字
        ...gameConfig
      }
    });
  }, [selectedWordbook, gameConfig, navigate, messageApi]);

  // 性能优化：使用useMemo计算词书选项
  const wordbookOptions = useMemo(() => 
    wordbooks.filter(book => book.wordCount > 0),
    [wordbooks]
  );

  // 获取响应式断点
  const getBreakpoint = () => {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  };
  
  const [breakpoint, setBreakpoint] = useState(getBreakpoint());
  
  useEffect(() => {
    const handleResize = () => setBreakpoint(getBreakpoint());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 移动端手势优化
  const handleTouchOptimizations = {
    // 防止双击缩放
    onSelectStart: (e: any) => {
      if (breakpoint === 'mobile') {
        e.preventDefault();
      }
    },
    
    // 优化按钮触摸体验
    buttonProps: breakpoint === 'mobile' ? {
      onTouchStart: () => {
        // 触觉反馈
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    } : {}
  };

  return (
    <>
      {contextHolder}
      
      {/* 极简设计 - 遵循乔布斯的设计哲学 */}
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5',
        padding: breakpoint === 'mobile' ? '16px' : '24px'
      }}>
        
        {/* 核心内容卡片 */}
        <Card style={{ 
          maxWidth: '800px', 
          margin: '0 auto',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          
          {/* 页面标题 */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: breakpoint === 'mobile' ? 24 : 32 
          }}>
            <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
              单词游戏
            </Title>
            <Text type="secondary" style={{ fontSize: breakpoint === 'mobile' ? 14 : 16 }}>
              {gameConfig.questionCount}道题 · {getDifficultyLabel(gameConfig.difficulty)} · 约{Math.ceil(gameConfig.questionCount / 2)}分钟
            </Text>
          </div>

          {/* 词书选择 */}
          <div style={{ marginBottom: breakpoint === 'mobile' ? 20 : 24 }}>
            <Text strong style={{ 
              fontSize: breakpoint === 'mobile' ? 16 : 18,
              display: 'block',
              marginBottom: 12
            }}>
              选择词书
            </Text>
            
            {loading ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 0',
                color: '#999'
              }}>
                加载中...
              </div>
            ) : wordbookOptions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <BookOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary">暂无可用词书</Text>
                </div>
                <Button 
                  type="primary" 
                  icon={<BookOutlined />}
                  onClick={() => navigate('/wordbooks')}
                  size={breakpoint === 'mobile' ? 'middle' : 'large'}
                >
                  去导入词书
                </Button>
              </div>
            ) : (
              <Select
                value={selectedWordbook}
                onChange={setSelectedWordbook}
                style={{ width: '100%' }}
                size={breakpoint === 'mobile' ? 'middle' : 'large'}
                placeholder="选择一个词书开始游戏"
              >
                {wordbookOptions.map(book => (
                  <Select.Option key={book.id} value={book.id}>
                    <Space>
                      <BookOutlined />
                      <span>{book.name}</span>
                      <Text type="secondary">({book.wordCount} 词)</Text>
                      {book.progress > 0 && (
                        <Text type="secondary">· {Math.round(book.progress)}% 已掌握</Text>
                      )}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            )}
          </div>

          {/* 游戏配置选择 - 响应式配置界面 */}
          <div style={{ 
            marginBottom: breakpoint === 'mobile' ? 20 : 24,
            padding: breakpoint === 'mobile' ? 16 : 20,
            backgroundColor: '#f8f9fa',
            borderRadius: breakpoint === 'mobile' ? 6 : 8,
            border: '1px solid #e8e8e8',
            // 移动端触摸优化
            ...(breakpoint === 'mobile' && {
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            })
          }}>
            <Text strong style={{ 
              fontSize: breakpoint === 'mobile' ? 16 : 18,
              display: 'block',
              marginBottom: breakpoint === 'mobile' ? 12 : 16,
              color: '#333'
            }}>
              🎮 游戏设置
            </Text>

            {/* 移动端垂直布局 */}
            {breakpoint === 'mobile' ? (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {/* 难度选择 - 移动端 */}
                <div>
                  <Text style={{ 
                    fontSize: 14, 
                    color: '#666',
                    display: 'block',
                    marginBottom: 8
                  }}>
                    难度级别
                  </Text>
                  <Select
                    value={gameConfig.difficulty}
                    onChange={(difficulty) => setGameConfig(prev => ({ ...prev, difficulty }))}
                    style={{ width: '100%' }}
                    size="large"
                    {...(breakpoint === 'mobile' && {
                      className: 'mobile-select',
                      showSearch: false
                    })}
                  >
                    {Object.entries(difficultyConfig).map(([key, config]) => (
                      <Select.Option key={key} value={key}>
                        <Space>
                          <span>{config.icon}</span>
                          <span style={{ color: config.color, fontWeight: 'bold' }}>
                            {config.label}
                          </span>
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                  <Text type="secondary" style={{ 
                    fontSize: 12, 
                    display: 'block',
                    marginTop: 4,
                    lineHeight: 1.4
                  }}>
                    {getGameModeDescription(gameConfig.difficulty)}
                  </Text>
                </div>

                {/* 题目数量选择 - 移动端 */}
                <div>
                  <Text style={{ 
                    fontSize: 14, 
                    color: '#666',
                    display: 'block',
                    marginBottom: 8
                  }}>
                    题目数量
                  </Text>
                  <Select
                    value={gameConfig.questionCount}
                    onChange={(questionCount) => setGameConfig(prev => ({ ...prev, questionCount }))}
                    style={{ width: '100%' }}
                    size="large"
                    {...(breakpoint === 'mobile' && {
                      className: 'mobile-select'
                    })}
                  >
                    <Select.Option value={5}>
                      <Space>5题 <Text type="secondary">· 轻松</Text></Space>
                    </Select.Option>
                    <Select.Option value={10}>
                      <Space>10题 <Text type="secondary">· 标准</Text></Space>
                    </Select.Option>
                    <Select.Option value={15}>
                      <Space>15题 <Text type="secondary">· 挑战</Text></Space>
                    </Select.Option>
                    <Select.Option value={20}>
                      <Space>20题 <Text type="secondary">· 持久</Text></Space>
                    </Select.Option>
                  </Select>
                </div>
              </Space>
            ) : (
              /* 桌面端水平布局 */
              <Row gutter={[16, 16]}>
                {/* 难度选择 - 桌面端 */}
                <Col xs={24} sm={12}>
                  <div style={{ marginBottom: 12 }}>
                    <Text style={{ 
                      fontSize: 14, 
                      color: '#666',
                      display: 'block',
                      marginBottom: 8
                    }}>
                      难度级别
                    </Text>
                    <Select
                      value={gameConfig.difficulty}
                      onChange={(difficulty) => setGameConfig(prev => ({ ...prev, difficulty }))}
                      style={{ width: '100%' }}
                      size="middle"
                    >
                      {Object.entries(difficultyConfig).map(([key, config]) => (
                        <Select.Option key={key} value={key}>
                          <Space>
                            <span>{config.icon}</span>
                            <span style={{ color: config.color, fontWeight: 'bold' }}>
                              {config.label}
                            </span>
                          </Space>
                        </Select.Option>
                      ))}
                    </Select>
                    <Text type="secondary" style={{ 
                      fontSize: 12, 
                      display: 'block',
                      marginTop: 4
                    }}>
                      {getGameModeDescription(gameConfig.difficulty)}
                    </Text>
                  </div>
                </Col>

                {/* 题目数量选择 - 桌面端 */}
                <Col xs={24} sm={12}>
                  <div style={{ marginBottom: 12 }}>
                    <Text style={{ 
                      fontSize: 14, 
                      color: '#666',
                      display: 'block',
                      marginBottom: 8
                    }}>
                      题目数量
                    </Text>
                    <Select
                      value={gameConfig.questionCount}
                      onChange={(questionCount) => setGameConfig(prev => ({ ...prev, questionCount }))}
                      style={{ width: '100%' }}
                      size="middle"
                    >
                      <Select.Option value={5}>
                        <Space>5题 <Text type="secondary">· 轻松</Text></Space>
                      </Select.Option>
                      <Select.Option value={10}>
                        <Space>10题 <Text type="secondary">· 标准</Text></Space>
                      </Select.Option>
                      <Select.Option value={15}>
                        <Space>15题 <Text type="secondary">· 挑战</Text></Space>
                      </Select.Option>
                      <Select.Option value={20}>
                        <Space>20题 <Text type="secondary">· 持久</Text></Space>
                      </Select.Option>
                    </Select>
                  </div>
                </Col>
              </Row>
            )}

            {/* 当前配置预览 - 响应式设计 */}
            <div style={{ 
              marginTop: breakpoint === 'mobile' ? 12 : 16,
              padding: breakpoint === 'mobile' ? '10px 12px' : '12px 16px',
              backgroundColor: '#fff',
              borderRadius: breakpoint === 'mobile' ? '4px' : '6px',
              border: `1px solid ${difficultyConfig[gameConfig.difficulty].color}20`
            }}>
              <Space direction="vertical" size={breakpoint === 'mobile' ? 2 : 4} style={{ width: '100%' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <Text strong style={{ 
                    color: difficultyConfig[gameConfig.difficulty].color,
                    fontSize: breakpoint === 'mobile' ? 14 : 16
                  }}>
                    {difficultyConfig[gameConfig.difficulty].icon} {getDifficultyLabel(gameConfig.difficulty)}
                  </Text>
                  <Text type="secondary" style={{ 
                    fontSize: breakpoint === 'mobile' ? 11 : 12
                  }}>
                    {gameConfig.questionCount} 题
                  </Text>
                </div>
                <Text type="secondary" style={{ 
                  fontSize: breakpoint === 'mobile' ? 11 : 12,
                  lineHeight: 1.4
                }}>
                  {getGameModeDescription(gameConfig.difficulty)}
                </Text>
              </Space>
            </div>
          </div>

          {/* 主要操作按钮 */}
          <Button
            type="primary"
            size={breakpoint === 'mobile' ? 'large' : 'large'}
            icon={<PlayCircleOutlined />}
            onClick={handleStartGame}
            loading={loading}
            disabled={!selectedWordbook || loading}
            {...handleTouchOptimizations.buttonProps}
            style={{ 
              width: '100%', 
              height: breakpoint === 'mobile' ? 48 : 56,
              fontSize: breakpoint === 'mobile' ? 16 : 18,
              background: !selectedWordbook || loading 
                ? '#d9d9d9' 
                : 'linear-gradient(45deg, #1890ff, #52c41a)',
              border: 'none',
              borderRadius: '8px',
              // 移动端触摸优化
              ...(breakpoint === 'mobile' && {
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              })
            }}
          >
            {!selectedWordbook 
              ? '请选择词书' 
              : loading 
                ? '加载中...' 
                : '开始游戏'
            }
          </Button>

          {/* 底部提示 */}
          {selectedWordbook && wordbookOptions.length > 0 && (
            <div style={{ 
              marginTop: 16, 
              textAlign: 'center',
              color: '#999',
              fontSize: 12
            }}>
              <Text type="secondary">
                当前选择: {wordbookOptions.find(w => w.id === selectedWordbook)?.name}
              </Text>
            </div>
          )}
        </Card>

        {/* 底部辅助链接 */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: 24,
          color: '#999'
        }}>
          <Button 
            type="link" 
            size="small"
            onClick={() => navigate('/wordbooks')}
            style={{ color: '#999' }}
          >
            <TrophyOutlined /> 词书管理
          </Button>
        </div>
      </div>
    </>
  );
};

export default GameHomePage;