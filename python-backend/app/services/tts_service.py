"""
TTS (Text-to-Speech) 服务
使用 Microsoft Edge TTS
"""
import edge_tts
import asyncio
from typing import Dict, List, Optional, Callable
from loguru import logger
import os
from pathlib import Path


class TTSService:
    """TTS 服务"""
    
    def __init__(self, cache_dir: str = "./cache/tts"):
        """
        初始化 TTS 服务
        
        Args:
            cache_dir: 缓存目录
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"TTS 服务初始化，缓存目录: {self.cache_dir}")
    
    async def get_voices(self) -> List[Dict]:
        """
        获取可用语音列表
        
        Returns:
            语音列表，包含 all 和 chinese 两个字段
        """
        try:
            logger.info("获取语音列表")
            voices = await edge_tts.list_voices()
            
            # 转换为简化格式
            all_voices = []
            chinese_voices = []
            
            for voice in voices:
                voice_data = {
                    'name': voice['ShortName'],
                    'gender': voice['Gender'],
                    'locale': voice['Locale'],
                    'language': voice['Locale'].split('-')[0],
                    'display_name': voice['FriendlyName']
                }
                all_voices.append(voice_data)
                
                # 筛选中文语音
                if voice['Locale'].startswith('zh-'):
                    chinese_voices.append(voice_data)
            
            logger.info(f"获取到 {len(all_voices)} 个语音，其中中文语音 {len(chinese_voices)} 个")
            
            return {
                'all': all_voices,
                'chinese': chinese_voices
            }
            
        except Exception as e:
            logger.error(f"获取语音列表失败: {e}")
            raise
    
    async def synthesize(
        self,
        text: str,
        voice: str = "zh-CN-XiaoxiaoNeural",
        rate: int = 0,
        pitch: int = 0,
        volume: int = 0
    ) -> bytes:
        """
        合成语音（非流式）
        
        Args:
            text: 要合成的文本
            voice: 语音名称
            rate: 语速调整（-100 到 100）
            pitch: 音调调整（-100 到 100）
            volume: 音量调整（-100 到 100）
            
        Returns:
            音频数据（bytes）
        """
        try:
            logger.info(f"合成语音: {text[:50]}...")
            
            # 构建 SSML 参数
            rate_str = f"{rate:+d}%" if rate != 0 else "+0%"
            pitch_str = f"{pitch:+d}Hz" if pitch != 0 else "+0Hz"
            volume_str = f"{volume:+d}%" if volume != 0 else "+0%"
            
            # 创建 TTS 通信对象
            communicate = edge_tts.Communicate(
                text,
                voice,
                rate=rate_str,
                pitch=pitch_str,
                volume=volume_str
            )
            
            # 收集音频数据
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            
            logger.info(f"语音合成成功，大小: {len(audio_data)} bytes")
            return audio_data
            
        except Exception as e:
            logger.error(f"语音合成失败: {e}")
            raise
    
    async def synthesize_stream(
        self,
        text: str,
        voice: str = "zh-CN-XiaoxiaoNeural",
        rate: int = 0,
        pitch: int = 0,
        volume: int = 0,
        callback: Optional[Callable[[bytes], None]] = None
    ):
        """
        流式合成语音
        
        Args:
            text: 要合成的文本
            voice: 语音名称
            rate: 语速调整
            pitch: 音调调整
            volume: 音量调整
            callback: 回调函数，接收音频块
        """
        try:
            logger.info(f"流式合成语音: {text[:50]}...")
            
            # 构建 SSML 参数
            rate_str = f"{rate:+d}%" if rate != 0 else "+0%"
            pitch_str = f"{pitch:+d}Hz" if pitch != 0 else "+0Hz"
            volume_str = f"{volume:+d}%" if volume != 0 else "+0%"
            
            # 创建 TTS 通信对象
            communicate = edge_tts.Communicate(
                text,
                voice,
                rate=rate_str,
                pitch=pitch_str,
                volume=volume_str
            )
            
            # 流式输出
            async for chunk in communicate.stream():
                if chunk["type"] == "audio" and callback:
                    callback(chunk["data"])
            
            logger.info("流式语音合成完成")
            
        except Exception as e:
            logger.error(f"流式语音合成失败: {e}")
            raise
    
    async def clear_cache(self):
        """清理缓存"""
        try:
            logger.info("清理 TTS 缓存")
            
            # 删除缓存目录中的所有文件
            for file in self.cache_dir.glob("*"):
                if file.is_file():
                    file.unlink()
            
            logger.info("TTS 缓存已清理")
            
        except Exception as e:
            logger.error(f"清理缓存失败: {e}")
            raise
