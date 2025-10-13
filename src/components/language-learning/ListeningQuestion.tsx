import React, { useCallback } from 'react';
import { Button, Space, Typography } from 'antd';

const { Title } = Typography;

export interface ListeningQuestionProps {
  word: string;
  isFlipped: boolean;
  onFlip: () => void;
  onResult: (ok: boolean) => void;
}

/**
 * 听力题（占位版）
 * - 调用浏览器 SpeechSynthesis 播放
 * - 显示答案后进行评分
 */
export const ListeningQuestion: React.FC<ListeningQuestionProps> = ({ word, isFlipped, onFlip, onResult }) => {
  const speak = useCallback(() => {
    try {
      if ('speechSynthesis' in window && word) {
        const u = new SpeechSynthesisUtterance(word);
        u.lang = 'en-US';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {
      console.error('speak failed', e);
    }
  }, [word]);

  return (
    <div className="listening-card">
      <Title level={3} style={{ textAlign: 'center' }}>听写该单词</Title>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
        <Button onClick={speak}>播放发音</Button>
        <Button onClick={onFlip}>显示答案</Button>
      </div>
      {isFlipped && (
        <div style={{ textAlign: 'center' }}>
          <Title level={4}>{word}</Title>
          <Space>
            <Button danger onClick={() => onResult(false)}>没听出</Button>
            <Button type="primary" onClick={() => onResult(true)}>听出来了</Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default ListeningQuestion;