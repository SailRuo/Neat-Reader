"""
LangChain Qwen 服务
使用 LangChain Agent 系统调用 Qwen API，支持工具调用和会话管理
"""
from typing import List, Dict, Optional, AsyncIterator
from langchain_openai import ChatOpenAI
from langchain.tools import tool
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
from loguru import logger
import json

class LangChainQwenService:
    """LangChain Qwen 服务（支持 Agent 和工具调用）
    
    支持两种模式：
    1. OAuth 模式：access_token + resource_url（Qwen 官方授权）
    2. 自定义 API 模式：base_url + api_key + model（OpenAI 兼容格式，如自建、通义千问 API 等）
    """
    
    def __init__(
        self,
        access_token: Optional[str] = None,
        resource_url: Optional[str] = None,
        *,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        """
        初始化 LangChain 服务
        
        OAuth 模式：传入 access_token，可选 resource_url
        自定义 API 模式：传入 base_url, api_key, model（三个都提供时优先使用）
        """
        # 自定义 API 模式：base_url、api_key、model 三个都提供
        if base_url and api_key and model:
            self.base_url = base_url.rstrip("/")
            # 若未包含 /v1，补充之（OpenAI 兼容接口通常需要）
            if "/v1" not in self.base_url:
                self.base_url = f"{self.base_url}/v1"
            self.api_key = api_key
            self.model = model
            logger.info(f"初始化 LangChain 服务（自定义 API）: base={self.base_url}, model={model}")
        else:
            # OAuth 模式
            self.api_key = access_token
            if resource_url:
                self.base_url = f"https://{resource_url}/v1"
            else:
                self.base_url = "https://portal.qwen.ai/v1"
            self.model = "qwen3-coder-plus"
            logger.info(f"初始化 LangChain Qwen 服务（OAuth）: {self.base_url}")
        
        # 创建 LangChain ChatOpenAI 客户端（兼容 OpenAI 格式）
        self.llm = ChatOpenAI(
            model=self.model,
            api_key=self.api_key,
            base_url=self.base_url,
            temperature=0.7,
            streaming=True  # 启用流式响应
        )
        
        # 注册工具
        self.tools = self._register_tools()
        
        # 创建 Agent
        self.agent = create_react_agent(self.llm, self.tools)
        
        logger.info(f"注册了 {len(self.tools)} 个工具")
    
    def _register_tools(self) -> List:
        """注册阅读器相关的工具"""
        
        @tool
        def search_book_content(query: str) -> str:
            """
            在当前书籍中搜索内容
            
            Args:
                query: 搜索关键词
                
            Returns:
                搜索结果摘要
            """
            # TODO: 实际实现需要访问书籍内容
            logger.info(f"工具调用: search_book_content(query='{query}')")
            return f"搜索关键词 '{query}' 的功能正在开发中。这将搜索当前书籍的全文内容。"
        
        @tool
        def get_book_summary(chapter: Optional[str] = None) -> str:
            """
            获取书籍或章节的摘要
            
            Args:
                chapter: 章节名称（可选，不提供则返回全书摘要）
                
            Returns:
                摘要内容
            """
            logger.info(f"工具调用: get_book_summary(chapter='{chapter}')")
            if chapter:
                return f"章节 '{chapter}' 的摘要功能正在开发中。"
            return "全书摘要功能正在开发中。这将基于书籍内容生成智能摘要。"
        
        @tool
        def explain_concept(concept: str, context: Optional[str] = None) -> str:
            """
            解释书中的概念或术语
            
            Args:
                concept: 需要解释的概念
                context: 上下文（可选）
                
            Returns:
                概念解释
            """
            logger.info(f"工具调用: explain_concept(concept='{concept}', context='{context}')")
            
            # 这里可以结合书籍上下文和通用知识
            explanation = f"关于 '{concept}' 的解释：\n\n"
            
            if context:
                explanation += f"在当前上下文中，'{concept}' 指的是...\n\n"
            
            explanation += "这是一个示例解释。实际实现将结合书籍内容和 AI 知识库。"
            
            return explanation
        
        @tool
        def translate_text(text: str, target_language: str = "中文") -> str:
            """
            翻译选中的文本
            
            Args:
                text: 需要翻译的文本
                target_language: 目标语言（默认中文）
                
            Returns:
                翻译结果
            """
            logger.info(f"工具调用: translate_text(text='{text[:50]}...', target_language='{target_language}')")
            
            # 实际实现将调用 Qwen 的翻译能力
            return f"翻译功能演示：将 '{text[:30]}...' 翻译为 {target_language}"
        
        @tool
        def analyze_reading_progress(book_title: str) -> str:
            """
            分析阅读进度和习惯
            
            Args:
                book_title: 书籍标题
                
            Returns:
                阅读分析报告
            """
            logger.info(f"工具调用: analyze_reading_progress(book_title='{book_title}')")
            
            return f"""阅读进度分析（示例）：
            
书籍：{book_title}
- 当前进度：45%
- 预计剩余时间：2小时30分钟
- 阅读速度：约 250 字/分钟
- 建议：保持当前阅读节奏，预计明天可以完成

实际实现将基于真实的阅读数据。"""
        
        return [
            search_book_content,
            get_book_summary,
            explain_concept,
            translate_text,
            analyze_reading_progress
        ]
    
    async def chat_with_agent(
        self,
        user_message: str,
        chat_history: Optional[List[Dict]] = None,
        system_prompt: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> Dict:
        """
        使用 Agent 进行对话（非流式）
        
        Args:
            user_message: 用户消息
            chat_history: 对话历史（LangChain 格式的消息列表）
            system_prompt: 系统提示词
            conversation_id: 会话 ID（用于日志）
            
        Returns:
            Agent 响应
        """
        try:
            logger.info(f"Agent 对话 [会话:{conversation_id}]: {user_message[:100]}...")
            
            # 构建消息列表
            messages = []
            
            # 添加系统提示词
            if system_prompt:
                messages.append(SystemMessage(content=system_prompt))
            else:
                # 默认系统提示词
                default_prompt = """你是 Neat Reader 的智能阅读助手。你可以：

1. 搜索书籍内容
2. 生成章节摘要
3. 解释概念和术语
4. 翻译文本
5. 分析阅读进度

请根据用户的问题，智能地选择和使用这些工具。始终用中文回答。"""
                messages.append(SystemMessage(content=default_prompt))
            
            # 添加对话历史（支持字典格式和 LangChain 消息对象）
            if chat_history:
                for msg in chat_history:
                    if isinstance(msg, dict):
                        # 字典格式
                        if msg["role"] == "user":
                            messages.append(HumanMessage(content=msg["content"]))
                        elif msg["role"] == "assistant":
                            messages.append(AIMessage(content=msg["content"]))
                        elif msg["role"] == "system":
                            messages.append(SystemMessage(content=msg["content"]))
                    else:
                        # 已经是 LangChain 消息对象
                        messages.append(msg)
            
            # 添加当前用户消息
            messages.append(HumanMessage(content=user_message))
            
            logger.debug(f"消息历史长度: {len(messages)} (包含系统提示词)")
            
            # 调用 Agent
            result = self.agent.invoke({"messages": messages})
            
            # 提取最终答案
            final_message = result["messages"][-1]
            
            logger.info(f"Agent 执行成功 [会话:{conversation_id}]")
            
            return {
                "role": "assistant",
                "content": final_message.content,
                "tool_calls": self._extract_tool_calls(result["messages"])
            }
            
        except Exception as e:
            logger.error(f"Agent 对话失败 [会话:{conversation_id}]: {e}")
            raise
    
    async def chat_stream_with_agent(
        self,
        user_message: str,
        chat_history: Optional[List[Dict]] = None,
        system_prompt: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> AsyncIterator[str]:
        """
        使用 Agent 进行流式对话
        
        Args:
            user_message: 用户消息
            chat_history: 对话历史（LangChain 格式的消息列表）
            system_prompt: 系统提示词
            conversation_id: 会话 ID（用于日志）
            
        Yields:
            响应文本片段
        """
        try:
            logger.info(f"Agent 流式对话 [会话:{conversation_id}]: {user_message[:100]}...")
            
            # 构建消息列表
            messages = []
            
            # 添加系统提示词
            if system_prompt:
                messages.append(SystemMessage(content=system_prompt))
            else:
                default_prompt = """你是 Neat Reader 的智能阅读助手。你可以：

1. 搜索书籍内容
2. 生成章节摘要
3. 解释概念和术语
4. 翻译文本
5. 分析阅读进度

请根据用户的问题，智能地选择和使用这些工具。始终用中文回答。"""
                messages.append(SystemMessage(content=default_prompt))
            
            # 添加对话历史（支持字典格式和 LangChain 消息对象）
            if chat_history:
                for msg in chat_history:
                    if isinstance(msg, dict):
                        # 字典格式
                        if msg["role"] == "user":
                            messages.append(HumanMessage(content=msg["content"]))
                        elif msg["role"] == "assistant":
                            messages.append(AIMessage(content=msg["content"]))
                        elif msg["role"] == "system":
                            messages.append(SystemMessage(content=msg["content"]))
                    else:
                        # 已经是 LangChain 消息对象
                        messages.append(msg)
            
            # 添加当前用户消息
            messages.append(HumanMessage(content=user_message))
            
            logger.debug(f"消息历史长度: {len(messages)} (包含系统提示词)")
            
            # 流式调用 Agent
            async for event in self.agent.astream_events(
                {"messages": messages},
                version="v1"
            ):
                kind = event["event"]
                
                # 处理不同类型的事件
                if kind == "on_chat_model_stream":
                    # LLM 生成的内容
                    content = event["data"]["chunk"].content
                    if content:
                        yield content
                
                elif kind == "on_tool_start":
                    # 工具开始执行
                    tool_name = event["name"]
                    logger.info(f"工具开始: {tool_name}")
                    yield f"\n\n🔧 正在使用工具: {tool_name}\n\n"
                
                elif kind == "on_tool_end":
                    # 工具执行完成
                    tool_name = event["name"]
                    logger.info(f"工具完成: {tool_name}")
            
            logger.info(f"Agent 流式对话完成 [会话:{conversation_id}]")
            
        except Exception as e:
            logger.error(f"Agent 流式对话失败 [会话:{conversation_id}]: {e}")
            raise
    
    def _extract_tool_calls(self, messages: List) -> List[Dict]:
        """提取工具调用信息"""
        tool_calls = []
        
        for msg in messages:
            if hasattr(msg, 'additional_kwargs') and 'tool_calls' in msg.additional_kwargs:
                for tc in msg.additional_kwargs['tool_calls']:
                    tool_calls.append({
                        "name": tc.get("function", {}).get("name"),
                        "arguments": tc.get("function", {}).get("arguments")
                    })
        
        return tool_calls
    
    async def simple_chat(
        self,
        user_message: str,
        chat_history: Optional[List[Dict]] = None
    ) -> str:
        """
        简单对话（不使用 Agent，直接调用 LLM）
        
        Args:
            user_message: 用户消息
            chat_history: 对话历史
            
        Returns:
            AI 响应
        """
        try:
            logger.info(f"简单对话: {user_message[:100]}...")
            
            # 构建消息列表
            messages = []
            
            # 添加对话历史
            if chat_history:
                for msg in chat_history:
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        messages.append(AIMessage(content=msg["content"]))
            
            # 添加当前用户消息
            messages.append(HumanMessage(content=user_message))
            
            # 调用 LLM
            response = await self.llm.ainvoke(messages)
            
            logger.info("简单对话成功")
            
            return response.content
            
        except Exception as e:
            logger.error(f"简单对话失败: {e}")
            raise
    
    async def simple_chat_stream(
        self,
        user_message: str,
        chat_history: Optional[List[Dict]] = None
    ) -> AsyncIterator[str]:
        """
        简单流式对话（不使用 Agent）
        
        Args:
            user_message: 用户消息
            chat_history: 对话历史
            
        Yields:
            响应文本片段
        """
        try:
            logger.info(f"简单流式对话: {user_message[:100]}...")
            
            # 构建消息列表
            messages = []
            
            # 添加对话历史
            if chat_history:
                for msg in chat_history:
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        messages.append(AIMessage(content=msg["content"]))
            
            # 添加当前用户消息
            messages.append(HumanMessage(content=user_message))
            
            # 流式调用 LLM
            async for chunk in self.llm.astream(messages):
                if chunk.content:
                    yield chunk.content
            
            logger.info("简单流式对话完成")
            
        except Exception as e:
            logger.error(f"简单流式对话失败: {e}")
            raise
