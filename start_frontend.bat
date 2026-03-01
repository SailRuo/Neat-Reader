@echo off
chcp 65001 >nul
echo ========================================
echo   Neat Reader - 前端
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

echo [1/2] Checking Node.js...
node --version
echo.

REM Check Node.js dependencies
echo [2/2] Checking Node.js dependencies...
if not exist "frontend\node_modules" (
    echo Installing Node.js dependencies...
    cd frontend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Installation failed
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo Node.js dependencies installed successfully
) else (
    echo Node.js dependencies already installed
)
echo.

echo Starting frontend...
echo - URL: http://localhost:5173
echo - Press Ctrl+C to stop
echo.
echo Note: 请确保后端已启动 (http://localhost:3002)
echo ========================================
echo.

cd frontend
call npm run dev
cd ..

echo.
echo Frontend stopped.
pause
