import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { APIManager, API_TYPES, apiManager, generateTTS, playAudio, setUserApiKey, getApiStatus } from './apiManager.js';
import { GoogleGenAI } from '@google/genai';

// Mock dependencies
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn()
}));

vi.mock('./geminiTTS.js', () => ({
  convertL16ToWav: vi.fn((data) => new Uint8Array([1, 2, 3, 4]))
}));

// Mock global objects
Object.defineProperty(global, 'fetch', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  },
  writable: true
});

Object.defineProperty(global, 'Audio', {
  value: vi.fn(() => ({
    play: vi.fn(() => Promise.resolve()),
    onloadstart: null,
    onerror: null,
    onended: null
  })),
  writable: true
});

Object.defineProperty(global, 'Blob', {
  value: vi.fn((data, options) => ({ data, options, type: options?.type || 'application/octet-stream' })),
  writable: true
});

Object.defineProperty(global, 'atob', {
  value: vi.fn(() => 'mock-decoded-data'),
  writable: true
});

describe('APIManager 測試', () => {
  let manager;
  
  beforeEach(() => {
    vi.clearAllMocks();
    manager = new APIManager();
    
    // Mock import.meta.env
    Object.defineProperty(import.meta, 'env', {
      value: { VITE_GEMINI_API_KEY: 'env-api-key' },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('APIManager 基本功能', () => {
    it('應該正確初始化', () => {
      expect(manager.userApiKey).toBeNull();
      expect(manager.envApiKey).toBe('env-api-key');
      expect(manager.backendUrl).toBe('http://localhost:3001');
    });

    it('應該正確設置用戶API密鑰', () => {
      manager.setUserApiKey('user-api-key');
      expect(manager.userApiKey).toBe('user-api-key');
    });

    it('應該正確獲取有效API密鑰', () => {
      // 沒有用戶密鑰時，返回環境變量密鑰
      expect(manager.getEffectiveApiKey()).toBe('env-api-key');
      
      // 有用戶密鑰時，優先返回用戶密鑰
      manager.setUserApiKey('user-api-key');
      expect(manager.getEffectiveApiKey()).toBe('user-api-key');
    });
  });

  describe('API類型判斷', () => {
    it('應該在Tauri環境中返回TAURI類型', () => {
      // Mock Tauri environment
      Object.defineProperty(window, '__TAURI__', {
        value: {},
        writable: true,
        configurable: true
      });
      
      expect(manager.getApiType()).toBe(API_TYPES.TAURI);
      
      // Clean up
      delete window.__TAURI__;
    });

    it('應該在有用戶API密鑰時返回OFFICIAL_SDK類型', () => {
      manager.setUserApiKey('user-api-key');
      expect(manager.getApiType()).toBe(API_TYPES.OFFICIAL_SDK);
    });

    it('應該在沒有用戶API密鑰時返回BACKEND類型', () => {
      expect(manager.getApiType()).toBe(API_TYPES.BACKEND);
    });
  });

  describe('Tauri TTS 調用', () => {
    beforeEach(() => {
      Object.defineProperty(window, '__TAURI__', {
        value: {},
        writable: true,
        configurable: true
      });
    });

    afterEach(() => {
      delete window.__TAURI__;
    });

    it('應該成功調用Tauri TTS', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      invoke.mockResolvedValue({
        audioData: new Uint8Array([1, 2, 3, 4]),
        voiceName: 'Charon'
      });

      const result = await manager.generateTTS('Hello', 'professional');
      
      expect(invoke).toHaveBeenCalledWith('generate_tts', {
        text: 'Hello',
        style: 'professional',
        apiKey: 'env-api-key'
      });
      
      expect(result.source).toBe(API_TYPES.TAURI);
      expect(result.voiceName).toBe('Charon');
      expect(result.style).toBe('professional');
    });

    it('應該在沒有API密鑰時拋出錯誤', async () => {
      // Mock no API key
      Object.defineProperty(import.meta, 'env', {
        value: {},
        writable: true,
        configurable: true
      });
      manager.envApiKey = null;
      
      await expect(manager.generateTTS('Hello')).rejects.toThrow('API密鑰未配置');
    });
  });

  describe('官方SDK調用', () => {
    let mockAI;
    let mockGenerateContent;

    beforeEach(() => {
      manager.setUserApiKey('user-api-key');
      
      mockGenerateContent = vi.fn();
      mockAI = {
        models: {
          generateContent: mockGenerateContent
        }
      };
      GoogleGenAI.mockImplementation(() => mockAI);
    });

    it('應該成功調用官方SDK', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                data: btoa('mock-audio-data')
              }
            }]
          }
        }]
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);
      
      const result = await manager.generateTTS('Hello', 'cheerful');
      
      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'user-api-key' });
      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{
          parts: [{ text: 'Say cheerfully: Hello' }]
        }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck'
              }
            }
          }
        }
      });
      
      expect(result.source).toBe(API_TYPES.OFFICIAL_SDK);
      expect(result.voiceName).toBe('Puck');
      expect(result.style).toBe('cheerful');
    });

    it('應該在沒有用戶API密鑰時拋出錯誤', async () => {
      manager.setUserApiKey(null);
      
      await expect(manager.generateTTS('Hello')).rejects.toThrow('後端TTS 生成失敗');
    });

    it('應該處理無效響應', async () => {
      mockGenerateContent.mockResolvedValue({ candidates: [] });
      
      await expect(manager.generateTTS('Hello')).rejects.toThrow('官方SDK返回無效響應');
    });
  });

  describe('後端TTS調用', () => {
    beforeEach(() => {
      // 確保不在Tauri環境且沒有用戶API密鑰
      delete window.__TAURI__;
      manager.setUserApiKey(null);
    });

    it('應該成功調用後端TTS', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      const mockResponse = {
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
        headers: {
          get: vi.fn().mockReturnValue('Kore')
        }
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      
      const result = await manager.generateTTS('Hello', 'calm');
      
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/gemini-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'Hello',
          style: 'calm'
        })
      });
      
      expect(result.source).toBe(API_TYPES.BACKEND);
      expect(result.voiceName).toBe('Kore');
      expect(result.style).toBe('calm');
    });

    it('應該處理HTTP錯誤', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Server Error' })
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      
      await expect(manager.generateTTS('Hello')).rejects.toThrow('Server Error');
    });

    it('應該處理網絡錯誤', async () => {
      global.fetch.mockRejectedValue(new Error('Network Error'));
      
      await expect(manager.generateTTS('Hello')).rejects.toThrow('後端TTS 生成失敗: Network Error');
    });
  });

  describe('音頻播放', () => {
    let mockAudio;
    let onStart, onEnd, onError;

    beforeEach(() => {
      mockAudio = {
        play: vi.fn(() => Promise.resolve()),
        onloadstart: null,
        onerror: null,
        onended: null
      };
      global.Audio.mockImplementation(() => mockAudio);
      
      onStart = vi.fn();
      onEnd = vi.fn();
      onError = vi.fn();
    });

    it('應該成功播放音頻', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      
      const playPromise = manager.playAudio(mockBlob, onStart, onEnd, onError);
      
      // 模擬音頻事件
      if (mockAudio.onloadstart) mockAudio.onloadstart();
      if (mockAudio.onended) mockAudio.onended();
      
      await expect(playPromise).resolves.toBeUndefined();
      expect(onStart).toHaveBeenCalled();
      expect(onEnd).toHaveBeenCalled();
    });

    it('應該處理播放錯誤', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      const mockError = new Error('播放失敗');
      
      const playPromise = manager.playAudio(mockBlob, onStart, onEnd, onError);
      
      // 模擬音頻錯誤
      if (mockAudio.onerror) mockAudio.onerror(mockError);
      
      await expect(playPromise).rejects.toThrow('音頻播放失敗');
      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('狀態獲取', () => {
    it('應該返回正確的狀態信息', () => {
      manager.setUserApiKey('user-key');
      
      const status = manager.getStatus();
      
      expect(status).toEqual({
        apiType: API_TYPES.OFFICIAL_SDK,
        hasUserApiKey: true,
        hasEnvApiKey: true,
        effectiveApiKey: true,
        isTauri: false,
        backendUrl: 'http://localhost:3001'
      });
    });
  });

  describe('全局實例和便捷函數', () => {
    it('應該正確導出全局實例', () => {
      expect(apiManager).toBeInstanceOf(APIManager);
    });

    it('應該正確執行便捷函數', () => {
      const spy = vi.spyOn(apiManager, 'setUserApiKey');
      setUserApiKey('test-key');
      expect(spy).toHaveBeenCalledWith('test-key');
    });

    it('應該正確獲取狀態', () => {
      const spy = vi.spyOn(apiManager, 'getStatus');
      getApiStatus();
      expect(spy).toHaveBeenCalled();
    });
  });
});