@echo off
chcp 65001 >nul
echo ========================================
echo   Neat Reader - Python 后端
echo ========================================
echo.

REM Check Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found
    echo Download: https://www.python.org/
    pause
    exit /b 1
)

echo [1/2] Checking Python...
python --version
echo.

REM Check Python dependencies
echo [2/2] Checking Python dependencies...
python -c "import fastapi, uvicorn" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing Python dependencies...
    cd python-backend
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Installation failed
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo Python dependencies installed successfully
) else (
    echo Python dependencies already installed
)
echo.

REM Check port 3002
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002 ^| findstr LISTENING') do (
    echo [WARNING] Port 3002 in use, killing process %%a...
    taskkill /F /PID %%a >nul 2>nul
    timeout /t 2 /nobreak >nul
)
echo.

echo Starting Python backend...
echo - URL: http://localhost:3002
echo - Press Ctrl+C to stop (will sync conversation to Baidu before exit)
echo ========================================
echo.

cd python-backend
python start_server.py
cd ..

echo.
echo Backend stopped.
pause
