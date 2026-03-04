"""
Token 管理 API
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from loguru import logger

from app.db.database import get_db

router = APIRouter()


class TokenData(BaseModel):
    service: str  # 'baidu' | 'qwen' | 'custom_api'
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[int] = None
    resource_url: Optional[str] = None
    extra_data: Optional[dict] = None


@router.post("/tokens")
async def save_token(data: TokenData):
    """保存 Token"""
    try:
        db = get_db()
        
        token_data = {
            'access_token': data.access_token,
            'refresh_token': data.refresh_token,
            'expires_at': data.expires_at,
            'resource_url': data.resource_url,
            'extra_data': data.extra_data or {}
        }
        
        db.save_token(data.service, token_data)
        
        logger.info(f"Token 已保存: {data.service}")
        
        return {
            "success": True,
            "message": "Token 保存成功"
        }
        
    except Exception as e:
        logger.error(f"保存 Token 失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tokens/{service}")
async def get_token(service: str):
    """获取 Token"""
    try:
        db = get_db()
        token_data = db.get_token(service)
        
        if not token_data:
            return {
                "success": False,
                "message": "Token 不存在"
            }
        
        return {
            "success": True,
            "token": token_data
        }
        
    except Exception as e:
        logger.error(f"获取 Token 失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
