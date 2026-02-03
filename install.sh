#!/bin/bash

echo "========================================"
echo "  Neat Reader - 依赖安装脚本"
echo "========================================"
echo ""

echo "[提示] 正在配置国内镜像源以加速下载..."
echo ""

# 检查 .npmrc 是否存在
if [ ! -f ".npmrc" ]; then
    echo "[错误] .npmrc 文件不存在"
    echo "请确保项目根目录有 .npmrc 文件"
    exit 1
fi

echo "[1/4] 清理旧的依赖和缓存..."
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf backend/node_modules
rm -f package-lock.json
rm -f frontend/package-lock.json
rm -f backend/package-lock.json
echo ""

echo "[2/4] 清理 npm 缓存..."
npm cache clean --force
echo ""

echo "[3/4] 安装根项目依赖（包括 Electron）..."
echo "这可能需要几分钟，请耐心等待..."
echo ""
npm install
if [ $? -ne 0 ]; then
    echo ""
    echo "[错误] 根项目依赖安装失败"
    echo ""
    echo "可能的解决方案："
    echo "1. 检查网络连接"
    echo "2. 尝试使用 VPN 或代理"
    echo "3. 手动设置代理："
    echo "   npm config set proxy http://your-proxy:port"
    echo "   npm config set https-proxy http://your-proxy:port"
    echo "4. 或者使用 cnpm："
    echo "   npm install -g cnpm --registry=https://registry.npmmirror.com"
    echo "   cnpm install"
    echo ""
    exit 1
fi
echo ""

echo "[4/4] 安装前端和后端依赖..."
echo ""
echo "安装前端依赖..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "[错误] 前端依赖安装失败"
    cd ..
    exit 1
fi
cd ..
echo ""

echo "安装后端依赖..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "[错误] 后端依赖安装失败"
    cd ..
    exit 1
fi
cd ..
echo ""

echo "========================================"
echo "  ✅ 所有依赖安装成功！"
echo "========================================"
echo ""
echo "下一步："
echo "  运行 ./start.sh 启动应用"
echo ""
