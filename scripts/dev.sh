#!/bin/bash

# AI口语练习产品 - 开发环境启动脚本
# 用于同时启动前端和后端服务

echo "🚀 Starting AI Speech Practice Development Environment..."

# 检查环境
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        echo "❌ pnpm is not installed. Installing..."
        npm install -g pnpm
    fi
    
    echo "✅ All dependencies are installed"
}

# 安装依赖
install_packages() {
    echo "📦 Installing packages..."
    
    # 前端依赖
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        pnpm install
    fi
    
    # 后端依赖
    if [ ! -d "server/node_modules" ]; then
        echo "Installing backend dependencies..."
        cd server && npm install && cd ..
    fi
}

# 创建必要的目录
create_directories() {
    echo "📁 Creating necessary directories..."
    mkdir -p logs
    mkdir -p server/uploads/audio
    mkdir -p server/uploads/temp
    mkdir -p data
    mkdir -p docs
    mkdir -p discuss
    mkdir -p types
}

# 检查环境变量
check_env() {
    if [ ! -f ".env" ]; then
        echo "⚠️  .env file not found. Copying from .env.example..."
        cp .env.example .env
        echo "📝 Please update .env with your API keys"
    fi
}

# 启动服务
start_services() {
    echo "🎯 Starting services..."
    
    # 清理旧的日志
    rm -f logs/*.log
    
    # 启动后端服务器
    echo "Starting backend server..."
    cd server && npm start > ../logs/server.log 2>&1 &
    SERVER_PID=$!
    cd ..
    
    # 等待服务器启动
    sleep 3
    
    # 启动前端开发服务器
    echo "Starting frontend dev server..."
    pnpm dev > logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    echo "✅ Services started!"
    echo "   Backend PID: $SERVER_PID (Port 3001)"
    echo "   Frontend PID: $FRONTEND_PID (Port 5173)"
    echo ""
    echo "📌 Logs:"
    echo "   Backend: logs/server.log"
    echo "   Frontend: logs/frontend.log"
    echo ""
    echo "🌐 Access the application at: http://localhost:5173"
    echo ""
    echo "Press Ctrl+C to stop all services..."
    
    # 保存PID到文件
    echo "$SERVER_PID" > logs/server.pid
    echo "$FRONTEND_PID" > logs/frontend.pid
    
    # 等待用户中断
    trap cleanup INT
    wait
}

# 清理函数
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    
    if [ -f "logs/server.pid" ]; then
        kill $(cat logs/server.pid) 2>/dev/null
        rm logs/server.pid
    fi
    
    if [ -f "logs/frontend.pid" ]; then
        kill $(cat logs/frontend.pid) 2>/dev/null
        rm logs/frontend.pid
    fi
    
    echo "✅ All services stopped"
    exit 0
}

# 主流程
main() {
    check_dependencies
    create_directories
    check_env
    install_packages
    start_services
}

main
