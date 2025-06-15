# 🚀 Artist Generator - Quick Start Launchers

This project includes multiple launcher scripts for easy development server startup with automatic port detection and browser opening.

## 📁 Available Launchers

### 1. `Quick-Start.bat` (Recommended)
**One-click solution that automatically chooses the best launcher**
- ✅ Detects PowerShell availability
- ✅ Falls back to batch version if needed
- ✅ Double-click to run

### 2. `start-dev.ps1` (PowerShell - Most Advanced)
**Full-featured PowerShell launcher with enhanced capabilities**
- ✅ Smart port detection (5173-5200)
- ✅ Network IP detection for mobile testing
- ✅ Colorful console output
- ✅ Process management
- ✅ Timeout handling
- ✅ Auto-browser opening

### 3. `start-dev.bat` (Batch - Universal Compatibility)
**Traditional batch file for maximum compatibility**
- ✅ Works on all Windows versions
- ✅ Port auto-detection
- ✅ Auto-browser opening
- ✅ Dependency checking

## 🎯 Quick Start

### Method 1: Double-click `Quick-Start.bat`
Just double-click the file and it will:
1. Check system requirements
2. Install dependencies if needed
3. Find available port automatically
4. Start development server
5. Open browser automatically

### Method 2: Run PowerShell script directly
```powershell
# Default (starts from port 5173)
.\start-dev.ps1

# Custom port range
.\start-dev.ps1 -StartPort 3000 -MaxPort 3100
```

### Method 3: Run batch file directly
```cmd
start-dev.bat
```

## 🔧 Features

### ✅ Automatic Port Detection
- Starts from port 5173 (Vite default)
- Automatically tries next port if occupied
- Supports range 5173-5200 (configurable)
- Shows which port is being used

### ✅ Smart Dependency Management
- Checks if Node.js is installed
- Verifies project structure
- Auto-installs npm dependencies if missing
- Validates package.json existence

### ✅ Auto Browser Opening
- Opens default browser automatically
- Shows all access URLs (local, network, devtools)
- Provides mobile device access URL (PowerShell version)

### ✅ Error Handling
- Comprehensive error checking
- Clear error messages
- Graceful fallbacks
- Timeout protection

## 🌐 Access URLs

Once started, you can access the application via:

- **Local**: `http://localhost:[PORT]/`
- **Network**: `http://0.0.0.0:[PORT]/` (for same network devices)
- **DevTools**: `http://localhost:[PORT]/__devtools__/`
- **Mobile**: `http://[YOUR-IP]:[PORT]/` (shown in PowerShell version)

## 🛠️ Troubleshooting

### Port Issues
- If all ports 5173-5200 are occupied, the script will show an error
- You can manually specify a different port range in PowerShell version
- Check running processes: `netstat -an | findstr :5173`

### Permission Issues
- If PowerShell execution is blocked, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- Or use the batch version instead

### Node.js Issues
- Ensure Node.js is installed: https://nodejs.org/
- Verify installation: `node --version`
- Add Node.js to PATH if needed

## 📱 Mobile Testing

The PowerShell version automatically detects your local IP address for mobile device testing:
1. Ensure your mobile device is on the same WiFi network
2. Use the Network URL shown in the console
3. Example: `http://192.168.1.100:5173/`

## 🎨 Customization

### PowerShell Version Parameters
```powershell
# Start from port 3000, max 3100
.\start-dev.ps1 -StartPort 3000 -MaxPort 3100
```

### Environment Variables
You can set these before running:
```cmd
set BROWSER=chrome
set PORT=3000
```

## 📋 System Requirements

- **Windows 7+** (for batch version)
- **Windows 10+** (recommended for PowerShell version)
- **Node.js 16+**
- **npm** (comes with Node.js)

## 🔄 Updates

These launchers are designed to be self-updating:
- They check for missing dependencies
- They validate project structure
- They adapt to different system configurations

---

**Happy coding! 🎨✨**

*For issues or suggestions, please check the main project README or create an issue.* 