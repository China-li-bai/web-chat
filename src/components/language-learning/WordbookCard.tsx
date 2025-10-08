import React from 'react';
import { Card, Button, Progress, Typography, Space, Statistic, Row, Col } from 'antd';
import { BookOutlined, TrophyOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

interface WordbookCardProps {
  name: string;
  description: string | null;
  wordCount: number;
  progress: number; // A value between 0 and 100
  masteredCount?: number;
  dueCount?: number;
  lastStudied?: string;
  onStart: () => void;
  isLoading?: boolean;
}

export const WordbookCard: React.FC<WordbookCardProps> = ({
  name,
  description,
  wordCount,
  progress,
  masteredCount = 0,
  dueCount = 0,
  lastStudied,
  onStart,
  isLoading,
}) => {
  const formatLastStudied = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card
      title={name}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <div>
        <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: '44px', marginBottom: '12px' }}>
          {description || 'No description available.'}
        </Paragraph>
        
        <Row gutter={8} style={{ marginBottom: '12px' }}>
          <Col span={8}>
            <Statistic
              title="Total"
              value={wordCount}
              prefix={<BookOutlined />}
              valueStyle={{ fontSize: '14px' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Mastered"
              value={masteredCount}
              prefix={<TrophyOutlined />}
              valueStyle={{ fontSize: '14px', color: '#52c41a' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Due"
              value={dueCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ fontSize: '14px', color: dueCount > 0 ? '#fa8c16' : '#8c8c8c' }}
            />
          </Col>
        </Row>
        
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Last studied: {formatLastStudied(lastStudied)}
          </Text>
        </Space>
      </div>
      
      <div style={{ marginTop: '16px' }}>
        <Progress percent={Math.round(progress)} size="small" strokeColor="#1890ff" />
        <Button
          type="primary"
          onClick={onStart}
          style={{ width: '100%', marginTop: '12px' }}
          loading={isLoading}
          disabled={dueCount === 0 && progress === 100}
        >
          {dueCount > 0 ? `Study ${dueCount} words` : progress === 100 ? 'Completed' : 'Start Learning'}
        </Button>
      </div>
    </Card>
  );
};