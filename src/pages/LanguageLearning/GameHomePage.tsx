import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Typography, 
  Row, 
  Col, 
  Button, 
  Space, 
  Select, 
  InputNumber,
  List, 
  Avatar, 
  Tag, 
  Progress, 
  Statistic
} from 'antd';
import { 
  PlayCircleOutlined, 
  TrophyOutlined, 
  StarOutlined, 
  FireOutlined,
  BookOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useGameStore } from '@/store/game';
import { useAppStore } from '@/store/useAppStore';
import { GameLayout, GameButton, GameStatCard, GameGrid } from '@/components/language-learning/game/GameLayout';
import { useGameResponsive } from '@/hooks/useGameResponsive';
import type { GameType, GameDifficulty } from '@/types/game';

const { Title, Text, Paragraph } = Typography;

export const GameHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { 
    userLevel, 
    statistics, 
    achievements, 
    isLoading, 
    loadStatistics 
  } = useGameStore();
  const { isMobile, isTablet } = useGameResponsive();
  
  const [selectedWordbook, setSelectedWordbook] = useState<number>(1);
  const [selectedGameType, setSelectedGameType] = useState<GameType>('vocabulary-match');
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number>(10);

  // 游戏类型配置
  const gameTypes = [
    {
      type: 'vocabulary-match' as GameType,
      name: '词汇匹配',
      description: '选择单词对应的中文释义',
      icon: '📝',
      difficulty: '简单',
      estimatedTime: 5
    },
    {
      type: 'definition-match' as GameType,
      name: '释义匹配',
      description: '选择单词对应的英文定义',
      icon: '📖',
      difficulty: '中等',
      estimatedTime: 7
    },
    {
      type: 'listening-match' as GameType,
      name: '听力匹配',
      description: '听音选择正确的单词',
      icon: '👂',
      difficulty: '困难',
      estimatedTime: 10
    },
    {
      type: 'spelling-bee' as GameType,
      name: '拼写挑战',
      description: '听音拼写正确的单词',
      icon: '✍️',
      difficulty: '专家',
      estimatedTime: 15
    }
  ];

  const difficulties = [
    { value: 'easy', label: '简单', color: 'green', timeLimit: 20 },
    { value: 'medium' as GameDifficulty, label: '中等', color: 'blue', timeLimit: 15 },
    { value: 'hard' as GameDifficulty, label: '困难', color: 'orange', timeLimit: 10 },
    { value: 'expert' as GameDifficulty, label: '专家', color: 'red', timeLimit: 8 }
  ];

  // 模拟词书数据
  const wordbooks = [
    { id: 1, name: '四级词汇', wordCount: 4500 },
    { id: 2, name: '六级词汇', wordCount: 6000 },
    { id: 3, name: '托福词汇', wordCount: 8000 },
    { id: 4, name: '雅思词汇', wordCount: 7000 }
  ];

  useEffect(() => {
    if (selectedWordbook) {
      loadStatistics(selectedWordbook);
    }
  }, [selectedWordbook, loadStatistics]);

  const handleStartGame = () => {
    navigate('/game/play', {
      state: {
        wordbookId: selectedWordbook,
        gameType: selectedGameType,
        difficulty: selectedDifficulty,
        questionCount
      }
    });
  };

  const getNextMilestone = () => {
    const nextLevelExp = userLevel.nextLevelExperience;
    const currentExp = userLevel.experience;
    const remaining = nextLevelExp - currentExp;
    const progress = (currentExp % 1000) / 1000;
    
    return { remaining, progress, nextLevelExp };
  };

  const milestone = getNextMilestone();
  const selectedGameTypeConfig = gameTypes.find(g => g.type === selectedGameType);
  const selectedDifficultyConfig = difficulties.find(d => d.value === selectedDifficulty);

  return (
    <GameLayout showDeviceInfo={isMobile}>
      {/* 用户信息头部 */}
      <Card style={{ marginBottom: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
        <Row align="middle" gutter={[24, 16]}>
          <Col xs={24} sm={8} md={6}>
            <div style={{ textAlign: 'center', color: 'white' }}>
              <Title level={isMobile ? 3 : 2} style={{ color: 'white', margin: 0 }}>
                {userLevel.title}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                等级 {userLevel.level}
              </Text>
            </div>
          </Col>
          <Col xs={24} sm={16} md={18}>
            <div style={{ color: 'white' }}>
              {isMobile ? (
                // 移动端紧凑布局
                <div>
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <GameStatCard
                        title="经验"
                        value={userLevel.experience}
                        suffix={`/ ${milestone.nextLevelExp}`}
                        color="white"
                      />
                    </Col>
                    <Col span={12}>
                      <GameStatCard
                        title="游戏次数"
                        value={statistics?.totalGames || 0}
                        color="white"
                      />
                    </Col>
                    <Col span={12}>
                      <GameStatCard
                        title="准确率"
                        value={`${Math.round((statistics?.averageAccuracy || 0) * 100)}%`}
                        color="white"
                      />
                    </Col>
                    <Col span={12}>
                      <GameStatCard
                        title="最佳连击"
                        value={statistics?.bestStreak || 0}
                        color="white"
                      />
                    </Col>
                  </Row>
                </div>
              ) : (
                // 桌面端完整布局
                <Row gutter={[16, 8]}>
                  <Col xs={12} sm={6}>
                    <Statistic 
                      title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>经验</span>} 
                      value={userLevel.experience} 
                      valueStyle={{ color: 'white' }}
                      suffix="/ " + milestone.nextLevelExp
                    />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic 
                      title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>游戏次数</span>} 
                      value={statistics?.totalGames || 0} 
                      valueStyle={{ color: 'white' }}
                    />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic 
                      title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>准确率</span>} 
                      value={Math.round((statistics?.averageAccuracy || 0) * 100)} 
                      valueStyle={{ color: 'white' }}
                      suffix="%"
                    />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic 
                      title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>最佳连击</span>} 
                      value={statistics?.bestStreak || 0} 
                      valueStyle={{ color: 'white' }}
                    />
                  </Col>
                </Row>
              )}
              <div style={{ marginTop: 12 }}>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? 12 : 14 }}>
                  距离下一等级还需 {milestone.remaining} 经验值
                </Text>
                <Progress 
                  percent={Math.round(milestone.progress * 100)} 
                  strokeColor="rgba(255,255,255,0.8)"
                  showInfo={false}
                  size="small"
                />
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* 游戏配置 */}
        <Col xs={24} lg={16}>
          <Card title="游戏配置" style={{ height: '100%' }}>
            <Space direction="vertical" size={isMobile ? "middle" : "large"} style={{ width: '100%' }}>
              {/* 选择词书 */}
              <div>
                <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>选择词书</Text>
                <Select
                  value={selectedWordbook}
                  onChange={setSelectedWordbook}
                  style={{ width: '100%', marginTop: 8 }}
                  size={isMobile ? "middle" : "large"}
                >
                  {wordbooks.map(wb => (
                    <Select.Option key={wb.id} value={wb.id}>
                      <Space>
                        <BookOutlined />
                        {wb.name}
                        <Text type="secondary">({wb.wordCount} 词)</Text>
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </div>

              {/* 选择游戏类型 */}
              <div>
                <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>游戏类型</Text>
                <div style={{ marginTop: 8 }}>
                  <GameGrid>
                    {gameTypes.map(game => (
                      <Card
                        key={game.type}
                        size="small"
                        hoverable
                        style={{ 
                          border: selectedGameType === game.type ? '2px solid #1890ff' : '1px solid #d9d9d9',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                        onClick={() => setSelectedGameType(game.type)}
                      >
                        <div>
                          <div style={{ fontSize: isMobile ? 20 : 24, marginBottom: 4 }}>{game.icon}</div>
                          <Text strong style={{ fontSize: isMobile ? 11 : 12 }}>{game.name}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            约 {game.estimatedTime} 分钟
                          </Text>
                        </div>
                      </Card>
                    ))}
                  </GameGrid>
                </div>
              </div>

              {/* 选择难度 */}
              <div>
                <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>难度设置</Text>
                <div style={{ marginTop: 8 }}>
                  <GameGrid>
                    {difficulties.map(diff => (
                      <GameButton
                        key={diff.value}
                        type={selectedDifficulty === diff.value ? 'primary' : 'default'}
                        onClick={() => setSelectedDifficulty(diff.value)}
                        style={{ 
                          borderColor: diff.color,
                          color: selectedDifficulty === diff.value ? 'white' : diff.color,
                          fontSize: isMobile ? 12 : 14
                        }}
                      >
                        <div>
                          <div>{diff.label}</div>
                          <div style={{ fontSize: 10 }}>
                            {diff.timeLimit}秒/题
                          </div>
                        </div>
                      </GameButton>
                    ))}
                  </GameGrid>
                </div>
              </div>

              {/* 题目数量 */}
              <div>
                <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>题目数量</Text>
                <InputNumber
                  min={5}
                  max={50}
                  value={questionCount}
                  onChange={(value) => setQuestionCount(value || 10)}
                  size={isMobile ? "middle" : "large"}
                  style={{ width: '100%', marginTop: 8 }}
                  addonAfter="题"
                />
              </div>

              {/* 开始游戏按钮 */}
              <GameButton
                onClick={handleStartGame}
                loading={isLoading}
                style={{ 
                  height: isMobile ? 48 : 60, 
                  fontSize: isMobile ? 16 : 18,
                  background: 'linear-gradient(45deg, #1890ff, #52c41a)',
                  border: 'none'
                }}
              >
                <Space>
                  <PlayCircleOutlined />
                  开始游戏挑战
                </Space>
              </GameButton>
            </Space>
          </Card>
        </Col>

        {/* 侧边栏：统计和成就 */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 快速统计 */}
            <Card title="快速统计" size="small">
              {isMobile ? (
                <GameGrid>
                  <GameStatCard
                    title="总游戏数"
                    value={statistics?.totalGames || 0}
                    prefix={<PlayCircleOutlined />}
                    color="#1890ff"
                  />
                  <GameStatCard
                    title="完成题目"
                    value={statistics?.totalQuestions || 0}
                    prefix={<BookOutlined />}
                    color="#52c41a"
                  />
                  <GameStatCard
                    title="正确率"
                    value={`${Math.round((statistics?.averageAccuracy || 0) * 100)}%`}
                    prefix={<StarOutlined />}
                    color="#faad14"
                  />
                  <GameStatCard
                    title="最长连击"
                    value={statistics?.bestStreak || 0}
                    prefix={<FireOutlined />}
                    color="#722ed1"
                  />
                </GameGrid>
              ) : (
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic 
                      title="总游戏数" 
                      value={statistics?.totalGames || 0} 
                      valueStyle={{ fontSize: 16 }}
                      prefix={<PlayCircleOutlined />}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="完成题目" 
                      value={statistics?.totalQuestions || 0} 
                      valueStyle={{ fontSize: 16 }}
                      prefix={<BookOutlined />}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="正确率" 
                      value={Math.round((statistics?.averageAccuracy || 0) * 100)} 
                      suffix="%"
                      valueStyle={{ fontSize: 16 }}
                      prefix={<StarOutlined />}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="最长连击" 
                      value={statistics?.bestStreak || 0} 
                      valueStyle={{ fontSize: 16 }}
                      prefix={<FireOutlined />}
                    />
                  </Col>
                </Row>
              )}
            </Card>

            {/* 最近成就 */}
            <Card 
              title={
                <Space>
                  <TrophyOutlined />
                  最近成就
                </Space>
              } 
              size="small"
              extra={<Button type="link" size="small">查看全部</Button>}
            >
              {achievements.length > 0 ? (
                <List
                  size="small"
                  dataSource={achievements.slice(-3)}
                  renderItem={(achievement) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar size="small">{achievement.icon}</Avatar>}
                        title={achievement.name}
                        description={
                          <Space size={4}>
                            <Tag size="small" color={achievement.rarity === 'legendary' ? 'gold' : 'blue'}>
                              {achievement.rarity}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              +{achievement.rewards.experience}经验
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Text type="secondary">还没有获得成就</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    开始游戏来解锁你的第一个成就吧！
                  </Text>
                </div>
              )}
            </Card>

            {/* 操作按钮 */}
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <GameButton block icon={<BarChartOutlined />}>
                  查看详细统计
                </GameButton>
                <GameButton block icon={<TrophyOutlined />}>
                  成就中心
                </GameButton>
                <GameButton block icon={<SettingOutlined />}>
                  游戏设置
                </GameButton>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>

      {/* 游戏类型介绍 */}
      {selectedGameTypeConfig && (
        <Card style={{ marginTop: 24 }} title="游戏说明">
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} sm={6}>
              <div style={{ textAlign: 'center', fontSize: isMobile ? 36 : 48 }}>
                {selectedGameTypeConfig.icon}
              </div>
            </Col>
            <Col xs={24} sm={18}>
              <Title level={4} style={{ margin: 0 }}>
                {selectedGameTypeConfig.name}
              </Title>
              <Paragraph style={{ margin: '8px 0', color: '#666', fontSize: isMobile ? 14 : 16 }}>
                {selectedGameTypeConfig.description}
              </Paragraph>
              <Space size="middle">
                <Tag color="blue">难度: {selectedGameTypeConfig.difficulty}</Tag>
                <Text type="secondary">
                  预计用时: {selectedGameTypeConfig.estimatedTime} 分钟
                </Text>
                {selectedDifficultyConfig && (
                  <Tag color={selectedDifficultyConfig.color}>
                    每题时间: {selectedDifficultyConfig.timeLimit} 秒
                  </Tag>
                )}
              </Space>
            </Col>
          </Row>
        </Card>
      )}
    </GameLayout>
  );
};

export default GameHomePage;