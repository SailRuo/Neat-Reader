@echo off
echo Installing Tauri frontend dependencies...
echo.

cd frontend

echo [1/1] Installing @tauri-apps/api...
call npm install @tauri-apps/api@^1.5.0

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install Tauri dependencies
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo [SUCCESS] Tauri dependencies installed successfully!
echo.
echo You can now run: start-tauri.bat
echo.
pause
