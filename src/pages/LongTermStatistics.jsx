
import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Typography, Select, DatePicker, Button, Space, Card, Row, Col, Statistic, Spin, Alert, Drawer, Grid } from 'antd';
import { Line, Area, Bar, Column } from '@ant-design/plots';
import dayjs from 'dayjs';
import { calculateKPIs } from '../utils/statisticsDataGenerator';
import { generateStatisticsFromWordbooks } from '../utils/realStatisticsGenerator';

// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          message="页面加载错误"
          description={
            <div>
              <p>抱歉，页面加载时出现了问题。</p>
              <p>错误信息: {this.state.error?.message || '未知错误'}</p>
              <Button type="primary" onClick={() => window.location.reload()}>
                重新加载
              </Button>
            </div>
          }
          type="error"
          showIcon
        />
      );
    }

    return this.props.children;
  }
}

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

// 辅助函数：获取时间段
const getTimePeriod = (hour) => {
  if (hour >= 6 && hour < 9) return '早晨 (6-9点)';
  if (hour >= 9 && hour < 12) return '上午 (9-12点)';
  if (hour >= 12 && hour < 14) return '中午 (12-14点)';
  if (hour >= 14 && hour < 18) return '下午 (14-18点)';
  if (hour >= 18 && hour < 22) return '晚上 (18-22点)';
  return '深夜 (22-6点)';
};

// 辅助函数：获取星期名称
const getDayName = (day) => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[day] || '未知';
};

// 辅助函数：间隔分组
const getIntervalGroup = (interval) => {
  if (interval <= 1) return '1天';
  if (interval <= 3) return '2-3天';
  if (interval <= 7) return '4-7天';
  if (interval <= 14) return '8-14天';
  if (interval <= 30) return '15-30天';
  return '30天以上';
};

import { wordbookService } from '../services/wordbookService';
import { learningDataService } from '../services/learningDataService';

const LongTermStatistics = () => {
  const [selectedWordbooks, setSelectedWordbooks] = useState([]);
  const [dateRange, setDateRange] = useState([]); // [dayjs, dayjs]
  const [statisticsData, setStatisticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState('overview');
  const [availableWordbooks, setAvailableWordbooks] = useState([]);
  
  // 响应式断点检测
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // 加载真实单词本数据
        const wordbooks = await wordbookService.getWordbooks();
        setAvailableWordbooks(wordbooks.map(wb => ({
          label: wb.name,
          value: wb.id
        })));
        
        // 使用真实数据生成器生成统计信息
        const endDate = dayjs();
        const startDate = endDate.subtract(90, 'day');
        const data = await generateStatisticsFromWordbooks(
          startDate.format('YYYY-MM-DD'),
          endDate.format('YYYY-MM-DD')
        );
        setStatisticsData(data);
        setError(null);
      } catch (err) {
        setError('数据加载失败: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const handleReset = () => {
    setSelectedWordbooks([]);
    setDateRange([]);
  };

  // 移动端筛选抽屉控制
  const toggleFilterDrawer = () => {
    setFilterDrawerVisible(!filterDrawerVisible);
  };

  // 移动端图表切换
  const handleChartTabChange = (tab) => {
    setActiveChartTab(tab);
  };

  // 实时计算KPI数据
  const kpiData = useMemo(() => {
    if (!statisticsData) return {
      totalSessions: 0,
      totalWords: 0,
      averageAccuracy: 0,
      averageInterval: 0,
      memoryStability: 0
    };

    const dateRangeStr = dateRange.length > 0 ? [
      dateRange[0].format('YYYY-MM-DD'),
      dateRange[1].format('YYYY-MM-DD')
    ] : null;

    return calculateKPIs(statisticsData, dateRangeStr, selectedWordbooks);
  }, [statisticsData, dateRange, selectedWordbooks]);

  // 计算学习时间分布数据
  const timeDistributionData = useMemo(() => {
    if (!statisticsData) return [];

    const allRecords = [];
    const wordbooksToShow = selectedWordbooks.length > 0 ? selectedWordbooks : Object.keys(statisticsData);
    const startDate = dateRange.length > 0 ? dateRange[0] : dayjs().subtract(30, 'day');
    const endDate = dateRange.length > 0 ? dateRange[1] : dayjs();

    wordbooksToShow.forEach(wordbookId => {
      const wbData = statisticsData[wordbookId];
      if (!wbData) return;

      wbData.rawRecords.forEach(record => {
        const recordDate = dayjs(record.sessionDate);
        const startTimestamp = startDate.valueOf();
        const endTimestamp = endDate.valueOf();
        const recordTimestamp = recordDate.valueOf();
        
        if (recordTimestamp >= startTimestamp && recordTimestamp <= endTimestamp) {
          allRecords.push({
            ...record,
            wordbook: wbData.wordbookName,
            hour: recordDate.hour(), // 获取小时
            dayOfWeek: recordDate.day(), // 获取星期几 (0-6, 0=周日)
            period: getTimePeriod(recordDate.hour()) // 获取时间段
          });
        }
      });
    });

    // 按时间段统计
    const periodStats = {};
    const hourStats = {};
    const dayStats = {};

    allRecords.forEach(record => {
      // 时间段统计
      periodStats[record.period] = (periodStats[record.period] || 0) + 1;
      
      // 小时统计
      hourStats[record.hour] = (hourStats[record.hour] || 0) + 1;
      
      // 星期统计
      dayStats[record.dayOfWeek] = (dayStats[record.dayOfWeek] || 0) + 1;
    });

    return {
      periodData: Object.keys(periodStats).map(period => ({
        period,
        count: periodStats[period]
      })),
      hourData: Object.keys(hourStats).map(hour => ({
        hour: parseInt(hour),
        count: hourStats[hour]
      })).sort((a, b) => a.hour - b.hour),
      dayData: Object.keys(dayStats).map(day => ({
        day: parseInt(day),
        dayName: getDayName(parseInt(day)),
        count: dayStats[day]
      })).sort((a, b) => a.day - b.day)
    };
  }, [statisticsData, dateRange, selectedWordbooks]);

  // 计算难度间隔分布数据
  const intervalDistributionData = useMemo(() => {
    if (!statisticsData) return [];

    const allRecords = [];
    const wordbooksToShow = selectedWordbooks.length > 0 ? selectedWordbooks : Object.keys(statisticsData);
    const startDate = dateRange.length > 0 ? dateRange[0] : dayjs().subtract(30, 'day');
    const endDate = dateRange.length > 0 ? dateRange[1] : dayjs();

    wordbooksToShow.forEach(wordbookId => {
      const wbData = statisticsData[wordbookId];
      if (!wbData) return;

      wbData.rawRecords.forEach(record => {
        const recordDate = dayjs(record.sessionDate);
        const startTimestamp = startDate.valueOf();
        const endTimestamp = endDate.valueOf();
        const recordTimestamp = recordDate.valueOf();
        
        if (recordTimestamp >= startTimestamp && recordTimestamp <= endTimestamp) {
          allRecords.push({
            ...record,
            wordbook: wbData.wordbookName,
            intervalGroup: getIntervalGroup(record.interval) // 分组间隔
          });
        }
      });
    });

    // 按间隔分组统计
    const intervalStats = {};
    const accuracyByInterval = {};

    allRecords.forEach(record => {
      const group = record.intervalGroup;
      intervalStats[group] = (intervalStats[group] || 0) + 1;
      
      if (!accuracyByInterval[group]) {
        accuracyByInterval[group] = { total: 0, correct: 0 };
      }
      accuracyByInterval[group].total += 1;
      if (record.isCorrect) {
        accuracyByInterval[group].correct += 1;
      }
    });

    return {
      intervalData: Object.keys(intervalStats).map(group => ({
        interval: group,
        count: intervalStats[group],
        accuracy: accuracyByInterval[group] ? 
          (accuracyByInterval[group].correct / accuracyByInterval[group].total) : 0
      })).sort((a, b) => {
        // 按间隔大小排序
        const aNum = parseInt(a.interval.split('-')[0]);
        const bNum = parseInt(b.interval.split('-')[0]);
        return aNum - bNum;
      })
    };
  }, [statisticsData, dateRange, selectedWordbooks]);



  // 生成趋势图数据 - 基于真实统计数据
  const trendData = useMemo(() => {
    if (!statisticsData) return [];

    const data = [];
    const wordbooksToShow = selectedWordbooks.length > 0 ? selectedWordbooks : Object.keys(statisticsData);
    const startDate = dateRange.length > 0 ? dateRange[0] : dayjs().subtract(30, 'day');
    const endDate = dateRange.length > 0 ? dateRange[1] : dayjs();

    wordbooksToShow.forEach(wordbookId => {
      const wbData = statisticsData[wordbookId];
      if (!wbData) return;

      wbData.dailyStats.forEach(stat => {
        const statDate = dayjs(stat.date);
        const startTimestamp = startDate.valueOf();
        const endTimestamp = endDate.valueOf();
        const statTimestamp = statDate.valueOf();
        
        // 修复日期比较逻辑
        if (statTimestamp >= startTimestamp && statTimestamp <= endTimestamp) {
          data.push({
            date: stat.date,
            wordbook: wbData.wordbookName,
            sessions: stat.totalSessions,
            accuracy: stat.accuracy,
            avgInterval: stat.avgInterval,
            avgStability: stat.avgStability
          });
        }
      });
    });

    return data.sort((a, b) => a.date.localeCompare(b.date));
  }, [statisticsData, dateRange, selectedWordbooks]);

  // 趋势图配置 - 学习次数折线图
  const sessionsLineConfig = {
    data: trendData,
    xField: 'date',
    yField: 'sessions',
    seriesField: 'wordbook',
    color: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'],
    point: {
      size: 4,
      shape: 'circle',
    },
    smooth: true,
    yAxis: {
      title: {
        text: '学习次数',
      },
    },
    xAxis: {
      type: 'time',
      tickCount: 5,
    },
    slider: {
      start: 0,
      end: 1,
    },
    tooltip: {
      showMarkers: true,
      formatter: (datum) => {
        return {
          name: datum.wordbook,
          value: `${datum.sessions} 次`,
        };
      },
    },
    interactions: [
      {
        type: 'element-active',
      },
      {
        type: 'brush',
      },
    ],
  };

  // 趋势图配置 - 正确率面积图
  const accuracyAreaConfig = {
    data: trendData,
    xField: 'date',
    yField: 'accuracy',
    seriesField: 'wordbook',
    color: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'],
    areaStyle: {
      fillOpacity: 0.3,
    },
    line: {
      size: 2,
    },
    point: {
      size: 3,
      shape: 'diamond',
    },
    smooth: true,
    yAxis: {
      title: {
        text: '正确率',
      },
      min: 0,
      max: 1,
      label: {
        formatter: (v) => `${(v * 100).toFixed(0)}%`,
      },
    },
    xAxis: {
      type: 'time',
      tickCount: 5,
    },
    slider: {
      start: 0,
      end: 1,
    },
    tooltip: {
      showMarkers: true,
      formatter: (datum) => {
        return {
          name: datum.wordbook,
          value: `${(datum.accuracy * 100).toFixed(1)}%`,
        };
      },
    },
    interactions: [
      {
        type: 'element-active',
      },
      {
        type: 'brush',
      },
    ],
  };

  // 学习时间分布配置 - 时间段柱状图
  const timeDistributionConfig = {
    data: timeDistributionData.periodData || [],
    xField: 'period',
    yField: 'count',
    color: '#1890ff',
    meta: {
      count: {
        alias: '学习次数',
      },
      period: {
        alias: '时间段',
      },
    },
    xAxis: {
      label: {
        autoRotate: false,
      },
    },
    yAxis: {
      title: {
        text: '学习次数',
      },
    },
    tooltip: {
      formatter: (datum) => {
        return {
          name: datum.period,
          value: `${datum.count} 次`,
        };
      },
    },
    interactions: [
      {
        type: 'element-active',
      },
    ],
  };

  // 难度间隔分布配置 - 间隔柱状图
  const intervalDistributionConfig = {
    data: intervalDistributionData.intervalData || [],
    xField: 'interval',
    yField: 'count',
    color: '#52c41a',
    meta: {
      count: {
        alias: '学习次数',
      },
      interval: {
        alias: '间隔天数',
      },
    },
    xAxis: {
      label: {
        autoRotate: false,
      },
    },
    yAxis: {
      title: {
        text: '学习次数',
      },
    },
    tooltip: {
      formatter: (datum) => {
        const accuracyPercent = (datum.accuracy * 100).toFixed(1);
        return {
          name: `${datum.interval} 间隔`,
          value: `${datum.count} 次 (正确率: ${accuracyPercent}%)`,
        };
      },
    },
    interactions: [
      {
        type: 'element-active',
      },
    ],
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Spin size="large" tip="数据加载中..." />
        </Content>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ margin: '24px 16px 0' }}>
          <Alert message="数据加载错误" description={error} type="error" showIcon />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>长期学习统计</Title>
      </Header>
      <Content style={{ margin: '24px 16px 0', overflow: 'initial' }}>
        <div style={{ padding: 24, background: '#fff', minHeight: 360 }}>
          {/* 移动端筛选按钮 */}
          {isMobile && (
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                onClick={toggleFilterDrawer}
                icon={<span>📊</span>}
                style={{ width: '100%' }}
              >
                筛选设置
              </Button>
            </div>
          )}

          {/* 桌面端筛选区域 */}
          {!isMobile && (
            <Space style={{ marginBottom: 24, flexWrap: 'wrap' }}>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: 240 }}
                disabled={loading}
              />
              <Select
                mode="multiple"
                placeholder="选择单词本"
                value={selectedWordbooks}
                onChange={setSelectedWordbooks}
                options={availableWordbooks}
                style={{ minWidth: 200 }}
                disabled={loading}
              />
              <Button onClick={handleReset} disabled={loading}>重置</Button>
            </Space>
          )}

          {/* 移动端筛选抽屉 */}
          <Drawer
            title="筛选设置"
            placement="bottom"
            height={300}
            open={filterDrawerVisible}
            onClose={toggleFilterDrawer}
            maskClosable={true}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>日期范围:</Text>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  style={{ width: '100%', marginTop: 8 }}
                  disabled={loading}
                />
              </div>
              <div>
                <Text strong>单词本选择:</Text>
                <Select
                  mode="multiple"
                  placeholder="选择单词本"
                  value={selectedWordbooks}
                  onChange={setSelectedWordbooks}
                  options={availableWordbooks}
                  style={{ width: '100%', marginTop: 8 }}
                  disabled={loading}
                />
              </div>
              <Button 
                type="primary" 
                onClick={toggleFilterDrawer}
                style={{ width: '100%' }}
              >
                应用筛选
              </Button>
            </Space>
          </Drawer>

          {/* KPI概览卡片 - 移动端优化布局 */}
          <Row gutter={[8, 8]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={12} lg={6}>
              <Card size={isMobile ? "small" : "default"} style={{ height: isMobile ? 80 : 'auto' }}>
                <Statistic
                  title={isMobile ? "次数" : "总学习次数"}
                  value={kpiData.totalSessions}
                  valueStyle={{ 
                    color: '#3f8600',
                    fontSize: isMobile ? '14px' : '24px'
                  }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card size={isMobile ? "small" : "default"} style={{ height: isMobile ? 80 : 'auto' }}>
                <Statistic
                  title={isMobile ? "单词数" : "总学习单词数"}
                  value={kpiData.totalWords}
                  valueStyle={{ 
                    color: '#1890ff',
                    fontSize: isMobile ? '14px' : '24px'
                  }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card size={isMobile ? "small" : "default"} style={{ height: isMobile ? 80 : 'auto' }}>
                <Statistic
                  title={isMobile ? "正确率" : "平均正确率"}
                  value={kpiData.averageAccuracy * 100}
                  suffix="%"
                  precision={1}
                  valueStyle={{ 
                    color: '#cf1322',
                    fontSize: isMobile ? '14px' : '24px'
                  }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card size={isMobile ? "small" : "default"} style={{ height: isMobile ? 80 : 'auto' }}>
                <Statistic
                  title={isMobile ? "间隔" : "平均间隔(天)"}
                  value={kpiData.averageInterval}
                  precision={1}
                  valueStyle={{ 
                    color: '#722ed1',
                    fontSize: isMobile ? '14px' : '24px'
                  }}
                  loading={loading}
                />
              </Card>
            </Col>
          </Row>

          {/* 内存稳定性卡片 */}
          <Row gutter={[8, 8]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <Card size={isMobile ? "small" : "default"}>
                <Statistic
                  title={isMobile ? "稳定度" : "记忆稳定度"}
                  value={kpiData.memoryStability * 100}
                  suffix="%"
                  precision={1}
                  valueStyle={{ 
                    color: '#13c2c2',
                    fontSize: isMobile ? '14px' : '24px'
                  }}
                  loading={loading}
                />
              </Card>
            </Col>
          </Row>

          {/* 移动端图表切换标签 */}
          {isMobile && (
            <div style={{ marginBottom: 16 }}>
              <Space style={{ width: '100%', justifyContent: 'center' }}>
                <Button 
                  type={activeChartTab === 'overview' ? 'primary' : 'default'}
                  onClick={() => handleChartTabChange('overview')}
                >
                  概览
                </Button>
                <Button 
                  type={activeChartTab === 'distribution' ? 'primary' : 'default'}
                  onClick={() => handleChartTabChange('distribution')}
                >
                  分布
                </Button>
                <Button 
                  type={activeChartTab === 'trend' ? 'primary' : 'default'}
                  onClick={() => handleChartTabChange('trend')}
                >
                  趋势
                </Button>
              </Space>
            </div>
          )}

          {/* 图表区域 - 移动端按标签切换，桌面端同时显示 */}
          {(!isMobile || activeChartTab === 'distribution') && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={12}>
                <Card title="学习时间分布" style={{ height: isMobile ? 300 : 400 }}>
                  {timeDistributionData.periodData && timeDistributionData.periodData.length > 0 ? (
                    <Bar {...timeDistributionConfig} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Typography.Text type="secondary">
                        暂无数据
                      </Typography.Text>
                    </div>
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="难度间隔分布" style={{ height: isMobile ? 300 : 400 }}>
                  {intervalDistributionData.intervalData && intervalDistributionData.intervalData.length > 0 ? (
                    <Column {...intervalDistributionConfig} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Typography.Text type="secondary">
                        暂无数据
                      </Typography.Text>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          )}

          {(!isMobile || activeChartTab === 'trend') && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={12}>
                <Card title="学习次数趋势" style={{ height: isMobile ? 300 : 400 }}>
                  <Line {...sessionsLineConfig} />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="正确率趋势" style={{ height: isMobile ? 300 : 400 }}>
                  <Area {...accuracyAreaConfig} />
                </Card>
              </Col>
            </Row>
          )}

          {/* 概览区域 - 仅移动端显示 */}
          {isMobile && activeChartTab === 'overview' && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24}>
                <Card title="学习概览">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>总学习次数:</Text>
                      <Text strong>{kpiData.totalSessions}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>总学习单词数:</Text>
                      <Text strong>{kpiData.totalWords}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>平均正确率:</Text>
                      <Text strong>{(kpiData.averageAccuracy * 100).toFixed(1)}%</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>平均间隔:</Text>
                      <Text strong>{kpiData.averageInterval.toFixed(1)}天</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>记忆稳定度:</Text>
                      <Text strong>{(kpiData.memoryStability * 100).toFixed(1)}%</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          )}

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <p>已选择单词本: {selectedWordbooks.length > 0 ? selectedWordbooks.map(wb => 
              availableWordbooks.find(mwb => mwb.value === wb)?.label || wb).join(', ') : '全部'}</p>
            <p>已选择日期范围: {dateRange.length > 0 ? `${dateRange[0].format('YYYY-MM-DD')} ~ ${dateRange[1].format('YYYY-MM-DD')}` : '最近30天'}</p>
            <p>数据统计: 共 {Object.keys(statisticsData || {}).length} 个单词本，{kpiData.totalSessions} 次学习记录</p>
          </div>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>AI Speech Practice ©2024 Created by Your Name</Footer>
    </Layout>
  );
};

const LongTermStatisticsWithBoundary = () => (
  <ErrorBoundary>
    <LongTermStatistics />
  </ErrorBoundary>
);

export default LongTermStatisticsWithBoundary;