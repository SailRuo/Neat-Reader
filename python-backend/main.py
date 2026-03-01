"""
Python Backend for PageIndex RAG
FastAPI 服务器入口
"""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys

from app.config import settings
from app.routes import qwen, pageindex, health

# 配置日志
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level=settings.LOG_LEVEL
)

# 创建 FastAPI 应用
app = FastAPI(
    title="PageIndex RAG Backend",
    description="Python backend for EPUB PageIndex and RAG",
    version="0.1.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(qwen.router, prefix="/api/qwen", tags=["Qwen"])
app.include_router(pageindex.router, prefix="/api/pageindex", tags=["PageIndex"])

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Python Backend 启动中...")
    logger.info(f"📍 监听地址: {settings.HOST}:{settings.PORT}")
    logger.info(f"🔧 环境: {'开发' if settings.DEBUG else '生产'}")
    logger.info(f"📁 PageIndex 缓存目录: {settings.PAGEINDEX_CACHE_DIR}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("👋 Python Backend 关闭")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
