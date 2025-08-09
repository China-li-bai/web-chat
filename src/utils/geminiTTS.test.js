import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertL16ToWav, generateSpeechWithGemini, playAudioBlob } from './geminiTTS.js';
import { GoogleGenAI } from '@google/genai';

// Mock Google GenAI
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn()
}));

// Mock global objects
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
  value: vi.fn((data, options) => ({ data, options })),
  writable: true
});

describe('geminiTTS API 测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('convertL16ToWav', () => {
    it('应该正确转换 L16 PCM 数据为 WAV 格式', () => {
      const inputData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const result = convertL16ToWav(inputData, 24000, 1);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(44 + inputData.length); // WAV header (44 bytes) + data
      
      // 检查 WAV 文件头标识
      const header = result.slice(0, 4);
      expect(String.fromCharCode(...header)).toBe('RIFF');
    });

    it('应该使用默认参数', () => {
      const inputData = new Uint8Array([1, 2, 3, 4]);
      const result = convertL16ToWav(inputData);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(48); // 44 + 4
    });

    it('应该处理不同的采样率和声道数', () => {
      const inputData = new Uint8Array([1, 2, 3, 4]);
      const result = convertL16ToWav(inputData, 48000, 2);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(48);
    });
  });

  describe('generateSpeechWithGemini', () => {
    let mockAI;
    let mockGenerateContent;

    beforeEach(() => {
      mockGenerateContent = vi.fn();
      mockAI = {
        models: {
          generateContent: mockGenerateContent
        }
      };
      GoogleGenAI.mockImplementation(() => mockAI);
    });

    it('应该在没有 API 密钥时抛出错误', async () => {
      // Mock import.meta.env by temporarily setting it to undefined
      const originalEnv = import.meta.env;
      Object.defineProperty(import.meta, 'env', {
        value: {},
        writable: true,
        configurable: true
      });

      try {
        await expect(generateSpeechWithGemini('Hello', null)).rejects.toThrow(
          'API密鑰未配置'
        );
      } finally {
        // Restore original env
        Object.defineProperty(import.meta, 'env', {
          value: originalEnv,
          writable: true,
          configurable: true
        });
      }
    });

    it('应该成功生成语音', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                data: btoa('mock-audio-data'),
                mimeType: 'audio/pcm'
              }
            }]
          }
        }]
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await generateSpeechWithGemini('Hello', 'test-api-key');

      expect(result).toHaveProperty('audioBlob');
      expect(result).toHaveProperty('mimeType', 'audio/wav');
      expect(result).toHaveProperty('voiceName', 'Charon'); // professional style default
      expect(result).toHaveProperty('style', 'professional');
    });

    it('应该根据风格选择正确的语音', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                data: btoa('mock-audio-data'),
                mimeType: 'audio/pcm'
              }
            }]
          }
        }]
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await generateSpeechWithGemini('Hello', 'test-api-key', 'cheerful');

      expect(result.voiceName).toBe('Puck');
      expect(result.style).toBe('cheerful');
    });

    it('应该处理 API 错误', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API_KEY_INVALID'));

      await expect(generateSpeechWithGemini('Hello', 'invalid-key')).rejects.toThrow(
        'API密鑰無效，請檢查您的 Gemini API 密鑰'
      );
    });

    it('应该处理配额超限错误', async () => {
      mockGenerateContent.mockRejectedValue(new Error('QUOTA_EXCEEDED'));

      await expect(generateSpeechWithGemini('Hello', 'test-key')).rejects.toThrow(
        'API 配額已用完，請稍後再試'
      );
    });

    it('应该处理模型不可用错误', async () => {
      mockGenerateContent.mockRejectedValue(new Error('MODEL_NOT_FOUND'));

      await expect(generateSpeechWithGemini('Hello', 'test-key')).rejects.toThrow(
        'TTS 模型不可用，請稍後再試'
      );
    });

    it('应该处理空响应', async () => {
      mockGenerateContent.mockResolvedValue(null);

      await expect(generateSpeechWithGemini('Hello', 'test-key')).rejects.toThrow(
        'Gemini API 返回空响应'
      );
    });

    it('应该处理无效内容响应', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: []
          }
        }]
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      await expect(generateSpeechWithGemini('Hello', 'test-key')).rejects.toThrow(
        'Gemini API 返回无效内容'
      );
    });

    it('应该处理无音频数据响应', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'no audio data'
            }]
          }
        }]
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      await expect(generateSpeechWithGemini('Hello', 'test-key')).rejects.toThrow(
        'Gemini API 返回无音频数据'
      );
    });
  });

  describe('playAudioBlob', () => {
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

    it('应该成功播放音频', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      
      const playPromise = playAudioBlob(mockBlob, onStart, onEnd, onError);
      
      // 模拟音频加载开始
      if (mockAudio.onloadstart) {
        mockAudio.onloadstart();
      }
      
      // 模拟音频播放结束
      if (mockAudio.onended) {
        mockAudio.onended();
      }
      
      await expect(playPromise).resolves.toBeUndefined();
      expect(onStart).toHaveBeenCalled();
      expect(onEnd).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('应该处理音频播放错误', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      const mockError = new Error('播放失败');
      
      const playPromise = playAudioBlob(mockBlob, onStart, onEnd, onError);
      
      // 模拟音频错误
      if (mockAudio.onerror) {
        mockAudio.onerror(mockError);
      }
      
      await expect(playPromise).rejects.toThrow('音频播放失败');
      expect(onError).toHaveBeenCalledWith(mockError);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('应该处理 play() 方法失败', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      const mockError = new Error('play() 失败');
      
      mockAudio.play.mockRejectedValue(mockError);
      
      await expect(playAudioBlob(mockBlob, onStart, onEnd, onError)).rejects.toThrow('play() 失败');
      expect(onError).toHaveBeenCalledWith(mockError);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('应该在没有回调函数时正常工作', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      
      const playPromise = playAudioBlob(mockBlob);
      
      // 模拟音频播放结束
      if (mockAudio.onended) {
        mockAudio.onended();
      }
      
      await expect(playPromise).resolves.toBeUndefined();
    });
  });
});