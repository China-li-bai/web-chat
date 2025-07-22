import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Select,
  Space,
  Typography,
  Progress,
  Tag,
  Tooltip,
  Calendar,
  Badge
} from 'antd';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  FireOutlined,
  BarChartOutlined,
  CalendarOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { Line, Column, Pie } from '@ant-design/plots';
import dayjs from 'dayjs';
import { invoke } from '@tauri-apps/api/tauri';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ProgressPage = () => {
  const [stats, setStats] = useState(null);
  const [practiceRecords, setPracticeRecords] = useState([]);
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'day'), dayjs()]);
  const [selectedTopic, setSelectedTopic] = useState('all');

  // 模拟数据
  const mockStats = {
    totalSessions: 45,
    totalMinutes: 320,
    averageScore: 87,
    streak: 12,
    improvement: 15
  };

  const mockRecords = [
    {
      id: 1,
      date: '2024-01-15',
      topic: '日常对话',
      duration: 15,
      score: 88,
      pronunciation: 85,
      fluency: 90,
      completeness: 92
    },
    {
      id: 2,
      date: '2024-01-14',
      topic: '商务英语',
      duration: 20,
      score: 82,
      pronunciation: 80,
      fluency: 85,
      completeness: 81
    },
    {
      id: 3,
      date: '2024-01-13',
      topic: '旅游英语',
      duration: 12,
      score: 90,
      pronunciation: 92,
      fluency: 88,
      completeness: 90
    },
    {
      id: 4,
      date: '2024-01-12',
      topic: '学术讨论',
      duration: 25,
      score: 85,
      pronunciation: 83,
      fluency: 87,
      completeness: 85
    },
    {
      id: 5,
      date: '2024-01-11',
      topic: '日常对话',
      duration: 18,
      score: 89,
      pronunciation: 87,
      fluency: 91,
      completeness: 89
    }
  ];

  // 生成图表数据
  const generateChartData = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('MM-DD');
      const record = mockRecords.find(r => dayjs(r.date).format('MM-DD') === date);
      last7Days.push({
        date,
        score: record ? record.score : 0,
        duration: record ? record.duration : 0
      });
    }
    return last7Days;
  };

  const chartData = generateChartData();

  // 主题分布数据
  const topicData = [
    { topic: '日常对话', count: 15, percentage: 33.3 },
    { topic: '商务英语', count: 12, percentage: 26.7 },
    { topic: '旅游英语', count: 10, percentage: 22.2 },
    { topic: '学术讨论', count: 8, percentage: 17.8 }
  ];

  // 表格列定义
  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '主题',
      dataIndex: 'topic',
      key: 'topic',
      render: (topic) => {
        const colors = {
          '日常对话': 'blue',
          '商务英语': 'green',
          '旅游英语': 'orange',
          '学术讨论': 'purple'
        };
        return <Tag color={colors[topic]}>{topic}</Tag>;
      }
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => `${duration}分钟`
    },
    {
      title: '总分',
      dataIndex: 'score',
      key: 'score',
      render: (score) => (
        <span style={{ 
          color: score >= 85 ? '#52c41a' : score >= 70 ? '#faad14' : '#f5222d',
          fontWeight: 'bold'
        }}>
          {score}分
        </span>
      )
    },
    {
      title: '发音',
      dataIndex: 'pronunciation',
      key: 'pronunciation',
      render: (score) => (
        <Progress 
          percent={score} 
          size="small" 
          strokeColor={score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#f5222d'}
        />
      )
    },
    {
      title: '流利度',
      dataIndex: 'fluency',
      key: 'fluency',
      render: (score) => (
        <Progress 
          percent={score} 
          size="small" 
          strokeColor={score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#f5222d'}
        />
      )
    },
    {
      title: '完整度',
      dataIndex: 'completeness',
      key: 'completeness',
      render: (score) => (
        <Progress 
          percent={score} 
          size="small" 
          strokeColor={score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#f5222d'}
        />
      )
    }
  ];

  // 日历数据
  const getCalendarData = (value) => {
    const record = mockRecords.find(r => dayjs(r.date).isSame(value, 'day'));
    if (record) {
      return {
        type: record.score >= 85 ? 'success' : record.score >= 70 ? 'warning' : 'error',
        content: `${record.score}分`
      };
    }
    return null;
  };

  const dateCellRender = (value) => {
    const data = getCalendarData(value);
    if (data) {
      return (
        <Tooltip title={`练习得分: ${data.content}`}>
          <Badge status={data.type} text={data.content} />
        </Tooltip>
      );
    }
    return null;
  };

  useEffect(() => {
    // 加载统计数据
    const loadStats = async () => {
      try {
        const result = await invoke('get_learning_stats');
        setStats(result);
      } catch (error) {
        console.error('加载统计数据失败:', error);
        setStats(mockStats);
      }
    };

    loadStats();
    setPracticeRecords(mockRecords);
  }, []);

  // 得分趋势图配置
  const lineConfig = {
    data: chartData,
    xField: 'date',
    yField: 'score',
    point: {
      size: 5,
      shape: 'diamond',
    },
    color: '#1890ff',
    smooth: true,
    yAxis: {
      min: 0,
      max: 100,
    },
  };

  // 练习时长图配置
  const columnConfig = {
    data: chartData,
    xField: 'date',
    yField: 'duration',
    color: '#52c41a',
    columnWidthRatio: 0.6,
  };

  // 主题分布图配置
  const pieConfig = {
    data: topicData,
    angleField: 'count',
    colorField: 'topic',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}%',
    },
    interactions: [
      {
        type: 'element-active',
      },
    ],
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <BarChartOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
        学习进度
      </Title>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总练习次数"
              value={stats?.totalSessions || mockStats.totalSessions}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总练习时长"
              value={stats?.totalMinutes || mockStats.totalMinutes}
              suffix="分钟"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均得分"
              value={stats?.averageScore || mockStats.averageScore}
              suffix="分"
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="连续练习"
              value={stats?.streak || mockStats.streak}
              suffix="天"
              prefix={<FireOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="得分趋势（最近7天）">
            <Line {...lineConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="练习时长（最近7天）">
            <Column {...columnConfig} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="主题分布">
            <Pie {...pieConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="练习日历">
            <Calendar 
              fullscreen={false} 
              dateCellRender={dateCellRender}
              style={{ height: '300px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 练习记录表格 */}
      <Card 
        title="练习记录" 
        extra={
          <Space>
            <Select
              value={selectedTopic}
              onChange={setSelectedTopic}
              style={{ width: 120 }}
            >
              <Option value="all">全部主题</Option>
              <Option value="日常对话">日常对话</Option>
              <Option value="商务英语">商务英语</Option>
              <Option value="旅游英语">旅游英语</Option>
              <Option value="学术讨论">学术讨论</Option>
            </Select>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              format="YYYY-MM-DD"
            />
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={practiceRecords.filter(record => 
            selectedTopic === 'all' || record.topic === selectedTopic
          )}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>
    </div>
  );
};

export default ProgressPage;