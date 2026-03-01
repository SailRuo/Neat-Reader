"""
Qwen API 路由
验证 Python 调用 Qwen API 的可行性
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
from loguru import logger
import json

from app.services.qwen_client import QwenClient

router = APIRouter()

class QwenTestRequest(BaseModel):
    """Qwen API 测试请求"""
    access_token: str
    resource_url: Optional[str] = None
    message: Optional[str] = "你好，请用一句话介绍你自己。"

class QwenChatRequest(BaseModel):
    """Qwen 对话请求"""
    access_token: str
    resource_url: Optional[str] = None
    messages: List[Dict[str, str]]
    model: Optional[str] = "qwen3-coder-plus"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None

@router.post("/test")
async def test_qwen_api(request: QwenTestRequest):
    """
    测试 Qwen API 连接（用户故事 8.3）
    
    验证：
    - Python 接收 access_token 和 resource_url
    - 使用 OpenAI SDK 配置 Qwen API 端点
    - 成功调用 Qwen API（非流式）
    """
    try:
        logger.info("收到 Qwen API 测试请求")
        logger.info(f"Resource URL: {request.resource_url or 'default'}")
        
        # 创建 Qwen 客户端
        client = QwenClient(
            access_token=request.access_token,
            resource_url=request.resource_url
        )
        
        # 测试连接
        result = client.test_connection()
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        logger.info("Qwen API 测试成功")
        
        return {
            "success": True,
            "message": "Qwen API 连接成功",
            "response": result["response"],
            "usage": result["usage"]
        }
        
    except Exception as e:
        logger.error(f"Qwen API 测试失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def chat_completion(request: QwenChatRequest):
    """
    Qwen 对话（非流式）
    
    验证：
    - 处理多轮对话
    - 长文本输入（PageIndex 上下文）
    """
    try:
        logger.info(f"收到 Qwen 对话请求: {len(request.messages)} 条消息")
        
        # 创建 Qwen 客户端
        client = QwenClient(
            access_token=request.access_token,
            resource_url=request.resource_url
        )
        
        # 调用 API
        response = await client.chat_completion_async(
            messages=request.messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        logger.info("Qwen 对话成功")
        
        return {
            "success": True,
            "response": response
        }
        
    except Exception as e:
        logger.error(f"Qwen 对话失败: {e}")
        
        # 处理特定错误（用户故事 8.5）
        if "401" in str(e) or "Unauthorized" in str(e):
            raise HTTPException(
                status_code=401,
                detail="Token 无效或已过期，请重新授权"
            )
        elif "429" in str(e):
            raise HTTPException(
                status_code=429,
                detail="API 调用频率超限，请稍后重试"
            )
        elif "500" in str(e) or "502" in str(e) or "503" in str(e):
            raise HTTPException(
                status_code=503,
                detail="Qwen 服务暂时不可用，请稍后重试"
            )
        else:
            raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat-stream")
async def chat_completion_stream(request: QwenChatRequest):
    """
    Qwen 对话（流式响应）（用户故事 8.4）
    
    验证：
    - 流式响应
    - SSE 格式
    """
    try:
        logger.info(f"收到 Qwen 流式对话请求: {len(request.messages)} 条消息")
        
        # 创建 Qwen 客户端
        client = QwenClient(
            access_token=request.access_token,
            resource_url=request.resource_url
        )
        
        async def generate():
            """生成 SSE 流"""
            try:
                async for chunk in client.chat_completion_stream(
                    messages=request.messages,
                    model=request.model,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens
                ):
                    # SSE 格式
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # 结束标记
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                logger.error(f"流式响应错误: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # 禁用 Nginx 缓冲
            }
        )
        
    except Exception as e:
        logger.error(f"Qwen 流式对话失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-long-context")
async def test_long_context(request: QwenChatRequest):
    """
    测试长文本输入（用户故事 8.7）
    
    验证：
    - PageIndex 上下文 + 用户问题
    - Token 计数
    - 响应质量
    """
    try:
        logger.info("收到长文本测试请求")
        
        # 计算输入 token 数（粗略估算：中文 1 字 ≈ 1.5 tokens，英文 1 词 ≈ 1.3 tokens）
        total_chars = sum(len(msg["content"]) for msg in request.messages)
        estimated_tokens = int(total_chars * 1.5)
        
        logger.info(f"输入文本长度: {total_chars} 字符, 估算 {estimated_tokens} tokens")
        
        # 创建 Qwen 客户端
        client = QwenClient(
            access_token=request.access_token,
            resource_url=request.resource_url
        )
        
        # 调用 API
        response = await client.chat_completion_async(
            messages=request.messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        logger.info(f"长文本测试成功，响应长度: {len(response)} 字符")
        
        return {
            "success": True,
            "response": response,
            "input_stats": {
                "total_chars": total_chars,
                "estimated_tokens": estimated_tokens,
                "message_count": len(request.messages)
            }
        }
        
    except Exception as e:
        logger.error(f"长文本测试失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
