@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1 || (echo 请先安装 Node.js 20 或更新版本。 & pause & exit /b 1)
if not exist node_modules (call npm ci || (pause & exit /b 1))
echo 启动画师串生成器，按 Ctrl+C 退出。
call npm run dev
pause
