#!/bin/bash

# AI Speech Practice 部署腳本
# 目標服務器: 192.227.177.133

set -e  # 遇到錯誤立即退出

# 配置變量
SERVER_IP="192.227.177.133"
DOMAIN_NAME="66666618.xyz"
SERVER_USER="root"  # 請根據實際情況修改用戶名
APP_NAME="ai-speech-practice"
REMOTE_DIR="/var/www/${APP_NAME}"
SERVER_DIR="/var/www/${APP_NAME}/server"
NGINX_CONFIG="/etc/nginx/sites-available/${APP_NAME}"
SERVICE_NAME="${APP_NAME}-server"
SSL_EMAIL="admin@${DOMAIN_NAME}"  # SSL證書申請郵箱

echo "🚀 開始部署 AI Speech Practice 到服務器 ${SERVER_IP}"

# 1. 構建前端項目
echo "📦 構建前端項目..."
npm install
npm run build

echo "✅ 前端構建完成"

# 2. 準備部署文件
echo "📋 準備部署文件..."

# 創建部署目錄
mkdir -p deploy-temp

# 複製前端構建文件
cp -r dist deploy-temp/

# 複製後端文件
cp -r server deploy-temp/
cp package.json deploy-temp/
cp .env.example deploy-temp/.env

# 複製其他必要文件
cp README.md deploy-temp/
cp USAGE.md deploy-temp/

echo "✅ 部署文件準備完成"

# 3. 上傳文件到服務器
echo "📤 上傳文件到服務器..."

# 創建遠程目錄
ssh ${SERVER_USER}@${SERVER_IP} "sudo mkdir -p ${REMOTE_DIR}"
ssh ${SERVER_USER}@${SERVER_IP} "sudo chown -R ${SERVER_USER}:${SERVER_USER} ${REMOTE_DIR}"

# 上傳文件
rsync -avz --delete deploy-temp/ ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/

echo "✅ 文件上傳完成"

# 4. 服務器端配置
echo "⚙️ 配置服務器環境..."

ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
# 更新系統
sudo apt update
sudo apt upgrade -y

# 安裝基礎工具
sudo apt install -y curl wget git unzip software-properties-common

# 安裝 Node.js (如果未安裝)
if ! command -v node &> /dev/null; then
    echo "安裝 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 安裝 Nginx (如果未安裝)
if ! command -v nginx &> /dev/null; then
    echo "安裝 Nginx..."
    sudo apt install -y nginx
fi

# 安裝 PM2 (如果未安裝)
if ! command -v pm2 &> /dev/null; then
    echo "安裝 PM2..."
    sudo npm install -g pm2
fi

# 安裝 Certbot (用於 SSL 證書)
if ! command -v certbot &> /dev/null; then
    echo "安裝 Certbot..."
    sudo apt install -y certbot python3-certbot-nginx
fi

echo "✅ 系統環境配置完成"
EOF

# 5. 安裝後端依賴
echo "📦 安裝後端依賴..."
ssh ${SERVER_USER}@${SERVER_IP} "cd ${SERVER_DIR} && npm install --production"

echo "✅ 後端依賴安裝完成"

# 6. 配置 Nginx
echo "🌐 配置 Nginx..."

ssh ${SERVER_USER}@${SERVER_IP} << EOF
# 創建 Nginx 配置文件
sudo tee ${NGINX_CONFIG} > /dev/null << 'NGINX_CONF'
# HTTP 服務器配置 (重定向到 HTTPS)
server {
    listen 80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME} ${SERVER_IP};
    
    # Let's Encrypt 驗證路徑
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # 重定向所有 HTTP 請求到 HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS 服務器配置
server {
    listen 443 ssl http2;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};
    
    # SSL 證書配置 (將由 Certbot 自動配置)
    # ssl_certificate /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 安全頭
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # 前端靜態文件
    location / {
        root ${REMOTE_DIR}/dist;
        try_files \$uri \$uri/ /index.html;
        
        # 緩存靜態資源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Access-Control-Allow-Origin "*";
        }
    }
    
    # API 代理到後端
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 超時設置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Socket.IO 支持
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket 超時設置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 文件上傳大小限制
    client_max_body_size 50M;
    
    # Gzip 壓縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/xml
        image/svg+xml;
}
NGINX_CONF

# 啟用站點
sudo ln -sf ${NGINX_CONFIG} /etc/nginx/sites-enabled/

# 測試 Nginx 配置
sudo nginx -t

# 重新加載 Nginx
sudo systemctl reload nginx

echo "✅ Nginx 配置完成"
EOF

# 7. 配置 PM2 服務
echo "🔧 配置 PM2 服務..."

ssh ${SERVER_USER}@${SERVER_IP} << EOF
# 創建 PM2 配置文件
cat > ${REMOTE_DIR}/ecosystem.config.cjs << 'PM2_CONF'
module.exports = {
  apps: [{
    name: '${SERVICE_NAME}',
    script: './server/index.js',
    cwd: '${REMOTE_DIR}',
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

# 創建日誌目錄
mkdir -p ${REMOTE_DIR}/logs

# 停止現有服務（如果存在）
pm2 delete ${SERVICE_NAME} 2>/dev/null || true

# 啟動服務
cd ${REMOTE_DIR}
pm2 start ecosystem.config.cjs

# 保存 PM2 配置
pm2 save

# 設置 PM2 開機自啟
pm2 startup

echo "✅ PM2 服務配置完成"
EOF

# 8. 設置防火牆
echo "🔒 配置防火牆..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
# 允許 HTTP 和 HTTPS 流量
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH

# 啟用防火牆（如果未啟用）
sudo ufw --force enable

echo "✅ 防火牆配置完成"
EOF

# 9. 檢查並申請 SSL 證書
echo "🔐 檢查並申請 SSL 證書..."
ssh ${SERVER_USER}@${SERVER_IP} << EOF
# 檢查是否已存在有效的 SSL 證書
echo "檢查現有 SSL 證書..."
EXISTING_CERT=\$(sudo certbot certificates 2>/dev/null | grep -A 10 "Certificate Name: ${DOMAIN_NAME}\|Certificate Name: .*${DOMAIN_NAME}" | grep "Expiry Date" | head -1)

if [ ! -z "\$EXISTING_CERT" ]; then
    # 檢查證書是否在 30 天內過期
    EXPIRY_DATE=\$(echo "\$EXISTING_CERT" | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}')
    EXPIRY_TIMESTAMP=\$(date -d "\$EXPIRY_DATE" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "\$EXPIRY_DATE" +%s 2>/dev/null)
    CURRENT_TIMESTAMP=\$(date +%s)
    DAYS_UNTIL_EXPIRY=\$(( (\$EXPIRY_TIMESTAMP - \$CURRENT_TIMESTAMP) / 86400 ))
    
    if [ \$DAYS_UNTIL_EXPIRY -gt 30 ]; then
        echo "✅ 發現有效的 SSL 證書，還有 \$DAYS_UNTIL_EXPIRY 天過期"
        echo "跳過證書申請，使用現有證書"
        
        # 確保自動續期已設置
        if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
            echo "設置證書自動續期..."
            (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
            echo "✅ SSL 證書自動續期已設置"
        fi
        
        exit 0
    else
        echo "⚠️  現有證書將在 \$DAYS_UNTIL_EXPIRY 天內過期，將嘗試續期"
    fi
else
    echo "未發現現有 SSL 證書，將申請新證書"
fi

# 檢查域名是否正確解析到服務器
echo "檢查域名解析..."
dig +short ${DOMAIN_NAME} | grep -q "${SERVER_IP}" || {
    echo "⚠️  警告: 域名 ${DOMAIN_NAME} 未正確解析到服務器 IP ${SERVER_IP}"
    echo "請確保域名 DNS 記錄指向服務器 IP，然後手動運行以下命令申請證書:"
    echo "sudo certbot --nginx -d ${DOMAIN_NAME} -d www.${DOMAIN_NAME} --email ${SSL_EMAIL} --agree-tos --non-interactive"
    exit 0
}

# 申請或續期 SSL 證書
echo "申請/續期 SSL 證書..."
sudo certbot --nginx -d ${DOMAIN_NAME} -d www.${DOMAIN_NAME} --email ${SSL_EMAIL} --agree-tos --non-interactive

if [ \$? -eq 0 ]; then
    echo "✅ SSL 證書申請/續期成功"
    
    # 設置自動續期（如果尚未設置）
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        echo "設置證書自動續期..."
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        echo "✅ SSL 證書自動續期已設置"
    fi
else
    echo "❌ SSL 證書申請/續期失敗，請檢查域名解析和網絡連接"
    echo "可以稍後手動運行: sudo certbot --nginx -d ${DOMAIN_NAME} -d www.${DOMAIN_NAME}"
fi
EOF

# 10. 清理臨時文件
echo "🧹 清理臨時文件..."
rm -rf deploy-temp

echo "✅ 臨時文件清理完成"

# 11. 驗證部署
echo "🔍 驗證部署狀態..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
echo "=== 服務狀態 ==="
pm2 status

echo "\n=== Nginx 狀態 ==="
sudo systemctl status nginx --no-pager -l

echo "\n=== 端口監聽狀態 ==="
sudo netstat -tlnp | grep -E ':(80|443|3001)\s'

echo "\n=== SSL 證書狀態 ==="
sudo certbot certificates 2>/dev/null || echo "未安裝 SSL 證書"

echo "\n=== 磁盤使用情況 ==="
df -h

echo "\n=== 內存使用情況 ==="
free -h

echo "\n=== 系統負載 ==="
uptime
EOF

echo ""
echo "🎉 部署完成！"
echo "🌐 主要訪問地址:"
echo "  - HTTPS: https://${DOMAIN_NAME}"
echo "  - HTTP: http://${DOMAIN_NAME} (自動重定向到 HTTPS)"
echo "  - IP 訪問: http://${SERVER_IP} (自動重定向到 HTTPS)"
echo "🔧 API 地址: https://${DOMAIN_NAME}/api"
echo ""
echo "📋 常用管理命令:"
echo "  查看服務狀態: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 status'"
echo "  查看服務日誌: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 logs ${SERVICE_NAME}'"
echo "  重啟服務: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 restart ${SERVICE_NAME}'"
echo "  停止服務: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 stop ${SERVICE_NAME}'"
echo "  查看 SSL 證書: ssh ${SERVER_USER}@${SERVER_IP} 'sudo certbot certificates'"
echo "  手動續期證書: ssh ${SERVER_USER}@${SERVER_IP} 'sudo certbot renew'"
echo ""
echo "🔐 SSL 證書信息:"
echo "  域名: ${DOMAIN_NAME}, www.${DOMAIN_NAME}"
echo "  自動續期: 每天 12:00 檢查"
echo ""
echo "⚠️  重要提醒:"
echo "  1. 在服務器上配置 .env 文件中的 API 密鑰"
echo "  2. 確保域名 ${DOMAIN_NAME} 正確解析到 ${SERVER_IP}"
echo "  3. SSL 證書已自動配置，支持 HTTPS 訪問"
echo "  4. 定期備份數據庫和上傳文件"
echo "  5. 監控服務器資源使用情況"
echo ""