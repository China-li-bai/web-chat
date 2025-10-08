import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordbookCard } from '@/components/language-learning/WordbookCard';
import { seedInitialData, getAllWordbooksWithStats, importWordbook, type WordbookWithStats } from '@/services/wordbookService';
import { Button, Row, Col, Typography, Space, Spin, Empty, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export const WordbookSelectionPage: React.FC = () => {
  const [wordbooks, setWordbooks] = useState<WordbookWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const loadWordbooks = async () => {
    try {
      setIsLoading(true);
      const books = await getAllWordbooksWithStats();
      setWordbooks(books);
    } catch (error) {
      console.error("Failed to load wordbooks:", error);
      message.error('Failed to load wordbooks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    seedInitialData().then(() => {
      loadWordbooks();
    });
  }, []);

  const handleStartLearning = (wordbookId: number) => {
    navigate(`/learning-session/${wordbookId}`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        await importWordbook(content);
        message.success('Wordbook imported successfully!');
        await loadWordbooks(); // Refresh the list
      } catch (error: any) {
        console.error('Failed to import wordbook:', error);
        message.error(`Import failed: ${error.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
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
  );
};