/**
 * 数据库初始化验证测试
 */

import React, { useState } from 'react';
import { Card, Typography, Button, Space, message, Alert } from 'antd';
import { useAppStore } from '@/store/useAppStore';
import { initializeDatabase, isDatabaseInitialized } from '@/services/dataInitService';

const { Title, Text } = Typography;

export const DatabaseInitTestPage: React.FC = () => {
  const { userId } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ initialized: boolean | null, error?: string }>({
    initialized: null
  });

  const checkDatabaseStatus = async () => {
    try {
      setLoading(true);
      setDbStatus({ initialized: null });
      
      console.log('=== 检查数据库初始化状态 ===');
      console.log('用户ID:', userId);
      
      const initialized = await isDatabaseInitialized();
      console.log('数据库初始化状态:', initialized);
      
      setDbStatus({ initialized });
      
      if (initialized) {
        message.success('数据库已初始化');
      } else {
        message.info('数据库未初始化');
      }
      
    } catch (error) {
      console.error('检查数据库状态失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setDbStatus({ initialized: false, error: errorMessage });
      message.error(`检查失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const initializeDatabaseTest = async () => {
    if (!userId) {
      message.error('用户未登录');
      return;
    }

    try {
      setLoading(true);
      setDbStatus({ initialized: null });
      
      console.log('=== 开始数据库初始化测试 ===');
      console.log('用户ID:', userId);
      
      message.loading({ content: '正在初始化数据库...', key: 'init' });
      
      await initializeDatabase(userId);
      
      console.log('数据库初始化完成');
      
      // 验证初始化结果
      const initialized = await isDatabaseInitialized();
      setDbStatus({ initialized });
      
      if (initialized) {
        message.success({ content: '数据库初始化成功！', key: 'init' });
      } else {
        message.error({ content: '初始化后验证失败', key: 'init' });
      }
      
    } catch (error) {
      console.error('数据库初始化失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setDbStatus({ initialized: false, error: errorMessage });
      message.error({ content: `初始化失败: ${errorMessage}`, key: 'init' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Card>
        <Title level={2}>🗄️ 数据库初始化测试</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: '20px' }}>
          测试 sample-learning-data.json 文件导入和数据库初始化功能
        </Text>

        <Space style={{ marginBottom: '20px' }}>
          <Button 
            onClick={checkDatabaseStatus}
            loading={loading}
            disabled={loading}
          >
            检查数据库状态
          </Button>
          
          <Button 
            type="primary"
            onClick={initializeDatabaseTest}
            loading={loading}
            disabled={loading || !userId}
          >
            初始化数据库
          </Button>
          
          <Text type="secondary">
            用户ID: {userId || '未登录'}
          </Text>
        </Space>

        {/* 数据库状态显示 */}
        {dbStatus.initialized !== null && (
          <Alert
            style={{ marginBottom: '20px' }}
            message={
              <div>
                <strong>数据库状态:</strong> {
                  dbStatus.initialized ? 
                  <span style={{ color: '#52c41a' }}>✅ 已初始化</span> : 
                  <span style={{ color: '#ff4d4f' }}>❌ 未初始化</span>
                }
              </div>
            }
            type={dbStatus.initialized ? 'success' : 'warning'}
            showIcon
          />
        )}

        {/* 错误信息显示 */}
        {dbStatus.error && (
          <Alert
            style={{ marginBottom: '20px' }}
            message={
              <div>
                <strong>错误信息:</strong>
                <pre style={{ 
                  margin: '8px 0 0 0', 
                  fontSize: '12px',
                  background: '#f5f5f5',
                  padding: '8px',
                  borderRadius: '4px'
                }}>
                  {dbStatus.error}
                </pre>
              </div>
            }
            type="error"
            showIcon
          />
        )}

        {/* 说明信息 */}
        <Card size="small" style={{ backgroundColor: '#f0f2f5' }}>
          <Title level={5} style={{ marginTop: 0 }}>📋 测试说明</Title>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li><Text type="secondary">检查当前数据库是否已初始化（是否存在词书数据）</Text></li>
            <li><Text type="secondary">如果未初始化，将自动创建示例词书和单词数据</Text></li>
            <li><Text type="secondary">示例数据包含10个基础英语单词和学习进度</Text></li>
            <li><Text type="secondary">初始化后可进行游戏测试</Text></li>
          </ul>
        </Card>

        <Card size="small" style={{ marginTop: '20px', backgroundColor: '#e6f7ff' }}>
          <Title level={5} style={{ marginTop: 0, color: '#1890ff' }}>📝 已修复问题</Title>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li><Text type="secondary">✅ 创建了缺失的 sample-learning-data.json 文件</Text></li>
            <li><Text type="secondary">✅ 文件包含 10 个示例单词数据</Text></li>
            <li><Text type="secondary">✅ 包含完整的学习进度和日志数据</Text></li>
            <li><Text type="secondary">✅ 数据格式与现有学习系统兼容</Text></li>
          </ul>
        </Card>
      </Card>
    </div>
  );
};

export default DatabaseInitTestPage;