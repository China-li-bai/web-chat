import React from 'react';
import { Card, Button, Progress, Typography } from 'antd';

const { Paragraph, Text } = Typography;

interface WordbookCardProps {
  name: string;
  description: string | null;
  wordCount: number;
  progress: number; // A value between 0 and 100
  onStart: () => void;
  isLoading?: boolean;
}

export const WordbookCard: React.FC<WordbookCardProps> = ({
  name,
  description,
  wordCount,
  progress,
  onStart,
  isLoading,
}) => {
  return (
    <Card
      title={name}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <div>
        <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: '44px' }}>
          {description || 'No description available.'}
        </Paragraph>
        <Text type="secondary">{wordCount} words</Text>
      </div>
      <div style={{ marginTop: '16px' }}>
        <Progress percent={Math.round(progress)} size="small" />
        <Button
          type="primary"
          onClick={onStart}
          style={{ width: '100%', marginTop: '16px' }}
          loading={isLoading}
        >
          Start Learning
        </Button>
      </div>
    </Card>
  );
};