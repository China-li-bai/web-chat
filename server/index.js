import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';



// 导入语音服务类
const SpeechServices = require('./services/speechServices.js');

// ES模块中获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加載環境變量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:1420",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传音频文件'));
    }
  }
});

// API配置 - 優先從環境變量讀取，然後允許頁面配置覆蓋
const API_CONFIG = {
  // 百度语音API配置
  baidu: {
    appId: process.env.BAIDU_APP_ID || 'YOUR_BAIDU_APP_ID',
    apiKey: process.env.BAIDU_API_KEY || 'YOUR_BAIDU_API_KEY',
    secretKey: process.env.BAIDU_SECRET_KEY || 'YOUR_BAIDU_SECRET_KEY'
  },
  // 科大讯飞API配置
  xunfei: {
    appId: process.env.XUNFEI_APP_ID || 'YOUR_XUNFEI_APP_ID',
    apiKey: process.env.XUNFEI_API_KEY || 'YOUR_XUNFEI_API_KEY',
    apiSecret: process.env.XUNFEI_API_SECRET || 'YOUR_XUNFEI_API_SECRET'
  },
  // 腾讯云API配置
  tencent: {
    secretId: process.env.TENCENT_SECRET_ID || 'YOUR_TENCENT_SECRET_ID',
    secretKey: process.env.TENCENT_SECRET_KEY || 'YOUR_TENCENT_SECRET_KEY',
    region: process.env.TENCENT_REGION || 'ap-beijing'
  },
  // Google Gemini API配置
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || null
  }
};

// 獲取有效的API配置（環境變量優先，然後是頁面傳入的配置）
function getEffectiveConfig(service, userConfig = {}) {
  const defaultConfig = API_CONFIG[service] || {};
  const result = { ...defaultConfig };
  
  // 只有当用户配置中的值不为 undefined 或 null 时才覆盖默认配置
  Object.keys(userConfig).forEach(key => {
    if (userConfig[key] !== undefined && userConfig[key] !== null) {
      result[key] = userConfig[key];
    }
  });
  
  return result;
}

// 模拟数据存储
let practiceRecords = [];
let userStats = {
  totalSessions: 0,
  totalMinutes: 0,
  averageScore: 0,
  streak: 0
};

// 工具函数
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function calculateScore(transcription, referenceText) {
  // 简单的评分算法，实际应用中需要更复杂的算法
  const similarity = calculateSimilarity(transcription.toLowerCase(), referenceText.toLowerCase());
  const baseScore = Math.max(0, Math.min(100, similarity * 100));
  
  return {
    overall: Math.round(baseScore),
    pronunciation: Math.round(baseScore * 0.9 + Math.random() * 10),
    fluency: Math.round(baseScore * 0.95 + Math.random() * 10),
    completeness: Math.round(baseScore * 1.05 - Math.random() * 5)
  };
}

function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// 百度语音识别API调用
async function baiduSpeechToText(audioBuffer, config = {}) {
  try {
    // 使用有效配置（環境變量 + 用戶配置）
    const { apiKey, secretKey, appId } = config;
    
    console.log('调用百度语音识别API', { hasApiKey: !!apiKey, hasSecretKey: !!secretKey, hasAppId: !!appId });
    
    // 这里是百度语音识别API的调用逻辑
    // 实际使用时需要替换为真实的API调用
    
    // 模拟API响应
    return {
      result: ['Hello, how are you today?'],
      error: null
    };
  } catch (error) {
    console.error('百度语音识别失败:', error);
    return {
      result: null,
      error: error.message
    };
  }
}

// 科大讯飞语音合成API调用
async function xunfeiTextToSpeech(text, config = {}) {
  try {
    // 使用有效配置（環境變量 + 用戶配置）
    const { apiKey, apiSecret, appId } = config;
    
    console.log('调用科大讯飞语音合成API:', text, { hasApiKey: !!apiKey, hasApiSecret: !!apiSecret, hasAppId: !!appId });
    
    // 这里是科大讯飞语音合成API的调用逻辑
    // 实际使用时需要替换为真实的API调用
    
    // 模拟API响应
    return {
      audio: 'base64_audio_data_here',
      error: null
    };
  } catch (error) {
    console.error('科大讯飞语音合成失败:', error);
    return {
      audio: null,
      error: error.message
    };
  }
}

// API路由

// 语音识别接口
app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传音频文件' });
    }
    
    // 獲取用戶配置（如果有的話）
    const { provider = 'baidu', config = {} } = req.body;
    const effectiveConfig = getEffectiveConfig(provider, config);
    
    const audioBuffer = fs.readFileSync(req.file.path);
    const result = await baiduSpeechToText(audioBuffer, effectiveConfig);
    
    // 清理临时文件
    fs.unlinkSync(req.file.path);
    
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json({ text: result.result[0] || '' });
  } catch (error) {
    console.error('语音识别错误:', error);
    res.status(500).json({ error: '语音识别失败' });
  }
});

// 语音合成接口
app.post('/api/text-to-speech', async (req, res) => {
  try {
    const { text, voice = 'female', provider = 'xunfei', config = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '文本不能为空' });
    }
    
    // 獲取有效配置（環境變量優先，然後是用戶配置）
    const effectiveConfig = getEffectiveConfig(provider, config);
    
    const result = await xunfeiTextToSpeech(text, effectiveConfig);
    
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json({ audio: result.audio });
  } catch (error) {
    console.error('语音合成错误:', error);
    res.status(500).json({ error: '语音合成失败' });
  }
});

// Gemini AI 语音合成接口
app.post('/api/gemini-tts', async (req, res) => {
  try {
    const { text, apiKey, voice, speaker, style, config = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '文本不能为空' });
    }
    
    // 使用統一的配置策略（環境變量優先，然後是用戶配置）
    const userConfig = { apiKey, ...config };
    const effectiveConfig = getEffectiveConfig('gemini', userConfig);
    
    console.log('有效配置:', { hasApiKey: !!effectiveConfig.apiKey, apiKeyPrefix: effectiveConfig.apiKey ? effectiveConfig.apiKey.substring(0, 10) + '...' : 'null' });
    
    if (!effectiveConfig.apiKey) {
      return res.status(400).json({ error: 'API密鑰不能為空，請在請求中提供或在環境變量中配置 GEMINI_API_KEY' });
    }
    
    // 根據官方文檔，可用的預構建語音選項
    const availableVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];
    
    // 智能語音選擇：根據文本內容和風格選擇最適合的語音
    let selectedVoice = voice;
    if (!selectedVoice || !availableVoices.includes(selectedVoice)) {
      // 根據風格和內容智能選擇語音
      if (style === 'cheerful' || style === 'friendly') {
        selectedVoice = 'Aoede'; // 最適合友好、愉快的語調
      } else if (style === 'professional' || style === 'formal') {
        selectedVoice = 'Kore'; // 專業、正式的語調
      } else if (style === 'warm' || style === 'conversational') {
        selectedVoice = 'Puck'; // 溫暖、對話式的語調
      } else if (style === 'authoritative' || style === 'serious') {
        selectedVoice = 'Charon'; // 權威、嚴肅的語調
      } else if (style === 'dynamic' || style === 'energetic') {
        selectedVoice = 'Fenrir'; // 動態、有活力的語調
      } else {
        // 默認選擇：根據文本長度和內容類型
        if (text.length > 200) {
          selectedVoice = 'Kore'; // 長文本使用清晰、專業的語音
        } else if (text.includes('!') || text.includes('?')) {
          selectedVoice = 'Aoede'; // 包含感嘆號或問號的文本使用表達力強的語音
        } else {
          selectedVoice = 'Puck'; // 默認使用溫暖、自然的語音
        }
      }
    }
    
    console.log(`選擇的語音: ${selectedVoice} (原始請求: ${voice}, 風格: ${style})`);
    
    // 構建優化的文本提示，增強語音表現力
    let enhancedText = text;
    if (style) {
      const stylePrompts = {
        cheerful: 'Say cheerfully and with enthusiasm: ',
        friendly: 'Say in a warm and friendly tone: ',
        professional: 'Say in a clear and professional manner: ',
        formal: 'Say formally and respectfully: ',
        warm: 'Say with warmth and care: ',
        conversational: 'Say in a natural, conversational way: ',
        authoritative: 'Say with confidence and authority: ',
        serious: 'Say seriously and thoughtfully: ',
        dynamic: 'Say with energy and dynamism: ',
        energetic: 'Say with high energy and excitement: '
      };
      
      if (stylePrompts[style]) {
        enhancedText = stylePrompts[style] + text;
      }
    }
    
    // 構建 Gemini TTS API 請求 - 根據官方文檔格式
    const geminiRequest = {
      contents: [{
        parts: [{ text: enhancedText }]
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: selectedVoice
            }
          }
        }
      }
    };
    
    // 如果指定了說話者，使用多說話者配置
    if (speaker) {
      geminiRequest.generationConfig.speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [{
            speaker: speaker,
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: selectedVoice
              }
            }
          }]
        }
      };
    }
    
    console.log('Gemini TTS 請求配置:', JSON.stringify(geminiRequest, null, 2));
    
    // 使用 Gemini 代理服務或官方 API
    const geminiProxyUrl = process.env.GEMINI_PROXY_URL || 'https://gemini.66666618.xyz';
    const useProxy = process.env.USE_GEMINI_PROXY !== 'false'; // 默認使用代理
    
    let geminiUrl;
    if (useProxy) {
      // 使用代理服務
      geminiUrl = `${geminiProxyUrl}/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${effectiveConfig.apiKey}`;
      console.log('使用 Gemini 代理服務:', geminiProxyUrl);
    } else {
      // 使用官方 API
      geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${effectiveConfig.apiKey}`;
      console.log('使用 Gemini 官方 API');
    }
    
    console.log('使用的API URL:', geminiUrl);
    
    // 配置代理和請求選項
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(geminiRequest),
      timeout: 30000 // 30秒超時
    };
    
    // 如果設置了代理，使用代理
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.PROXY_URL;
    if (proxyUrl) {
      console.log('使用代理:', proxyUrl.replace(/:\/\/.*@/, '://***@')); // 隱藏認證信息
      
      // 動態導入 https-proxy-agent
      try {
        const { HttpsProxyAgent } = await import('https-proxy-agent');
        fetchOptions.agent = new HttpsProxyAgent(proxyUrl);
      } catch (importError) {
        console.warn('https-proxy-agent 未安裝，嘗試使用環境變量代理');
        // 設置環境變量，讓 Node.js 自動使用代理
        if (!process.env.HTTPS_PROXY && !process.env.HTTP_PROXY) {
          process.env.HTTPS_PROXY = proxyUrl;
        }
      }
    }
    
    console.log('發送請求到 Gemini API...');
    const response = await fetch(geminiUrl, fetchOptions);
    
    console.log('API 響應狀態:', response.status);
    console.log('API 響應頭:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API 錯誤響應:', errorText);
      throw new Error(`Gemini API 錯誤: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API 響應數據結構:', JSON.stringify(data, null, 2));

    // 根據官方文檔，音頻數據在 candidates[0].content.parts[0].inlineData.data
    if (data.candidates && 
        data.candidates[0] && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts[0] && 
        data.candidates[0].content.parts[0].inlineData && 
        data.candidates[0].content.parts[0].inlineData.data) {
      
      const audioData = data.candidates[0].content.parts[0].inlineData.data;
      console.log('成功獲取音頻數據，長度:', audioData.length);
      
      res.json({
        success: true,
        audioData: audioData,
        mimeType: data.candidates[0].content.parts[0].inlineData.mimeType || 'audio/wav'
      });
    } else {
      console.error('響應中未找到音頻數據:', data);
      res.status(500).json({
        success: false,
        error: '響應中未找到音頻數據',
        responseStructure: data
      });
    }
    
  } catch (error) {
    console.error('Gemini TTS API 調用失敗:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

// 发音评分接口
app.post('/api/pronunciation-score', async (req, res) => {
  try {
    const { transcription, referenceText } = req.body;
    
    if (!transcription || !referenceText) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const scores = calculateScore(transcription, referenceText);
    
    res.json(scores);
  } catch (error) {
    console.error('发音评分错误:', error);
    res.status(500).json({ error: '发音评分失败' });
  }
});

// 保存练习记录接口
app.post('/api/practice-records', (req, res) => {
  try {
    const record = {
      id: generateId(),
      ...req.body,
      timestamp: new Date().toISOString()
    };
    
    practiceRecords.push(record);
    
    // 更新统计数据
    userStats.totalSessions += 1;
    userStats.totalMinutes += record.duration || 0;
    userStats.averageScore = Math.round(
      practiceRecords.reduce((sum, r) => sum + (r.score || 0), 0) / practiceRecords.length
    );
    
    res.json({ success: true, record });
  } catch (error) {
    console.error('保存练习记录错误:', error);
    res.status(500).json({ error: '保存练习记录失败' });
  }
});

// 获取练习记录接口
app.get('/api/practice-records', (req, res) => {
  try {
    const { page = 1, limit = 10, topic } = req.query;
    
    let filteredRecords = practiceRecords;
    if (topic && topic !== 'all') {
      filteredRecords = practiceRecords.filter(r => r.topic === topic);
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
    
    res.json({
      records: paginatedRecords,
      total: filteredRecords.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('获取练习记录错误:', error);
    res.status(500).json({ error: '获取练习记录失败' });
  }
});

// 获取统计数据接口
app.get('/api/stats', (req, res) => {
  try {
    res.json(userStats);
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// 配置检查接口
app.get('/api/config-check', (req, res) => {
  try {
    const config = {
      geminiApiKey: process.env.GEMINI_API_KEY ? '已配置' : '未配置',
      geminiApiKeyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : null,
      useGeminiProxy: process.env.USE_GEMINI_PROXY !== 'false',
      geminiProxyUrl: process.env.GEMINI_PROXY_URL || 'https://gemini.66666618.xyz',
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3001
    };
    res.json(config);
  } catch (error) {
    console.error('获取配置信息错误:', error);
    res.status(500).json({ error: '获取配置信息失败' });
  }
});

// WebSocket连接处理
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);
  
  // 实时语音识别
  socket.on('start-realtime-recognition', () => {
    console.log('开始实时语音识别');
    socket.emit('recognition-started');
  });
  
  socket.on('audio-chunk', async (audioData) => {
    try {
      // 处理实时音频数据
      // 这里可以实现实时语音识别
      console.log('收到音频数据块');
      
      // 模拟实时识别结果
      socket.emit('recognition-result', {
        text: 'Real-time recognition result...',
        isFinal: false
      });
    } catch (error) {
      socket.emit('recognition-error', { error: error.message });
    }
  });
  
  socket.on('stop-realtime-recognition', () => {
    console.log('停止实时语音识别');
    socket.emit('recognition-stopped');
  });
  
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`🚀 AI口语练习服务器启动成功!`);
  console.log(`📡 服务器地址: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket服务已启用`);
  console.log(`📁 文件上传目录: ${path.join(__dirname, 'uploads')}`);
  
  // 显示环境变量配置状态
  console.log(`🔑 GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '已配置' : '未配置'}`);
  if (process.env.GEMINI_API_KEY) {
    console.log(`🔑 API密钥前缀: ${process.env.GEMINI_API_KEY.substring(0, 10)}...`);
  }
  console.log(`🌐 使用Gemini代理: ${process.env.USE_GEMINI_PROXY !== 'false' ? '是' : '否'}`);
  console.log(`🌐 代理地址: ${process.env.GEMINI_PROXY_URL || 'https://gemini.66666618.xyz'}`);
  
  // 创建必要的目录
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📂 创建上传目录: ${uploadsDir}`);
  }
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});