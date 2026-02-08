@echo off
echo ========================================
echo 检查是否需要重新构建
echo ========================================
echo.

echo 检查前端构建目录...
if not exist "frontend\dist" (
    echo [X] frontend\dist 不存在
    echo [!] 需要重新构建！
    echo.
    echo 请运行: rebuild.bat
    pause
    exit /b 1
)

echo [√] frontend\dist 存在

echo.
echo 检查源文件修改时间...
for %%F in (frontend\src\pages\Reader\components\FoliateReader.vue) do set SOURCE_TIME=%%~tF
for %%F in (frontend\dist\index.html) do set BUILD_TIME=%%~tF

echo 源文件时间: %SOURCE_TIME%
echo 构建时间:   %BUILD_TIME%

echo.
echo ========================================
echo 建议：
echo ========================================
echo.
echo 如果您刚刚修改了代码，请运行:
echo   rebuild.bat
echo.
echo 如果构建是最新的，可以直接运行:
echo   npm start
echo.
pause
