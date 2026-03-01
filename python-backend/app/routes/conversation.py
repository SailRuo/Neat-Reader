"""
会话管理 API 路由
提供会话的 CRUD 操作
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from loguru import logger

from app.services.conversation_manager import conversation_manager

router = APIRouter()


class CreateConversationRequest(BaseModel):
    """创建会话请求"""
    conversation_id: str
    user_id: Optional[str] = None
    title: str = "新对话"
    context: Optional[Dict] = None  # 如 {"book_id": "xxx", "book_title": "xxx"}


class AddMessageRequest(BaseModel):
    """添加消息请求"""
    conversation_id: str
    role: str  # user/assistant/system
    content: str
    metadata: Optional[Dict] = None


class GetMessagesRequest(BaseModel):
    """获取消息请求"""
    conversation_id: str
    limit: Optional[int] = None


@router.post("/create")
async def create_conversation(request: CreateConversationRequest):
    """创建新会话"""
    try:
        conversation = conversation_manager.create_conversation(
            conversation_id=request.conversation_id,
            user_id=request.user_id,
            title=request.title,
            context=request.context
        )
        
        return {
            "success": True,
            "conversation": conversation
        }
        
    except Exception as e:
        logger.error(f"创建会话失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get/{conversation_id}")
async def get_conversation(conversation_id: str):
    """获取会话详情"""
    try:
        conversation = conversation_manager.get_conversation(conversation_id)
        
        if not conversation:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        return {
            "success": True,
            "conversation": conversation
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取会话失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages/add")
async def add_message(request: AddMessageRequest):
    """添加消息到会话"""
    try:
        success = conversation_manager.add_message(
            conversation_id=request.conversation_id,
            role=request.role,
            content=request.content,
            metadata=request.metadata
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        return {
            "success": True,
            "message": "消息已添加"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加消息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages/get")
async def get_messages(request: GetMessagesRequest):
    """获取会话消息"""
    try:
        messages = conversation_manager.get_messages(
            conversation_id=request.conversation_id,
            limit=request.limit
        )
        
        return {
            "success": True,
            "messages": messages
        }
        
    except Exception as e:
        logger.error(f"获取消息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """删除会话"""
    try:
        success = conversation_manager.delete_conversation(conversation_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        return {
            "success": True,
            "message": "会话已删除"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除会话失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_conversations(
    user_id: Optional[str] = None,
    limit: int = 50
):
    """列出会话列表"""
    try:
        conversations = conversation_manager.list_conversations(
            user_id=user_id,
            limit=limit
        )
        
        return {
            "success": True,
            "conversations": conversations,
            "total": len(conversations)
        }
        
    except Exception as e:
        logger.error(f"列出会话失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear-old")
async def clear_old_conversations(days: int = 30):
    """清理旧会话"""
    try:
        deleted_count = conversation_manager.clear_old_conversations(days=days)
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"已清理 {deleted_count} 个超过 {days} 天的会话"
        }
        
    except Exception as e:
        logger.error(f"清理旧会话失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/to-baidu")
async def sync_to_baidu(conversation_id: Optional[str] = None):
    """
    同步会话到百度网盘。
    使用统一存储的 token（data/auth_tokens.json + 内存缓存），或 .env 中的 BAIDU_ACCESS_TOKEN。
    """
    try:
        from app.config import settings
        access_token = conversation_manager.load_baidu_token() or settings.BAIDU_ACCESS_TOKEN
        result = await conversation_manager.sync_to_baidu(conversation_id, access_token=access_token)
        
        return {
            "success": True,
            "result": result,
            "message": f"同步完成: 成功 {result['success']}, 失败 {result['failed']}"
        }
        
    except Exception as e:
        logger.error(f"同步到百度网盘失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/from-baidu")
async def sync_from_baidu():
    """从百度网盘同步会话"""
    try:
        result = await conversation_manager.sync_from_baidu()
        
        return {
            "success": True,
            "result": result,
            "message": f"同步完成: 成功 {result['success']}, 失败 {result['failed']}"
        }
        
    except Exception as e:
        logger.error(f"从百度网盘同步失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/enable")
async def enable_baidu_sync():
    """启用百度网盘同步"""
    try:
        # 导入百度网盘服务
        from app.services.baidu_service import BaiduNetdiskService
        
        baidu_service = BaiduNetdiskService()
        conversation_manager.enable_baidu_sync(baidu_service)
        
        return {
            "success": True,
            "message": "百度网盘同步已启用"
        }
        
    except Exception as e:
        logger.error(f"启用百度网盘同步失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/disable")
async def disable_baidu_sync():
    """禁用百度网盘同步"""
    try:
        conversation_manager.disable_baidu_sync()
        
        return {
            "success": True,
            "message": "百度网盘同步已禁用"
        }
        
    except Exception as e:
        logger.error(f"禁用百度网盘同步失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
