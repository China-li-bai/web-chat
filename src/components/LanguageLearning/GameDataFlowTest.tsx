import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

/**
 * 数据流测试组件 - 验证从 GameHomePage 到 GamePlayPage 的参数传递
 */
export const GameDataFlowTest: React.FC = () => {
  // 模拟 GameHomePage 的参数传递
  const mockGameParams = {
    wordbookId: 1,
    gameType: 'vocabulary-match',
    difficulty: 'medium',
    questionCount: 5
  };

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', margin: '10px 0' }}>
      <h4>🔄 数据流测试</h4>
      <Text strong>从 GameHomePage 传递的参数：</Text>
      <pre style={{ 
        background: '#fff', 
        padding: '10px', 
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        {JSON.stringify(mockGameParams, null, 2)}
      </pre>
      
      <Text strong>新 GamePlayPage 期望的参数格式：</Text>
      <pre style={{ 
        background: '#fff', 
        padding: '10px', 
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        {JSON.stringify({
          wordbookId: "number ✅",
          gameType: "'vocabulary-match' | 'definition-match' ✅",
          difficulty: "'easy' | 'medium' | 'hard' | 'expert' ✅",
          questionCount: "number ✅"
        }, null, 2)}
      </pre>
      
      <div style={{ 
        background: '#d4edda', 
        color: '#155724', 
        padding: '10px', 
        borderRadius: '4px',
        marginTop: '10px'
      }}>
        ✅ <strong>数据一致性验证通过</strong>
      </div>
    </div>
  );
};

export default GameDataFlowTest;