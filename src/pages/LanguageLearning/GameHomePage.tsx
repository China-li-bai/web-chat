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
import { getDB } from '@/services/db';
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

  // 智能默认值 - 遵循"它就是那样"的哲学
  const [gameConfig] = useState({
    gameType: 'vocabulary-match' as GameType,
    difficulty: 'medium' as GameDifficulty,
    questionCount: 10
  });

  // 加载词书数据
  const loadWordbooks = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const db = await getDB();
      
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
              10道题 · 中等难度 · 约5分钟
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