import { GoogleGenAI } from '@google/genai';

// 将 L16 PCM 转换为 WAV 格式的工具函数
export function convertL16ToWav(inputData, sampleRate = 24000, numChannels = 1) {
  const bitsPerSample = 16;
  const blockAlign = numChannels * bitsPerSample / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = inputData.length;
  const fileSize = 36 + dataSize;
  
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  // WAV 文件头
  const headerData = [
    { method: "setUint8", value: [..."RIFF"].map(e => e.charCodeAt(0)), positions: [0, 1, 2, 3] },
    { method: "setUint32", value: [fileSize], positions: [4], littleEndian: true },
    { method: "setUint8", value: [..."WAVE"].map(e => e.charCodeAt(0)), positions: [8, 9, 10, 11] },
    { method: "setUint8", value: [..."fmt "].map(e => e.charCodeAt(0)), positions: [12, 13, 14, 15] },
    { method: "setUint32", value: [16], positions: [16], littleEndian: true },
    { method: "setUint16", value: [1, numChannels], positions: [20, 22], littleEndian: true },
    { method: "setUint32", value: [sampleRate, byteRate], positions: [24, 28], littleEndian: true },
    { method: "setUint16", value: [blockAlign, bitsPerSample], positions: [32, 34], littleEndian: true },
    { method: "setUint8", value: [..."data"].map(e => e.charCodeAt(0)), positions: [36, 37, 38, 39] },
    { method: "setUint32", value: [dataSize], positions: [40], littleEndian: true },
  ];
  
  headerData.forEach(({ method, value, positions, littleEndian }) =>
    positions.forEach((pos, i) => view[method](pos, value[i], littleEndian || false))
  );
  
  return new Uint8Array([...new Uint8Array(header), ...inputData]);
}

// 智能语音选择函数
function selectVoiceByStyle(style, text) {
  const voiceMap = {
    'professional': 'Charon',
    'cheerful': 'Puck', 
    'calm': 'Kore',
    'energetic': 'Fenrir',
    'friendly': 'Aoede',
    'serious': 'Charon'
  };
  
  return voiceMap[style] || 'Kore';
}

// 生成风格化提示
function generateStylePrompt(style, text) {
  const stylePrompts = {
    'professional': `Say professionally: ${text}`,
    'cheerful': `Say cheerfully: ${text}`,
    'calm': `Say calmly: ${text}`,
    'energetic': `Say energetically: ${text}`,
    'friendly': `Say in a friendly way: ${text}`,
    'serious': `Say seriously: ${text}`
  };
  
  return stylePrompts[style] || text;
}

// 使用 Gemini 官方 SDK 进行 TTS
export async function generateSpeechWithGemini(text, userApiKey = null, style = 'professional') {
  // 优先从环境变量获取 API 密钥，然后使用用户设置的密钥
  const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiKey = envApiKey || userApiKey;
  
  if (!apiKey) {
    throw new Error('API密鑰未配置，請在環境變量中設置 GEMINI_API_KEY 或在設置中配置 Gemini API 密鑰');
  }
  
  try {
    // 初始化 Gemini 客户端
    const ai = new GoogleGenAI({ apiKey });
    
    // 选择语音和生成提示
    const voiceName = selectVoiceByStyle(style, text);
    const styledPrompt = generateStylePrompt(style, text);
    
    // 调用 Gemini TTS API - 使用正确的配置格式
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{
        parts: [{
          text: styledPrompt
        }]
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
    
    // 检查响应
    if (!response || !response.candidates || response.candidates.length === 0) {
      throw new Error('Gemini API 返回空响应');
    }
    
    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('Gemini API 返回无效内容');
    }
    
    const part = candidate.content.parts[0];
    if (!part.inlineData || !part.inlineData.data) {
      throw new Error('Gemini API 返回无音频数据');
    }
    
    const { data: audioData, mimeType } = part.inlineData;
    
    // 处理音频数据 - Gemini TTS 返回的是 PCM 格式
    const pcmData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    const wavData = convertL16ToWav(pcmData, 24000, 1);
    const audioBlob = new Blob([wavData], { type: 'audio/wav' });
    
    return {
      audioBlob,
      mimeType: 'audio/wav',
      voiceName,
      style
    };
    
  } catch (error) {
    console.error('Gemini TTS SDK 错误:', error);
    
    // 根据错误类型抛出具体错误
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('401')) {
      throw new Error('API密鑰無效，請檢查您的 Gemini API 密鑰');
    } else if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('429')) {
      throw new Error('API 配額已用完，請稍後再試');
    } else if (error.message.includes('MODEL_NOT_FOUND') || error.message.includes('404')) {
      throw new Error('TTS 模型不可用，請稍後再試');
    } else {
      throw new Error(`Gemini TTS 生成失敗: ${error.message}`);
    }
  }
}

// 播放音频的工具函数
export async function playAudioBlob(audioBlob, onStart, onEnd, onError) {
  return new Promise((resolve, reject) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onloadstart = () => {
      if (onStart) onStart();
    };
    
    audio.onerror = (event) => {
      URL.revokeObjectURL(audioUrl);
      if (onError) onError(event);
      reject(new Error('音频播放失败'));
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