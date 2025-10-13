import React, { useState, useEffect, memo } from 'react';
import { Modal, Progress, Button, Card, Typography, Tag, Space, Divider } from 'antd';
import { TrophyOutlined, FireOutlined, BulbOutlined, BookOutlined, StarOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';
import '../../styles/SessionEndFeedback.css';

const { Title, Text, Paragraph } = Typography;

interface SessionEndFeedbackProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  sessionStats: {
    totalItems: number;
    correct: number;
    accuracy: number;
    duration: number;
  };
}

interface FeedbackData {
  level: string;
  title: string;
  description: string;
  suggestions: string[];
  nextSteps: string[];
  achievements: string[];
}

const SessionEndFeedback: React.FC<SessionEndFeedbackProps> = memo(({
  visible,
  onClose,
  onComplete,
  sessionStats
}) => {
  const { theme } = useAppStore();
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);

  // 从sessionStats中解构所需的数据
  const { accuracy, duration: sessionDuration, totalItems, correct: correctItems } = sessionStats;

  // 根据学习表现生成反馈
  useEffect(() => {
    if (visible) {
      generateFeedback();
    }
  }, [visible, accuracy, sessionDuration, totalItems, correctItems]);

  const generateFeedback = () => {
    setLoading(true);
    
    // 模拟异步生成反馈
    setTimeout(() => {
      const data = calculateFeedback();
      setFeedbackData(data);
      setLoading(false);
    }, 800);
  };

  const calculateFeedback = (): FeedbackData => {
    const efficiency = totalItems > 0 ? (correctItems / totalItems) * 100 : 0;
    const speed = sessionDuration > 0 ? totalItems / sessionDuration : 0; // 每分钟处理的项目数
    
    let level: string, title: string, description: string;
    let suggestions: string[] = [];
    let nextSteps: string[] = [];
    let achievements: string[] = [];

    // 根据准确率确定等级
    if (accuracy >= 90) {
      level = 'excellent';
      title = '学习大师！';
      description = '您的表现非常出色，几乎掌握了所有学习内容！';
      achievements = ['准确率超过90%', '学习效率极高', '知识掌握牢固'];
      nextSteps = ['尝试更高难度的内容', '挑战更多学习模式', '分享您的学习经验'];
    } else if (accuracy >= 75) {
      level = 'good';
      title = '表现出色！';
      description = '您已经很好地掌握了大部分学习内容，继续保持！';
      achievements = ['准确率超过75%', '学习效果良好', '知识基础扎实'];
      nextSteps = ['巩固薄弱环节', '增加练习频率', '尝试应用所学知识'];
    } else if (accuracy >= 60) {
      level = 'average';
      title = '稳步前进！';
      description = '您已经掌握了部分内容，还有提升空间，继续努力！';
      achievements = ['完成学习目标', '知识逐步积累', '学习态度积极'];
      nextSteps = ['重点复习错误内容', '放慢学习节奏', '寻求更多学习资源'];
    } else {
      level = 'needsImprovement';
      title = '继续努力！';
      description = '学习是一个过程，每次练习都是进步，不要气馁！';
      achievements = ['坚持完成学习', '勇于面对挑战', '积累学习经验'];
      nextSteps = ['复习基础知识', '调整学习方法', '寻求帮助和指导'];
    }

    // 根据学习速度提供建议
    if (speed < 2) {
      suggestions.push('尝试提高学习速度，减少每个项目的思考时间');
    } else if (speed > 5) {
      suggestions.push('您学习速度很快，确保每个知识点都充分理解');
    }

    // 根据准确率提供建议
    if (accuracy < 70) {
      suggestions.push('建议先复习基础知识，再进行新内容学习');
      suggestions.push('尝试使用更多提示和辅助工具帮助记忆');
    } else if (accuracy >= 85) {
      suggestions.push('可以尝试更高难度的挑战，进一步提升自己');
    }

    // 通用建议
    suggestions.push('定期复习是巩固记忆的关键');
    suggestions.push('结合多种学习方式，提高学习效果');

    // 如果没有特定建议，提供默认建议
    if (suggestions.length === 0) {
      suggestions.push('保持当前学习节奏，继续努力');
      suggestions.push('尝试不同的学习模式，找到最适合自己的方式');
    }

    return {
      level,
      title,
      description,
      suggestions,
      nextSteps,
      achievements
    };
  };

  const getLevelColor = () => {
    if (!feedbackData) return '#1890ff';
    
    switch (feedbackData.level) {
      case 'excellent': return '#52c41a';
      case 'good': return '#1890ff';
      case 'average': return '#fa8c16';
      case 'needsImprovement': return '#ff4d4f';
      default: return '#1890ff';
    }
  };

  const getLevelIcon = () => {
    if (!feedbackData) return <TrophyOutlined />;
    
    switch (feedbackData.level) {
      case 'excellent': return <TrophyOutlined style={{ color: '#52c41a' }} />;
      case 'good': return <StarOutlined style={{ color: '#1890ff' }} />;
      case 'average': return <FireOutlined style={{ color: '#fa8c16' }} />;
      case 'needsImprovement': return <BookOutlined style={{ color: '#ff4d4f' }} />;
      default: return <TrophyOutlined />;
    }
  };

  return (
    <Modal
      title={
        <Space>
          {getLevelIcon()}
          <span>学习反馈</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      centered
      className={`session-feedback-modal ${theme}`}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Progress type="circle" percent={100} status="active" />
          <div style={{ marginTop: 16 }}>正在分析您的学习表现...</div>
        </div>
      ) : feedbackData ? (
        <div className="feedback-content">
          {/* 反馈标题和描述 */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={3} style={{ color: getLevelColor(), marginBottom: 8 }}>
              {feedbackData.title}
            </Title>
            <Paragraph style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
              {feedbackData.description}
            </Paragraph>
          </div>

          {/* 学习统计数据 */}
          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: getLevelColor() }}>
                  {accuracy}%
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>准确率</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {sessionDuration}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>学习时长(分钟)</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {totalItems}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>学习项目</div>
              </div>
            </div>
          </Card>

          {/* 成就标签 */}
          <div style={{ marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 12 }}>
              <TrophyOutlined /> 本次学习成就
            </Title>
            <Space wrap>
              {feedbackData.achievements.map((achievement, index) => (
                <Tag key={index} color="gold" style={{ marginBottom: 8 }}>
                  {achievement}
                </Tag>
              ))}
            </Space>
          </div>

          {/* 学习建议 */}
          <div style={{ marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 12 }}>
              <BulbOutlined /> 个性化建议
            </Title>
            <ul style={{ paddingLeft: 20 }}>
              {feedbackData.suggestions.map((suggestion, index) => (
                <li key={index} style={{ marginBottom: 8, lineHeight: 1.6 }}>
                  <Text>{suggestion}</Text>
                </li>
              ))}
            </ul>
          </div>

          {/* 下一步计划 */}
          <div style={{ marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 12 }}>
              <BookOutlined /> 下一步计划
            </Title>
            <ul style={{ paddingLeft: 20 }}>
              {feedbackData.nextSteps.map((step, index) => (
                <li key={index} style={{ marginBottom: 8, lineHeight: 1.6 }}>
                  <Text>{step}</Text>
                </li>
              ))}
            </ul>
          </div>

          <Divider />

          {/* 操作按钮 */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => {
                // 这里可以添加复习薄弱项的逻辑
                onClose();
                // 可以通过回调通知父组件进行复习薄弱项
              }}
              style={{ marginRight: 8 }}
            >
              复习薄弱项
            </Button>
            <Space>
              <Button onClick={onClose}>
                查看详细统计
              </Button>
              <Button type="primary" onClick={onComplete}>
                查看总结
              </Button>
            </Space>
          </div>
        </div>
      ) : null}
    </Modal>
  );
});

export default SessionEndFeedback;