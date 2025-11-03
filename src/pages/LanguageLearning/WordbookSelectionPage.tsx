import React from 'react';
import { WordbookCard } from '@/components/language-learning/WordbookCard';
import { useAppStore } from '@/store/useAppStore';
import { Button, Typography, Space, Spin, Empty, message } from 'antd';
import ImportPreviewModal from '@/components/language-learning/import-preview-modal';
import AIGenerateModal from '@/components/language-learning/AIGenerateModal';
import { useWordbookPage } from '@/hooks/useWordbookPage';
import { UploadOutlined } from '@ant-design/icons';
import styles from './WordbookSelectionPage.module.css';

const { Title, Text } = Typography;

export const WordbookSelectionPage: React.FC = () => {
  const userId = useAppStore((state) => state.userId);
  const {
    wordbooks,
    isLoading,
    previewFile,
    aiModalOpen,
    aiLoading,
    previewOpen,
    handleStartLearning,
    handleOpenAiModal,
    handleCloseAiModal,
    handleImportSuccess,
    handleImportConfirm,
    handleImportClick,
    fileInputElement,
    fileContextHolder,
    contextHolder,
  } = useWordbookPage();

  // 渲染头部区域
  const renderHeader = () => (
    <div className={styles.header}>
      <div className={styles.headerContent}>
        <Title level={2} className={styles.title}>Wordbooks</Title>
        <Text type="secondary">Choose a wordbook to start your learning session.</Text>
      </div>
      <Space>
        <Button 
          type="primary" 
          icon={<UploadOutlined />} 
          onClick={handleImportClick}
          className={styles.actionButton}
        >
          Import Wordbook
        </Button>
        <Button 
          onClick={handleOpenAiModal}
          loading={aiLoading}
          className={styles.actionButton}
        >
          AI Generate
        </Button>
        {fileInputElement}
      </Space>
    </div>
  );

  // 渲染词书列表
  const renderWordbooks = () => {
    if (isLoading) {
      return (
        <div className={styles.loadingContainer}>
          <Spin size="large" tip="Loading your wordbooks..." />
        </div>
      );
    }

    if (wordbooks.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Empty 
            description={
              <div>
                <Text>No wordbooks found.</Text>
                <br />
                <Text type="secondary">Try importing one to get started.</Text>
              </div>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      );
    }

    return (
      <div className={styles.wordbookGrid}>
        {wordbooks.map((book) => (
          <WordbookCard
            key={book.id}
            name={book.name}
            description={book.description}
            wordCount={book.wordCount}
            progress={book.progress}
            masteredCount={book.masteredCount}
            dueCount={book.dueCount}
            lastStudied={book.lastStudied}
            onStart={() => handleStartLearning(book.id)}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {contextHolder}
      {fileContextHolder}
      <ImportPreviewModal
        open={previewOpen}
        file={previewFile}
        onCancel={() => {}}
        onConfirm={handleImportConfirm}
      />
      <div className={styles.container}>
        {renderHeader()}
        <main>
          {renderWordbooks()}
        </main>
      </div>
      <AIGenerateModal
        open={aiModalOpen}
        loading={aiLoading}
        onCancel={handleCloseAiModal}
        onSuccess={handleImportSuccess}
        userId={userId}
      />
    </>
  );
};

export default WordbookSelectionPage;