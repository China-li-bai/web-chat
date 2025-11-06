import { useState, useEffect } from 'react';
import { message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  seedInitialData, 
  getAllWordbooksWithStats, 
  importWordbook, 
  checkWordbookExists 
} from '@/services/learningService';
import { type WordbookWithStats, type ImportFile } from '@/types/wordbook';
import { useAppStore } from '@/store/useAppStore';
import { useFileImport } from '@/hooks/useFileImport';

// 合并相关状态到单一状态对象
interface PageState {
  wordbooks: WordbookWithStats[];
  isLoading: boolean;
  previewFile: ImportFile | null;
  modals: {
    ai: boolean;
    preview: boolean;
  };
  loading: {
    ai: boolean;
  };
}

export interface UseWordbookPageReturn {
  // Data - 只暴露必要的数据
  wordbooks: WordbookWithStats[];
  isLoading: boolean;
  previewFile: ImportFile | null;
  aiModalOpen: boolean;
  aiLoading: boolean;
  previewOpen: boolean;
  
  // Actions - 合并相似操作
  handleStartLearning: (wordbookId: number) => void;
  handleOpenAiModal: () => void;
  handleCloseAiModal: () => void;
  handleImportSuccess: (file: ImportFile) => void;
  handleImportConfirm: (file: ImportFile) => Promise<void>;
  
  // File import
  handleImportClick: () => void;
  fileInputElement: React.ReactNode;
  fileContextHolder: React.ReactNode;
  contextHolder: React.ReactNode;
}

export const useWordbookPage = (): UseWordbookPageReturn => {
  // 使用单一状态对象管理所有状态
  const [state, setState] = useState<PageState>({
    wordbooks: [],
    isLoading: true,
    previewFile: null,
    modals: { ai: false, preview: false },
    loading: { ai: false }
  });
  
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const userId = useAppStore((state) => state.userId);

  // 更新状态的辅助函数
  const updateState = (updates: Partial<PageState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };
  
  const updateModal = (modal: keyof PageState['modals'], isOpen: boolean) => {
    setState(prev => ({
      ...prev,
      modals: { ...prev.modals, [modal]: isOpen }
    }));
  };
  
  const updateLoading = (type: keyof PageState['loading'], isLoading: boolean) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [type]: isLoading }
    }));
  };

  // 加载词书数据
  const loadWordbooks = async () => {
    if (!userId) return;
    
    try {
      updateState({ isLoading: true });
      const books = await getAllWordbooksWithStats(userId);
      updateState({ wordbooks: books });
    } catch (error) {
      console.error("Failed to load wordbooks:", error);
      messageApi.error('Failed to load wordbooks.');
    } finally {
      updateState({ isLoading: false });
    }
  };

  // 初始化数据
  useEffect(() => {
    if (!userId) return;
    
    (async () => {
      await seedInitialData(userId);
      await loadWordbooks();
    })();
  }, [userId]);

  // 导航到学习会话
  const handleStartLearning = (wordbookId: number) => {
    navigate(`/learning-session/${wordbookId}`);
  };

  // 打开AI生成模态框
  const handleOpenAiModal = () => {
    updateModal('ai', true);
  };

  // 关闭AI生成模态框
  const handleCloseAiModal = () => {
    if (!state.loading.ai) {
      updateModal('ai', false);
    }
  };

  // 统一处理导入成功（AI生成或文件导入）
  const handleImportSuccess = (file: ImportFile) => {
    setState(prev => ({
      ...prev,
      previewFile: file,
      modals: { ...prev.modals, ai: false, preview: true }
    }));
  };

  // 确认导入
  const handleImportConfirm = async (file: ImportFile) => {
    try {
      const name = file.name;
      const exists = await checkWordbookExists(name);

      const doImport = async () => {
        try {
          const json = JSON.stringify(file);
          const res = await importWordbook(json, userId);

          if (res.status === 'created') {
            messageApi.success(`Wordbook "${name}" imported successfully!`);
          } else {
            messageApi.success(`Wordbook "${name}" updated successfully!`);
          }

          // 关闭预览模态框
          updateModal('preview', false);
          // 清空预览文件
          updateState({ previewFile: null });
          // 重新加载词书列表
          await loadWordbooks();
        } catch (importError: any) {
          console.error('Import operation failed:', importError);
          messageApi.error(importError?.message || 'Failed to import wordbook');
          throw importError; // 重新抛出错误以便Modal.confirm处理
        }
      };

      if (exists) {
        // 词书已存在，显示覆盖确认对话框
        Modal.confirm({
          title: 'Confirm Overwrite',
          content: `A wordbook named "${name}" already exists. Do you want to overwrite it?`,
          okText: 'Confirm',
          cancelText: 'Cancel',
          // 确保异步onOk正确处理
          onOk: async () => {
            await doImport();
          },
          // 错误处理
          onError: (error) => {
            console.error('Modal confirm error:', error);
            messageApi.error('Operation cancelled or failed');
          },
        });
      } else {
        // 词书不存在，直接导入
        await doImport();
      }
    } catch (err: any) {
      console.error('Import failed:', err);
      messageApi.error(String(err?.message || 'Import failed'));
      // 确保即使出错也关闭模态框
      updateModal('preview', false);
      updateState({ previewFile: null });
    }
  };

  // 文件导入
  const { handleImportClick, fileInputElement, contextHolder: fileContextHolder } = useFileImport({
    onFileReady: handleImportSuccess
  });

  return {
    // Data
    wordbooks: state.wordbooks,
    isLoading: state.isLoading,
    previewFile: state.previewFile,
    aiModalOpen: state.modals.ai,
    aiLoading: state.loading.ai,
    previewOpen: state.modals.preview,
    
    // Actions
    handleStartLearning,
    handleOpenAiModal,
    handleCloseAiModal,
    handleImportSuccess,
    handleImportConfirm,
    
    // File import
    handleImportClick,
    fileInputElement,
    fileContextHolder,
    
    // Message context
    contextHolder,
  };
};