# AI口语练习应用使用指南

## 📋 目录

- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [API密钥申请](#api密钥申请)
- [功能介绍](#功能介绍)
- [使用教程](#使用教程)
- [常见问题](#常见问题)
- [故障排除](#故障排除)
- [性能优化](#性能优化)

## 🚀 快速开始

### 1. 环境要求

- **Node.js**: 16.0+ (推荐 18.0+)
- **Rust**: 1.70+ 
- **操作系统**: Windows 10+, macOS 10.15+, Linux
- **内存**: 最低 4GB RAM
- **存储**: 至少 2GB 可用空间

### 2. 一键启动

```bash
# Windows用户
双击运行 start.bat

# macOS/Linux用户
chmod +x start.sh
./start.sh
```

### 3. 手动启动

```bash
# 1. 安装依赖
npm install
cd server && npm install && cd ..

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入API密钥

# 3. 启动开发服务
npm run dev
```

## ⚙️ 环境配置

### 1. 创建环境变量文件

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

### 2. 配置API密钥

编辑 `.env` 文件，至少配置一个语音服务提供商：

```env
# 百度语音（推荐，免费额度大）
BAIDU_API_KEY=your_baidu_api_key
BAIDU_SECRET_KEY=your_baidu_secret_key

# 科大讯飞（可选，准确度高）
XUNFEI_APP_ID=your_xunfei_app_id
XUNFEI_API_KEY=your_xunfei_api_key
XUNFEI_API_SECRET=your_xunfei_api_secret
```

## 🔑 API密钥申请

### 百度语音服务（推荐）

**优势**: 免费额度大（每日50000次），适合开发测试

1. 访问 [百度AI开放平台](https://ai.baidu.com/)
2. 注册并登录账号
3. 创建应用，选择"语音技术"
4. 获取 API Key 和 Secret Key
5. 将密钥填入 `.env` 文件

```env
BAIDU_API_KEY=your_api_key_here
BAIDU_SECRET_KEY=your_secret_key_here
```

### 科大讯飞（可选）

**优势**: 识别准确度高，支持方言

1. 访问 [科大讯飞开放平台](https://www.xfyun.cn/)
2. 注册并实名认证
3. 创建应用，开通语音听写和语音合成服务
4. 获取 APPID、API Key、API Secret
5. 将密钥填入 `.env` 文件

```env
XUNFEI_APP_ID=your_app_id_here
XUNFEI_API_KEY=your_api_key_here
XUNFEI_API_SECRET=your_api_secret_here
```

### 腾讯云（可选）

**优势**: 企业级稳定性，多语言支持

1. 访问 [腾讯云控制台](https://cloud.tencent.com/)
2. 开通语音识别和语音合成服务
3. 创建密钥，获取 SecretId 和 SecretKey
4. 将密钥填入 `.env` 文件

```env
TENCENT_SECRET_ID=your_secret_id_here
TENCENT_SECRET_KEY=your_secret_key_here
```

## 🎯 功能介绍

### 核心功能

1. **语音录制**: 支持实时录音，自动降噪
2. **语音识别**: 将语音转换为文字
3. **发音评分**: 多维度评分（准确度、流利度、完整度）
4. **语音合成**: 标准发音示范
5. **学习统计**: 详细的学习数据分析
6. **练习主题**: 丰富的练习内容库

### 界面功能

- **首页**: 学习概览和快速开始
- **练习页**: 核心练习功能
- **进度页**: 学习统计和分析
- **设置页**: 个性化配置

## 📖 使用教程

### 第一次使用

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **选择练习主题**
   - 进入"练习"页面
   - 选择适合的难度级别
   - 选择感兴趣的主题

3. **开始练习**
   - 点击"开始录音"按钮
   - 朗读显示的文本
   - 点击"停止录音"结束

4. **查看结果**
   - 系统自动进行语音识别
   - 显示识别文本和评分
   - 可播放标准发音对比

### 高级功能

#### 自定义练习内容

1. 进入设置页面
2. 选择"练习设置"
3. 添加自定义文本
4. 设置难度级别

#### 学习数据分析

1. 进入"进度"页面
2. 查看学习统计图表
3. 分析薄弱环节
4. 制定学习计划

#### 多语音服务切换

1. 进入"设置" > "AI服务设置"
2. 选择语音识别提供商
3. 选择语音合成提供商
4. 调整语音参数

## ❓ 常见问题

### Q1: 无法录音怎么办？

**A**: 检查以下几点：
- 浏览器是否允许麦克风权限
- 麦克风设备是否正常工作
- 是否使用HTTPS或localhost访问

### Q2: 语音识别不准确？

**A**: 尝试以下方法：
- 确保环境安静，减少背景噪音
- 说话清晰，语速适中
- 调整麦克风音量
- 尝试切换不同的语音服务提供商

### Q3: API调用失败？

**A**: 检查以下配置：
- API密钥是否正确填写
- 网络连接是否正常
- API额度是否用完
- 服务提供商服务是否正常

### Q4: 应用启动失败？

**A**: 按以下步骤排查：
```bash
# 检查Node.js版本
node --version

# 检查Rust版本
rustc --version

# 重新安装依赖
rm -rf node_modules
npm install

# 检查端口占用
netstat -ano | findstr :1420
netstat -ano | findstr :3001
```

### Q5: 评分结果不合理？

**A**: 评分算法说明：
- **发音准确度**: 基于语音识别结果与标准文本的匹配度
- **流利度**: 基于语速和停顿分析
- **完整度**: 基于内容覆盖度
- 评分仅供参考，建议结合多次练习结果分析

## 🔧 故障排除

### 常见错误及解决方案

#### 1. 端口占用错误

```bash
# Windows
netstat -ano | findstr :1420
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:1420 | xargs kill -9
```

#### 2. 依赖安装失败

```bash
# 清理缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install
```

#### 3. Tauri构建失败

```bash
# 更新Rust工具链
rustup update

# 清理构建缓存
cd src-tauri
cargo clean
cd ..

# 重新构建
npm run tauri build
```

#### 4. 数据库错误

```bash
# 删除数据库文件重新创建
rm -f data/speech_practice.db
# 重启应用，数据库会自动重新创建
```

### 日志查看

```bash
# 查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log

# 查看开发者工具控制台
# 在浏览器中按F12打开开发者工具
```

## ⚡ 性能优化

### 1. 系统优化

- **内存**: 建议8GB以上RAM
- **存储**: 使用SSD硬盘
- **网络**: 稳定的网络连接

### 2. 应用优化

```env
# .env文件优化配置
CACHE_TTL=3600000
MAX_CONCURRENT_REQUESTS=50
REQUEST_TIMEOUT=15000
```

### 3. 音频优化

- 使用高质量麦克风
- 录音环境安静
- 音频格式设置为WAV 16kHz

### 4. 网络优化

- 使用CDN加速（生产环境）
- 启用gzip压缩
- 优化API调用频率

## 📞 技术支持

如果遇到其他问题，可以通过以下方式获取帮助：

1. **查看日志**: 检查 `logs/` 目录下的日志文件
2. **GitHub Issues**: 在项目仓库提交问题
3. **社区讨论**: 参与技术社区讨论
4. **文档更新**: 关注项目文档更新

## 📝 更新日志

### v0.1.0 (当前版本)
- ✅ 基础语音识别功能
- ✅ 发音评分系统
- ✅ 多语音服务支持
- ✅ 学习统计分析
- ✅ 响应式界面设计

### 计划功能
- 🔄 实时语音识别
- 🔄 离线模式支持
- 🔄 多语言支持
- 🔄 社交功能
- 🔄 AI智能推荐

---

**祝您学习愉快！** 🎉