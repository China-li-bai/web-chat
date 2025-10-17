import React, { useMemo, useState } from 'react';
import { Modal, Table, Input, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ImportFile, ImportWord } from '@/types/wordbook';

const { Text } = Typography;

export interface ImportPreviewModalProps {
  open: boolean;
  file: ImportFile | null;
  onCancel: () => void;
  onConfirm: (nextFile: ImportFile) => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ open, file, onCancel, onConfirm }) => {
  const [data, setData] = useState<ImportWord[]>(file?.words || []);

  React.useEffect(() => {
    setData(file?.words || []);
  }, [file?.words]);

  const columns: ColumnsType<ImportWord & { key: number }> = useMemo(() => ([
    { title: 'Word', dataIndex: 'word', key: 'word', width: 160 },
    { title: 'Phonetic', dataIndex: 'phonetic', key: 'phonetic', width: 140 },
    { title: 'Definition', dataIndex: 'definition', key: 'definition' },
    {
      title: '中文释义',
      dataIndex: 'translation',
      key: 'translation',
      width: 200,
      render: (_val, _row, index) => (
        <Input
          value={data[index]?.translation || ''}
          onChange={(e) => {
            const next = [...data];
            next[index] = { ...next[index], translation: e.target.value };
            setData(next);
          }}
          placeholder="输入中文释义"
        />
      ),
    },
    { title: 'Example', dataIndex: 'example', key: 'example' },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 120 },
  ]), [data]);

  const tableData = useMemo(() => (data || []).map((w, idx) => ({ key: idx, ...w })), [data]);

  return (
    <Modal
      title="导入预览"
      open={open}
      onCancel={onCancel}
      onOk={() => {
        if (!file) return;
        const nextFile: ImportFile = { ...file, words: data };
        onConfirm(nextFile);
      }}
      okText="确认导入"
      destroyOnClose
      width={960}
    >
      {file ? (
        <div>
          <div className="mb-3">
            <Text strong>{file.name}</Text>
            {file.description ? <Text type="secondary" className="ml-2">{file.description}</Text> : null}
          </div>
          <Table
            size="small"
            columns={columns}
            dataSource={tableData}
            pagination={{ pageSize: 10 }}
            scroll={{ y: 420 }}
          />
        </div>
      ) : (
        <Text type="secondary">暂无数据</Text>
      )}
    </Modal>
  );
};

export default ImportPreviewModal;