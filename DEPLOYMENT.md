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

---

## ☁️ 使用 Cloudflare Worker 作為 Gemini 代理

本項目已支持通過 Cloudflare Worker 代理轉發到 Google Generative Language（Gemini）API，避免在 URL 中暴露 API Key，並便於增加限流/觀測與來源校驗。

### 變更摘要
- 後端（server/index.js）在 `USE_GEMINI_PROXY=true` 時，不再將 `?key=...` 附加到 URL；改為請求代理端點。
- 若配置 `WORKER_SHARED_SECRET`，後端會在請求頭帶上 `X-Internal-Auth`，Worker 校驗後才放行。
- 新增 Worker 專案：`cf-worker/gemini-proxy`（包含 wrangler 配置與代碼）。

### 部署步驟
1. 前置條件
   - 擁有 Cloudflare 帳號
   - Node.js 已安裝（本地）
   - 使用 `npx` 來運行 wrangler

2. 部署 Worker
   - 進入目錄：
     - Windows PowerShell: `cd E:\gitlab\chat-web\cf-worker\gemini-proxy`
   - 登入 Cloudflare：
     - `npx wrangler login`
   - 配置機密（Secrets）：
     - 設置 Gemini API Key：`npx wrangler secret put GEMINI_API_KEY`（按提示輸入值）
     - 可選：設置共享密鑰：`npx wrangler secret put WORKER_SHARED_SECRET`
   - 可選：設置 CORS 允許來源（預設 http://localhost:1420）：
     - `npx wrangler deploy --var ALLOWED_ORIGIN=http://localhost:1420`
     - 或將 `ALLOWED_ORIGIN` 寫入 wrangler.toml 的 [vars]
   - 發佈：
     - `npx wrangler deploy`
   - 記下 Workers URL，例如：`https://gemini-proxy.<your-subdomain>.workers.dev`

3. 後端配置
   - 編輯 `.env`：
     - `USE_GEMINI_PROXY=true`
     - `GEMINI_PROXY_URL=https://gemini-proxy.<your-subdomain>.workers.dev`
     - `WORKER_SHARED_SECRET=<與 Worker 一致的值>`（若上一步有設置）
   - 重啟後端並檢查：
     - `GET /api/config-check` 應顯示 `useGeminiProxy: true` 和正確的 `geminiProxyUrl`

4. 驗證
   - 調用後端 `POST /api/gemini-tts`，Body 例：`{"text":"Hello world","style":"professional"}`
   - 成功時返回 `audioData`（base64 音頻）。

5. 切換/回退
   - 若要直連官方 API：將 `.env` 中 `USE_GEMINI_PROXY=false`，後端會改為 `https://generativelanguage.googleapis.com/...?...key=...` 直連模式。

### 安全與注意事項
- Worker 端保管 `GEMINI_API_KEY`，後端與前端都無需再攜帶 key。
- 建議啟用 `WORKER_SHARED_SECRET` 並在 Worker 校驗 `X-Internal-Auth`，防止被外部濫用。
- 調整 CORS：預設允許 `http://localhost:1420`，如有自定義域名請在部署時傳入或於 wrangler.toml 設置。
