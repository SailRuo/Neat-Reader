@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
echo ========================================
echo   Neat Reader - 一键打包（Tauri + Python sidecar）
echo ========================================
echo.

REM 1) Basic checks
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Node.js not found. Please install Node.js first.
  pause
  exit /b 1
)
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] npm not found.
  pause
  exit /b 1
)
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Python not found. Please install Python first.
  pause
  exit /b 1
)

echo [1/4] 尝试结束可能占用的进程（app/backend）...
for %%P in (app.exe Neat-Reader.exe backend-x86_64-pc-windows-msvc.exe backend-aarch64-pc-windows-msvc.exe backend-i686-pc-windows-msvc.exe) do (
  taskkill /F /IM %%P >nul 2>nul
)
timeout /t 2 /nobreak >nul
echo.

echo [2/4] 打包 Python 后端 sidecar（PyInstaller）...
python python-backend\build_scripts.py
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] Python backend build failed.
  pause
  exit /b 1
)
echo.

echo [3/4] 打包 Tauri（会先构建前端 dist，再生成安装包）...
pushd frontend
call npm run tauri:build
set TAURI_BUILD_ERR=%ERRORLEVEL%
popd
if %TAURI_BUILD_ERR% NEQ 0 (
  echo.
  echo [ERROR] Tauri build failed.
  echo         常见原因：backend/app 仍被占用 或 杀毒拦截（PermissionDenied）。
  pause
  exit /b 1
)
echo.

echo [4/4] 完成！安装包输出目录：
echo   frontend\src-tauri\target\release\bundle\nsis\
echo   frontend\src-tauri\target\release\bundle\msi\
echo.
echo 后端 sidecar 输出目录：
echo   frontend\src-tauri\binaries\
echo.
echo 启动后如后端仍异常，可查看：
echo   %%TEMP%%\neat-reader-backend.log
echo.
pause
