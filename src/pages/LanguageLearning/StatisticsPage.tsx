import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Spin, Typography, Empty } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getOverallStats, getHeatmapData, getProficiencyStats } from '@/services/statsService';
import type { OverallStats, HeatmapData, ProficiencyData } from '@/services/statsService';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [overall, heatmap, proficiency] = await Promise.all([
          getOverallStats(),
          getHeatmapData(),
          getProficiencyStats(),
        ]);
        setOverallStats(overall);
        setHeatmapData(heatmap);
        setProficiencyData(proficiency);
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>Learning Statistics</Title>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={8}>
          <Card>
            <Title level={4}>Total Words</Title>
            <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>{overallStats.totalWords}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Title level={4}>Mastered Words</Title>
            <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>{overallStats.masteredWords}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Title level={4}>Learning Days</Title>
            <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>{overallStats.learningDays}</Text>
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
    </div>
  );
};

export default StatisticsPage;