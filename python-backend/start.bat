@echo off
echo Starting Python Backend for PageIndex RAG...
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

REM 检查依赖是否安装
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
    echo Installing dependencies...
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

echo.
echo Starting server on http://127.0.0.1:3002
echo Press Ctrl+C to stop
echo.

python main.py

pause
