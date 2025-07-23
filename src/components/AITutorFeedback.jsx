import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Tag,
  Button,
  Alert,
  Progress,
  Divider,
  List,
  Avatar,
  Spin,
  Modal,
  Rate
} from 'antd';
import {
  RobotOutlined,
  HeartOutlined,
  BulbOutlined,
  TrophyOutlined,
  FireOutlined,
  StarOutlined,
  ThunderboltOutlined,
  SmileOutlined,
  LikeOutlined,
  DislikeOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';

const { Title, Text, Paragraph } = Typography;

const AITutorFeedback = ({ 
  userPerformance, 
  practiceContext, 
  onFeedbackReceived,
  visible = true 
}) => {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    if (userPerformance && practiceContext && visible) {
      generateFeedback();
    }
  }, [userPerformance, practiceContext, visible]);

  const generateFeedback = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_ai_tutor_feedback', {
        userPerformance,
        practiceContext
      });
      
      setFeedback(result);
      if (onFeedbackReceived) {
        onFeedbackReceived(result);
      }
    } catch (error) {
      console.error('Failed to get AI feedback:', error);
      // 顯示備用反饋
      setFeedback({
        encouragement: "很棒的練習！每一次嘗試都是進步的開始。",
        specific_feedback: "您的努力很值得讚賞，繼續保持這種學習態度。",
        improvement_tips: [
          "每天堅持練習15分鐘",
          "注意語音語調的變化",
          "多聽母語者的發音"
        ],
        next_challenge: "嘗試挑戰更複雜的對話場景",
        motivation_level: "high",
        difficulty_adjustment: "maintain"
      });
    } finally {
      setLoading(false);
    }
  };

  const getMotivationIcon = (level) => {
    switch (level) {
      case 'high':
        return <FireOutlined style={{ color: '#ff4d4f' }} />;
      case 'medium':
        return <ThunderboltOutlined style={{ color: '#faad14' }} />;
      case 'low':
        return <HeartOutlined style={{ color: '#52c41a' }} />;
      default:
        return <SmileOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getMotivationColor = (level) => {
    switch (level) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#1890ff';
    }
  };

  const getDifficultyAdjustmentText = (adjustment) => {
    switch (adjustment) {
      case 'increase': return '建議提升難度';
      case 'decrease': return '建議降低難度';
      case 'maintain': return '保持當前難度';
      default: return '保持當前難度';
    }
  };

  const getDifficultyAdjustmentColor = (adjustment) => {
    switch (adjustment) {
      case 'increase': return 'success';
      case 'decrease': return 'warning';
      case 'maintain': return 'processing';
      default: return 'default';
    }
  };

  const handleFeedbackRating = (rating) => {
    setFeedbackRating(rating);
    setShowRatingModal(false);
    
    // 這裡可以將評分發送到後端進行分析
    console.log('Feedback rating:', rating);
  };

  const savePracticeRecord = async () => {
    try {
      await invoke('save_practice_record', {
        topic: practiceContext,
        scores: userPerformance,
        feedback: JSON.stringify(feedback)
      });
      
      Modal.success({
        title: '練習記錄已保存',
        content: '您的練習數據已成功保存，可在進度頁面查看詳細統計。',
      });
    } catch (error) {
      console.error('Failed to save practice record:', error);
      Modal.error({
        title: '保存失敗',
        content: '練習記錄保存失敗，請稍後重試。',
      });
    }
  };

  if (!visible) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <RobotOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <div style={{ marginTop: '8px' }}>AI導師正在分析您的表現...</div>
          </div>
        </div>
      </Card>
    );
  }

  if (!feedback) {
    return null;
  }

  return (
    <Card>
      <div style={{ marginBottom: '16px' }}>
        <Title level={4}>
          <RobotOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          AI導師反饋
          <Tag 
            color={getMotivationColor(feedback.motivation_level)} 
            style={{ marginLeft: '8px' }}
          >
            {getMotivationIcon(feedback.motivation_level)}
            {feedback.motivation_level === 'high' ? '高度激勵' : 
             feedback.motivation_level === 'medium' ? '適度鼓勵' : '溫和支持'}
          </Tag>
        </Title>
      </div>

      {/* 鼓勵性話語 */}
      <Alert
        message={feedback.encouragement}
        type="success"
        showIcon
        icon={<TrophyOutlined />}
        style={{ marginBottom: '16px' }}
      />

      {/* 具體反饋 */}
      <Card size="small" title="詳細分析" style={{ marginBottom: '16px' }}>
        <Paragraph>{feedback.specific_feedback}</Paragraph>
      </Card>

      {/* 改進建議 */}
      <Card size="small" title="改進建議" style={{ marginBottom: '16px' }}>
        <List
          size="small"
          dataSource={feedback.improvement_tips}
          renderItem={(tip, index) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar 
                    size="small" 
                    style={{ backgroundColor: '#1890ff' }}
                  >
                    {index + 1}
                  </Avatar>
                }
                description={tip}
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 下一步挑戰 */}
      <Card size="small" title="下一步挑戰" style={{ marginBottom: '16px' }}>
        <Alert
          message={feedback.next_challenge}
          type="info"
          showIcon
          icon={<BulbOutlined />}
        />
      </Card>

      {/* 難度調整建議 */}
      <div style={{ marginBottom: '16px' }}>
        <Text strong>難度調整建議：</Text>
        <Tag 
          color={getDifficultyAdjustmentColor(feedback.difficulty_adjustment)}
          style={{ marginLeft: '8px' }}
        >
          {getDifficultyAdjustmentText(feedback.difficulty_adjustment)}
        </Tag>
      </div>

      <Divider />

      {/* 操作按鈕 */}
      <Space>
        <Button type="primary" onClick={savePracticeRecord}>
          <StarOutlined /> 保存練習記錄
        </Button>
        <Button onClick={() => setShowRatingModal(true)}>
          為反饋評分
        </Button>
        <Button onClick={generateFeedback} loading={loading}>
          重新生成反饋
        </Button>
      </Space>

      {/* 反饋評分模態框 */}
      <Modal
        title="為AI導師反饋評分"
        open={showRatingModal}
        onCancel={() => setShowRatingModal(false)}
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Paragraph>您覺得這次的AI導師反饋如何？</Paragraph>
          <Rate
            allowHalf
            value={feedbackRating}
            onChange={handleFeedbackRating}
            style={{ fontSize: '24px' }}
          />
          <div style={{ marginTop: '16px' }}>
            <Space>
              <Button 
                icon={<LikeOutlined />} 
                onClick={() => handleFeedbackRating(5)}
              >
                很有幫助
              </Button>
              <Button 
                icon={<DislikeOutlined />} 
                onClick={() => handleFeedbackRating(2)}
              >
                需要改進
              </Button>
            </Space>
          </div>
        </div>
      </Modal>

      {/* 使用提示 */}
      <Alert
        message="💡 小提示"
        description="AI導師會根據您的表現動態調整反饋風格和難度建議，就像真正的私人教師一樣！定期練習能讓AI更好地了解您的學習模式。"
        type="info"
        style={{ marginTop: '16px' }}
        closable
      />
    </Card>
  );
};

export default AITutorFeedback;