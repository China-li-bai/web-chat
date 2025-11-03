import React from 'react';
import { Card, Button, Progress, Typography, Space, Statistic } from 'antd';
import { BookOutlined, TrophyOutlined, ClockCircleOutlined } from '@ant-design/icons';
import './WordbookCard.css';

const { Paragraph, Text } = Typography;

interface WordbookCardProps {
  name: string;
  description: string | null;
  wordCount: number;
  progress: number;
  masteredCount?: number;
  dueCount?: number;
  lastStudied?: string;
  onStart: () => void;
  isLoading?: boolean;
}

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

const getButtonText = (dueCount: number, progress: number, isLoading?: boolean) => {
  if (isLoading) return 'Loading...';
  if (dueCount > 0) return `Study ${dueCount} words`;
  if (progress === 100) return 'Completed';
  return 'Start Learning';
};

const getButtonDisabled = (dueCount: number, progress: number, isLoading?: boolean) => {
  return (dueCount === 0 && progress === 100) || isLoading;
};

const getProgressColor = (progress: number) => {
  if (progress === 100) return '#52c41a';
  if (progress >= 70) return '#1890ff';
  if (progress >= 40) return '#fa8c16';
  return '#f5222d';
};

export const WordbookCard: React.FC<WordbookCardProps> = React.memo(({
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
  return (
    <Card
      title={name}
      className="wordbook-card"
      bodyStyle={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <div>
        <Paragraph type="secondary" ellipsis={{ rows: 2 }} className="wordbook-description">
          {description || 'No description available.'}
        </Paragraph>
        
        <div className="wordbook-stats">
          <Statistic
            title="Total"
            value={wordCount}
            prefix={<BookOutlined />}
            valueStyle={{ fontSize: '14px' }}
            className="wordbook-statistic"
          />
          <Statistic
            title="Mastered"
            value={masteredCount}
            prefix={<TrophyOutlined />}
            valueStyle={{ fontSize: '14px', color: '#52c41a' }}
            className="wordbook-statistic"
          />
          <Statistic
            title="Due"
            value={dueCount}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ fontSize: '14px', color: dueCount > 0 ? '#fa8c16' : '#8c8c8c' }}
            className="wordbook-statistic"
          />
        </div>
        
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary" className="wordbook-meta">
            Last studied: {formatLastStudied(lastStudied)}
          </Text>
        </Space>
      </div>
      
      <div>
        <Progress 
          percent={Math.round(progress)} 
          size="small" 
          strokeColor={getProgressColor(progress)} 
          className="wordbook-progress"
          format={(percent) => `${percent}%`}
        />
        <Button
          type="primary"
          onClick={onStart}
          className="wordbook-button"
          loading={isLoading}
          disabled={getButtonDisabled(dueCount, progress, isLoading)}
        >
          {getButtonText(dueCount, progress, isLoading)}
        </Button>
      </div>
    </Card>
  );
});

WordbookCard.displayName = 'WordbookCard';