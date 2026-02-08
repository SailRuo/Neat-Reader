@echo off
echo ========================================
echo Rebuilding Neat Reader Frontend
echo ========================================
echo.

cd frontend
echo [1/2] Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)

cd ..
echo.
echo [2/2] Building Electron app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Electron build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo You can now run the app with: npm start
echo Or package it with: npm run build:win
echo.
pause
