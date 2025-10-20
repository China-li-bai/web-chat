#!/usr/bin/env bash
set -e

# 说明：
# - 先以 HTTP 托管前端静态资源（端口 80）
# - 需要你先在本地构建并上传 dist 到服务器
# - Nginx 基于子域 app.66666618.xyz，与现有站点共存

SITE=app.66666618.xyz
WEBROOT=/var/www/chat-web/dist
CONF=/etc/nginx/sites-available/$SITE

echo "==> 准备目录: $WEBROOT"
sudo mkdir -p "$WEBROOT"

echo "==> 写入 Nginx 配置: $CONF"
sudo tee "$CONF" >/dev/null <<'CONFEOF'
server {
    listen 80;
    server_name app.66666618.xyz;

    root /var/www/chat-web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        try_files $uri =404;
    }

    # 预留 /api：后端未上线前返回 502
    location /api {
        return 502;
    }
}
CONFEOF

echo "==> 启用站点并重载 Nginx"
sudo ln -sf "$CONF" /etc/nginx/sites-enabled/$SITE
sudo nginx -t
sudo systemctl reload nginx

echo "==> 完成。请访问: http://app.66666618.xyz"
echo "==> 若尚未上传静态文件，请在本地执行："
echo "    npm ci && npm run build"
echo "    scp -r ./dist/* root@<YOUR_SERVER_IP>:/var/www/chat-web/dist/"