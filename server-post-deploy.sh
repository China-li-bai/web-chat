#!/bin/bash

# AI Speech Practice 服務器部署後配置腳本
# 在服務器上運行此腳本完成最終配置

set -e

# 配置變量
APP_DIR="/var/www/ai-speech-practice"
SERVICE_NAME="ai-speech-practice"
DOMAIN_NAME="66666618.xyz"

echo "🚀 開始服務器部署後配置..."
echo "應用目錄: $APP_DIR"
echo "服務名稱: $SERVICE_NAME"
echo "域名: $DOMAIN_NAME"
echo ""

# 1. 檢查應用目錄是否存在
if [ ! -d "$APP_DIR" ]; then
    echo "❌ 錯誤: 應用目錄 $APP_DIR 不存在"
    echo "請先運行部署腳本 deploy.sh"
    exit 1
fi

cd $APP_DIR

# 2. 配置環境變量文件
echo "🔧 配置環境變量..."
if [ ! -f ".env" ]; then
    echo "創建 .env 文件..."
    cat > .env << 'ENV_FILE'
# AI Speech Practice 環境配置
NODE_ENV=production
PORT=3001
HOST=localhost

# API 密鑰配置 - 請填入您的實際密鑰
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# 數據庫配置（如果使用）
# DATABASE_URL=your_database_url_here

# 其他配置
CORS_ORIGIN=https://66666618.xyz
SESSION_SECRET=your_session_secret_here
ENV_FILE
    echo "✅ .env 文件已創建"
    echo "⚠️  請編輯 .env 文件並填入您的實際 API 密鑰"
else
    echo "✅ .env 文件已存在"
fi

# 3. 設置文件權限
echo "🔒 設置文件權限..."
sudo chown -R www-data:www-data $APP_DIR
sudo chmod -R 755 $APP_DIR
sudo chmod 644 $APP_DIR/.env
echo "✅ 文件權限設置完成"

# 4. 安裝後端依賴（如果需要）
echo "📦 檢查後端依賴..."
if [ -f "server/package.json" ]; then
    cd server
    if [ ! -d "node_modules" ]; then
        echo "安裝後端依賴..."
        npm install --production
        echo "✅ 後端依賴安裝完成"
    else
        echo "✅ 後端依賴已存在"
    fi
    cd ..
fi

# 5. 檢查服務器文件結構
echo "📁 檢查服務器文件結構..."
echo "當前目錄內容:"
ls -la
echo ""
echo "檢查 server 目錄:"
if [ -d "server" ]; then
    echo "✅ server 目錄存在"
    ls -la server/
    if [ -f "server/index.js" ]; then
        echo "✅ server/index.js 文件存在"
    else
        echo "❌ server/index.js 文件不存在"
        echo "嘗試查找其他可能的入口文件..."
        find . -name "*.js" -path "./server/*" | head -5
    fi
else
    echo "❌ server 目錄不存在"
    echo "查找可能的服務器文件..."
    find . -name "index.js" | head -5
fi
echo ""

# 6. 檢查並創建 PM2 配置文件
echo "📝 檢查 PM2 配置文件..."

# 動態確定腳本路徑
SCRIPT_PATH=""
if [ -f "server/index.js" ]; then
    SCRIPT_PATH="./server/index.js"
elif [ -f "index.js" ]; then
    SCRIPT_PATH="./index.js"
elif [ -f "app.js" ]; then
    SCRIPT_PATH="./app.js"
else
    echo "❌ 找不到 Node.js 入口文件"
    echo "請確保服務器文件已正確上傳"
    exit 1
fi

echo "使用腳本路徑: $SCRIPT_PATH"

if [ ! -f "ecosystem.config.cjs" ]; then
    echo "創建 ecosystem.config.cjs 文件..."
    cat > ecosystem.config.cjs << PM2_CONF
module.exports = {
  apps: [{
    name: 'ai-speech-practice-server',
    script: '$SCRIPT_PATH',
    cwd: '$APP_DIR',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: 'localhost'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
PM2_CONF
    echo "✅ ecosystem.config.cjs 文件已創建"
else
    echo "✅ ecosystem.config.cjs 文件已存在"
fi

# 創建日誌目錄
mkdir -p logs

# 7. 重啟 PM2 服務
echo "🔄 重啟 PM2 服務..."

# 停止現有服務（如果存在）
pm2 delete ai-speech-practice-server 2>/dev/null || true

# 啟動服務
pm2 start ecosystem.config.cjs
pm2 save
echo "✅ PM2 服務重啟完成"

# 8. 重新加載 Nginx 配置
echo "🌐 重新加載 Nginx..."
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo "✅ Nginx 重新加載完成"
else
    echo "❌ Nginx 配置測試失敗"
    exit 1
fi

# 9. 檢查防火墻狀態
echo "🔒 檢查防火墻狀態..."
sudo ufw status | grep -E "80|443|22" || {
    echo "配置防火墻..."
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 22/tcp
    sudo ufw --force enable
    echo "✅ 防火墻配置完成"
}

# 10. 檢查 SSL 證書狀態
echo "🔐 檢查 SSL 證書狀態..."
SSL_STATUS=$(sudo certbot certificates 2>/dev/null | grep -A 5 "$DOMAIN_NAME" || echo "未找到證書")
if echo "$SSL_STATUS" | grep -q "VALID"; then
    echo "✅ SSL 證書狀態正常"
    echo "$SSL_STATUS"
else
    echo "⚠️  SSL 證書可能需要配置"
    echo "手動申請命令: sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME"
fi

# 11. 驗證服務狀態
echo "🔍 驗證服務狀態..."
echo ""
echo "=== PM2 服務狀態 ==="
pm2 status

echo ""
echo "=== Nginx 狀態 ==="
sudo systemctl status nginx --no-pager -l | head -10

echo ""
echo "=== 端口監聽狀態 ==="
sudo netstat -tlnp | grep -E ':(80|443|3001)\s'

echo ""
echo "=== 磁盤使用情況 ==="
df -h | grep -E '(Filesystem|/$)'

echo ""
echo "=== 內存使用情況 ==="
free -h

# 10. 測試應用連接
echo ""
echo "🌐 測試應用連接..."
echo "測試本地後端服務..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ 後端服務響應正常"
else
    echo "⚠️  後端服務可能未正常啟動"
fi

echo "測試 Nginx 代理..."
if curl -s http://localhost/ > /dev/null 2>&1; then
    echo "✅ Nginx 代理響應正常"
else
    echo "⚠️  Nginx 代理可能有問題"
fi

echo ""
echo "🎉 服務器配置完成！"
echo ""
echo "📋 重要提醒:"
echo "1. 請編輯 $APP_DIR/.env 文件，填入您的實際 API 密鑰"
echo "2. 編輯完成後運行: pm2 restart $SERVICE_NAME"
echo "3. 訪問地址: https://$DOMAIN_NAME"
echo "4. API 地址: https://$DOMAIN_NAME/api"
echo ""
echo "📝 常用管理命令:"
echo "  查看服務日誌: pm2 logs $SERVICE_NAME"
echo "  重啟服務: pm2 restart $SERVICE_NAME"
echo "  查看 Nginx 日誌: sudo tail -f /var/log/nginx/error.log"
echo "  檢查 SSL 證書: sudo certbot certificates"
echo "  編輯環境變量: nano $APP_DIR/.env"
echo ""
echo "✅ 配置腳本執行完成！"