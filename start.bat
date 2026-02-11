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

echo [3/3] Checking port 3001...
echo.

REM Check if port 3001 is in use
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    set PID=%%a
    goto :found
)
goto :notfound

:found
echo [WARNING] Port 3001 is already in use by process %PID%
echo Killing process %PID%...
taskkill /F /PID %PID% >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Process killed successfully
    timeout /t 2 /nobreak >nul
) else (
    echo [ERROR] Failed to kill process. Please close it manually.
    pause
    exit /b 1
)

:notfound
echo Port 3001 is available
echo.
echo [4/4] Starting application...
echo.
echo Info:
echo - Backend:  http://localhost:3001
echo - Frontend: http://localhost:5173
echo - Press Ctrl+C to stop
echo.
echo ========================================
echo.

call npm run dev

pause
