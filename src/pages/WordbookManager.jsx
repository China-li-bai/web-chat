import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Row,
  Col,
  Divider,
  Typography,
  Drawer,
  Spin
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ImportOutlined,
  EyeOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { wordbookService } from '../services/wordbookService';

const { Title, Text } = Typography;
const { Option } = Select;

const WordbookManager = () => {
  const [wordbooks, setWordbooks] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingWordbook, setEditingWordbook] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  // 响应式布局配置
  const isMobile = window.innerWidth < 768;

  // 单词本列配置
  const columns = [
    {
      title: '单词本名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color={getCategoryColor(category)}>
          {getCategoryLabel(category)}
        </Tag>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty) => (
        <Tag color={getDifficultyColor(difficulty)}>
          {getDifficultyLabel(difficulty)}
        </Tag>
      ),
    },
    {
      title: '单词数量',
      dataIndex: 'wordCount',
      key: 'wordCount',
      render: (count) => `${count || 0}`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewWords(record)}
          >
            查看单词
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个单词本吗？"
            description="删除后将无法恢复，所有相关单词也会被删除。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 分类标签配置
  const getCategoryColor = (category) => {
    const colors = {
      academic: 'blue',
      exam: 'orange',
      business: 'green',
      daily: 'purple',
      custom: 'gray'
    };
    return colors[category] || 'default';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      academic: '学术',
      exam: '考试',
      business: '商务',
      daily: '日常',
      custom: '自定义'
    };
    return labels[category] || category;
  };

  // 难度标签配置
  const getDifficultyColor = (difficulty) => {
    const colors = {
      beginner: 'green',
      intermediate: 'orange',
      advanced: 'red',
      expert: 'purple'
    };
    return colors[difficulty] || 'default';
  };

  const getDifficultyLabel = (difficulty) => {
    const labels = {
      beginner: '初级',
      intermediate: '中级',
      advanced: '高级',
      expert: '专家'
    };
    return labels[difficulty] || difficulty;
  };

  // 处理操作
  const handleAdd = () => {
    setEditingWordbook(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (wordbook) => {
    setEditingWordbook(wordbook);
    form.setFieldsValue(wordbook);
    setIsModalVisible(true);
  };

  // 加载单词本数据
  useEffect(() => {
    const loadWordbooks = async () => {
      try {
        setLoading(true);
        const data = await wordbookService.getWordbooks();
        setWordbooks(data);
      } catch (error) {
        message.error('加载单词本失败');
      } finally {
        setLoading(false);
      }
    };

    loadWordbooks();
  }, []);

  const handleDelete = async (id) => {
    try {
      const success = await wordbookService.deleteWordbook(id);
      if (success) {
        setWordbooks(prev => prev.filter(wb => wb.id !== id));
        message.success('单词本删除成功');
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleViewWords = (wordbook) => {
    // 这里可以跳转到单词列表页面
    message.info(`查看 ${wordbook.name} 的单词列表`);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingWordbook) {
        const success = await wordbookService.updateWordbook(editingWordbook.id, values);
        if (success) {
          setWordbooks(prev => prev.map(wb => 
            wb.id === editingWordbook.id ? { ...wb, ...values } : wb
          ));
          message.success('单词本更新成功');
        } else {
          message.error('更新失败');
        }
      } else {
        const newWordbook = await wordbookService.createWordbook(values);
        if (newWordbook) {
          setWordbooks(prev => [...prev, newWordbook]);
          message.success('单词本创建成功');
        } else {
          message.error('创建失败');
        }
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
      message.error('操作失败');
    }
  };

  const handleImport = () => {
    // 导入功能实现
    message.info('导入功能开发中...');
  };

  // 移动端抽屉控制
  const showDrawer = () => {
    setIsDrawerVisible(true);
  };

  const onCloseDrawer = () => {
    setIsDrawerVisible(false);
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', minHeight: '100vh' }}>
      {/* 头部区域 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            单词本管理
          </Title>
          <Text type="secondary">
            管理您的单词本，支持导入、编辑和删除操作
          </Text>
        </Col>
        <Col>
          {isMobile ? (
            <Button
              type="primary"
              icon={<MenuOutlined />}
              onClick={showDrawer}
            >
              菜单
            </Button>
          ) : (
            <Space>
              <Button
                type="primary"
                icon={<ImportOutlined />}
                onClick={handleImport}
              >
                导入单词
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新建单词本
              </Button>
            </Space>
          )}
        </Col>
      </Row>

      <Divider />

      {/* 单词本列表 */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={wordbooks}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个单词本`
            }}
            scroll={{ x: 800 }}
          />
        )}
      </Card>

      {/* 新建/编辑模态框 */}
      <Modal
        title={editingWordbook ? '编辑单词本' : '新建单词本'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={isMobile ? '90%' : 600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <Row gutter={16}>
            <Col span={isMobile ? 24 : 12}>
              <Form.Item
                name="name"
                label="单词本名称"
                rules={[{ required: true, message: '请输入单词本名称' }]}
              >
                <Input placeholder="例如：牛津3000" />
              </Form.Item>
            </Col>
            <Col span={isMobile ? 24 : 12}>
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="选择分类">
                  <Option value="academic">学术</Option>
                  <Option value="exam">考试</Option>
                  <Option value="business">商务</Option>
                  <Option value="daily">日常</Option>
                  <Option value="custom">自定义</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入单词本描述"
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={isMobile ? 24 : 12}>
              <Form.Item
                name="difficulty"
                label="难度级别"
                rules={[{ required: true, message: '请选择难度级别' }]}
              >
                <Select placeholder="选择难度">
                  <Option value="beginner">初级</Option>
                  <Option value="intermediate">中级</Option>
                  <Option value="advanced">高级</Option>
                  <Option value="expert">专家</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={isMobile ? 24 : 12}>
              <Form.Item
                name="wordCount"
                label="预计单词数量"
              >
                <Input type="number" placeholder="例如：3000" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select mode="tags" placeholder="添加标签（回车确认）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 移动端抽屉 */}
      <Drawer
        title="操作菜单"
        placement="right"
        onClose={onCloseDrawer}
        open={isDrawerVisible}
        width={280}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            icon={<ImportOutlined />}
            onClick={handleImport}
            block
          >
            导入单词
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              onCloseDrawer();
              handleAdd();
            }}
            block
          >
            新建单词本
          </Button>
        </Space>
      </Drawer>
    </div>
  );
};

export default WordbookManager;