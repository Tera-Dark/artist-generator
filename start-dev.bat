@echo off
chcp 65001 >nul
title Artist Generator V3 - Development Server

echo.
echo ========================================
echo   🎨 Artist Generator V3 Dev Server
echo ========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if we're in the correct directory
if not exist "package.json" (
    echo ❌ Error: package.json not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo 🚀 Starting development server...
echo.

:: Find available port starting from 5173
set PORT=5173
:check_port
netstat -an | find ":%PORT% " >nul
if errorlevel 1 (
    echo ✅ Port %PORT% is available
    goto start_server
) else (
    echo ⚠️  Port %PORT% is already in use, trying next port...
    set /a PORT+=1
    if %PORT% gtr 5200 (
        echo ❌ Error: No available ports found in range 5173-5200
        pause
        exit /b 1
    )
    goto check_port
)

:start_server
echo 🌐 Starting server on port %PORT%...
echo.

:: Start the development server and wait for it to be ready
start /min cmd /c "npm run dev -- --port %PORT% --host 0.0.0.0"

:: Wait for server to start
echo ⏳ Waiting for server to start...
:wait_loop
timeout /t 2 /nobreak >nul
netstat -an | find ":%PORT% " >nul
if errorlevel 1 goto wait_loop

:: Additional wait to ensure server is fully ready
timeout /t 3 /nobreak >nul

echo.
echo ✅ Development server is running!
echo.
echo 📍 Access URLs:
echo    ➜ Local:     http://localhost:%PORT%/
echo    ➜ Network:   http://0.0.0.0:%PORT%/
echo    ➜ DevTools:  http://localhost:%PORT%/__devtools__/
echo.

:: Open browser automatically
echo 🌐 Opening browser...
start "" "http://localhost:%PORT%"

echo.
echo ========================================
echo   Server Status: ✅ RUNNING on Port %PORT%
echo   Press any key to close this window
echo   (Server will continue running in background)
echo ========================================
echo.

pause >nul
exit /b 0 