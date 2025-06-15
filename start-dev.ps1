# Artist Generator V3 - Development Server Launcher
# PowerShell version with enhanced port detection and auto-browser opening

param(
    [int]$StartPort = 5173,
    [int]$MaxPort = 5200
)

# Set console title and encoding
$Host.UI.RawUI.WindowTitle = "Artist Generator V3 - Development Server"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   🎨 Artist Generator V3 Dev Server" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error: Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "🚀 Starting development server..." -ForegroundColor Green
Write-Host ""

# Function to check if port is available
function Test-Port {
    param([int]$Port)
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

# Find available port
$Port = $StartPort
while ($Port -le $MaxPort) {
    if (Test-Port -Port $Port) {
        Write-Host "✅ Port $Port is available" -ForegroundColor Green
        break
    } else {
        Write-Host "⚠️  Port $Port is already in use, trying next port..." -ForegroundColor Yellow
        $Port++
    }
}

if ($Port -gt $MaxPort) {
    Write-Host "❌ Error: No available ports found in range $StartPort-$MaxPort" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "🌐 Starting server on port $Port..." -ForegroundColor Cyan
Write-Host ""

# Start the development server
$process = Start-Process -FilePath "npm" -ArgumentList "run", "dev", "--", "--port", $Port, "--host", "0.0.0.0" -PassThru -WindowStyle Minimized

# Wait for server to start
Write-Host "⏳ Waiting for server to start..." -ForegroundColor Yellow
$timeout = 30 # seconds
$elapsed = 0

do {
    Start-Sleep -Seconds 1
    $elapsed++
    $isRunning = -not (Test-Port -Port $Port)
    
    if ($elapsed -ge $timeout) {
        Write-Host "❌ Timeout: Server failed to start within $timeout seconds" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} while (-not $isRunning)

# Additional wait to ensure server is fully ready
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "✅ Development server is running!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access URLs:" -ForegroundColor Cyan
Write-Host "   ➜ Local:     http://localhost:$Port/" -ForegroundColor White
Write-Host "   ➜ Network:   http://0.0.0.0:$Port/" -ForegroundColor White
Write-Host "   ➜ DevTools:  http://localhost:$Port/__devtools__/" -ForegroundColor White
Write-Host ""

# Get local IP for network access
try {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*", "Ethernet*" | Where-Object {$_.IPAddress -notlike "169.254.*"} | Select-Object -First 1).IPAddress
    if ($localIP) {
        Write-Host "   ➜ Network:   http://${localIP}:${Port}/ (for mobile devices)" -ForegroundColor Magenta
        Write-Host ""
    }
} catch {
    # Ignore network IP detection errors
}

# Open browser automatically
Write-Host "🌐 Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:$Port"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Server Status: ✅ RUNNING on Port $Port" -ForegroundColor Green
Write-Host "   Process ID: $($process.Id)" -ForegroundColor Gray
Write-Host "   Press any key to close this window" -ForegroundColor Yellow
Write-Host "   (Server will continue running)" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
exit 0 