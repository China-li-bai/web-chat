# API 管理器使用指南

## 概述

API管理器是一個統一的接口管理工具，根據不同情況自動選擇最合適的API調用方式：

1. **Tauri 內置服務** - 在Tauri環境中優先使用，支持用戶API密鑰和環境變量
2. **官方SDK** - 當用戶提供API密鑰時使用Google官方SDK
3. **後端服務** - 當沒有API密鑰時使用自己的後端服務

## 快速開始

### 基本使用

```javascript
import { generateTTS, playAudio } from './utils/apiManager.js';

// 生成語音
const result = await generateTTS('Hello World', 'professional');

// 播放音頻
await playAudio(result.audioBlob);
```

### 設置API密鑰

```javascript
import { setUserApiKey, getApiStatus } from './utils/apiManager.js';

// 設置用戶API密鑰
setUserApiKey('your-gemini-api-key');

// 檢查狀態
const status = getApiStatus();
console.log(status);
```

## API 參考

### APIManager 類

#### 構造函數
```javascript
const manager = new APIManager();
```

#### 方法

##### `setUserApiKey(apiKey)`
設置用戶API密鑰
- `apiKey` (string): API密鑰

##### `getEffectiveApiKey()`
獲取當前有效的API密鑰
- 返回: (string|null) API密鑰

##### `getApiType()`
判斷當前應該使用的API類型
- 返回: (string) API類型 ('tauri', 'official_sdk', 'backend')

##### `generateTTS(text, style, options)`
生成語音
- `text` (string): 要轉換的文本
- `style` (string): 語音風格，可選值：
  - `'professional'` - 專業
  - `'cheerful'` - 愉快
  - `'calm'` - 平靜
  - `'energetic'` - 活力
  - `'friendly'` - 友好
  - `'serious'` - 嚴肅
- `options` (Object): 額外選項
- 返回: Promise<Object> 包含audioBlob、mimeType、voiceName、style、source

##### `playAudio(audioBlob, onStart, onEnd, onError)`
播放音頻
- `audioBlob` (Blob): 音頻數據
- `onStart` (Function): 開始播放回調
- `onEnd` (Function): 播放結束回調
- `onError` (Function): 錯誤回調
- 返回: Promise<void>

##### `getStatus()`
獲取API狀態信息
- 返回: Object 包含apiType、hasUserApiKey、hasEnvApiKey等信息

### 便捷函數

#### `generateTTS(text, style, options)`
全局TTS生成函數

#### `playAudio(audioBlob, onStart, onEnd, onError)`
全局音頻播放函數

#### `setUserApiKey(apiKey)`
設置用戶API密鑰

#### `getApiStatus()`
獲取API狀態

## 語音風格

| 風格 | 描述 | 對應語音 |
|------|------|----------|
| professional | 專業 | Charon |
| cheerful | 愉快 | Puck |
| calm | 平靜 | Kore |
| energetic | 活力 | Fenrir |
| friendly | 友好 | Aoede |
| serious | 嚴肅 | Charon |

## API 調用優先級

1. **檢測Tauri環境**
   - 如果在Tauri環境中，使用內置服務
   - 優先使用用戶API密鑰，然後使用環境變量

2. **檢查用戶API密鑰**
   - 如果用戶設置了API密鑰，使用官方SDK

3. **使用後端服務**
   - 如果沒有API密鑰，使用自己的後端服務

## 錯誤處理

```javascript
try {
  const result = await generateTTS('Hello');
  await playAudio(result.audioBlob);
} catch (error) {
  if (error.message.includes('API密鑰')) {
    // 處理API密鑰問題
  } else if (error.message.includes('配額')) {
    // 處理配額問題
  } else if (error.message.includes('網絡')) {
    // 處理網絡問題
  }
}
```

## 在React中使用

```jsx
import React, { useState } from 'react';
import { generateTTS, playAudio, setUserApiKey } from '../utils/apiManager.js';

function TTSComponent() {
  const [text, setText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const handleTTS = async () => {
    try {
      setIsPlaying(true);
      const result = await generateTTS(text, 'professional');
      
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
  
  return (
    <div>
      <input 
        type="password" 
        placeholder="API密鑰（可選）"
        onChange={(e) => setUserApiKey(e.target.value)}
      />
      
      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="輸入文本"
      />
      
      <button 
        onClick={handleTTS} 
        disabled={!text || isPlaying}
      >
        {isPlaying ? '播放中...' : '生成語音'}
      </button>
    </div>
  );
}
```

## 環境配置

### 環境變量
在 `.env` 文件中設置：
```
VITE_GEMINI_API_KEY=your-api-key-here
```

### Tauri配置
確保在 `tauri.conf.json` 中配置了相應的權限：
```json
{
  "tauri": {
    "allowlist": {
      "invoke": {
        "all": true
      }
    }
  }
}
```

## 測試

運行測試：
```bash
npm run test
```

運行特定測試：
```bash
npm run test apiManager
```

## 故障排除

### 常見問題

1. **API密鑰未配置**
   - 檢查環境變量是否設置
   - 確認用戶是否輸入了API密鑰

2. **Tauri環境檢測失敗**
   - 確認在Tauri應用中運行
   - 檢查Tauri API權限配置

3. **後端連接失敗**
   - 確認後端服務正在運行
   - 檢查後端URL配置

4. **音頻播放失敗**
   - 檢查瀏覽器音頻權限
   - 確認音頻格式支持

### 調試

啟用詳細日誌：
```javascript
import { getApiStatus } from './utils/apiManager.js';

console.log('API狀態:', getApiStatus());
```

## 更新日誌

### v1.0.0
- 初始版本
- 支持三種API調用方式
- 統一的錯誤處理
- 完整的測試覆蓋