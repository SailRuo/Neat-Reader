@echo off
chcp 65001 >nul
echo ========================================
echo   Neat Reader - Tauri Dev Mode
echo ========================================
echo.
echo Checking Rust installation...
echo.

REM Check if Rust is installed
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Rust is not installed!
    echo.
    echo Please install Rust from: https://rustup.rs/
    echo.
    echo Quick install command:
    echo   winget install Rustlang.Rustup
    echo.
    echo After installation, restart this terminal and run this script again.
    pause
    exit /b 1
)

echo [OK] Rust is installed
echo.
echo Checking MSVC Build Tools...
echo.

REM Check if Visual Studio Build Tools is installed via registry
reg query "HKLM\SOFTWARE\Microsoft\VisualStudio\Setup\Configurations" >nul 2>nul
if %errorlevel% equ 0 goto build_tools_ok

reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\VisualStudio\Setup\Configurations" >nul 2>nul
if %errorlevel% equ 0 goto build_tools_ok

echo [WARNING] Visual Studio Build Tools may not be installed.
echo.
echo If compilation fails with "link.exe not found", install:
echo   winget install Microsoft.VisualStudio.2022.BuildTools
echo.
echo Select "Desktop development with C++" during installation.
echo.
echo Press any key to continue anyway...
pause >nul

:build_tools_ok
echo [OK] Build Tools check passed
echo.
echo Installing Tauri CLI (if not already installed)...
echo.

REM Install Tauri CLI via npm
npm install

echo.
echo Starting Tauri dev environment...
echo.
echo Tips:
echo - Press F12 to open DevTools
echo - Visit /#/dev-test for environment testing
echo.

REM 启动 Tauri 开发模式（会自动启动前端和后端）
npm run tauri dev

pause
