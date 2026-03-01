"""
Qwen API 客户端
使用 OpenAI SDK 调用 Qwen API（兼容格式）
"""
from openai import OpenAI, AsyncOpenAI
from typing import List, Dict, Optional, AsyncIterator
from loguru import logger

class QwenClient:
    """Qwen API 客户端（OpenAI 兼容）"""
    
    def __init__(self, access_token: str, resource_url: Optional[str] = None):
        """
        初始化 Qwen 客户端
        
        Args:
            access_token: OAuth access token
            resource_url: 资源 URL（从 token 响应获取）
        """
        self.access_token = access_token
        
        # 构建 API 端点
        if resource_url:
            self.base_url = f"https://{resource_url}/v1"
        else:
            self.base_url = "https://portal.qwen.ai/v1"
        
        logger.info(f"初始化 Qwen 客户端: {self.base_url}")
        
        # 创建同步和异步客户端
        self.client = OpenAI(
            api_key=access_token,
            base_url=self.base_url
        )
        
        self.async_client = AsyncOpenAI(
            api_key=access_token,
            base_url=self.base_url
        )
    
    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "qwen3-coder-plus",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        同步调用 Qwen API
        
        Args:
            messages: 消息列表 [{"role": "user", "content": "..."}]
            model: 模型名称
            temperature: 温度参数
            max_tokens: 最大 token 数
            
        Returns:
            生成的文本内容
        """
        try:
            logger.info(f"调用 Qwen API: model={model}, messages={len(messages)}")
            
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False
            )
            
            content = response.choices[0].message.content
            
            logger.info(f"Qwen API 响应成功: {len(content)} 字符")
            logger.debug(f"Token 使用: {response.usage}")
            
            return content
            
        except Exception as e:
            logger.error(f"Qwen API 调用失败: {e}")
            raise
    
    async def chat_completion_async(
        self,
        messages: List[Dict[str, str]],
        model: str = "qwen3-coder-plus",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        异步调用 Qwen API
        
        Args:
            messages: 消息列表
            model: 模型名称
            temperature: 温度参数
            max_tokens: 最大 token 数
            
        Returns:
            生成的文本内容
        """
        try:
            logger.info(f"异步调用 Qwen API: model={model}, messages={len(messages)}")
            
            response = await self.async_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False
            )
            
            content = response.choices[0].message.content
            
            logger.info(f"Qwen API 异步响应成功: {len(content)} 字符")
            
            return content
            
        except Exception as e:
            logger.error(f"Qwen API 异步调用失败: {e}")
            raise
    
    async def chat_completion_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = "qwen3-coder-plus",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> AsyncIterator[str]:
        """
        流式调用 Qwen API
        
        Args:
            messages: 消息列表
            model: 模型名称
            temperature: 温度参数
            max_tokens: 最大 token 数
            
        Yields:
            生成的文本片段
        """
        try:
            logger.info(f"流式调用 Qwen API: model={model}, messages={len(messages)}")
            
            stream = await self.async_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            
            logger.info("Qwen API 流式响应完成")
            
        except Exception as e:
            logger.error(f"Qwen API 流式调用失败: {e}")
            raise
    
    def test_connection(self) -> Dict:
        """
        测试 API 连接
        
        Returns:
            测试结果
        """
        try:
            logger.info("测试 Qwen API 连接...")
            
            response = self.client.chat.completions.create(
                model="qwen3-coder-plus",
                messages=[
                    {"role": "user", "content": "你好，请用一句话介绍你自己。"}
                ],
                max_tokens=100
            )
            
            content = response.choices[0].message.content
            
            logger.info("Qwen API 连接测试成功")
            
            return {
                "success": True,
                "response": content,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            }
            
        except Exception as e:
            logger.error(f"Qwen API 连接测试失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
