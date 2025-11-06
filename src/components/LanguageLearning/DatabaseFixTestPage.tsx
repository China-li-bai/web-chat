/**
 * 数据库修复测试页面
 * 用于验证 SQLite 数据类型错误是否已修复
 */

import React, { useState } from 'react';
import { Card, Typography, Button, Space, message, List, Divider } from 'antd';
import { 
  createLearningSessionForWordbook, 
  processStudyResponse 
} from '@/services/learningService';
import { 
  initializeDatabase, 
  isDatabaseInitialized 
} from '@/services/dataInitService';
import { useAppStore } from '@/store/useAppStore';

const { Title, Text } = Typography;

export const DatabaseFixTestPage: React.FC = () => {
  const { userId } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<{ initialized: boolean | null, wordbookCount: number | null }>({
    initialized: null,
    wordbookCount: null
  });

  const addTestResult = (test: string, status: 'success' | 'error' | 'info', data?: any, error?: string) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      data,
      error,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runFullTest = async () => {
    if (!userId) {
      message.error('用户未登录');
      return;
    }

    setLoading(true);
    setTestResults([]);

    try {
      // 测试1: 检查数据库初始化状态
      addTestResult('1. 检查数据库初始化状态', 'info');
      const initialized = await isDatabaseInitialized();
      setDbStatus(prev => ({ ...prev, initialized }));
      addTestResult('1. 检查数据库初始化状态', 'success', { initialized });

      // 测试2: 如果未初始化，自动初始化
      if (!initialized) {
        addTestResult('2. 自动初始化数据库', 'info');
        await initializeDatabase(userId);
        addTestResult('2. 自动初始化数据库', 'success');
      }

      // 测试3: 再次检查初始化状态
      const initializedAfter = await isDatabaseInitialized();
      setDbStatus(prev => ({ ...prev, initialized: initializedAfter }));
      addTestResult('3. 验证初始化结果', 'success', { initialized: initializedAfter });

      // 测试4: 获取词书列表
      addTestResult('4. 获取词书列表', 'info');
      try {
        const { databaseService } = await import('@/services/database/index');
        const db = await databaseService.getConnection();
        const wordbooks = await db.exec({
          sql: 'SELECT id, name FROM wordbooks LIMIT 5'
        });
        addTestResult('4. 获取词书列表', 'success', { wordbooks: wordbooks.length, sample: wordbooks.slice(0, 2) });
        setDbStatus(prev => ({ ...prev, wordbookCount: wordbooks.length }));
      } catch (error) {
        addTestResult('4. 获取词书列表', 'error', null, error instanceof Error ? error.message : '未知错误');
      }

      // 测试5: 获取第一个词书的单词（如果有词书）
      if (dbStatus.wordbookCount && dbStatus.wordbookCount > 0) {
        addTestResult('5. 获取词书单词', 'info');
        try {
          const learningSession = await createLearningSessionForWordbook(1, userId);
          const words = learningSession.items.slice(0, 3);
          addTestResult('5. 获取词书单词', 'success', { 
            wordCount: words.length, 
            sampleWords: words.slice(0, 2).map((item: any) => ({ 
              id: Number(item.item.id), 
              word: item.item.content, 
              translation: item.item.details?.translation || item.item.details?.definition 
            }))
          });
        } catch (error) {
          addTestResult('5. 获取词书单词', 'error', null, error instanceof Error ? error.message : '未知错误');
        }
      }

      // 测试6: 测试学习记录功能
      addTestResult('6. 测试学习记录功能', 'info');
      try {
        const learningSession = await createLearningSessionForWordbook(1, userId);
        
        if (learningSession.items.length > 0) {
          const firstItem = learningSession.items[0];
          await processStudyResponse(
            learningSession,
            firstItem.item.id,
            'good',
            3000,
            userId
          );
          addTestResult('6. 测试学习记录功能', 'success', { 
            wordId: Number(firstItem.item.id), 
            result: 'recorded' 
          });
        } else {
          addTestResult('6. 测试学习记录功能', 'info', { message: '没有单词数据可以测试' });
        }
      } catch (error) {
        addTestResult('6. 测试学习记录功能', 'error', null, error instanceof Error ? error.message : '未知错误');
      }

      message.success('数据库修复测试完成！');

    } catch (error) {
      console.error('测试过程中发生错误:', error);
      addTestResult('测试过程', 'error', null, error instanceof Error ? error.message : '未知错误');
      message.error('测试过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#52c41a';
      case 'error': return '#ff4d4f';
      case 'info': return '#1890ff';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return '🔄';
      default: return '⚪';
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <Card>
        <Title level={2}>🧪 数据库修复测试页面</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: '20px' }}>
          验证 SQLite 数据类型错误修复和完整数据流功能
        </Text>

        <Space style={{ marginBottom: '20px' }}>
          <Button 
            type="primary" 
            loading={loading}
            onClick={runFullTest}
            disabled={loading}
          >
            运行完整测试
          </Button>
          <Text type="secondary">
            用户ID: {userId || '未登录'}
          </Text>
        </Space>

        {/* 数据库状态 */}
        {dbStatus.initialized !== null && (
          <Card size="small" style={{ marginBottom: '20px', backgroundColor: '#f5f5f5' }}>
            <Title level={4} style={{ marginTop: 0 }}>数据库状态</Title>
            <Space>
              <Text>
                初始化状态: <Text strong style={{ color: dbStatus.initialized ? '#52c41a' : '#ff4d4f' }}>
                  {dbStatus.initialized ? '✅ 已初始化' : '❌ 未初始化'}
                </Text>
              </Text>
              {dbStatus.wordbookCount !== null && (
                <Text>
                  词书数量: <Text strong>{dbStatus.wordbookCount}</Text>
                </Text>
              )}
            </Space>
          </Card>
        )}

        {/* 测试结果 */}
        {testResults.length > 0 && (
          <Card>
            <Title level={4} style={{ marginTop: 0 }}>测试结果</Title>
            <List
              dataSource={testResults}
              renderItem={(item) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <Text strong>
                        {getStatusIcon(item.status)} {item.test}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {item.timestamp}
                      </Text>
                    </div>
                    
                    {item.data && (
                      <div style={{ 
                        background: '#f9f9f9', 
                        padding: '8px', 
                        borderRadius: '4px',
                        marginBottom: '8px'
                      }}>
                        <pre style={{ 
                          fontSize: '12px', 
                          margin: 0,
                          whiteSpace: 'pre-wrap'
                        }}>
                          {JSON.stringify(item.data, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {item.error && (
                      <div style={{ 
                        background: '#fff2f0', 
                        color: '#cf1322',
                        padding: '8px', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        错误: {item.error}
                      </div>
                    )}
                  </div>
                </List.Item>
              )}
            />
          </Card>
        )}

        <Divider />
        
        {/* 修复说明 */}
        <Card size="small" style={{ backgroundColor: '#e6f7ff' }}>
          <Title level={5} style={{ marginTop: 0, color: '#1890ff' }}>🔧 本次修复内容</Title>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li><Text type="secondary">✅ 修复 SQL 字段别名问题（移除 learningDifficulty 别名）</Text></li>
            <li><Text type="secondary">✅ 增强参数类型验证和转换</Text></li>
            <li><Text type="secondary">✅ 添加数据库自动初始化检查</Text></li>
            <li><Text type="secondary">✅ 改进 JOIN 查询条件</Text></li>
            <li><Text type="secondary">✅ 增强错误处理和调试信息</Text></li>
            <li><Text type="secondary">✅ 添加数据一致性验证</Text></li>
          </ul>
        </Card>
      </Card>
    </div>
  );
};

export default DatabaseFixTestPage;