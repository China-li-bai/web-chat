import React, { memo } from 'react';
import { Modal, Button, Row, Col, Card, Statistic, Typography } from 'antd';
import { TrophyOutlined, ClockCircleOutlined, BookOutlined, FireOutlined, ThunderboltOutlined } from '@ant-design/icons';
import './SessionSummaryModal.css';

const { Text } = Typography;

interface SessionSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  accuracy: number;
  sessionDuration: number;
  totalItems: number;
  summaryCounts: {
    mastered: number;
    shaky: number;
    forgotten: number;
  };
  summaryStats: {
    estimatedRetention: number;
    cognitiveLoad: number;
  } | null;
  onReviewWeakItems: () => void;
  onScheduleNextReview: () => void;
  onContinueLearning: () => void;
  onViewStatistics: () => void;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = memo(({
  visible,
  onClose,
  accuracy,
  sessionDuration,
  totalItems,
  summaryCounts,
  summaryStats,
  onReviewWeakItems,
  onScheduleNextReview,
  onContinueLearning,
  onViewStatistics
}) => {
  // 根据准确率获取颜色
  const getAccuracyColor = () => {
    if (accuracy >= 80) return '#52c41a';
    if (accuracy >= 60) return '#fa8c16';
    return '#ff4d4f';
  };

  // 根据认知负荷获取状态
  const getCognitiveLoadStatus = () => {
    if (!summaryStats) return { text: '-', color: '#8c8c8c' };
    if (summaryStats.cognitiveLoad < 0.6) return { text: '轻松', color: '#52c41a' };
    if (summaryStats.cognitiveLoad < 0.8) return { text: '适中', color: '#fa8c16' };
    return { text: '较高', color: '#ff4d4f' };
  };

  const cognitiveStatus = getCognitiveLoadStatus();

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      title="学习总结"
      footer={null}
      width={600}
      className="session-summary-modal"
      centered
    >
      <div className="summary-content">
        {/* 主要统计数据 */}
        <Row gutter={16} className="summary-stats">
          <Col span={8}>
            <Statistic
              title="准确率"
              value={accuracy}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: getAccuracyColor() }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="用时"
              value={sessionDuration}
              suffix="min"
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="总题数"
              value={totalItems}
              prefix={<BookOutlined />}
            />
          </Col>
        </Row>

        {/* 学习效果指标 */}
        <Row gutter={16} className="summary-metrics">
          <Col span={12}>
            <Card size="small" className="metric-card">
              <div className="metric-header">
                <FireOutlined className="metric-icon" />
                <span className="metric-title">预计保持率</span>
              </div>
              <div className="metric-value">
                {summaryStats ? `${Math.round(summaryStats.estimatedRetention * 100)}%` : '-'}
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" className="metric-card">
              <div className="metric-header">
                <ThunderboltOutlined className="metric-icon" />
                <span className="metric-title">认知负荷</span>
              </div>
              <div className="metric-value" style={{ color: cognitiveStatus.color }}>
                {summaryStats ? Number(summaryStats.cognitiveLoad).toFixed(2) : '-'}
                <span className="metric-status">{cognitiveStatus.text}</span>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 掌握情况分布 */}
        <Row gutter={16} className="summary-distribution">
          <Col span={8}>
            <Card size="small" className="distribution-card mastered">
              <div className="distribution-value">{summaryCounts.mastered}</div>
              <div className="distribution-label">已掌握</div>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" className="distribution-card shaky">
              <div className="distribution-value">{summaryCounts.shaky}</div>
              <div className="distribution-label">生疏</div>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" className="distribution-card forgotten">
              <div className="distribution-value">{summaryCounts.forgotten}</div>
              <div className="distribution-label">遗忘</div>
            </Card>
          </Col>
        </Row>

        {/* 提示信息 */}
        <div className="summary-tip">
          <Text type="secondary" style={{ fontSize: '12px' }}>
            预计保持率基于本次正确率与实际认知负荷估算；实际认知负荷由题目难度、用时与错误率综合计算，建议控制在 0.8 以下。
          </Text>
        </div>

        {/* 操作按钮 */}
        <div className="summary-actions">
          <Button 
            className="action-button secondary" 
            onClick={onReviewWeakItems}
            disabled={summaryCounts.mastered === totalItems}
          >
            立即复习弱项
          </Button>
          <Button 
            className="action-button secondary" 
            onClick={onScheduleNextReview}
          >
            安排下次复习
          </Button>
          <Button 
            className="action-button primary" 
            type="primary" 
            onClick={onContinueLearning}
          >
            继续学习
          </Button>
          <Button 
            className="action-button secondary" 
            onClick={onViewStatistics}
          >
            查看统计
          </Button>
        </div>
      </div>
    </Modal>
  );
});