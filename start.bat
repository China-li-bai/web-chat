@echo off
chcp 65001
echo ====================================
echo    AI口语练习应用启动脚本
echo ====================================
echo.

:: 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到Node.js，请先安装Node.js
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)

:: 检查Rust是否安装
rustc --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到Rust，请先安装Rust
    echo 下载地址：https://rustup.rs/
    pause
    exit /b 1
)

:: 检查package.json是否存在
if not exist "package.json" (
    echo [错误] 未找到package.json文件，请确保在项目根目录运行此脚本
    pause
    exit /b 1
)

echo [信息] 正在检查依赖...

:: 安装前端依赖
if not exist "node_modules" (
    echo [信息] 正在安装前端依赖...
    npm install
    if %errorlevel% neq 0 (
        echo [错误] 前端依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo [信息] 前端依赖已存在
)

:: 安装后端依赖
cd server
if not exist "node_modules" (
    echo [信息] 正在安装后端依赖...
    npm install
    if %errorlevel% neq 0 (
        echo [错误] 后端依赖安装失败
        cd ..
        pause
        exit /b 1
    )
) else (
    echo [信息] 后端依赖已存在
)
cd ..

:: 检查环境变量文件
if not exist ".env" (
    if exist ".env.example" (
        echo [信息] 正在创建环境变量文件...
        copy ".env.example" ".env"
        echo [警告] 请编辑.env文件，配置您的API密钥
        echo [提示] 百度语音服务注册地址：https://ai.baidu.com/
    ) else (
        echo [警告] 未找到.env.example文件
    )
)

:: 创建必要的目录
if not exist "data" mkdir data
if not exist "uploads" mkdir uploads
if not exist "uploads\audio" mkdir uploads\audio
if not exist "uploads\temp" mkdir uploads\temp
if not exist "logs" mkdir logs

echo.
echo [信息] 准备启动应用...
echo [提示] 应用将在以下地址运行：
echo   前端：http://localhost:1420
echo   后端：http://localhost:3001
echo.
echo [注意] 首次运行前请确保已配置.env文件中的API密钥
echo.

:: 询问用户启动方式
echo 请选择启动方式：
echo 1. 开发模式（推荐）- 支持热重载
echo 2. 生产模式 - 构建后运行
echo 3. 仅启动后端服务
echo 4. 仅启动前端服务
echo 5. 退出
echo.
set /p choice="请输入选择 (1-5): "

if "%choice%"=="1" goto dev_mode
if "%choice%"=="2" goto prod_mode
if "%choice%"=="3" goto backend_only
if "%choice%"=="4" goto frontend_only
if "%choice%"=="5" goto end
goto invalid_choice

:dev_mode
echo [信息] 启动开发模式...
start "后端服务" cmd /k "cd server && npm run dev"
timeout /t 3 /nobreak >nul
start "前端服务" cmd /k "npm run tauri dev"
echo [信息] 开发模式启动完成
echo [提示] 两个终端窗口已打开，请保持运行状态
goto end

:prod_mode
echo [信息] 构建生产版本...
npm run tauri build
if %errorlevel% neq 0 (
    echo [错误] 构建失败
    pause
    exit /b 1
)
echo [信息] 构建完成，可执行文件位于 src-tauri/target/release/
goto end

:backend_only
echo [信息] 启动后端服务...
cd server
npm run dev
cd ..
goto end

:frontend_only
echo [信息] 启动前端服务...
npm run tauri dev
goto end

:invalid_choice
echo [错误] 无效选择，请重新运行脚本
pause
exit /b 1

:end
echo.
echo [信息] 脚本执行完成
echo [提示] 如需停止服务，请关闭相应的终端窗口
echo [帮助] 如遇问题，请查看README.md文件或检查日志
echo.
pause