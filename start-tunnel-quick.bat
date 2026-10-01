@echo off
echo ========================================
echo   Local Stream Server + Cloudflare Tunnel
echo   Quick Start (Temporary URL)
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/2] Starting Stream Server...
start "Local Stream Server" cmd /c "node server.js"

echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo [2/2] Starting Cloudflare Tunnel...
echo.
echo ========================================
echo   IMPORTANT: Copy the URL below!
echo ========================================
echo.

REM Start tunnel - this will show the public URL
npx cloudflared tunnel --url http://localhost:8000

REM If tunnel closes, keep window open
pause
