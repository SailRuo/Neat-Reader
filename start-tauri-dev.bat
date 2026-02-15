@echo off
echo ========================================
echo   Neat Reader - Tauri 开发模式
echo ========================================
echo.
echo 正在启动 Tauri 开发环境...
echo.
echo 提示：
echo - 按 F12 打开开发者工具
echo - 访问 /#/dev-test 进行环境测试
echo.

REM 启动 Tauri 开发模式（会自动启动前端和后端）
npm run tauri dev

pause
