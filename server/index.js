const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
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

// API配置 - 这里需要替换为实际的API密钥
const API_CONFIG = {
  // 百度语音API配置
  baidu: {
    appId: 'YOUR_BAIDU_APP_ID',
    apiKey: 'YOUR_BAIDU_API_KEY',
    secretKey: 'YOUR_BAIDU_SECRET_KEY'
  },
  // 科大讯飞API配置
  xunfei: {
    appId: 'YOUR_XUNFEI_APP_ID',
    apiKey: 'YOUR_XUNFEI_API_KEY',
    apiSecret: 'YOUR_XUNFEI_API_SECRET'
  },
  // 腾讯云API配置
  tencent: {
    secretId: 'YOUR_TENCENT_SECRET_ID',
    secretKey: 'YOUR_TENCENT_SECRET_KEY',
    region: 'ap-beijing'
  }
};

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
async function baiduSpeechToText(audioBuffer) {
  try {
    // 这里是百度语音识别API的调用逻辑
    // 实际使用时需要替换为真实的API调用
    console.log('调用百度语音识别API');
    
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
async function xunfeiTextToSpeech(text) {
  try {
    // 这里是科大讯飞语音合成API的调用逻辑
    console.log('调用科大讯飞语音合成API:', text);
    
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
    
    const audioBuffer = fs.readFileSync(req.file.path);
    const result = await baiduSpeechToText(audioBuffer);
    
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
    const { text, voice = 'female' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '文本不能为空' });
    }
    
    const result = await xunfeiTextToSpeech(text);
    
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json({ audio: result.audio });
  } catch (error) {
    console.error('语音合成错误:', error);
    res.status(500).json({ error: '语音合成失败' });
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

module.exports = app;