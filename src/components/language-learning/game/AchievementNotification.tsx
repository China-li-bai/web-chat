import React, { useEffect, useState } from 'react';
import { Card, Typography, Space, Tag } from 'antd';
import { 
  TrophyOutlined, 
  StarOutlined, 
  FireOutlined, 
  ThunderboltOutlined,
  CrownOutlined,
  MedalOutlined
} from '@ant-design/icons';
import type { AchievementNotificationProps, Achievement } from '@/types/game';

const { Title, Text } = Typography;

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onClose,
  duration = 5000
}) => {
  const [visible, setVisible] = useState(true);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    // 入场动画
    setAnimationClass('slide-in-right');
    
    const timer = setTimeout(() => {
      // 出场动画
      setAnimationClass('slide-out-right');
      setTimeout(() => {
        setVisible(false);
        onClose();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getRarityConfig = (rarity: string) => {
    const configs = {
      common: {
        color: '#52c41a',
        borderColor: '#b7eb8f',
        bgColor: '#f6ffed',
        icon: <MedalOutlined />,
        textColor: '#389e0d'
      },
      rare: {
        color: '#1890ff',
        borderColor: '#91d5ff',
        bgColor: '#e6f7ff',
        icon: <StarOutlined />,
        textColor: '#096dd9'
      },
      epic: {
        color: '#722ed1',
        borderColor: '#b37feb',
        bgColor: '#f9f0ff',
        icon: <FireOutlined />,
        textColor: '#531dab'
      },
      legendary: {
        color: '#fa8c16',
        borderColor: '#ffd591',
        bgColor: '#fff7e6',
        icon: <CrownOutlined />,
        textColor: '#d46b08'
      }
    };
    return configs[rarity as keyof typeof configs] || configs.common;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      accuracy: <TargetOutlined />,
      speed: <ThunderboltOutlined />,
      streak: <FireOutlined />,
      volume: <BookOutlined />,
      persistence: <CalendarOutlined />,
      milestone: <TrophyOutlined />
    };
    return icons[type as keyof typeof icons] || <TrophyOutlined />;
  };

  // 临时替代图标（避免导入错误）
  const TargetOutlined = () => <span>🎯</span>;
  const BookOutlined = () => <span>📚</span>;
  const CalendarOutlined = () => <span>📅</span>;

  const config = getRarityConfig(achievement.rarity);
  const typeIcon = getTypeIcon(achievement.type);

  if (!visible) return null;

  return (
    <div 
      className={`achievement-notification ${animationClass}`}
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 10000,
        maxWidth: 400,
        animation: animationClass === '' ? 'none' : undefined
      }}
    >
      <Card
        style={{
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          borderWidth: 2,
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }}
        bodyStyle={{ padding: '20px' }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {/* 头部 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space>
              <div style={{ 
                color: config.color, 
                fontSize: 24,
                animation: 'pulse 2s infinite'
              }}>
                {typeIcon}
              </div>
              <Tag color={config.color} style={{ margin: 0 }}>
                {achievement.rarity.toUpperCase()}
              </Tag>
            </Space>
            <div style={{ 
              color: config.color, 
              fontSize: 28,
              animation: 'bounce 1s ease-in-out'
            }}>
              <TrophyOutlined />
            </div>
          </div>

          {/* 成就名称 */}
          <Title level={4} style={{ 
            margin: 0, 
            color: config.textColor,
            textAlign: 'center'
          }}>
            🎉 成就解锁！
          </Title>

          {/* 成就详情 */}
          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ 
              fontSize: 16, 
              color: config.textColor,
              display: 'block',
              marginBottom: 8
            }}>
              {achievement.name}
            </Text>
            <Text style={{ 
              color: config.textColor,
              fontSize: 14,
              display: 'block'
            }}>
              {achievement.description}
            </Text>
          </div>

          {/* 奖励 */}
          {achievement.rewards && (
            <div style={{ 
              backgroundColor: 'rgba(255,255,255,0.6)', 
              borderRadius: 8, 
              padding: '12px',
              marginTop: 12
            }}>
              <Space size="small" wrap>
                {achievement.rewards.experience > 0 && (
                  <Tag icon={<StarOutlined />} color="gold">
                    +{achievement.rewards.experience} 经验
                  </Tag>
                )}
                {achievement.rewards.points > 0 && (
                  <Tag icon={<TrophyOutlined />} color="blue">
                    +{achievement.rewards.points} 积分
                  </Tag>
                )}
                {achievement.rewards.title && (
                  <Tag color="purple">
                    {achievement.rewards.title}
                  </Tag>
                )}
              </Space>
            </div>
          )}
        </Space>
      </Card>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slide-out-right {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .achievement-notification {
          transition: all 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default AchievementNotification;