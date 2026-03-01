"""
健康检查路由
"""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "pageindex-rag-backend",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "0.1.0"
    }
