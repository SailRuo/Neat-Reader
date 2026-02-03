@echo off
chcp 65001 >nul
echo ========================================
echo   Neat Reader - Electron Startup
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Node.js version:
node --version
echo.

REM Check dependencies
if not exist "node_modules" (
    echo [2/3] Installing dependencies...
    echo This may take a few minutes...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Installation failed
        pause
        exit /b 1
    )
) else (
    echo [2/3] Dependencies already installed
)
echo.

echo [3/3] Starting application...
echo.
echo Info:
echo - Backend:  http://localhost:3000
echo - Frontend: http://localhost:5173
echo - Press Ctrl+C to stop
echo.
echo ========================================
echo.

call npm run dev

pause
