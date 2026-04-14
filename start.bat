@echo off
chcp 65001 >nul 2>&1
title Music Visualizer Studio
color 0B

echo.
echo  ======================================
echo    Music Visualizer Studio
echo  ======================================
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    color 0E
    echo  [!] Dependencies not installed.
    echo  Running setup first...
    echo.
    call setup.bat
    if %errorlevel% neq 0 exit /b 1
    echo.
)

echo  Starting servers...
echo.
echo  Frontend:  http://localhost:5173
echo  Backend:   http://localhost:3001
echo.
echo  Press Ctrl+C to stop.
echo.

:: Open browser after a short delay
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"

:: Start dev servers
npm run dev
