@echo off
chcp 65001 >nul 2>&1
title Music Visualizer Studio - Setup
color 0B

echo.
echo  ======================================
echo    Music Visualizer Studio - Setup
echo  ======================================
echo.

:: ============================================
:: 1. Check Node.js
:: ============================================
echo  [1/4] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Node.js is not installed!
    echo.
    echo  Please download and install Node.js from:
    echo  https://nodejs.org/
    echo.
    echo  Choose the LTS version, run the installer,
    echo  then re-run this setup.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo  OK - Node.js %NODE_VER%

:: ============================================
:: 2. Check FFmpeg
:: ============================================
echo  [2/4] Checking FFmpeg...
set "FFMPEG_PATH=%~dp0ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
if exist "%FFMPEG_PATH%" (
    echo  OK - FFmpeg found at project folder
) else (
    where ffmpeg >nul 2>&1
    if %errorlevel% equ 0 (
        echo  OK - FFmpeg found in system PATH
    ) else (
        color 0E
        echo.
        echo  [WARNING] FFmpeg not found!
        echo.
        echo  Video export will NOT work without FFmpeg.
        echo  To fix this, do ONE of the following:
        echo.
        echo  Option A: Download FFmpeg Essentials from:
        echo    https://www.gyan.dev/ffmpeg/builds/
        echo    Extract the folder "ffmpeg-8.1-essentials_build"
        echo    into this project folder so it looks like:
        echo    %~dp0ffmpeg-8.1-essentials_build\bin\ffmpeg.exe
        echo.
        echo  Option B: Install FFmpeg via winget:
        echo    winget install Gyan.FFmpeg
        echo.
        echo  Preview will still work without FFmpeg.
        echo.
        color 0B
    )
)

:: ============================================
:: 3. Install npm dependencies
:: ============================================
echo  [3/4] Installing dependencies...
echo.
cd /d "%~dp0"
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] npm install failed!
    echo  Check the error messages above.
    echo.
    pause
    exit /b 1
)

:: ============================================
:: 4. Create required directories
:: ============================================
echo.
echo  [4/4] Creating directories...
if not exist "uploads" mkdir uploads
if not exist "exports" mkdir exports
echo  OK - uploads/ and exports/ ready

:: ============================================
:: Done
:: ============================================
echo.
echo  ======================================
echo    Setup complete!
echo  ======================================
echo.
echo  To start the app, run:
echo    start.bat
echo.
echo  Or manually:
echo    npm run dev
echo.
echo  Then open http://localhost:5173
echo.
pause
