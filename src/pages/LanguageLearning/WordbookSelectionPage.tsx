import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordbookCard } from '@/components/language-learning/WordbookCard';
import { seedInitialData, getAllWordbooksWithStats, importWordbook, checkWordbookExists, type WordbookWithStats } from '@/services/wordbookService';
import { initializeDatabase } from '@/services/dataInitService';
import { useAppStore } from '@/store/useAppStore';
import { Button, Row, Col, Typography, Space, Spin, Empty, message, App, Modal, Form, Input, Select, InputNumber } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const WordbookSelectionPage: React.FC = () => {
  const [wordbooks, setWordbooks] = useState<WordbookWithStats[]>([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const userId = useAppStore((state) => state.userId);

  // AI 生成相关状态
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiForm] = Form.useForm();

  // 引入 AI 统一生成并导入
  // 延后导入声明，避免循环依赖风险（实际为静态导入，保持简单）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type _Keep = void;

  const loadWordbooks = async () => {
    try {
      setIsLoading(true);
      const books = await getAllWordbooksWithStats(userId);
      setWordbooks(books);
    } catch (error) {
      console.error("Failed to load wordbooks:", error);
      messageApi.error('Failed to load wordbooks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    (async () => {
      // initializeDatabase 统一在 LanguageLearning 首次进入时做，避免并发初始化
      await seedInitialData(userId);
      await loadWordbooks();
    })();
  }, [userId]);

  const handleStartLearning = (wordbookId: number) => {
    navigate(`/learning-session/${wordbookId}`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleOpenAiModal = () => {
    setAiModalOpen(true);
  };

  const handleCloseAiModal = () => {
    if (!aiLoading) setAiModalOpen(false);
  };
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) {
        messageApi.error('Could not read file content.');
        return;
      }

      let data;
      try {
        data = JSON.parse(content);
      } catch (error) {
        messageApi.error('Invalid JSON file.');
        return;
      }

      const bookName = data.name;
      if (!bookName) {
        messageApi.error('Invalid import file: "name" field is missing.');
        return;
      }

      const proceedWithImport = async () => {
        try {
          const result = await importWordbook(content, userId);
          if (result.status === 'created') {
            messageApi.success(`Wordbook "${bookName}" imported successfully!`);
          } else {
            messageApi.success(`Wordbook "${bookName}" updated successfully!`);
          }
          await loadWordbooks(); // Refresh the list
        } catch (error: any) {
          console.error('Failed to import wordbook:', error);
          messageApi.error(`Import failed: ${error.message}`);
        }
      };

      try {
        const exists = await checkWordbookExists(bookName);
        if (exists) {
          Modal.confirm({
            title: 'Confirm Overwrite',
            content: `A wordbook named "${bookName}" already exists. Do you want to overwrite it?`,
            onOk: proceedWithImport,
            onCancel() {
              console.log('Import cancelled by user.');
            },
          });
        } else {
          await proceedWithImport();
        }
      } catch (error: any) {
        console.error('Failed to check wordbook existence:', error);
        messageApi.error(`Error: ${error.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // 提交 AI 生成
  const handleAiGenerate = async (values: any) => {
    const { name, topic, targetLanguage, level, wordCount, description } = values || {};
    if (!name || !String(name).trim()) {
      messageApi.error('Please input a valid name');
      return;
    }

    const options = {
      name: String(name).trim(),
      topic: topic ? String(topic).trim() : undefined,
      targetLanguage: targetLanguage ? String(targetLanguage).trim() : 'English',
      level: level || 'intermediate',
      wordCount: Number(wordCount || 50),
      description: description ? String(description).trim() : undefined,
    };

    const proceed = async () => {
      try {
        setAiLoading(true);
        const { generateAndImportWordbookUnified } = await import('@/services/wordbookAIService');
        await generateAndImportWordbookUnified(options as any, userId);
        messageApi.success(`Wordbook "${options.name}" generated successfully!`);
        setAiModalOpen(false);
        aiForm.resetFields();
        await loadWordbooks();
      } catch (e: any) {
        console.error('AI generate/import failed:', e);
        messageApi.error(String(e?.message || 'AI generate failed'));
      } finally {
        setAiLoading(false);
      }
    };

    try {
      const exists = await checkWordbookExists(options.name);
      if (exists) {
        Modal.confirm({
          title: 'Confirm Overwrite',
          content: `A wordbook named "${options.name}" already exists. Do you want to overwrite it?`,
          onOk: proceed,
        });
      } else {
        await proceed();
      }
    } catch (e: any) {
      console.error('checkWordbookExists failed:', e);
      messageApi.error(String(e?.message || 'Check wordbook failed'));
    }
  };

  return (
    <>
      {contextHolder}
      <div style={{ padding: '24px', background: '#f0f2f5', minHeight: 'calc(100vh - 48px)' }}>
        <div style={{ background: '#fff', padding: '16px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f0f0f0' }}>
          <div>
            <Title level={2} style={{ margin: 0, marginBottom: '4px' }}>Wordbooks</Title>
            <Text type="secondary">Choose a wordbook to start your learning session.</Text>
          </div>
          <Space>
            <Button type="primary" icon={<UploadOutlined />} onClick={handleImportClick}>
              Import Wordbook
            </Button>
            <Button onClick={handleOpenAiModal}>
              AI Generate
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept=".json"
            />
          </Space>
        </div>
        <main>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
          </div>
        ) : wordbooks.length > 0 ? (
          <Row gutter={[16, 16]}>
            {wordbooks.map((book) => (
              <Col xs={24} sm={12} md={8} lg={6} key={book.id}>
                <WordbookCard
                  name={book.name}
                  description={book.description}
                  wordCount={book.wordCount}
                  progress={book.progress}
                  masteredCount={book.masteredCount}
                  dueCount={book.dueCount}
                  lastStudied={book.lastStudied}
                  onStart={() => handleStartLearning(book.id)}
                />
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="No wordbooks found. Try importing one to get started." />
        )}
        </main>
      </div>

      {/* AI 生成词书表单 Modal */}
      <Modal
        title="AI Generate Wordbook"
        open={aiModalOpen}
        onCancel={handleCloseAiModal}
        onOk={() => aiForm.submit()}
        okText={aiLoading ? 'Generating...' : 'Generate'}
        confirmLoading={aiLoading}
        destroyOnClose
      >
        <Form
          form={aiForm}
          layout="vertical"
          initialValues={{ level: 'intermediate', wordCount: 50, targetLanguage: 'English' }}
          onFinish={handleAiGenerate}
          onFinishFailed={() => messageApi.error('Please complete required fields')}
        >
          <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Please input name' }]}>
            <Input placeholder="e.g., Travel English Starter" />
          </Form.Item>
          <Form.Item label="Topic" name="topic">
            <Input placeholder="e.g., Travel, Business, IT" />
          </Form.Item>
          <Form.Item label="Target Language" name="targetLanguage">
            <Input placeholder="e.g., English, Chinese" />
          </Form.Item>
          <Form.Item label="Level" name="level">
            <Select
              options={[
                { label: 'Beginner', value: 'beginner' },
                { label: 'Intermediate', value: 'intermediate' },
                { label: 'Advanced', value: 'advanced' },
                { label: 'CET4', value: 'cet4' },
                { label: 'CET6', value: 'cet6' },
                { label: 'SAT', value: 'sat' },
                { label: 'GMAT', value: 'gmat' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Word Count" name="wordCount" rules={[{ type: 'number', min: 10, max: 200 }]}>
            <InputNumber min={10} max={200} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <TextArea rows={3} placeholder="Short description for this wordbook" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default WordbookSelectionPage