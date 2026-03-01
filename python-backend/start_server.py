#!/usr/bin/env python3
"""
启动 Python 后端服务器
- DEBUG=True（默认）：自动重载，改代码后无需手动重启
- DEBUG=False：生产模式，无重载
"""
import uvicorn
from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=3002,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
