@echo off
title Artist Generator V3 - Quick Start

:: Check if PowerShell is available
powershell -Command "exit 0" >nul 2>&1
if errorlevel 1 (
    echo PowerShell not available, using batch version...
    call start-dev.bat
) else (
    echo Starting with PowerShell version...
    powershell -ExecutionPolicy Bypass -File "start-dev.ps1"
)

pause 