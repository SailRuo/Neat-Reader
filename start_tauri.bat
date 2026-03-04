@echo off
chcp 65001 >nul
echo ========================================
echo   Neat Reader - Tauri Dev Mode
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

echo [1/3] Checking Node.js...
node --version
echo.

REM Check Rust
where cargo >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Rust not found
    echo Download: https://rustup.rs/
    pause
    exit /b 1
)

echo [2/3] Checking Rust...
cargo --version
echo.

REM Check Node.js dependencies
echo [3/3] Checking Node.js dependencies...
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

echo Starting Tauri Dev Mode...
echo - Vite Dev Server will start automatically
echo - Desktop app window will open
echo - Hot reload enabled
echo - Press Ctrl+C to stop
echo.
echo Note: 请确保后端已启动 (http://localhost:3002)
echo ========================================
echo.

cd frontend
call npm run tauri:dev
cd ..

echo.
echo Tauri Dev stopped.
pause
