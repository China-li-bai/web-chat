import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordbookCard } from '@/components/language-learning/WordbookCard';
import { seedInitialData, getAllWordbooksWithStats, importWordbook, checkWordbookExists } from '@/services/wordbookService';
import { type WordbookWithStats } from '@/types/wordbook';
import { initializeDatabase } from '@/services/dataInitService';
import { useAppStore } from '@/store/useAppStore';
import { Button, Row, Col, Typography, Space, Spin, Empty, message, App, Modal, Form, Input, Select, InputNumber } from 'antd';
import ImportPreviewModal from '@/components/language-learning/import-preview-modal';
import { UploadOutlined } from '@ant-design/icons';
import { generateWordbookFile } from '@/modules/ai'
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<null | { name: string; description?: string; words: any[] }>(null);

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

      // 改为先预览
      setPreviewFile(data);
      setPreviewOpen(true);
      const proceedWithImport = async (finalContent: string) => {
        try {
          const result = await importWordbook(finalContent, userId);
          if (result.status === 'created') {
            messageApi.success('Wordbook "' + bookName + '" imported successfully!');
          } else {
            messageApi.success('Wordbook "' + bookName + '" updated successfully!');
          }
          await loadWordbooks();
        } catch (error: any) {
          console.error('Failed to import wordbook:', error);
          messageApi.error('Import failed: ' + error.message);
        }
      };

      try {
        const exists = await checkWordbookExists(bookName);
        // 覆盖确认移动到预览确认时再处理
        setPreviewFile(data);
        setPreviewOpen(true);
        return;
      } catch (error: any) {
        console.error('Failed to check wordbook existence:', error);
        messageApi.error(`Error: ${error.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // 提交 AI 生成（先生成文件，进入预览）
  const handleAiGenerate = async (values: any) => {
    if (!userId) {
      messageApi.error('User not ready');
      return;
    }
    const confirmOverwrite = (name: string) => new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: 'Confirm Overwrite',
        content: `A wordbook named "${name}" already exists. Do you want to overwrite it?`,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    try {
      setAiLoading(true);

      const file = await generateWordbookFile(values);
      setPreviewFile(file as any);
      setPreviewOpen(true);
      setAiModalOpen(false);
      aiForm.resetFields();
      messageApi.success('Generated wordbook file. Please review before import.');
    } catch (e: any) {
      if (String(e?.message).includes('User cancelled overwrite')) {
        // 用户取消覆盖，静默处理
        return;
      }
      console.error('AI generate/import failed:', e);
      messageApi.error(String(e?.message || 'AI generate failed'));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <ImportPreviewModal
        open={previewOpen}
        file={previewFile as any}
        onCancel={() => {
          setPreviewOpen(false);
          setPreviewFile(null);
        }}
        onConfirm={async (nextFile) => {
          try {
            const name = nextFile.name;
            const exists = await checkWordbookExists(name);
            const doImport = async () => {
              const json = JSON.stringify(nextFile);
              const res = await importWordbook(json, userId);
              if (res.status === 'created') {
                messageApi.success('Wordbook "' + name + '" imported successfully!');
              } else {
                messageApi.success('Wordbook "' + name + '" updated successfully!');
              }
              setPreviewOpen(false);
              setPreviewFile(null);
              await loadWordbooks();
            };
            if (exists) {
              Modal.confirm({
                title: 'Confirm Overwrite',
                content: 'A wordbook named "' + name + '" already exists. Do you want to overwrite it?',
                onOk: doImport,
              });
            } else {
              await doImport();
            }
          } catch (err: any) {
            console.error('Import failed:', err);
            messageApi.error(String(err?.message || 'Import failed'));
          }
        }}
      />
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
          initialValues={{ level: 'intermediate', wordCount: 50, targetLanguage: 'English', provider: 'free-priority' }}
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

          <Form.Item label="Provider" name="provider">
            <Select
              options={[
                { label: 'Free Priority (GLM → ERNIE → Hunyuan → OpenRouter:free → Gemini → OpenAI)', value: 'free-priority' },
                { label: 'Zhipu AI (GLM)', value: 'zhipu' },
                { label: 'Baidu ERNIE', value: 'ernie' },
                { label: 'Tencent Hunyuan', value: 'hunyuan' },
                { label: 'OpenRouter', value: 'openrouter' },
                { label: 'Gemini', value: 'gemini' },
                { label: 'OpenAI', value: 'openai' },
              ]}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.provider !== curr.provider}>
            {({ getFieldValue }) => {
              const p = getFieldValue('provider');
              if (p && p !== 'free-priority') {
                const modelPh =
                  p === 'zhipu' ? 'e.g., glm-4-flash' :
                    p === 'ernie' ? 'e.g., ernie-speed' :
                      p === 'hunyuan' ? 'e.g., hunyuan-lite' :
                        p === 'openrouter' ? 'e.g., deepseek/deepseek-r1:free' :
                          p === 'openai' ? 'e.g., gpt-4o-mini' :
                            'e.g., gemini-1.5-flash';
                const basePh =
                  p === 'zhipu' ? 'https://open.bigmodel.cn/api/paas/v4' :
                    p === 'openrouter' ? 'https://openrouter.ai/api/v1' :
                      p === 'ernie' ? 'Your ERNIE-compatible gateway base URL' :
                        p === 'hunyuan' ? 'Your Hunyuan OpenAI-compatible gateway base URL' :
                          '';
                return (
                  <>
                    <Form.Item label="Model (optional)" name="model">
                      <Input placeholder={modelPh} />
                    </Form.Item>
                    <Form.Item label="API Key" name="apiKey" rules={[{ required: true, message: 'Please input API Key for the selected provider' }]}>
                      <Input.Password placeholder="Your API Key" />
                    </Form.Item>
                    <Form.Item label="Base URL (optional)" name="baseUrl">
                      <Input placeholder={basePh} />
                    </Form.Item>
                  </>
                );
              }
              return (
                <Form.Item>
                  <Text type="secondary">
                    Using Free Priority chain by default: GLM-4-Flash → ERNIE-Speed → hunyuan-lite → OpenRouter:free → Gemini → OpenAI
                  </Text>
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default WordbookSelectionPage