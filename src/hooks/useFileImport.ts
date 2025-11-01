import { useRef } from 'react';
import { message } from 'antd';
import { type ImportFile } from '@/types/wordbook';

export interface UseFileImportOptions {
  onFileReady: (file: ImportFile) => void;
}

export const useFileImport = ({ onFileReady }: UseFileImportOptions) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const handleImportClick = () => {
    fileInputRef.current?.click();
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

      onFileReady(data);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const fileInputElement = (
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileChange}
      style={{ display: 'none' }}
      accept=".json"
    />
  );

  return {
    handleImportClick,
    fileInputElement,
    contextHolder,
  };
};