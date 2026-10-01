@echo off
echo ========================================
echo   Local Stream Server + Cloudflare Tunnel
echo   Persistent Mode (Configured URLs)
echo ========================================
echo.

REM Check if cloudflared is installed
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: cloudflared not found!
    echo Please run: install-cloudflared.bat first
    pause
    exit /b 1
)

REM Check if config file exists
if not exist "cloudflare-tunnel-config.yml" (
    echo ERROR: cloudflare-tunnel-config.yml not found!
    echo Please run: setup-tunnel.bat first
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
echo Using configuration: cloudflare-tunnel-config.yml
echo.

REM Start persistent tunnel with config
cloudflared tunnel --config cloudflare-tunnel-config.yml run local-stream-server

REM If tunnel closes, keep window open
echo.
echo Tunnel stopped.
pause
