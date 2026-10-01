@echo off
echo ========================================
echo   Cloudflare Tunnel Installation
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Please run as Administrator!
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

echo Installing Cloudflare Tunnel (cloudflared)...
echo.

REM Check if winget is available
where winget >nul 2>nul
if %errorlevel% equ 0 (
    echo Using winget to install cloudflared...
    winget install Cloudflare.cloudflared
    goto :installed
)

REM Check if chocolatey is available
where choco >nul 2>nul
if %errorlevel% equ 0 (
    echo Using Chocolatey to install cloudflared...
    choco install cloudflared -y
    goto :installed
)

REM Manual download instructions
echo.
echo ========================================
echo   Manual Installation Required
echo ========================================
echo.
echo Please download cloudflared manually:
echo 1. Visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
echo 2. Download Windows version (64-bit)
echo 3. Rename downloaded file to: cloudflared.exe
echo 4. Move to: C:\Windows\System32\
echo 5. Run this script again
echo.
pause
exit /b 1

:installed
echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Verifying installation...
cloudflared --version

echo.
echo Next steps:
echo 1. Run: setup-tunnel.bat
echo.
pause
