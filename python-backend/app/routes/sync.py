"""
云端同步 API
"""
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.services.cloud_sync_service import get_sync_service

router = APIRouter()


@router.post("/sync/force")
async def force_sync():
    """
    强制执行一次完整同步
    
    同步内容:
    - 数据库文件
    - 书籍文件
    - PageIndex 索引
    - AI 对话记录
    """
    try:
        sync_service = get_sync_service()
        await sync_service.force_sync()
        
        return {
            "success": True,
            "message": "强制同步完成"
        }
        
    except Exception as e:
        logger.error(f"强制同步失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync/status")
async def get_sync_status():
    """
    获取同步服务状态
    """
    try:
        sync_service = get_sync_service()
        
        return {
            "success": True,
            "status": {
                "is_running": sync_service.is_running,
                "sync_interval": sync_service.sync_interval,
                "last_sync_time": sync_service.last_sync_time,
                "synced_books_count": len(sync_service.synced_books),
                "synced_pageindex_count": len(sync_service.synced_pageindex)
            }
        }
        
    except Exception as e:
        logger.error(f"获取同步状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/config")
async def update_sync_config(interval: int = 300):
    """
    更新同步配置
    
    Args:
        interval: 同步间隔（秒），默认 300 秒（5分钟）
    """
    try:
        if interval < 60:
            raise HTTPException(status_code=400, detail="同步间隔不能小于 60 秒")
        
        sync_service = get_sync_service()
        sync_service.sync_interval = interval
        
        return {
            "success": True,
            "message": f"同步间隔已更新为 {interval} 秒"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新同步配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
