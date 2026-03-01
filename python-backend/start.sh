#!/bin/bash

echo "Starting Python Backend for PageIndex RAG..."
echo ""

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo ""
    echo "Installing dependencies..."
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

echo ""
echo "Starting server on http://127.0.0.1:3002"
echo "Press Ctrl+C to stop"
echo ""

python main.py
