"""
TTS (Text-to-Speech) API 路由
"""
from fastapi import APIRouter, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from loguru import logger

from app.services.tts_service import TTSService

router = APIRouter()
tts_service = TTSService()


class SynthesizeRequest(BaseModel):
    """语音合成请求"""
    text: str
    voice: Optional[str] = "zh-CN-XiaoxiaoNeural"
    rate: Optional[int] = 0
    pitch: Optional[int] = 0
    volume: Optional[int] = 0


@router.get("/voices")
async def get_voices():
    """
    获取可用语音列表
    GET /api/tts/voices
    """
    try:
        voices = await tts_service.get_voices()
        return {
            "success": True,
            "data": voices
        }
    except Exception as e:
        logger.error(f"获取语音列表失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/synthesize")
async def synthesize(request: SynthesizeRequest):
    """
    合成语音
    POST /api/tts/synthesize
    Body: { text, voice, rate, pitch, volume }
    """
    try:
        if not request.text:
            return {
                "success": False,
                "error": "缺少 text 参数"
            }
        
        audio_data = await tts_service.synthesize(
            request.text,
            request.voice,
            request.rate,
            request.pitch,
            request.volume
        )
        
        # 返回音频数据
        return Response(
            content=audio_data,
            media_type="audio/mpeg",
            headers={
                "Content-Length": str(len(audio_data)),
                "Cache-Control": "public, max-age=3600"
            }
        )
    except Exception as e:
        logger.error(f"合成语音失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/synthesize-stream")
async def synthesize_stream(request: SynthesizeRequest):
    """
    流式合成语音
    POST /api/tts/synthesize-stream
    Body: { text, voice, rate, pitch, volume }
    """
    try:
        if not request.text:
            return {
                "success": False,
                "error": "缺少 text 参数"
            }
        
        async def generate():
            """生成音频流"""
            chunks = []
            
            def callback(chunk):
                chunks.append(chunk)
            
            await tts_service.synthesize_stream(
                request.text,
                request.voice,
                request.rate,
                request.pitch,
                request.volume,
                callback
            )
            
            for chunk in chunks:
                yield chunk
        
        return StreamingResponse(
            generate(),
            media_type="audio/mpeg",
            headers={
                "Transfer-Encoding": "chunked",
                "Cache-Control": "no-cache"
            }
        )
    except Exception as e:
        logger.error(f"流式合成失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.delete("/cache")
async def clear_cache():
    """
    清理缓存
    DELETE /api/tts/cache
    """
    try:
        await tts_service.clear_cache()
        return {
            "success": True,
            "message": "缓存已清理"
        }
    except Exception as e:
        logger.error(f"清理缓存失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }
