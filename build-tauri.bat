@echo off
echo ========================================
echo Building Neat Reader (Tauri Version)
echo ========================================
echo.

REM Check if Rust is installed
where cargo >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Rust is not installed!
    echo Please install Rust from: https://rustup.rs/
    pause
    exit /b 1
)

echo [1/3] Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)

echo.
echo [2/3] Building frontend...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build frontend
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [3/3] Building Tauri application...
cargo tauri build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build Tauri application
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo Output location: src-tauri\target\release\bundle\
echo.
pause
