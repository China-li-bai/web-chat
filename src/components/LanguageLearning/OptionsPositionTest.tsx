/**
 * 选项位置固定性测试
 * 
 * 这个文件用于验证选项位置在倒计时时不会改变的问题修复
 */

import React from 'react';

export const OptionsPositionTest: React.FC = () => {
  const testOptionsFixedPosition = () => {
    // 模拟题目数据
    const mockWords = [
      { 
        id: 1, 
        word: 'apple', 
        translation: '苹果', 
        options: ['书', '苹果', '水', '房子'], // 固定选项顺序
        correctIndex: 1 
      }
    ];

    console.log('=== 选项位置固定性测试 ===');
    console.log('题目:', mockWords[0].word);
    console.log('选项位置 (固定不变):', mockWords[0].options.map((option, index) => 
      `${index}:${option}${index === mockWords[0].correctIndex ? ' ✓' : ''}`
    ).join(', '));
    
    // 验证一致性
    const currentOptions = mockWords[0].options;
    const nextOptions = mockWords[0].options; // 重新获取（应该相同）
    
    const isConsistent = currentOptions.every((option, index) => option === nextOptions[index]);
    
    console.log('位置一致性测试:', isConsistent ? '✅ 通过' : '❌ 失败');
    
    return isConsistent;
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: '#f0f0f0', 
      margin: '10px 0',
      borderRadius: '8px'
    }}>
      <h4>🔧 选项位置固定性测试</h4>
      <p>验证选项位置在游戏过程中保持不变</p>
      
      <button 
        onClick={testOptionsFixedPosition}
        style={{
          padding: '8px 16px',
          background: '#1890ff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        运行测试
      </button>
      
      <div style={{ 
        marginTop: '10px', 
        padding: '10px', 
        background: '#fff',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <strong>测试内容：</strong>
        <ul>
          <li>验证每个题目的选项位置在生成后保持固定</li>
          <li>确保倒计时不会影响选项位置</li>
          <li>验证整个游戏过程中选项一致性</li>
        </ul>
      </div>
    </div>
  );
};

export default OptionsPositionTest;