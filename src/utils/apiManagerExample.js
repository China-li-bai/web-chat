/**
 * API 管理器使用示例
 * 展示如何在實際項目中使用 APIManager
 */

import { apiManager, generateTTS, playAudio, setUserApiKey, getApiStatus } from './apiManager.js';

// 示例1：基本TTS使用
export async function basicTTSExample() {
  try {
    console.log('開始生成語音...');
    
    // 生成TTS
    const result = await generateTTS('Hello, this is a test message', 'professional');
    
    console.log('語音生成成功:', {
      source: result.source,
      voiceName: result.voiceName,
      style: result.style
    });
    
    // 播放音頻
    await playAudio(
      result.audioBlob,
      () => console.log('開始播放'),
      () => console.log('播放結束'),
      (error) => console.error('播放錯誤:', error)
    );
    
  } catch (error) {
    console.error('TTS生成失敗:', error.message);
  }
}

// 示例2：設置用戶API密鑰
export function setApiKeyExample() {
  // 設置用戶API密鑰
  setUserApiKey('your-gemini-api-key-here');
  
  // 檢查狀態
  const status = getApiStatus();
  console.log('API狀態:', status);
  
  /*
  輸出示例:
  {
    apiType: 'official_sdk',
    hasUserApiKey: true,
    hasEnvApiKey: true,
    effectiveApiKey: true,
    isTauri: false,
    backendUrl: 'http://localhost:3001'
  }
  */
}

// 示例3：不同語音風格
export async function voiceStylesExample() {
  const text = '這是一個測試消息';
  const styles = ['professional', 'cheerful', 'calm', 'energetic', 'friendly', 'serious'];
  
  for (const style of styles) {
    try {
      console.log(`生成 ${style} 風格語音...`);
      const result = await generateTTS(text, style);
      console.log(`${style} 風格完成，語音名稱: ${result.voiceName}`);
      
      // 可以選擇播放或保存
      // await playAudio(result.audioBlob);
      
    } catch (error) {
      console.error(`${style} 風格生成失敗:`, error.message);
    }
  }
}

// 示例4：錯誤處理
export async function errorHandlingExample() {
  try {
    // 清除API密鑰來模擬錯誤
    setUserApiKey(null);
    
    // 嘗試生成TTS
    await generateTTS('This will fail');
    
  } catch (error) {
    console.error('預期的錯誤:', error.message);
    
    // 根據錯誤類型進行不同處理
    if (error.message.includes('API密鑰')) {
      console.log('需要設置API密鑰');
      // 可以提示用戶輸入API密鑰
    } else if (error.message.includes('配額')) {
      console.log('API配額不足，請稍後再試');
    } else if (error.message.includes('網絡')) {
      console.log('網絡連接問題，請檢查網絡');
    } else {
      console.log('未知錯誤，請聯繫技術支持');
    }
  }
}

// 示例5：批量TTS生成
export async function batchTTSExample() {
  const messages = [
    { text: '歡迎使用AI語音助手', style: 'friendly' },
    { text: '請選擇您需要的服務', style: 'professional' },
    { text: '感謝您的使用！', style: 'cheerful' }
  ];
  
  const results = [];
  
  for (const message of messages) {
    try {
      const result = await generateTTS(message.text, message.style);
      results.push({
        ...result,
        originalText: message.text
      });
      console.log(`生成完成: ${message.text}`);
    } catch (error) {
      console.error(`生成失敗: ${message.text}`, error.message);
    }
  }
  
  return results;
}

// 示例6：API狀態監控
export function apiStatusMonitor() {
  const status = getApiStatus();
  
  console.log('=== API 狀態報告 ===');
  console.log(`當前API類型: ${status.apiType}`);
  console.log(`用戶API密鑰: ${status.hasUserApiKey ? '已設置' : '未設置'}`);
  console.log(`環境API密鑰: ${status.hasEnvApiKey ? '已設置' : '未設置'}`);
  console.log(`有效API密鑰: ${status.effectiveApiKey ? '可用' : '不可用'}`);
  console.log(`Tauri環境: ${status.isTauri ? '是' : '否'}`);
  console.log(`後端地址: ${status.backendUrl}`);
  
  // 根據狀態給出建議
  if (!status.effectiveApiKey) {
    console.warn('⚠️  建議: 請設置API密鑰以使用TTS功能');
  }
  
  if (status.apiType === 'backend' && !status.hasUserApiKey) {
    console.info('ℹ️  信息: 當前使用後端服務，如需更好性能可設置個人API密鑰');
  }
  
  if (status.isTauri) {
    console.info('ℹ️  信息: 檢測到Tauri環境，將使用內置服務');
  }
}

// 示例7：React組件中的使用
export const ReactComponentExample = `
// 在React組件中使用API管理器
import React, { useState, useEffect } from 'react';
import { generateTTS, playAudio, setUserApiKey, getApiStatus } from '../utils/apiManager.js';

function TTSComponent() {
  const [text, setText] = useState('');
  const [style, setStyle] = useState('professional');
  const [isPlaying, setIsPlaying] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);
  
  useEffect(() => {
    // 獲取API狀態
    setApiStatus(getApiStatus());
  }, []);
  
  const handleTTS = async () => {
    try {
      setIsPlaying(true);
      const result = await generateTTS(text, style);
      
      await playAudio(
        result.audioBlob,
        () => console.log('開始播放'),
        () => setIsPlaying(false),
        (error) => {
          console.error('播放錯誤:', error);
          setIsPlaying(false);
        }
      );
    } catch (error) {
      console.error('TTS錯誤:', error);
      setIsPlaying(false);
    }
  };
  
  const handleApiKeyChange = (apiKey) => {
    setUserApiKey(apiKey);
    setApiStatus(getApiStatus());
  };
  
  return (
    <div>
      <h3>TTS 測試</h3>
      
      {/* API狀態顯示 */}
      <div>
        <p>API類型: {apiStatus?.apiType}</p>
        <p>API密鑰: {apiStatus?.effectiveApiKey ? '已配置' : '未配置'}</p>
      </div>
      
      {/* API密鑰輸入 */}
      <input 
        type="password" 
        placeholder="輸入Gemini API密鑰（可選）"
        onChange={(e) => handleApiKeyChange(e.target.value)}
      />
      
      {/* 文本輸入 */}
      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="輸入要轉換的文本"
      />
      
      {/* 風格選擇 */}
      <select value={style} onChange={(e) => setStyle(e.target.value)}>
        <option value="professional">專業</option>
        <option value="cheerful">愉快</option>
        <option value="calm">平靜</option>
        <option value="energetic">活力</option>
        <option value="friendly">友好</option>
        <option value="serious">嚴肅</option>
      </select>
      
      {/* 生成按鈕 */}
      <button 
        onClick={handleTTS} 
        disabled={!text || isPlaying}
      >
        {isPlaying ? '播放中...' : '生成並播放'}
      </button>
    </div>
  );
}

export default TTSComponent;
`;

// 導出所有示例
export const examples = {
  basicTTSExample,
  setApiKeyExample,
  voiceStylesExample,
  errorHandlingExample,
  batchTTSExample,
  apiStatusMonitor
};