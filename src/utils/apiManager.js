/**
 * API 管理工具
 * 根據不同情況選擇合適的API調用方式：
 * 1. Tauri 內置服務（優先使用用戶API key，然後從env獲取）
 * 2. 用戶有API key時使用官方SDK
 * 3. 用戶沒有API key時使用自己的後端
 */

import { GoogleGenAI } from '@google/genai';

// 檢查是否在Tauri環境中
const isTauriEnvironment = () => {
  return typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.invoke;
};

// 獲取Tauri invoke函數
const getTauriInvoke = () => {
  if (isTauriEnvironment()) {
    return window.__TAURI__.invoke;
  }
  return null;
};

// API 調用類型枚舉
export const API_TYPES = {
  TAURI: 'tauri',
  OFFICIAL_SDK: 'official_sdk', 
  BACKEND: 'backend'
};

// API 管理器類
export class APIManager {
  constructor() {
    this.userApiKey = null;
    this.envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    this.backendUrl = 'http://localhost:3001';
  }

  /**
   * 設置用戶API密鑰
   * @param {string} apiKey - 用戶輸入的API密鑰
   */
  setUserApiKey(apiKey) {
    this.userApiKey = apiKey;
  }


  /**
   * 獲取當前有效的API密鑰
   * @returns {string|null} API密鑰
   */
  getEffectiveApiKey() {
    return this.userApiKey || this.envApiKey || null;
  }

  /**
   * 檢查是否在Tauri環境中
   */
  isTauri() {
    return isTauriEnvironment();
  }

  /**
   * 判斷當前應該使用哪種API調用方式
   * @returns {string} API類型
   */
  getApiType() {
    // 檢查是否在Tauri環境中
    const isTauri = this.isTauri();
    console.log({userApiKey: this.userApiKey,envApiKey:this.envApiKey});
    
    if (isTauri) {
      return API_TYPES.TAURI;
    }
    
    // 如果用戶有API key，使用官方SDK
    if (this.userApiKey) {
      return API_TYPES.OFFICIAL_SDK;
    }
    
    // 否則使用後端
    return API_TYPES.BACKEND;
  }

  /**
   * 統一的TTS調用接口（無緩存，純API調用）
   * @param {string} text - 要轉換的文本
   * @param {string} style - 語音風格
   * @param {Object} options - 額外選項
   * @returns {Promise<Object>} 音頻結果
   */
  async generateTTS(text, style = 'professional', options = {}) {
    const apiType = this.getApiType();
    console.log('[APIManager] 調用API類型:', apiType);
    
    switch (apiType) {
      case API_TYPES.TAURI:
        return await this._callTauriTTS(text, style, options);
      case API_TYPES.OFFICIAL_SDK:
        return await this._callOfficialSDK(text, style, options);
      case API_TYPES.BACKEND:
        return await this._callBackendTTS(text, style, options);
      default:
        throw new Error(`不支持的API類型: ${apiType}`);
    }
  }

  /**
   * 調用Tauri內置TTS服務
   * @private
   */
  async _callTauriTTS(text, style, options) {
    try {
      const apiKey = this.getEffectiveApiKey();
      if (!apiKey) {
        throw new Error('API密鑰未配置');
      }

      const tauriInvoke = getTauriInvoke();
      if (!tauriInvoke) {
        throw new Error('Tauri API不可用');
      }

      const result = await tauriInvoke('generate_tts', {
        text,
        style,
        apiKey,
        ...options
      });

      return {
        audioBlob: new Blob([result.audioData], { type: 'audio/wav' }),
        mimeType: 'audio/wav',
        voiceName: result.voiceName,
        style,
        source: API_TYPES.TAURI
      };
    } catch (error) {
      console.error('Tauri TTS 調用失敗:', error);
      throw new Error(`Tauri TTS 生成失敗: ${error.message}`);
    }
  }

  /**
   * 調用官方SDK
   * @private
   */
  async _callOfficialSDK(text, style, options) {
    try {
      if (!this.userApiKey) {
        throw new Error('用戶API密鑰未設置');
      }

      const ai = new GoogleGenAI({ apiKey: this.userApiKey });
      
      // 語音選擇邏輯
      const voiceMap = {
        'professional': 'Charon',
        'cheerful': 'Puck',
        'calm': 'Kore',
        'energetic': 'Fenrir',
        'friendly': 'Aoede',
        'serious': 'Charon'
      };
      const voiceName = voiceMap[style] || 'Kore';

      // 風格化提示
      const stylePrompts = {
        'professional': `Say professionally: ${text}`,
        'cheerful': `Say cheerfully: ${text}`,
        'calm': `Say calmly: ${text}`,
        'energetic': `Say energetically: ${text}`,
        'friendly': `Say in a friendly way: ${text}`,
        'serious': `Say seriously: ${text}`
      };
      const styledPrompt = stylePrompts[style] || text;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{
          parts: [{ text: styledPrompt }]
        }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName
              }
            }
          }
        }
      });

      if (!response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
        throw new Error('官方SDK返回無效響應');
      }

      const { data: audioData } = response.candidates[0].content.parts[0].inlineData;
      const pcmData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
      
      // 轉換為WAV格式（這裡需要引入convertL16ToWav函數）
      const { convertL16ToWav } = await import('./geminiTTS.js');
      const wavData = convertL16ToWav(pcmData, 24000, 1);
      const audioBlob = new Blob([wavData], { type: 'audio/wav' });

      return {
        audioBlob,
        mimeType: 'audio/wav',
        voiceName,
        style,
        source: API_TYPES.OFFICIAL_SDK
      };
    } catch (error) {
      console.error('官方SDK調用失敗:', error);
      throw new Error(`官方SDK TTS 生成失敗: ${error.message}`);
    }
  }

  /**
   * 調用後端TTS服務
   * @private
   */
  async _callBackendTTS(text, style, options) {
    try {
      const response = await fetch(`${this.backendUrl}/api/gemini-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          style,
          apiKey: this.getEffectiveApiKey(),
          ...options
        })
      });

      const contentType = response.headers.get('Content-Type') || '';
      if (!response.ok) {
        // 優先嘗試解析服務端錯誤信息
        if (contentType.includes('application/json')) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        const text = await response.text().catch(() => '');
        throw new Error(text || `HTTP ${response.status}`);
      }

      // 服務端返回 JSON: { success, audioData (base64), mimeType }
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (!data || !data.success || !data.audioData) {
          throw new Error(data?.error || '後端返回數據不完整');
        }
        const binary = atob(data.audioData);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const mimeType = data.mimeType || 'audio/wav';
        const audioBlob = new Blob([bytes], { type: mimeType });
        return {
          audioBlob,
          mimeType,
          voiceName: 'Unknown',
          style,
          source: API_TYPES.BACKEND
        };
      }

      // 兼容：如果服務端直接回傳二進制
      const audioBlob = await response.blob();
      const mimeType = audioBlob.type || 'audio/wav';
      return {
        audioBlob,
        mimeType,
        voiceName: 'Unknown',
        style,
        source: API_TYPES.BACKEND
      };
    } catch (error) {
      console.error('後端TTS調用失敗:', error);
      throw new Error(`後端TTS 生成失敗: ${error.message}`);
    }
  }

  /**
   * 播放音頻
   * @param {Blob} audioBlob - 音頻數據
   * @param {Function} onStart - 開始播放回調
   * @param {Function} onEnd - 播放結束回調
   * @param {Function} onError - 錯誤回調
   * @returns {Promise<void>}
   */
  async playAudio(audioBlob, onStart, onEnd, onError) {
    return new Promise((resolve, reject) => {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onloadstart = () => {
        if (onStart) onStart();
      };
      
      audio.onerror = (event) => {
        URL.revokeObjectURL(audioUrl);
        if (onError) onError(event);
        reject(new Error('音頻播放失敗'));
      };
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (onEnd) onEnd();
        resolve();
      };
      
      audio.play().catch(error => {
        URL.revokeObjectURL(audioUrl);
        if (onError) onError(error);
        reject(error);
      });
    });
  }

  /**
   * 獲取API狀態信息
   * @returns {Object} 狀態信息
   */
  getStatus() {
    return {
      apiType: this.getApiType(),
      hasUserApiKey: !!this.userApiKey,
      hasEnvApiKey: !!this.envApiKey,
      effectiveApiKey: !!this.getEffectiveApiKey(),
      isTauri: window.__TAURI__ !== undefined,
      backendUrl: this.backendUrl
    };
  }
}

// 創建全局實例
export const apiManager = new APIManager();

// 導出便捷函數
export const generateTTS = (text, style, options) => apiManager.generateTTS(text, style, options);
export const playAudio = (audioBlob, onStart, onEnd, onError) => apiManager.playAudio(audioBlob, onStart, onEnd, onError);
export const setUserApiKey = (apiKey) => apiManager.setUserApiKey(apiKey);
export const getApiStatus = () => apiManager.getStatus();

