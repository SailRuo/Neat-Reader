@echo off
echo ========================================
echo Neat Reader - 启动并迁移数据
echo ========================================
echo.

echo [1/3] 运行数据迁移...
cd python-backend
python migrate_to_sqlite.py
if errorlevel 1 (
    echo 迁移失败，但继续启动服务...
)
cd ..
echo.

echo [2/3] 启动后端服务...
start "Neat Reader Backend" cmd /k "cd python-backend && python main.py"
timeout /t 3 /nobreak >nul
echo.

echo [3/3] 启动前端服务...
start "Neat Reader Frontend" cmd /k "cd frontend && npm run dev"
echo.

echo ========================================
echo 服务已启动！
echo.
echo 后端: http://localhost:3001
echo 前端: http://localhost:5173
echo 迁移页面: http://localhost:5173/migration
echo.
echo 按任意键关闭此窗口...
echo ========================================
pause >nul
