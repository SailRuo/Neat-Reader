"""
Python Backend for PageIndex RAG
FastAPI 服务器入口
"""
import sys


class _NullStream:
    def write(self, _s):
        return 0

    def flush(self):
        return None

    def isatty(self):
        return False


if getattr(sys, "stdout", None) is None:
    sys.stdout = _NullStream()
if getattr(sys, "stderr", None) is None:
    sys.stderr = _NullStream()

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import os
from contextlib import asynccontextmanager

from app.config import settings
from app.routes import ai, pageindex, health, baidu, tts, conversation

# 配置日志
logger.remove()

_sink = sys.stdout if getattr(sys, "stdout", None) else None
if _sink is None and getattr(sys, "stderr", None):
    _sink = sys.stderr
if _sink is None:
    _sink = os.path.join(os.environ.get("TEMP") or os.getcwd(), "neat-reader-backend.log")

logger.add(
    _sink,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level=settings.LOG_LEVEL,
)

async def _run_exit_sync():
    """退出时同步会话到百度网盘（lifespan 与 /api/shutdown 共用）"""
    try:
        from app.services.conversation_manager import conversation_manager
        if conversation_manager.baidu_sync_enabled:
            access_token = conversation_manager.load_baidu_token() or settings.BAIDU_ACCESS_TOKEN
            if access_token:
                logger.info("📤 正在同步会话到百度网盘...")
                result = await conversation_manager.sync_to_baidu(access_token=access_token)
                logger.info(f"✅ 同步完成: 成功 {result['success']}, 失败 {result['failed']}")
                return result
            logger.info("💾 未找到百度网盘 Token，跳过上传")
        else:
            logger.info("💾 百度网盘同步未启用")
    except Exception as e:
        logger.error(f"退出时同步失败: {e}")
    return None


# 使用新的 lifespan 事件处理器（替代已弃用的 on_event）
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行
    logger.info("🚀 Neat Reader Python Backend 启动中...")
    logger.info(f"📍 监听地址: {settings.HOST}:{settings.PORT}")
    logger.info(f"🔧 环境: {'开发' if settings.DEBUG else '生产'}")
    logger.info(f"📦 已注册路由: Health, Baidu, TTS, AI, Conversation, PageIndex")
    logger.info(f"📁 PageIndex 缓存目录: {settings.PAGEINDEX_CACHE_DIR}")
    
    # 启动时从统一 token 文件加载到内存缓存（无缓存时从 data/auth_tokens.json 读取）
    try:
        from app.services import token_store
        token_store.load()
        logger.info("📂 已加载 Token 缓存（data/auth_tokens.json）")
    except Exception as e:
        logger.warning(f"加载 Token 缓存失败: {e}")
    
    # 自动启用百度网盘同步（混合模式）
    try:
        from app.services.conversation_manager import conversation_manager
        from app.services.baidu_service import BaiduNetdiskService
        
        # 启用百度网盘同步
        baidu_service = BaiduNetdiskService()
        conversation_manager.enable_baidu_sync(baidu_service)
        
        logger.info("☁️ 百度网盘同步已自动启用（混合模式）")
        logger.info("📥 应用启动时会自动从百度网盘下载会话（需配置 Token）")
        logger.info("📤 应用退出时会自动上传会话到百度网盘（需配置 Token）")
        
        # 注意：实际的同步会在前端配置 Token 后自动触发
        # 这里不尝试同步，因为后端启动时可能还没有 Token
        
    except Exception as e:
        logger.warning(f"百度网盘同步初始化失败（不影响使用）: {e}")
    
    yield  # 应用运行期间
    
    # 关闭时执行（Ctrl+C 时会执行到这里，完成对话同步后再退出）
    logger.info("👋 Python Backend 关闭中...")
    await _run_exit_sync()
    logger.info("👋 Python Backend 已关闭")

# 创建 FastAPI 应用（使用 lifespan）
app = FastAPI(
    title="PageIndex RAG Backend",
    description="Python backend for EPUB PageIndex and RAG",
    version="0.1.0",
    lifespan=lifespan
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


@app.post("/api/shutdown")
async def shutdown_sync():
    """主动触发一次“退出同步”（对话记录上传百度网盘），不关闭服务。供脚本/批处理在退出前调用。"""
    result = await _run_exit_sync()
    return {"success": True, "result": result, "message": "同步已执行"}
app.include_router(baidu.router, prefix="/api/baidu", tags=["Baidu"])
app.include_router(tts.router, prefix="/api/tts", tags=["TTS"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(conversation.router, prefix="/api/conversation", tags=["Conversation"])
app.include_router(pageindex.router, prefix="/api/pageindex", tags=["PageIndex"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        log_config=None,
    )
