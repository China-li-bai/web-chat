import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Spin, Typography, Empty, Statistic, DatePicker, Button, Space } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { getOverallStats, getHeatmapData, getProficiencyStats, getLearningStatistics, getWordTypeStatistics } from '@/services/statsService';
import { useAppStore } from '@/store/useAppStore';
import type { OverallStats, HeatmapData, ProficiencyData, LearningStatistics, WordTypeStatistics } from '@/services/statsService';
import { CalendarOutlined, TrophyOutlined, ClockCircleOutlined, BookOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const COLORS = {
  new: '#d1d5db',
  learning: '#60a5fa',
  review: '#22c55e',
  relearning: '#f97316',
};

const StatisticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [proficiencyData, setProficiencyData] = useState<ProficiencyData[]>([]);
  const [learningStats, setLearningStats] = useState<LearningStatistics[]>([]);
  const [wordTypeStats, setWordTypeStats] = useState<WordTypeStatistics[]>([]);
  const [statsDays, setStatsDays] = useState(30);
  const userId = useAppStore((state: any) => state.userId);
  const lastWordbookId = useAppStore((state: any) => state.lastWordbookId);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [overall, heatmap, proficiency, learning, wordType] = await Promise.all([
          getOverallStats(userId),
          getHeatmapData(userId),
          getProficiencyStats(userId),
          getLearningStatistics(userId, statsDays),
          getWordTypeStatistics(userId, statsDays),
        ]);
        setOverallStats(overall);
        setHeatmapData(heatmap);
        setProficiencyData(proficiency);
        setLearningStats(learning);
        setWordTypeStats(wordType);
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [statsDays]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (!overallStats) {
    return <Empty description="No statistics data available." />;
  }

  const formattedProficiencyData = proficiencyData.map(item => ({
    name: item.state.charAt(0).toUpperCase() + item.state.slice(1),
    value: item.count,
    color: COLORS[item.state as keyof typeof COLORS] || '#000000'
  }));

  const plannedTotal = learningStats.reduce((sum, s) => sum + (s.totalReviews || 0), 0);
  const avgRetr = learningStats.length > 0 ? (learningStats.reduce((sum, s) => sum + (s.avgRetrievability || 0), 0) / learningStats.length) : 0;
  const weakDays = learningStats.filter(s => (s.avgRetrievability || 0) < 0.85 || (s.correctRate || 0) < 0.7).length;
  const weakPeriods = learningStats
    .filter(s => (s.avgRetrievability || 0) < 0.85 || (s.correctRate || 0) < 0.7)
    .slice(0, 5);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>Learning Statistics</Title>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Words"
              value={overallStats.totalWords}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Mastered Words"
              value={overallStats.masteredWords}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Learning Days"
              value={overallStats.learningDays}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Accuracy Rate"
              value={overallStats.correctRate}
              suffix="%"
              precision={1}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: overallStats.correctRate >= 80 ? '#52c41a' : overallStats.correctRate >= 60 ? '#fa8c16' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24} md={12}>
          <Card title="Proficiency Distribution">
            {formattedProficiencyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={formattedProficiencyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {formattedProficiencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No proficiency data yet." />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Learning Activity (Last Year)">
            <Empty description="Heatmap chart is under construction." />
          </Card>
        </Col>
      </Row>

      {/* Learning Trends */}
      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24}>
          <Card title="Learning Trends (Last 30 Days)">
            {learningStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={learningStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value, name) => {
                      if (name === 'correctRate') return [`${(value as number * 100).toFixed(1)}%`, 'Accuracy Rate'];
                      if (name === 'avgResponseTime') return [`${(value as number / 1000).toFixed(1)}s`, 'Avg Response Time'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalReviews" fill="#1890ff" name="Total Reviews" />
                  <Line yAxisId="right" type="monotone" dataKey="correctRate" stroke="#52c41a" strokeWidth={2} name="Accuracy Rate" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No learning data yet. Start learning to see your progress!" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Word Type Statistics */}
      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24}>
          <Card title="Performance by Word Type">
            {wordTypeStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={wordTypeStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="wordType" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'correctRate') return [`${(value as number * 100).toFixed(1)}%`, 'Accuracy Rate'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalReviews" fill="#1890ff" name="Total Reviews" />
                  <Bar yAxisId="right" dataKey="correctRate" fill="#52c41a" name="Accuracy Rate" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No word type statistics yet." />
            )}
          </Card>
        </Col>
      </Row>

      {/* Review Plan Overview */}
      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24} md={12}>
          <Card title="复习计划概览">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="近30天复习量" value={plannedTotal} />
              </Col>
              <Col span={8}>
                <Statistic title="平均可回忆率" value={(avgRetr * 100).toFixed(1)} suffix="%" />
              </Col>
              <Col span={8}>
                <Statistic title="弱势天数" value={weakDays} />
              </Col>
            </Row>
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">
                <>弱势判定：平均可回忆率 小於 85% 或 当日正确率 小於 70% </>
              </Text>
            </div>
          </Card>
        </Col>

        {/* Weakness List */}
        <Col xs={24} md={12}>
          <Card title="弱项清单（最近）" extra={
            <Button type="primary" onClick={() => {
              const selectedWordbookId = Number(lastWordbookId) || 0;
              if (!selectedWordbookId) {
                navigate('/language-learning');
              } else {
                navigate(`/learning-session/${selectedWordbookId}`);
              }
            }}>
              开始微复习
            </Button>
          }>
            {weakPeriods.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                {weakPeriods.map((w, idx) => (
                  <Card key={idx} size="small">
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Text strong>{new Date(w.date).toLocaleDateString()}</Text>
                      </Col>
                      <Col>
                        <Space>
                          <Text>正确率 {(w.correctRate * 100).toFixed(0)}%</Text>
                          <Text type="secondary">回忆率 {(w.avgRetrievability * 100).toFixed(0)}%</Text>
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty description="最近暂无弱项记录" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StatisticsPage;