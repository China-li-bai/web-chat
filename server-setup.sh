#!/bin/bash

# AI Speech Practice 服務器初始化腳本
# 適用於 Ubuntu/Debian 系統

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查是否為 root 用戶
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "正在以 root 用戶運行腳本"
    else
        log_info "正在以普通用戶運行，某些操作需要 sudo 權限"
    fi
}

# 檢查系統版本
check_system() {
    log_info "檢查系統信息..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
        log_info "系統: $OS $VER"
    else
        log_error "無法確定系統版本"
        exit 1
    fi
    
    # 檢查是否為 Ubuntu/Debian
    if [[ "$OS" != *"Ubuntu"* ]] && [[ "$OS" != *"Debian"* ]]; then
        log_warning "此腳本主要針對 Ubuntu/Debian 系統，其他系統可能需要手動調整"
    fi
}

# 更新系統包
update_system() {
    log_info "更新系統包..."
    sudo apt update
    sudo apt upgrade -y
    log_success "系統包更新完成"
}

# 安裝基礎工具
install_basic_tools() {
    log_info "安裝基礎工具..."
    sudo apt install -y \
        curl \
        wget \
        git \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        htop \
        tree \
        vim \
        nano
    log_success "基礎工具安裝完成"
}

# 安裝 Node.js
install_nodejs() {
    log_info "安裝 Node.js..."
    
    # 檢查是否已安裝
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_info "Node.js 已安裝: $NODE_VERSION"
        
        # 檢查版本是否符合要求 (>= 16)
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [[ $MAJOR_VERSION -ge 16 ]]; then
            log_success "Node.js 版本符合要求"
            return
        else
            log_warning "Node.js 版本過低，將升級到最新版本"
        fi
    fi
    
    # 安裝 Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # 驗證安裝
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        log_success "Node.js $(node --version) 和 NPM $(npm --version) 安裝成功"
    else
        log_error "Node.js 安裝失敗"
        exit 1
    fi
}

# 安裝 PM2
install_pm2() {
    log_info "安裝 PM2 進程管理器..."
    
    if command -v pm2 &> /dev/null; then
        log_info "PM2 已安裝: $(pm2 --version)"
        return
    fi
    
    sudo npm install -g pm2
    
    # 驗證安裝
    if command -v pm2 &> /dev/null; then
        log_success "PM2 $(pm2 --version) 安裝成功"
        
        # 設置 PM2 開機自啟
        log_info "配置 PM2 開機自啟..."
        sudo pm2 startup
        log_success "PM2 開機自啟配置完成"
    else
        log_error "PM2 安裝失敗"
        exit 1
    fi
}

# 安裝 Nginx
install_nginx() {
    log_info "安裝 Nginx..."
    
    if command -v nginx &> /dev/null; then
        log_info "Nginx 已安裝: $(nginx -v 2>&1 | cut -d' ' -f3)"
        return
    fi
    
    sudo apt install -y nginx
    
    # 啟動並設置開機自啟
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    # 驗證安裝
    if command -v nginx &> /dev/null; then
        log_success "Nginx 安裝成功"
        log_info "Nginx 狀態: $(sudo systemctl is-active nginx)"
    else
        log_error "Nginx 安裝失敗"
        exit 1
    fi
}

# 配置防火牆
setup_firewall() {
    log_info "配置防火牆..."
    
    # 檢查 UFW 是否已安裝
    if ! command -v ufw &> /dev/null; then
        log_info "安裝 UFW 防火牆..."
        sudo apt install -y ufw
    fi
    
    # 配置防火牆規則
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # 啟用防火牆
    sudo ufw --force enable
    
    log_success "防火牆配置完成"
    sudo ufw status
}

# 創建應用目錄
setup_app_directory() {
    log_info "創建應用目錄..."
    
    APP_DIR="/var/www/ai-speech-practice"
    
    # 創建目錄
    sudo mkdir -p $APP_DIR
    sudo mkdir -p $APP_DIR/logs
    sudo mkdir -p $APP_DIR/uploads
    sudo mkdir -p $APP_DIR/data
    
    # 設置權限
    sudo chown -R $USER:$USER $APP_DIR
    sudo chmod -R 755 $APP_DIR
    
    log_success "應用目錄創建完成: $APP_DIR"
}

# 優化系統性能
optimize_system() {
    log_info "優化系統性能..."
    
    # 增加文件描述符限制
    echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
    echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
    
    # 優化網絡參數
    sudo tee -a /etc/sysctl.conf > /dev/null << EOF

# AI Speech Practice 優化參數
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_max_tw_buckets = 5000
EOF
    
    # 應用系統參數
    sudo sysctl -p
    
    log_success "系統性能優化完成"
}

# 安裝監控工具
install_monitoring() {
    log_info "安裝監控工具..."
    
    # 安裝系統監控工具
    sudo apt install -y htop iotop nethogs
    
    # 安裝 PM2 監控模塊
    sudo npm install -g pm2-logrotate
    pm2 install pm2-logrotate
    
    log_success "監控工具安裝完成"
}

# 創建維護腳本
create_maintenance_scripts() {
    log_info "創建維護腳本..."
    
    # 創建日誌清理腳本
    sudo tee /usr/local/bin/cleanup-logs.sh > /dev/null << 'EOF'
#!/bin/bash
# 清理應用日誌
find /var/www/ai-speech-practice/logs -name "*.log" -mtime +7 -delete
# 清理 Nginx 日誌
find /var/log/nginx -name "*.log.*" -mtime +7 -delete
# 清理系統日誌
journalctl --vacuum-time=7d
EOF
    
    sudo chmod +x /usr/local/bin/cleanup-logs.sh
    
    # 添加到 crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/cleanup-logs.sh") | crontab -
    
    log_success "維護腳本創建完成"
}

# 顯示系統信息
show_system_info() {
    log_info "系統信息摘要:"
    echo "==========================================="
    echo "系統: $(lsb_release -d | cut -f2)"
    echo "內核: $(uname -r)"
    echo "CPU: $(nproc) 核心"
    echo "內存: $(free -h | awk '/^Mem:/ {print $2}')"
    echo "磁盤: $(df -h / | awk 'NR==2 {print $4}') 可用"
    echo "Node.js: $(node --version)"
    echo "NPM: $(npm --version)"
    echo "PM2: $(pm2 --version)"
    echo "Nginx: $(nginx -v 2>&1 | cut -d' ' -f3)"
    echo "==========================================="
}

# 主函數
main() {
    echo "🚀 AI Speech Practice 服務器初始化腳本"
    echo "==========================================="
    
    check_root
    check_system
    
    log_info "開始服務器初始化..."
    
    update_system
    install_basic_tools
    install_nodejs
    install_pm2
    install_nginx
    setup_firewall
    setup_app_directory
    optimize_system
    install_monitoring
    create_maintenance_scripts
    
    show_system_info
    
    log_success "🎉 服務器初始化完成！"
    echo ""
    log_info "接下來您可以:"
    echo "  1. 運行部署腳本上傳應用文件"
    echo "  2. 配置 .env 文件中的 API 密鑰"
    echo "  3. 測試應用是否正常運行"
    echo ""
    log_info "常用命令:"
    echo "  查看服務狀態: pm2 status"
    echo "  查看 Nginx 狀態: sudo systemctl status nginx"
    echo "  查看防火牆狀態: sudo ufw status"
    echo "  查看系統資源: htop"
}

# 執行主函數
main "$@"