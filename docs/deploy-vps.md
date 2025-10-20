# chat-web 部署到 VPS（Cloudflare + 已有站点共存）

本文档指导将本项目的前端部署到子域 app.66666618.xyz（与现有站点共存），先以 HTTP 上线，稍后开启 Cloudflare 橙云并使用 Origin Certificate 切换到 HTTPS。后端/API 接入可在前端上线后进行。

## 前置条件
- VPS：Ubuntu 22.04，已安装 Nginx
- 域名：66666618.xyz（Cloudflare 托管）
- 子域：app.66666618.xyz（已在 Cloudflare DNS 添加 A 记录，灰云“DNS only”，指向 VPS IP）
- 项目构建产物目录：dist
- SSH：建议使用密钥登录；避免在脚本和命令中包含明文密码

## 一、本地构建与上传
在你的开发机（本地）执行：
```
npm ci
npm run build
scp -r ./dist/* root@<YOUR_SERVER_IP>:/var/www/chat-web/dist/
```

## 二、服务器端：HTTP 上线前端
在服务器执行脚本（已内置在项目中）：
```
sudo bash /root/setup-app-http.sh
```
如果你尚未创建该脚本，可复制项目 scripts/setup-app-http.sh 内容到服务器后运行，或执行以下命令创建并运行：
```
sudo tee /root/setup-app-http.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -e
SITE=app.66666618.xyz
WEBROOT=/var/www/chat-web/dist
CONF=/etc/nginx/sites-available/$SITE
sudo mkdir -p "$WEBROOT"
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

    location /api {
        return 502;
    }
}
CONFEOF
sudo ln -sf "$CONF" /etc/nginx/sites-enabled/$SITE
sudo nginx -t
sudo systemctl reload nginx
echo "HTTP 前端已上线: http://app.66666618.xyz"
EOF
sudo chmod +x /root/setup-app-http.sh
sudo bash /root/setup-app-http.sh
```

访问验证：
- 打开 http://app.66666618.xyz
- 前端路由可刷新子路径并正常加载
- /api 目前返回 502（占位），后端上线后改为反代

## 三、Cloudflare 橙云与 Origin 证书（稍后切 HTTPS）
当你准备启用 HTTPS：
1) 在 Cloudflare 仪表盘为 app 子域开启“橙云代理”
2) 生成源站证书：
   - SSL/TLS → Origin Server → Create Certificate
   - Key format: PEM；Algorithm: RSA；Hostnames: app.66666618.xyz
   - 将证书与私钥保存到服务器：
     - /etc/ssl/cloudflare/app_66666618_xyz.crt
     - /etc/ssl/cloudflare/app_66666618_xyz.key
     - chmod 600 /etc/ssl/cloudflare/app_66666618_xyz.key
3) 在服务器执行切换脚本：
```
sudo bash /root/switch-to-https-cf.sh
```
如果尚未创建脚本，可使用项目 scripts/switch-to-https-cf.sh 内容；或执行以下命令创建：
```
sudo tee /root/switch-to-https-cf.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -e
SITE=app.66666618.xyz
CONF=/etc/nginx/sites-available/$SITE
CRT=/etc/ssl/cloudflare/app_66666618_xyz.crt
KEY=/etc/ssl/cloudflare/app_66666618_xyz.key
if [ ! -f "$CRT" ] || [ ! -f "$KEY" ]; then
  echo "未找到证书或私钥：$CRT / $KEY"; exit 1
fi
sudo tee "$CONF" >/dev/null <<'CONFEOF'
server {
    listen 80;
    server_name app.66666618.xyz;
    return 301 https://$host$request_uri;
}
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
    location / { try_files $uri $uri/ /index.html; }
    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp)$ {
        expires 7d; add_header Cache-Control "public, max-age=604800"; try_files $uri =404;
    }
    location /api { return 502; }
}
CONFEOF
sudo nginx -t
sudo systemctl reload nginx
echo "HTTPS 前端已上线: https://app.66666618.xyz"
EOF
sudo chmod +x /root/switch-to-https-cf.sh
sudo bash /root/switch-to-https-cf.sh
```

## 四、GitHub Actions 自动部署（前端）
使用该工作流可在 push 到 main 或手动触发时，自动构建并部署到 VPS：
- 工作流文件：.github/workflows/deploy-frontend.yml
- 流程：
  1) Node 20 环境下执行 npm ci && npm run build
  2) 打包 dist 为 dist.tar.gz 并作为 artifact
  3) 通过 scp 将 dist.tar.gz 上传到 VPS /root/chat-web/
  4) 通过 ssh 在服务器解压到 /var/www/chat-web/dist，nginx -t && systemctl reload nginx

### 需要配置的 GitHub Secrets
- SSH_HOST：你的服务器 IP（示例：192.227.177.133）
- SSH_USER：root（或具备 sudo 权限的用户）
- SSH_KEY：私钥内容（OpenSSH 格式，多行文本，建议新建只用于部署的密钥）
- SSH_PORT：22（如非默认端口，请填你的 SSH 端口）
- WEBROOT：/var/www/chat-web/dist

### 服务器前置准备
- 在服务器创建目标目录（仅首次需要）：
```
mkdir -p /var/www/chat-web/dist
```
- 将 SSH 公钥加入服务器：
  - 在服务器的 ~/.ssh/authorized_keys 添加你的公钥
- Nginx 站点已启用（参考本文档的 HTTP 上线步骤）

### 如何触发
- 合并或推送到 main 分支会自动触发
- 或在 GitHub Actions 页面选择 “Deploy Frontend to VPS” 的 workflow_dispatch 手动触发

## 五、后端/API（可选，后续接入）
- 建议使用 PM2 常驻，监听 4000 端口
- Nginx 反代片段（替换 /api 占位）：
```
location /api {
  proxy_pass http://127.0.0.1:4000;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```
- PM2 示例（在后端目录）：
```
npm ci
pm2 start npm --name chat-web-backend -- run start
pm2 save
pm2 status
```

## 常见问题
- 403 Forbidden：检查 /var/www/chat-web/dist 是否有 index.html；修复权限（755 目录/644 文件），并重载 Nginx
- 刷新子路径 404：确认 Nginx 的 try_files 指向 /index.html
- 仍是 HTTP：确认是否开启橙云；HTTPS 切换脚本是否执行；SSL 模式建议 Full(Strict)
- /api 502：占位，接入后端后替换为 proxy_pass

## 安全建议
- 使用独立的部署密钥，限制权限；定期轮换
- 使用 SSH 密钥登录，禁用密码登录
- Cloudflare 开启 WAF/速率限制（按需）

——
如需我为 Actions 再添加一个 “HTTPS 切换” job（在 Cloudflare 橙云开启且证书到位后自动执行），请告知。