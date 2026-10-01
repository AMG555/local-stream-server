@echo off
echo ========================================
echo   Cloudflare Tunnel Setup
echo   (One-time configuration)
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

echo Step 1: Login to Cloudflare
echo ========================================
echo A browser window will open for authentication.
echo Login with your Cloudflare account (or create one - it's FREE)
echo.
pause

cloudflared tunnel login

if %errorlevel% neq 0 (
    echo ERROR: Login failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Create Tunnel
echo ========================================
echo Creating tunnel named: local-stream-server
echo.

cloudflared tunnel create local-stream-server

if %errorlevel% neq 0 (
    echo ERROR: Tunnel creation failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Configure DNS (Optional)
echo ========================================
echo If you have a domain in Cloudflare, you can set up custom URLs:
echo.
echo Run these commands (replace yourdomain.com):
echo   cloudflared tunnel route dns local-stream-server stream.yourdomain.com
echo   cloudflared tunnel route dns local-stream-server rtmp.yourdomain.com
echo   cloudflared tunnel route dns local-stream-server media.yourdomain.com
echo.
echo OR skip this step and use temporary URLs
echo.
set /p SETUP_DNS="Do you want to set up DNS now? (y/n): "

if /i "%SETUP_DNS%"=="y" (
    echo.
    set /p DOMAIN="Enter your domain (e.g., example.com): "
    
    echo Setting up DNS routes...
    cloudflared tunnel route dns local-stream-server stream.!DOMAIN!
    cloudflared tunnel route dns local-stream-server rtmp.!DOMAIN!
    cloudflared tunnel route dns local-stream-server media.!DOMAIN!
    
    echo.
    echo DNS routes created! URLs will be:
    echo   Web:   https://stream.!DOMAIN!
    echo   RTMP:  rtmp://rtmp.!DOMAIN!
    echo   Media: https://media.!DOMAIN!
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit: cloudflare-tunnel-config.yml
echo    - Update hostnames if you set up DNS
echo    - Update credentials-file path (shown above)
echo.
echo 2. Run: start-tunnel-persistent.bat
echo.
pause
