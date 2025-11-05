import React from 'react';
import { Modal, Typography, Space, Row, Col, Progress, Tag, Button, Divider, List, Avatar } from 'antd';
import { 
  TrophyOutlined, 
  StarOutlined, 
  FireOutlined, 
  ThunderboltOutlined,
  CrownOutlined,
  MailOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import type { GameResultModalProps } from '@/types/game';

const { Title, Text, Paragraph } = Typography;

export const GameResultModal: React.FC<GameResultModalProps> = ({
  result,
  achievements,
  statistics,
  onPlayAgain,
  onBackToMenu,
  onViewStatistics
}) => {
  const getGrade = (accuracy: number) => {
    if (accuracy >= 95) return { text: '完美', color: '#52c41a', icon: <CrownOutlined /> };
    if (accuracy >= 85) return { text: '优秀', color: '#1890ff', icon: <TrophyOutlined /> };
    if (accuracy >= 70) return { text: '良好', color: '#faad14', icon: <MailOutlined /> };
    if (accuracy >= 60) return { text: '及格', color: '#fa8c16', icon: <StarOutlined /> };
    return { text: '需要努力', color: '#f5222d', icon: <FireOutlined /> };
  };

  const getRarityIcon = (rarity: string) => {
    const icons = {
      common: <MailOutlined />,
      rare: <StarOutlined />,
      epic: <FireOutlined />,
      legendary: <CrownOutlined />
    };
    return icons[rarity as keyof typeof icons] || <MailOutlined />;
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: '#52c41a',
      rare: '#1890ff',
      epic: '#722ed1',
      legendary: '#fa8c16'
    };
    return colors[rarity as keyof typeof colors] || '#52c41a';
  };

  const grade = getGrade(result.finalAccuracy * 100);
  const accuracyPercent = Math.round(result.finalAccuracy * 100);
  const timeInMinutes = Math.round((new Date(result.endTime).getTime() - new Date(result.startTime).getTime()) / 60000);

  return (
    <Modal
      title={null}
      open={true}
      footer={null}
      width={600}
      style={{ top: 20 }}
      bodyStyle={{ padding: '24px' }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 头部结果展示 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: 48, 
            color: grade.color, 
            marginBottom: 8,
            animation: 'bounce 2s ease-in-out'
          }}>
            {grade.icon}
          </div>
          <Title level={2} style={{ margin: 0, color: grade.color }}>
            {grade.text}
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            本次游戏完成！
          </Text>
        </div>

        {/* 核心数据 */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center', padding: '12px', borderRadius: 8, backgroundColor: '#f5f5f5' }}>
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                {result.totalScore}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>总分数</Text>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center', padding: '12px', borderRadius: 8, backgroundColor: '#f5f5f5' }}>
              <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                {accuracyPercent}%
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>准确率</Text>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center', padding: '12px', borderRadius: 8, backgroundColor: '#f5f5f5' }}>
              <Title level={3} style={{ margin: 0, color: '#faad14' }}>
                {result.maxStreak}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>最大连击</Text>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center', padding: '12px', borderRadius: 8, backgroundColor: '#f5f5f5' }}>
              <Title level={3} style={{ margin: 0, color: '#722ed1' }}>
                {timeInMinutes}m
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>用时</Text>
            </div>
          </Col>
        </Row>

        {/* 详细进度条 */}
        <div>
          <Row gutter={[16, 8]} align="middle">
            <Col xs={24} sm={8}>
              <Text strong>准确率</Text>
            </Col>
            <Col xs={24} sm={16}>
              <Progress 
                percent={accuracyPercent} 
                strokeColor={grade.color}
                format={(percent) => `${percent}%`}
              />
            </Col>
          </Row>
          <Row gutter={[16, 8]} align="middle">
            <Col xs={24} sm={8}>
              <Text strong>题目完成</Text>
            </Col>
            <Col xs={24} sm={16}>
              <Progress 
                percent={Math.round((result.correctAnswers + result.totalQuestions - result.correctAnswers) / result.totalQuestions * 100)}
                strokeColor="#52c41a"
                format={(percent) => `${result.correctAnswers}/${result.totalQuestions}`}
              />
            </Col>
          </Row>
        </div>

        {/* 奖励详情 */}
        {(result.timeBonus > 0 || result.difficultyBonus > 0 || result.speedBonus > 0) && (
          <div style={{ 
            backgroundColor: '#f0f2f5', 
            borderRadius: 8, 
            padding: 16,
            border: '1px solid #d9d9d9'
          }}>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>
              <TrophyOutlined style={{ marginRight: 8 }} />
                  奖励详情
            </Text>
            <Row gutter={[16, 8]}>
              {result.timeBonus > 0 && (
                <Col xs={12} sm={8}>
                  <Tag color="blue" icon={<ThunderboltOutlined />}>
                    时间奖励: +{result.timeBonus}
                  </Tag>
                </Col>
              )}
              {result.difficultyBonus > 0 && (
                <Col xs={12} sm={8}>
                  <Tag color="purple" icon={<FireOutlined />}>
                    难度奖励: +{result.difficultyBonus}
                  </Tag>
                </Col>
              )}
              {result.speedBonus > 0 && (
                <Col xs={12} sm={8}>
                  <Tag color="gold" icon={<StarOutlined />}>
                    速度奖励: +{result.speedBonus}
                  </Tag>
                </Col>
              )}
            </Row>
          </div>
        )}

        {/* 成就展示 */}
        {achievements.length > 0 && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>
              <CrownOutlined style={{ marginRight: 8 }} />
              本次解锁成就 ({achievements.length})
            </Text>
            <List
              size="small"
              dataSource={achievements}
              renderItem={(achievement) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ 
                        backgroundColor: getRarityColor(achievement.rarity),
                        color: 'white'
                      }}>
                        {getRarityIcon(achievement.rarity)}
                      </Avatar>
                    }
                    title={achievement.name}
                    description={achievement.description}
                  />
                  <div>
                    <Tag color={getRarityColor(achievement.rarity)}>
                      {achievement.rarity}
                    </Tag>
                  </div>
                </List.Item>
              )}
            />
          </div>
        )}

        {/* 统计对比 */}
        {statistics && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>
              <BarChartOutlined style={{ marginRight: 8 }} />
              个人统计对比
            </Text>
            <Row gutter={[16, 8]}>
              <Col xs={12}>
                <Text type="secondary">平均准确率</Text>
                <br />
                <Text strong>
                  {Math.round(statistics.averageAccuracy * 100)}% 
                  {result.finalAccuracy > statistics.averageAccuracy ? (
                    <Text type="success" style={{ marginLeft: 4 }}>↑ 超出平均</Text>
                  ) : (
                    <Text type="secondary" style={{ marginLeft: 4 }}>低于平均</Text>
                  )}
                </Text>
              </Col>
              <Col xs={12}>
                <Text type="secondary">平均反应时间</Text>
                <br />
                <Text strong>
                  {Math.round(statistics.averageResponseTime / 1000)}s
                  {result.averageResponseTime < statistics.averageResponseTime ? (
                    <Text type="success" style={{ marginLeft: 4 }}>↑ 更快</Text>
                  ) : (
                    <Text type="secondary" style={{ marginLeft: 4 }}>较慢</Text>
                  )}
                </Text>
              </Col>
            </Row>
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ textAlign: 'center', paddingTop: 16 }}>
          <Space size="middle" wrap>
            <Button 
              type="primary" 
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={onPlayAgain}
              style={{ 
                background: 'linear-gradient(45deg, #1890ff, #52c41a)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
              }}
            >
              再次挑战
            </Button>
            <Button 
              size="large"
              icon={<BarChartOutlined />}
              onClick={onViewStatistics}
            >
              查看统计
            </Button>
            <Button 
              size="large"
              icon={<ShareAltOutlined />}
              onClick={onBackToMenu}
            >
              返回菜单
            </Button>
          </Space>
        </div>
      </Space>

      <style jsx>{`
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0);
          }
          40%, 43% {
            transform: translate3d(0, -15px, 0);
          }
          70% {
            transform: translate3d(0, -7px, 0);
          }
          90% {
            transform: translate3d(0, -3px, 0);
          }
        }
      `}</style>
    </Modal>
  );
};

export default GameResultModal;