#!/usr/bin/env bash
set -e

# 说明：
# - 开启 Cloudflare 橙云并将 Origin 证书与私钥放到 /etc/ssl/cloudflare 后执行
# - 切换到 HTTPS（端口 443）并将 HTTP 全量重定向到 HTTPS

SITE=app.66666618.xyz
CONF=/etc/nginx/sites-available/$SITE
CRT=/etc/ssl/cloudflare/app_66666618_xyz.crt
KEY=/etc/ssl/cloudflare/app_66666618_xyz.key

if [ ! -f "$CRT" ] || [ ! -f "$KEY" ]; then
  echo "未找到证书或私钥：$CRT / $KEY"
  echo "请在 Cloudflare 仪表盘 -> SSL/TLS -> Origin Server 生成证书与私钥，并保存到上述路径。"
  exit 1
fi

echo "==> 写入 HTTP->HTTPS 重定向 与 HTTPS 站点配置: $CONF"
sudo tee "$CONF" >/dev/null <<'CONFEOF'
# HTTP: 全量重定向到 HTTPS
server {
    listen 80;
    server_name app.66666618.xyz;
    return 301 https://$host$request_uri;
}

# HTTPS: 静态前端托管，/api 暂占位
server {
    listen 443 ssl http2;
    server_name app.66666618.xyz;

    ssl_certificate     /etc/ssl/cloudflare/app_66666618_xyz.crt;
    ssl_certificate_key /etc/ssl/cloudflare/app_66666618_xyz.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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

    # 预留 /api：后端上线后改为反代到 127.0.0.1:4000
    location /api {
        return 502;
        # proxy_pass http://127.0.0.1:4000;
        # proxy_set_header Host $host;
        # proxy_set_header X-Real-IP $remote_addr;
        # proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # proxy_set_header X-Forwarded-Proto $scheme;
    }
}
CONFEOF

echo "==> 测试并重载 Nginx"
sudo nginx -t
sudo systemctl reload nginx
echo "==> 完成。请访问: https://app.66666618.xyz"
echo "==> 若浏览器仍显示非 HTTPS，请确认 Cloudflare 已开启橙云代理并将 SSL 模式设为 Full(Strict)。"