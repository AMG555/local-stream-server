@echo off
echo ===================================
echo FFmpeg Quick Installer for Windows
echo ===================================
echo.

REM Check if FFmpeg already exists
where ffmpeg >nul 2>&1
if %errorlevel% == 0 (
    echo FFmpeg is already installed and in PATH!
    ffmpeg -version | findstr "ffmpeg version"
    echo.
    echo No installation needed.
    pause
    exit /b 0
)

echo FFmpeg not found in PATH. Installing...
echo.
echo Downloading FFmpeg (Windows build)...
echo This may take a few minutes depending on your connection.
echo.

REM Download FFmpeg essentials build
set DOWNLOAD_URL=https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
set FILENAME=ffmpeg-essentials.zip

curl -L -o "%FILENAME%" "%DOWNLOAD_URL%"

if errorlevel 1 (
    echo.
    echo ERROR: Download failed!
    echo.
    echo Manual installation:
    echo 1. Visit: https://www.gyan.dev/ffmpeg/builds/
    echo 2. Download: ffmpeg-release-essentials.zip
    echo 3. Extract to C:\ffmpeg
    echo 4. Add C:\ffmpeg\bin to System PATH
    echo.
    pause
    exit /b 1
)

echo.
echo Extracting FFmpeg...
tar -xf "%FILENAME%"

REM Find extracted folder (name varies by version)
for /d %%i in (ffmpeg-*) do set FFMPEG_DIR=%%i

if not defined FFMPEG_DIR (
    echo ERROR: Could not find extracted FFmpeg folder
    pause
    exit /b 1
)

echo.
echo Moving FFmpeg to C:\ffmpeg...
if exist "C:\ffmpeg" (
    echo C:\ffmpeg already exists. Removing old version...
    rmdir /s /q "C:\ffmpeg"
)

move "%FFMPEG_DIR%" "C:\ffmpeg"

echo.
echo Cleaning up...
del "%FILENAME%"

echo.
echo ===================================
echo Adding FFmpeg to System PATH...
echo ===================================
echo.
echo IMPORTANT: You need Administrator privileges for this step.
echo.
echo Option 1 (Recommended): Manual PATH setup
echo   1. Press Win + X, select "System"
echo   2. Click "Advanced system settings"
echo   3. Click "Environment Variables"
echo   4. Under "System variables", find "Path"
echo   5. Click "Edit" then "New"
echo   6. Add: C:\ffmpeg\bin
echo   7. Click OK on all dialogs
echo   8. Restart your terminal/PowerShell
echo.
echo Option 2: Run this command as Administrator:
echo   setx /M PATH "%%PATH%%;C:\ffmpeg\bin"
echo.

choice /C 12 /M "Choose option (1=Manual, 2=Auto)"

if errorlevel 2 (
    echo.
    echo Attempting automatic PATH setup...
    setx /M PATH "%PATH%;C:\ffmpeg\bin"
    if errorlevel 1 (
        echo ERROR: Could not modify PATH. Please add manually.
    ) else (
        echo SUCCESS! PATH updated.
    )
)

echo.
echo ===================================
echo Installation Complete!
echo ===================================
echo.
echo FFmpeg installed to: C:\ffmpeg
echo.
echo To verify installation:
echo 1. Close and reopen PowerShell/Terminal
echo 2. Run: ffmpeg -version
echo 3. Restart the stream server: npm start
echo.
pause
