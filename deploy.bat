@echo off
echo 🎨 画师串生成器 - GitHub Pages 部署脚本
echo.

echo 📦 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

echo 🔨 构建项目...
call npm run build-only
if %errorlevel% neq 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)

echo ✅ 构建成功！
echo.
echo 📝 接下来的步骤：
echo 1. 确保GitHub仓库已创建
echo 2. 在GitHub仓库设置中启用Pages（Source选择GitHub Actions）
echo 3. 推送代码到GitHub：
echo    git add .
echo    git commit -m "Setup GitHub Pages deployment"
echo    git push origin main
echo.
echo 🌐 部署完成后访问：https://你的用户名.github.io/artist-generator/
echo.
pause 