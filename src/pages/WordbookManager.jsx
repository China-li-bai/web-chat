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
  Spin,
  Upload,
  Steps,
  Alert,
  Progress
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ImportOutlined,
  EyeOutlined,
  MenuOutlined,
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined
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

  // 导入相关状态
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importLoading, setImportLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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

  useEffect(() => {
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

  const handleImport = async (file) => {
    console.log('开始导入文件:', file.name);
    setIsImporting(true);
    setImportProgress(0);
    
    try {
      const text = await file.text();
      console.log('文件内容读取完成，长度:', text.length);
      
      let data;
      let vocabularies = [];
      
      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
        vocabularies = Array.isArray(data) ? data : data.vocabularies || [];
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter(line => line.trim());
        vocabularies = lines.slice(1).map(line => {
          const [word, translation, pronunciation, example] = line.split(',').map(s => s.trim());
          return { word, translation, pronunciation, example };
        });
      } else if (file.name.endsWith('.txt')) {
        const lines = text.split('\n').filter(line => line.trim());
        vocabularies = lines.map(line => {
          const parts = line.split('\t');
          return {
            word: parts[0]?.trim() || '',
            translation: parts[1]?.trim() || '',
            pronunciation: parts[2]?.trim() || '',
            example: parts[3]?.trim() || ''
          };
        });
      }

      console.log('解析出的词汇数量:', vocabularies.length);
      
      if (vocabularies.length === 0) {
        throw new Error('没有找到有效的词汇数据');
      }

      // 创建新的单词本
      const newWordbook = {
        name: file.name.replace(/\.[^/.]+$/, ''),
        description: `从 ${file.name} 导入`,
        category: 'general',
        difficulty: 'beginner',
        source: 'imported',
        isActive: true,
        wordCount: vocabularies.length
      };

      console.log('创建单词本:', newWordbook);
      const createdWordbook = await wordbookService.addWordbook(newWordbook);
      console.log('单词本创建成功:', createdWordbook);

      // 批量导入词汇
      const batchSize = 50;
      let importedCount = 0;
      
      for (let i = 0; i < vocabularies.length; i += batchSize) {
        const batch = vocabularies.slice(i, i + batchSize);
        console.log(`导入批次 ${Math.floor(i/batchSize) + 1}:`, batch.length, '个词汇');
        
        const batchImported = await wordbookService.importVocabulary(createdWordbook.id, batch);
        importedCount += batchImported;
        
        const progress = Math.round((i + batch.length) / vocabularies.length * 100);
        setImportProgress(progress);
        console.log(`导入进度: ${progress}%, 已导入: ${importedCount}/${vocabularies.length}`);
        
        // 给UI一些时间更新
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('导入完成，总计导入:', importedCount, '个词汇');
      
      // 验证数据是否真正保存
      console.log('验证数据保存...');
      const savedWordbooks = await wordbookService.getWordbooks();
      console.log('当前单词本总数:', savedWordbooks.length);
      
      const savedVocabularies = await wordbookService.getVocabularyByWordbook(createdWordbook.id);
      console.log('新单词本中的词汇数量:', savedVocabularies.length);

      message.success(`成功导入 ${importedCount} 个词汇到单词本 "${createdWordbook.name}"`);
      
      // 刷新单词本列表
      await loadWordbooks();
      
    } catch (error) {
      console.error('导入失败:', error);
      message.error(`导入失败: ${error.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleImportModal = () => {
    setIsImportModalVisible(true);
    setImportStep(0);
    setUploadedFile(null);
    setParsedData(null);
    setImportProgress(0);
  };

  // 文件解析函数
  const parseJSONFile = (content) => {
    try {
      const data = JSON.parse(content);
      
      // 支持多种JSON格式
      if (Array.isArray(data)) {
        // 格式1: 直接是词汇数组 [{"word": "hello", "translation": "你好"}, ...]
        return data.map(item => ({
          word: item.word || item.english || item.en || '',
          translation: item.translation || item.chinese || item.cn || item.meaning || '',
          pronunciation: item.pronunciation || item.phonetic || '',
          definition: item.definition || item.def || '',
          example: item.example || item.sentence || '',
          tags: item.tags || []
        }));
      } else if (data.wordbook && Array.isArray(data.wordbook.vocabularies)) {
        // 格式2: 完整单词本格式 {"wordbook": {"name": "...", "vocabularies": [...]}}
        return data.wordbook.vocabularies.map(item => ({
          word: item.word || item.english || item.en || '',
          translation: item.translation || item.chinese || item.cn || item.meaning || '',
          pronunciation: item.pronunciation || item.phonetic || '',
          definition: item.definition || item.def || '',
          example: item.example || item.sentence || '',
          tags: item.tags || []
        }));
      } else if (data.vocabularies && Array.isArray(data.vocabularies)) {
        // 格式3: {"vocabularies": [...]}
        return data.vocabularies.map(item => ({
          word: item.word || item.english || item.en || '',
          translation: item.translation || item.chinese || item.cn || item.meaning || '',
          pronunciation: item.pronunciation || item.phonetic || '',
          definition: item.definition || item.def || '',
          example: item.example || item.sentence || '',
          tags: item.tags || []
        }));
      }
      
      throw new Error('不支持的JSON格式');
    } catch (error) {
      throw new Error(`JSON解析失败: ${error.message}`);
    }
  };

  const parseCSVFile = (content) => {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        throw new Error('CSV文件为空');
      }

      // 解析表头
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const vocabularies = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length < 2) continue; // 至少需要单词和翻译

        const vocab = {
          word: '',
          translation: '',
          pronunciation: '',
          definition: '',
          example: '',
          tags: []
        };

        // 智能匹配列
        headers.forEach((header, index) => {
          const value = values[index] || '';
          const lowerHeader = header.toLowerCase();
          
          if (lowerHeader.includes('word') || lowerHeader.includes('english') || lowerHeader.includes('en')) {
            vocab.word = value;
          } else if (lowerHeader.includes('translation') || lowerHeader.includes('chinese') || lowerHeader.includes('cn') || lowerHeader.includes('meaning')) {
            vocab.translation = value;
          } else if (lowerHeader.includes('pronunciation') || lowerHeader.includes('phonetic')) {
            vocab.pronunciation = value;
          } else if (lowerHeader.includes('definition') || lowerHeader.includes('def')) {
            vocab.definition = value;
          } else if (lowerHeader.includes('example') || lowerHeader.includes('sentence')) {
            vocab.example = value;
          }
        });

        if (vocab.word && vocab.translation) {
          vocabularies.push(vocab);
        }
      }

      if (vocabularies.length === 0) {
        throw new Error('未找到有效的词汇数据');
      }

      return vocabularies;
    } catch (error) {
      throw new Error(`CSV解析失败: ${error.message}`);
    }
  };

  const parseTXTFile = (content) => {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        throw new Error('TXT文件为空');
      }

      const vocabularies = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // 支持多种分隔符: 制表符、空格、冒号、等号
        let word = '', translation = '';
        
        if (trimmedLine.includes('\t')) {
          [word, translation] = trimmedLine.split('\t', 2);
        } else if (trimmedLine.includes(' - ')) {
          [word, translation] = trimmedLine.split(' - ', 2);
        } else if (trimmedLine.includes(': ')) {
          [word, translation] = trimmedLine.split(': ', 2);
        } else if (trimmedLine.includes('=')) {
          [word, translation] = trimmedLine.split('=', 2);
        } else if (trimmedLine.includes(' ')) {
          const parts = trimmedLine.split(' ');
          word = parts[0];
          translation = parts.slice(1).join(' ');
        } else {
          continue; // 跳过无法解析的行
        }

        word = word.trim();
        translation = translation.trim();

        if (word && translation) {
          vocabularies.push({
            word,
            translation,
            pronunciation: '',
            definition: '',
            example: '',
            tags: []
          });
        }
      }

      if (vocabularies.length === 0) {
        throw new Error('未找到有效的词汇数据');
      }

      return vocabularies;
    } catch (error) {
      throw new Error(`TXT解析失败: ${error.message}`);
    }
  };

  // 处理文件上传
  const handleFileUpload = (file) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const supportedFormats = ['json', 'csv', 'txt'];
    
    if (!supportedFormats.includes(fileExtension)) {
      message.error('不支持的文件格式，请上传 JSON、CSV 或 TXT 文件');
      return false;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let parsedVocabularies = [];

        switch (fileExtension) {
          case 'json':
            parsedVocabularies = parseJSONFile(content);
            break;
          case 'csv':
            parsedVocabularies = parseCSVFile(content);
            break;
          case 'txt':
            parsedVocabularies = parseTXTFile(content);
            break;
        }

        setUploadedFile(file);
        setParsedData({
          vocabularies: parsedVocabularies,
          totalCount: parsedVocabularies.length,
          fileType: fileExtension
        });
        setImportStep(1);
        message.success(`成功解析 ${parsedVocabularies.length} 个词汇`);
      } catch (error) {
        message.error(error.message);
      }
    };

    reader.readAsText(file, 'UTF-8');
    return false; // 阻止自动上传
  };

  // 执行导入
  const executeImport = async (wordbookName, category, difficulty) => {
    if (!parsedData) return;

    setImportLoading(true);
    setImportStep(2);

    try {
      console.log('🔍 开始导入过程...');
      console.log('📊 解析的数据:', parsedData);
      
      // 创建新单词本
      console.log('📝 创建新单词本...');
      const newWordbook = await wordbookService.addWordbook({
        name: wordbookName,
        description: `从${parsedData.fileType.toUpperCase()}文件导入`,
        category: category,
        difficulty: difficulty,
        wordCount: parsedData.totalCount,
        isActive: true,
        source: 'custom'
      });
      console.log('✅ 单词本创建成功:', newWordbook);

      // 导入词汇
      let importedCount = 0;
      const batchSize = 50; // 批量导入，每批50个

      for (let i = 0; i < parsedData.vocabularies.length; i += batchSize) {
        const batch = parsedData.vocabularies.slice(i, i + batchSize);
        console.log(`📥 导入批次 ${Math.floor(i/batchSize) + 1}:`, batch.length, '个词汇');
        
        await wordbookService.importVocabulary(newWordbook.id, batch);
        importedCount += batch.length;
        
        console.log(`✅ 已导入 ${importedCount}/${parsedData.totalCount} 个词汇`);
        
        // 更新进度
        const progress = Math.round((importedCount / parsedData.totalCount) * 100);
        setImportProgress(progress);
        
        // 给UI一点时间更新
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('🎉 导入完成，验证数据...');
      
      // 验证导入的数据
      const importedVocabularies = await wordbookService.getVocabularyByWordbook(newWordbook.id);
      console.log('🔍 验证结果 - 导入的词汇数量:', importedVocabularies.length);
      console.log('📋 导入的词汇列表:', importedVocabularies);

      message.success(`成功导入单词本"${wordbookName}"，包含 ${importedCount} 个词汇`);
      
      // 刷新单词本列表
      console.log('🔄 刷新单词本列表...');
      const data = await wordbookService.getWordbooks();
      console.log('📚 刷新后的单词本列表:', data);
      setWordbooks(data);
      
      // 关闭导入Modal
      setIsImportModalVisible(false);
      
    } catch (error) {
      console.error('❌ 导入失败:', error);
      message.error(`导入失败: ${error.message}`);
    } finally {
      setImportLoading(false);
    }
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
                onClick={handleImportModal}
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

      {/* 导入单词本模态框 */}
      <Modal
        title="导入单词本"
        open={isImportModalVisible}
        onCancel={() => {
          setIsImportModalVisible(false);
          setImportStep(0);
          setUploadedFile(null);
          setParsedData(null);
          setImportProgress(0);
        }}
        footer={null}
        width={isMobile ? '95%' : 800}
        destroyOnHidden
      >
        <Steps
          current={importStep}
          style={{ marginBottom: 24 }}
          items={[
            {
              title: '上传文件',
              icon: <UploadOutlined />
            },
            {
              title: '预览确认',
              icon: <FileTextOutlined />
            },
            {
              title: '导入完成',
              icon: <CheckCircleOutlined />
            }
          ]}
        />

        {/* 步骤1: 文件上传 */}
        {importStep === 0 && (
          <div>
            <Alert
              message="支持的文件格式"
              description={
                <div>
                  <p><strong>JSON格式：</strong>支持多种结构，如 {`[{"word": "hello", "translation": "你好"}]`} 或完整单词本格式</p>
                  <p><strong>CSV格式：</strong>第一行为表头，支持 word/english, translation/chinese 等列名</p>
                  <p><strong>TXT格式：</strong>每行一个词汇，支持制表符、空格、冒号等分隔符</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Upload.Dragger
              name="file"
              multiple={false}
              beforeUpload={handleFileUpload}
              showUploadList={false}
              accept=".json,.csv,.txt"
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 JSON、CSV、TXT 格式的单词本文件
              </p>
            </Upload.Dragger>
          </div>
        )}

        {/* 步骤2: 预览确认 */}
        {importStep === 1 && parsedData && (
          <div>
            <Alert
              message={`解析成功！共找到 ${parsedData.totalCount} 个词汇`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Form
              layout="vertical"
              onFinish={(values) => executeImport(values.name, values.category, values.difficulty)}
            >
              <Row gutter={16}>
                <Col span={isMobile ? 24 : 8}>
                  <Form.Item
                    name="name"
                    label="单词本名称"
                    rules={[{ required: true, message: '请输入单词本名称' }]}
                    initialValue={uploadedFile?.name.replace(/\.[^/.]+$/, '') || ''}
                  >
                    <Input placeholder="输入单词本名称" />
                  </Form.Item>
                </Col>
                <Col span={isMobile ? 24 : 8}>
                  <Form.Item
                    name="category"
                    label="分类"
                    rules={[{ required: true, message: '请选择分类' }]}
                    initialValue="custom"
                  >
                    <Select>
                      <Option value="academic">学术</Option>
                      <Option value="exam">考试</Option>
                      <Option value="business">商务</Option>
                      <Option value="daily">日常</Option>
                      <Option value="custom">自定义</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={isMobile ? 24 : 8}>
                  <Form.Item
                    name="difficulty"
                    label="难度级别"
                    rules={[{ required: true, message: '请选择难度级别' }]}
                    initialValue="intermediate"
                  >
                    <Select>
                      <Option value="beginner">初级</Option>
                      <Option value="intermediate">中级</Option>
                      <Option value="advanced">高级</Option>
                      <Option value="expert">专家</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* 词汇预览 */}
              <div style={{ marginBottom: 16 }}>
                <Text strong>词汇预览（前10个）：</Text>
                <div style={{ 
                  maxHeight: 200, 
                  overflowY: 'auto', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: 6, 
                  padding: 12, 
                  marginTop: 8,
                  backgroundColor: '#fafafa'
                }}>
                  {parsedData.vocabularies.slice(0, 10).map((vocab, index) => (
                    <div key={index} style={{ marginBottom: 8, padding: 8, backgroundColor: 'white', borderRadius: 4 }}>
                      <Text strong>{vocab.word}</Text>
                      <Text style={{ marginLeft: 16, color: '#666' }}>{vocab.translation}</Text>
                      {vocab.pronunciation && (
                        <Text style={{ marginLeft: 8, color: '#999', fontSize: '12px' }}>
                          [{vocab.pronunciation}]
                        </Text>
                      )}
                    </div>
                  ))}
                  {parsedData.vocabularies.length > 10 && (
                    <Text type="secondary">... 还有 {parsedData.vocabularies.length - 10} 个词汇</Text>
                  )}
                </div>
              </div>

              <Space>
                <Button onClick={() => setImportStep(0)}>
                  返回上传
                </Button>
                <Button type="primary" htmlType="submit" loading={importLoading}>
                  开始导入
                </Button>
              </Space>
            </Form>
          </div>
        )}

        {/* 步骤3: 导入进度 */}
        {importStep === 2 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Progress
              type="circle"
              percent={importProgress}
              status={importLoading ? 'active' : 'success'}
              style={{ marginBottom: 16 }}
            />
            <div>
              <Text strong>
                {importLoading ? '正在导入中...' : '导入完成！'}
              </Text>
              {parsedData && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    已导入 {Math.round(importProgress / 100 * parsedData.totalCount)} / {parsedData.totalCount} 个词汇
                  </Text>
                </div>
              )}
            </div>
          </div>
        )}
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
            onClick={handleImportModal}
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