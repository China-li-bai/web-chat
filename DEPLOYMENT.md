# AI Speech Practice 部署指南

本指南將幫助您將 AI Speech Practice 應用部署到服務器 `192.227.177.133` (域名: `66666618.xyz`)。

## 🚀 快速部署

### 前提條件

1. **本地環境**：
   - Node.js 16+ 已安裝
   - Git 已安裝（包含 SSH 工具）
   - 已配置到服務器的 SSH 密鑰認證

2. **服務器環境**：
   - Ubuntu/Debian Linux 系統 (推薦 Ubuntu 20.04+)
   - 具有 sudo 權限的用戶賬號 (root 用戶)
   - 域名: `66666618.xyz` (已配置 DNS 解析到服務器 IP)
   - 開放 80、443、22 端口

### 一鍵部署

```bash
# 在項目根目錄執行
chmod +x deploy.sh
./deploy.sh
```

### 部署前檢查（可選）

```bash
# 檢查本地環境
node --version
npm --version
ssh -V

# 測試服務器連接
ssh root@192.227.177.133 "echo 'Connection successful'"
```

## 📋 部署流程說明

### 1. 本地構建
- 安裝前端依賴
- 構建生產版本的前端文件
- 準備部署文件包

### 2. 服務器環境配置
- 自動安裝 Node.js 18.x
- 安裝 Nginx 網頁服務器
- 安裝 PM2 進程管理器

### 3. 文件上傳
- 上傳前端構建文件到 `/var/www/ai-speech-practice/dist`
- 上傳後端代碼到 `/var/www/ai-speech-practice/server`
- 上傳配置文件

### 4. 服務配置
- 配置 Nginx 反向代理
- 配置 PM2 進程管理
- 設置防火牆規則

## 🌐 架構說明

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用戶瀏覽器    │────│ Nginx (80/443)  │────│  Node.js (3001) │
│  66666618.xyz   │    │ 反向代理+SSL    │    │   Express API   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │   靜態文件      │
                       │   (React App)   │
                       └─────────────────┘
```

### 服務端口分配
- **80**: Nginx HTTP 服務 (自動重定向到 HTTPS)
- **443**: Nginx HTTPS 服務 (主要訪問端口)
- **3001**: Node.js 後端服務 (內部)
- **22**: SSH 管理端口

## ⚙️ 配置文件說明

### 環境變量配置

部署完成後，需要在服務器上配置 API 密鑰：

```bash
# SSH 登錄服務器
ssh root@192.227.177.133

# 編輯環境變量文件
cd /var/www/ai-speech-practice
nano .env
```

重要配置項：
```env
# 生產環境配置
NODE_ENV=production
PORT=3001
HOST=localhost
CORS_ORIGIN=http://192.227.177.133

# Gemini API 配置
GEMINI_API_KEY=your_actual_api_key_here

# 其他 API 配置（可選）
BAIDU_API_KEY=your_baidu_api_key
BAIDU_SECRET_KEY=your_baidu_secret_key
```

配置完成後重啟服務：
```bash
pm2 restart ai-speech-practice-server
```

## 📱 訪問應用

部署成功後，可通過以下地址訪問：

- **前端應用**: https://66666618.xyz
- **備用地址**: http://192.227.177.133
- **API 接口**: https://66666618.xyz/api

## 🔧 常用管理命令

### 服務管理
```bash
# 查看服務狀態
ssh root@192.227.177.133 "pm2 status"

# 查看服務日誌
ssh root@192.227.177.133 "pm2 logs ai-speech-practice-server"

# 重啟服務
ssh root@192.227.177.133 "pm2 restart ai-speech-practice-server"

# 停止服務
ssh root@192.227.177.133 "pm2 stop ai-speech-practice-server"
```

### Nginx 管理
```bash
# 檢查 Nginx 配置
ssh root@192.227.177.133 "sudo nginx -t"

# 重新加載 Nginx
ssh root@192.227.177.133 "sudo systemctl reload nginx"

# 查看 Nginx 狀態
ssh root@192.227.177.133 "sudo systemctl status nginx"
```

### 系統監控
```bash
# 查看系統資源使用
ssh root@192.227.177.133 "htop"

# 查看磁盤使用
ssh root@192.227.177.133 "df -h"

# 查看內存使用
ssh root@192.227.177.133 "free -h"
```

## 🔒 安全建議

1. **防火牆配置**：
   - 只開放必要端口 (22, 80, 443)
   - 考慮更改 SSH 默認端口

2. **SSL 證書**：
   ```bash
   # 安裝 Let's Encrypt 證書
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

3. **定期更新**：
   ```bash
   # 更新系統包
   sudo apt update && sudo apt upgrade
   
   # 更新 Node.js 依賴
   cd /var/www/ai-speech-practice/server
   npm audit fix
   ```

## 🐛 故障排除

### 常見問題

1. **服務無法啟動**：
   ```bash
   # 檢查端口占用
   sudo netstat -tlnp | grep :3001
   
   # 檢查服務日誌
   pm2 logs ai-speech-practice-server
   ```

2. **前端無法訪問**：
   ```bash
   # 檢查 Nginx 狀態
   sudo systemctl status nginx
   
   # 檢查 Nginx 錯誤日誌
   sudo tail -f /var/log/nginx/error.log
   ```

3. **API 請求失敗**：
   - 檢查 `.env` 文件中的 API 密鑰配置
   - 確認 CORS 設置正確
   - 檢查網絡連接和代理設置

### 日誌位置
- **PM2 日誌**: `/var/www/ai-speech-practice/logs/`
- **Nginx 日誌**: `/var/log/nginx/`
- **系統日誌**: `/var/log/syslog`

## 📞 技術支持

如遇到部署問題，請檢查：
1. 服務器系統要求是否滿足
2. 網絡連接是否正常
3. SSH 密鑰配置是否正確
4. 防火牆設置是否允許相應端口

---

**注意**: 首次部署後，請及時配置 API 密鑰並測試各項功能是否正常工作。