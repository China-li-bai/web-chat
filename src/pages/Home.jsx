import React from 'react';
import { Card, Row, Col, Statistic, Button, Typography, Progress, List } from 'antd';
import {
  SoundOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  FireOutlined,
  PlayCircleOutlined,
  BookOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const Home = () => {
  const navigate = useNavigate();

  // 模拟数据
  const stats = {
    totalSessions: 25,
    totalMinutes: 180,
    averageScore: 85,
    streak: 7
  };

  const recentPractices = [
    { id: 1, topic: '日常对话', score: 88, date: '2024-01-15' },
    { id: 2, topic: '商务英语', score: 82, date: '2024-01-14' },
    { id: 3, topic: '旅游英语', score: 90, date: '2024-01-13' },
    { id: 4, topic: '学术讨论', score: 85, date: '2024-01-12' },
  ];

  const practiceTopics = [
    { title: '日常对话', description: '练习日常生活中的基本对话', difficulty: '初级' },
    { title: '商务英语', description: '提升职场英语交流能力', difficulty: '中级' },
    { title: '旅游英语', description: '掌握旅行中的实用英语', difficulty: '初级' },
    { title: '学术讨论', description: '提高学术环境下的英语表达', difficulty: '高级' },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 欢迎区域 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row align="middle">
          <Col span={16}>
            <Title level={2} style={{ margin: 0 }}>
              <SoundOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
              欢迎回来！
            </Title>
            <Paragraph style={{ fontSize: '16px', marginTop: '8px', marginBottom: '16px' }}>
              继续你的AI口语练习之旅，提升英语表达能力
            </Paragraph>
            <Button 
              type="primary" 
              size="large" 
              icon={<PlayCircleOutlined />}
              onClick={() => navigate('/practice')}
            >
              开始练习
            </Button>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', color: '#1890ff' }}>
              🎯
            </div>
          </Col>
        </Row>
      </Card>

      {/* 统计数据 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总练习次数"
              value={stats.totalSessions}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总练习时长"
              value={stats.totalMinutes}
              suffix="分钟"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均得分"
              value={stats.averageScore}
              suffix="分"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="连续练习"
              value={stats.streak}
              suffix="天"
              prefix={<FireOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 最近练习记录 */}
        <Col xs={24} lg={12}>
          <Card title="最近练习记录" extra={<Button type="link" onClick={() => navigate('/progress')}>查看全部</Button>}>
            <List
              dataSource={recentPractices}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.topic}
                    description={`练习日期: ${item.date}`}
                  />
                  <div>
                    <Progress
                      type="circle"
                      size={50}
                      percent={item.score}
                      format={(percent) => `${percent}分`}
                    />
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 推荐练习主题 */}
        <Col xs={24} lg={12}>
          <Card title="推荐练习主题" extra={<Button type="link" onClick={() => navigate('/practice')}>开始练习</Button>}>
            <List
              dataSource={practiceTopics}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={() => navigate('/practice', { state: { topic: item.title } })}
                    >
                      开始
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={item.title}
                    description={
                      <div>
                        <div>{item.description}</div>
                        <div style={{ marginTop: '4px' }}>
                          <span style={{ 
                            background: item.difficulty === '初级' ? '#f6ffed' : 
                                      item.difficulty === '中级' ? '#fff7e6' : '#fff2f0',
                            color: item.difficulty === '初级' ? '#52c41a' : 
                                   item.difficulty === '中级' ? '#fa8c16' : '#f5222d',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {item.difficulty}
                          </span>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home;