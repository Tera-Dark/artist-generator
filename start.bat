@echo off
chcp 65001 >nul
title Artist Generator V3 - Start

echo.
echo ========================================
echo   🎨 Artist Generator V3 - Start
echo ========================================
echo.

:: Check if Node.js is installed
echo 🔍 Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%

:: Check if we're in the correct directory
if not exist "package.json" (
    echo ❌ Error: package.json not found
    echo Please run this script from the project root directory
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ Error: Failed to install dependencies
        echo.
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully
)

echo.
echo 🚀 Starting development server...
echo ⏳ This may take a few moments...
echo.

:: Start the development server directly
npm run dev

echo.
echo 📍 If the server started successfully, you can access it at:
echo    ➜ Local: http://localhost:5173/
echo.
echo Press any key to exit...
pause >nul
