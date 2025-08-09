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

// 緩存配置
const CACHE_CONFIG = {
  PREFIX: 'gemini_tts_cache_',
  EXPIRY_HOURS: 24*30, // 緩存30天
  MAX_CACHE_SIZE: 50000, // 最多緩存50000個音頻文件
  STORAGE_KEY: 'gemini_tts_cache_index'
};

// API 管理器類
export class APIManager {
  constructor() {
    this.userApiKey = null;
    this.envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    this.backendUrl = 'http://localhost:3001';
    this.cacheEnabled = true;
    
    // 初始化緩存
    this._initCache();
  }

  /**
   * 初始化緩存系統
   * @private
   */
  _initCache() {
    try {
      // 清理過期緩存
      this._cleanExpiredCache();
    } catch (error) {
      console.warn('緩存初始化失敗:', error);
    }
  }

  /**
   * 生成緩存鍵
   * @private
   * @param {string} text - 文本內容
   * @param {string} style - 語音風格
   * @param {string} apiType - API類型
   * @returns {string} 緩存鍵
   */
  _generateCacheKey(text, style, apiType) {
    // 使用文本、風格和API類型生成唯一鍵
    const content = `${text}_${style}_${apiType}`;
    // 簡單的哈希函數
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 轉換為32位整數
    }
    return `${CACHE_CONFIG.PREFIX}${Math.abs(hash)}`;
  }

  /**
   * 從緩存獲取音頻數據
   * @private
   * @param {string} cacheKey - 緩存鍵
   * @returns {Object|null} 緩存的音頻數據
   */
  _getCachedAudio(cacheKey) {
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (!cachedData) return null;

      const parsed = JSON.parse(cachedData);
      const now = Date.now();
      
      // 檢查是否過期
      if (now > parsed.expiry) {
        localStorage.removeItem(cacheKey);
        this._removeCacheIndex(cacheKey);
        return null;
      }

      // 將base64轉換回Blob
      const audioData = Uint8Array.from(atob(parsed.audioData), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioData], { type: parsed.mimeType });

      return {
        audioBlob,
        mimeType: parsed.mimeType,
        voiceName: parsed.voiceName,
        style: parsed.style,
        source: parsed.source + '_cached'
      };
    } catch (error) {
      console.warn('讀取緩存失敗:', error);
      return null;
    }
  }

  /**
   * 緩存音頻數據
   * @private
   * @param {string} cacheKey - 緩存鍵
   * @param {Object} audioResult - 音頻結果
   */
  async _cacheAudio(cacheKey, audioResult) {
    try {
      // 檢查緩存大小限制
      await this._ensureCacheSize();

      // 將Blob轉換為base64
      const arrayBuffer = await audioResult.audioBlob.arrayBuffer();
      const audioData = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const cacheData = {
        audioData,
        mimeType: audioResult.mimeType,
        voiceName: audioResult.voiceName,
        style: audioResult.style,
        source: audioResult.source,
        timestamp: Date.now(),
        expiry: Date.now() + (CACHE_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000)
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      this._addCacheIndex(cacheKey);
      
      console.log(`音頻已緩存: ${cacheKey}`);
    } catch (error) {
      console.warn('緩存音頻失敗:', error);
    }
  }

  /**
   * 獲取緩存索引
   * @private
   * @returns {Array} 緩存鍵列表
   */
  _getCacheIndex() {
    try {
      const index = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
      return index ? JSON.parse(index) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 添加緩存索引
   * @private
   * @param {string} cacheKey - 緩存鍵
   */
  _addCacheIndex(cacheKey) {
    const index = this._getCacheIndex();
    if (!index.includes(cacheKey)) {
      index.push(cacheKey);
      localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(index));
    }
  }

  /**
   * 移除緩存索引
   * @private
   * @param {string} cacheKey - 緩存鍵
   */
  _removeCacheIndex(cacheKey) {
    const index = this._getCacheIndex();
    const newIndex = index.filter(key => key !== cacheKey);
    localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(newIndex));
  }

  /**
   * 確保緩存大小不超過限制
   * @private
   */
  async _ensureCacheSize() {
    const index = this._getCacheIndex();
    if (index.length >= CACHE_CONFIG.MAX_CACHE_SIZE) {
      // 移除最舊的緩存項
      const oldestKey = index[0];
      localStorage.removeItem(oldestKey);
      this._removeCacheIndex(oldestKey);
      console.log(`移除舊緩存: ${oldestKey}`);
    }
  }

  /**
   * 清理過期緩存
   * @private
   */
  _cleanExpiredCache() {
    const index = this._getCacheIndex();
    const now = Date.now();
    let cleanedCount = 0;

    index.forEach(cacheKey => {
      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (now > parsed.expiry) {
            localStorage.removeItem(cacheKey);
            this._removeCacheIndex(cacheKey);
            cleanedCount++;
          }
        }
      } catch (error) {
        // 如果解析失敗，也移除這個緩存項
        localStorage.removeItem(cacheKey);
        this._removeCacheIndex(cacheKey);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`清理了 ${cleanedCount} 個過期緩存項`);
    }
  }

  /**
   * 設置用戶API密鑰
   * @param {string} apiKey - 用戶輸入的API密鑰
   */
  setUserApiKey(apiKey) {
    this.userApiKey = apiKey;
  }

  /**
   * 設置緩存開關
   * @param {boolean} enabled - 是否啟用緩存
   */
  setCacheEnabled(enabled) {
    this.cacheEnabled = enabled;
  }

  /**
   * 清空所有緩存
   */
  clearCache() {
    const index = this._getCacheIndex();
    index.forEach(cacheKey => {
      localStorage.removeItem(cacheKey);
    });
    localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
    console.log('已清空所有TTS緩存');
  }

  /**
   * 獲取緩存統計信息
   * @returns {Object} 緩存統計
   */
  getCacheStats() {
    const index = this._getCacheIndex();
    let totalSize = 0;
    let validCount = 0;
    const now = Date.now();

    index.forEach(cacheKey => {
      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (now <= parsed.expiry) {
            validCount++;
            totalSize += cachedData.length;
          }
        }
      } catch (error) {
        // 忽略解析錯誤
      }
    });

    return {
      totalItems: validCount,
      totalSize: Math.round(totalSize / 1024), // KB
      maxItems: CACHE_CONFIG.MAX_CACHE_SIZE,
      expiryHours: CACHE_CONFIG.EXPIRY_HOURS
    };
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
   * 統一的TTS調用接口（帶緩存）
   * @param {string} text - 要轉換的文本
   * @param {string} style - 語音風格
   * @param {Object} options - 額外選項
   * @returns {Promise<Object>} 音頻結果
   */
  async generateTTS(text, style = 'professional', options = {}) {
    const apiType = this.getApiType();
    
    // 如果啟用緩存，先檢查緩存
    if (this.cacheEnabled) {
      const cacheKey = this._generateCacheKey(text, style, apiType);
      const cachedResult = this._getCachedAudio(cacheKey);
      
      if (cachedResult) {
        console.log(`使用緩存音頻: ${cacheKey}`);
        return cachedResult;
      }
    }
    
    // 緩存中沒有，調用API
    let result;
    switch (apiType) {
      case API_TYPES.TAURI:
        result = await this._callTauriTTS(text, style, options);
        break;
      case API_TYPES.OFFICIAL_SDK:
        result = await this._callOfficialSDK(text, style, options);
        break;
      case API_TYPES.BACKEND:
        result = await this._callBackendTTS(text, style, options);
        break;
      default:
        throw new Error(`不支持的API類型: ${apiType}`);
    }
    
    // 如果啟用緩存，將結果緩存
    if (this.cacheEnabled && result) {
      const cacheKey = this._generateCacheKey(text, style, apiType);
      await this._cacheAudio(cacheKey, result);
    }
    
    return result;
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

// 緩存管理函數
export const setCacheEnabled = (enabled) => apiManager.setCacheEnabled(enabled);
export const clearTTSCache = () => apiManager.clearCache();
export const getTTSCacheStats = () => apiManager.getCacheStats();
export const cleanExpiredTTSCache = () => apiManager._cleanExpiredCache();