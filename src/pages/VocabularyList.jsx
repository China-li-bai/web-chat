import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Input,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  message,
  Row,
  Col,
  Typography,
  Select,
  Divider,
  Spin
} from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { wordbookService } from '../services/wordbookService';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const VocabularyList = ({ wordbookId }) => {
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [filteredWords, setFilteredWords] = useState([]);
  const [form] = Form.useForm();
  const [currentWordbook, setCurrentWordbook] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const wordbook = await wordbookService.getWordbookById(wordbookId);
        setCurrentWordbook(wordbook);
        
        // 模拟词汇数据 - 后续替换为真实API
        const mockVocabulary = [
          { id: '1', wordbookId, word: 'abandon', pronunciation: '/əˈbændən/', meaning: '放弃，抛弃', difficulty: 0.3, masteryLevel: 0.8 },
          { id: '2', wordbookId, word: 'ability', pronunciation: '/əˈbɪləti/', meaning: '能力，才能', difficulty: 0.2, masteryLevel: 0.9 },
          { id: '3', wordbookId, word: 'abroad', pronunciation: '/əˈbrɔːd/', meaning: '在国外，到国外', difficulty: 0.4, masteryLevel: 0.7 },
          { id: '4', wordbookId, word: 'absence', pronunciation: '/ˈæbsəns/', meaning: '缺席，不在场', difficulty: 0.5, masteryLevel: 0.6 },
          { id: '5', wordbookId, word: 'absolute', pronunciation: '/ˈæbsəluːt/', meaning: '绝对的，完全的', difficulty: 0.7, masteryLevel: 0.5 },
        ];
        setVocabulary(mockVocabulary);
      } catch (error) {
        message.error('加载单词本数据失败');
      } finally {
        setLoading(false);
      }
    };

    if (wordbookId) {
      loadData();
    }
  }, [wordbookId]);

  useEffect(() => {
    if (vocabulary.length > 0) {
      setFilteredWords(
        vocabulary.filter(word => 
          word.word.toLowerCase().includes(searchText.toLowerCase()) ||
          word.meaning.toLowerCase().includes(searchText.toLowerCase())
        )
      );
    }
  }, [vocabulary, searchText]);

  const columns = [
    {
      title: '单词',
      dataIndex: 'word',
      key: 'word',
      width: 120,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '音标',
      dataIndex: 'pronunciation',
      key: 'pronunciation',
      width: 100,
      render: (text) => <Text type="secondary">{text}</Text>,
    },
    {
      title: '释义',
      dataIndex: 'meaning',
      key: 'meaning',
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (difficulty) => (
        <Tag color={getDifficultyColor(difficulty)}>
          {Math.round(difficulty * 100)}%
        </Tag>
      ),
    },
    {
      title: '掌握度',
      dataIndex: 'masteryLevel',
      key: 'masteryLevel',
      width: 100,
      render: (level) => (
        <Tag color={getMasteryColor(level)}>
          {getMasteryLabel(level)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const getDifficultyColor = (difficulty) => {
    if (difficulty < 0.3) return 'green';
    if (difficulty < 0.6) return 'orange';
    return 'red';
  };

  const getMasteryColor = (level) => {
    if (level < 0.3) return 'red';
    if (level < 0.6) return 'orange';
    if (level < 0.8) return 'blue';
    return 'green';
  };

  const getMasteryLabel = (level) => {
    if (level < 0.3) return '未掌握';
    if (level < 0.6) return '一般';
    if (level < 0.8) return '良好';
    return '精通';
  };

  const handleAdd = () => {
    setEditingWord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (word) => {
    setEditingWord(word);
    form.setFieldsValue(word);
    setIsModalVisible(true);
  };

  const handleDelete = (wordId) => {
    // 模拟删除操作 - 后续替换为真实API
    setVocabulary(prev => prev.filter(word => word.id !== wordId));
    message.success('单词删除成功');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingWord) {
        // 模拟更新操作
        setVocabulary(prev => prev.map(word => 
          word.id === editingWord.id ? { ...word, ...values } : word
        ));
        message.success('单词更新成功');
      } else {
        // 模拟添加操作
        const newWord = {
          id: Date.now().toString(),
          ...values,
          wordbookId: wordbookId
        };
        setVocabulary(prev => [...prev, newWord]);
        message.success('单词添加成功');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!currentWordbook) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Text type="secondary">请选择有效的单词本</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            {currentWordbook.name} - 单词列表
          </Title>
          <Text type="secondary">
            共 {filteredWords.length} 个单词
          </Text>
        </Col>
        <Col>
          <Space>
            <Search
              placeholder="搜索单词或释义"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加单词
            </Button>
          </Space>
        </Col>
      </Row>

      <Divider />

      <Card>
        <Table
          columns={columns}
          dataSource={filteredWords}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个单词`
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      <Modal
        title={editingWord ? '编辑单词' : '添加单词'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="word"
                label="单词"
                rules={[{ required: true, message: '请输入单词' }]}
              >
                <Input placeholder="例如：abandon" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="pronunciation"
                label="音标"
              >
                <Input placeholder="例如：/əˈbændən/" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="meaning"
            label="释义"
            rules={[{ required: true, message: '请输入释义' }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="例如：放弃，抛弃"
            />
          </Form.Item>
          
          <Form.Item
            name="example"
            label="例句"
          >
            <Input.TextArea
              rows={2}
              placeholder="例如：He decided to abandon his studies and travel the world."
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="difficulty"
                label="难度"
                initialValue={0.5}
              >
                <Select>
                  <Option value={0.2}>简单 (20%)</Option>
                  <Option value={0.5}>中等 (50%)</Option>
                  <Option value={0.7}>困难 (70%)</Option>
                  <Option value={0.9}>专家 (90%)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tags"
                label="标签"
              >
                <Select mode="tags" placeholder="添加标签" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default VocabularyList;