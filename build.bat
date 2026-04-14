@echo off
chcp 65001 >nul 2>&1
title Music Visualizer Studio - Build
color 0B

echo.
echo  ======================================
echo    Music Visualizer Studio - Build
echo  ======================================
echo.

cd /d "%~dp0"

:: Check deps
if not exist "node_modules" (
    echo  [!] Dependencies not installed. Run setup.bat first.
    pause
    exit /b 1
)

echo  Building production bundle...
echo.
call npm run build

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo  ======================================
echo    Build complete!
echo  ======================================
echo.
echo  Output: dist/
echo.
echo  To serve the production build:
echo    1. Run: node server/index.js
echo    2. Serve dist/ with any static file server
echo.
pause
