import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordbookCard } from '@/components/language-learning/WordbookCard';
import { seedInitialData, getAllWordbooksWithStats, importWordbook, checkWordbookExists } from '@/services/wordbookService';
import { type WordbookWithStats, type ImportFile } from '@/types/wordbook';
import { useAppStore } from '@/store/useAppStore';
import { Button, Row, Col, Typography, Space, Spin, Empty, message, Modal } from 'antd';
import ImportPreviewModal from '@/components/language-learning/import-preview-modal';
import AIGenerateModal from '@/components/language-learning/AIGenerateModal';
import { useFileImport } from '@/hooks/useFileImport';
import { UploadOutlined } from '@ant-design/icons';
const { Title, Text } = Typography;

export const WordbookSelectionPage: React.FC = () => {
  const [wordbooks, setWordbooks] = useState<WordbookWithStats[]>([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const userId = useAppStore((state) => state.userId);

  // AI 生成相关状态
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<ImportFile | null>(null);


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

  const { handleImportClick, fileInputElement, contextHolder: fileContextHolder } = useFileImport({
    onFileReady: (file) => {
      setPreviewFile(file);
      setPreviewOpen(true);
    }
  });

  const handleStartLearning = (wordbookId: number) => {
    navigate(`/learning-session/${wordbookId}`);
  };

  const handleOpenAiModal = () => {
    setAiModalOpen(true);
  };

  const handleCloseAiModal = () => {
    if (!aiLoading) setAiModalOpen(false);
  };

  const handleAiSuccess = (file: ImportFile) => {
    setPreviewFile(file);
    setPreviewOpen(true);
    setAiModalOpen(false);
  };


  return (
    <>
      {contextHolder}
      {fileContextHolder}
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
                messageApi.success(`Wordbook "${name}" imported successfully!`);
              } else {
                messageApi.success(`Wordbook "${name}" updated successfully!`);
              }
              setPreviewOpen(false);
              setPreviewFile(null);
              await loadWordbooks();
            };
            if (exists) {
              Modal.confirm({
                title: 'Confirm Overwrite',
                content: `A wordbook named "${name}" already exists. Do you want to overwrite it?`,
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
            {fileInputElement}
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

      <AIGenerateModal
        open={aiModalOpen}
        loading={aiLoading}
        onCancel={handleCloseAiModal}
        onSuccess={handleAiSuccess}
        onLoadingChange={setAiLoading}
        userId={userId}
      />
    </>
  );
};

export default WordbookSelectionPage