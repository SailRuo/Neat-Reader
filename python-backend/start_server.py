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
        host=settings.HOST,  # 使用配置中的 HOST
        port=settings.PORT,  # 使用配置中的 PORT
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
