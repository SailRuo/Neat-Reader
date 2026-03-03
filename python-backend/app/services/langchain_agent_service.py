"""
LangChain Agent 服务
使用 LangChain Agent 系统调用 LLM API，支持工具调用和会话管理
支持任何 OpenAI 兼容的 API（Qwen、OpenAI、Claude、自建模型等）
"""
from typing import List, Dict, Optional, AsyncIterator
from langchain_openai import ChatOpenAI
from langchain.tools import tool
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
from loguru import logger
import json

from app.config import settings
from app.services.pageindex_service import PageIndexService

class LangChainAgentService:
    """LangChain Agent 服务（支持 Agent 和工具调用）
    
    支持两种模式：
    1. OAuth 模式：access_token + resource_url（Qwen 官方授权）
    2. 自定义 API 模式：base_url + api_key + model（OpenAI 兼容格式，支持任何兼容 API）
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
        初始化 LangChain Agent 服务
        
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
            logger.info(f"初始化 LangChain Agent 服务（自定义 API）: base={self.base_url}, model={model}")
        else:
            # OAuth 模式（默认 Qwen）
            self.api_key = access_token
            if resource_url:
                self.base_url = f"https://{resource_url}/v1"
            else:
                self.base_url = "https://portal.qwen.ai/v1"
            self.model = "qwen3-coder-plus"
            logger.info(f"初始化 LangChain Agent 服务（OAuth/Qwen）: {self.base_url}")
        
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

        _pageindex_service = PageIndexService(settings.PAGEINDEX_CACHE_DIR)
        
        @tool
        def search_book_content(book_id: str, query: str) -> str:
            """
            在当前书籍中搜索内容
            
            Args:
                book_id: 书籍 ID
                query: 搜索关键词
                
            Returns:
                搜索结果摘要
            """
            logger.info(f"工具调用: search_book_content(book_id='{book_id}', query='{query}')")
            if not book_id or not book_id.strip():
                return "book_id 不能为空"
            if not query or not query.strip():
                return "query 不能为空"
            if not _pageindex_service.exists(book_id.strip()):
                return "索引不存在，请先构建 PageIndex"

            # 增加检索深度 top_k=15，并支持 chapter_title 检索
            hits = _pageindex_service.search(book_id=book_id.strip(), query=query.strip(), top_k=15)
            if not hits:
                return "未命中相关片段"

            lines = []
            for h in hits:
                title = h.get('chapter_title') or h.get('chapter_name')
                lines.append(
                    f"- #{h.get('chunk_id')} [{title}] (score={h.get('score')}): {str(h.get('snippet') or '')[:300]}"
                )
            return "\n".join(lines)

        @tool
        def list_indexed_bookshelf() -> str:
            """列出已构建 PageIndex 的书籍（返回书籍 ID 和标题列表）。"""
            logger.info("工具调用: list_indexed_bookshelf()")
            book_ids = _pageindex_service.list_book_ids()
            if not book_ids:
                return "书架索引为空（尚未构建任何 PageIndex）"
            
            results = []
            for bid in book_ids:
                try:
                    index_doc = _pageindex_service.load(bid)
                    title = index_doc.get("book_title", "未知书名")
                    results.append(f"- {title} (ID: {bid})")
                except Exception:
                    results.append(f"- 未知书名 (ID: {bid})")
            
            return "\n".join(results)

        @tool
        def get_book_id_by_title(book_title: str) -> str:
            """
            通过书名查找书籍 ID。用户通常只知道书名,不知道后端生成的 book_id。
            
            Args:
                book_title: 书籍标题 (支持模糊匹配或关键词)
                
            Returns:
                匹配的书籍 ID,如果找到多个则返回列表,如果未找到则返回错误提示
                
            使用场景:
                - 当用户提及某本书而你没有其 book_id 时，先调用此工具获取 ID
                - 获取 ID 后再调用其他需要 book_id 的工具 (如获取摘要、查询内容等)
            """
            logger.info(f"工具调用: get_book_id_by_title(book_title='{book_title}')")
            
            if not book_title or not book_title.strip():
                return "错误: book_title 不能为空"
            
            search_term = book_title.strip().lower()
            book_ids = _pageindex_service.list_book_ids()
            
            if not book_ids:
                return "书架索引为空（尚未构建任何 PageIndex）"
            
            # 查找匹配的书籍
            exact_matches = []  # 精确匹配
            partial_matches = []  # 部分匹配
            
            for bid in book_ids:
                try:
                    index_doc = _pageindex_service.load(bid)
                    title = index_doc.get("book_title", "")
                    title_lower = title.lower()
                    
                    # 精确匹配 (完全相同)
                    if title_lower == search_term:
                        exact_matches.append((bid, title))
                    # 部分匹配 (包含关系)
                    elif search_term in title_lower or title_lower in search_term:
                        partial_matches.append((bid, title))
                except Exception as e:
                    logger.warning(f"加载书籍 {bid} 失败: {e}")
                    continue
            
            # 返回结果
            if exact_matches:
                if len(exact_matches) == 1:
                    bid, title = exact_matches[0]
                    logger.info(f"精确匹配到书籍: {title} (ID: {bid})")
                    return bid
                else:
                    # 多个精确匹配 (罕见情况)
                    results = [f"找到 {len(exact_matches)} 本完全匹配的书籍:"]
                    for bid, title in exact_matches:
                        results.append(f"- {title} (ID: {bid})")
                    results.append("\n请使用具体的 book_id 调用其他工具。")
                    return "\n".join(results)
            
            if partial_matches:
                if len(partial_matches) == 1:
                    bid, title = partial_matches[0]
                    logger.info(f"模糊匹配到书籍: {title} (ID: {bid})")
                    return bid
                else:
                    # 多个部分匹配
                    results = [f"找到 {len(partial_matches)} 本相关书籍:"]
                    for bid, title in partial_matches:
                        results.append(f"- {title} (ID: {bid})")
                    results.append("\n如果只有一本是目标书籍,请直接使用该 book_id。")
                    return "\n".join(results)
            
            # 未找到匹配
            return f"未找到书名包含 '{book_title}' 的书籍。请使用 list_indexed_bookshelf 查看所有可用书籍。"

        def get_book_toc(book_id: str) -> str:
                    """
                    获取书籍目录（TOC）。用于回答"目录/章节结构"。

                    Args:
                        book_id: 书籍 ID
                            ⚠️ 如果用户只提供书名,请先调用 get_book_id_by_title(书名) 获取 book_id
                    """
                    logger.info(f"工具调用: get_book_toc(book_id='{book_id}')")
                    if not book_id or not book_id.strip():
                        return "book_id 不能为空"
                    bid = book_id.strip()
                    if not _pageindex_service.exists(bid):
                        return "索引不存在，请先构建 PageIndex"
                    index_doc = _pageindex_service.load(bid)
                    toc = index_doc.get("toc") or []
                    if not toc:
                        return "未找到目录（索引中 toc 为空；可能需要重新 build 以提取 EPUB toc）"
                    return json.dumps(toc, ensure_ascii=False)


        @tool
        def search_book_section(book_id: str, href: str, query: str) -> str:
            """在书籍的特定章节内搜索内容。
            
            Args:
                book_id: 书籍 ID
                href: 章节的链接（从 get_book_toc 获取）
                query: 搜索关键词
            """
            logger.info(f"工具调用: search_book_section(book_id='{book_id}', href='{href}', query='{query}')")
            if not book_id or not book_id.strip():
                return "book_id 不能为空"
            bid = book_id.strip()
            if not _pageindex_service.exists(bid):
                return "索引不存在"
            
            index_doc = _pageindex_service.load(bid)
            href_map = index_doc.get("href_map") or {}
            
            # 某些 href 可能带有锚点 #，先尝试精确匹配，再尝试去掉锚点匹配
            chapter_index = href_map.get(href)
            if chapter_index is None and "#" in href:
                chapter_index = href_map.get(href.split("#")[0])
            
            if chapter_index is None:
                return f"未能在索引中定位到章节: {href}。请确保 href 是从 get_book_toc 获取的原始值。"

            hits = _pageindex_service.search(book_id=bid, query=query.strip(), top_k=5, chapter_index=chapter_index)
            if not hits:
                return "该章节内未命中相关片段"

            lines = []
            for h in hits:
                lines.append(
                    f"- #{h.get('chunk_id')} (score={h.get('score')}): {str(h.get('snippet') or '')[:300]}"
                )
            return "\n".join(lines)

        @tool
        def search_bookshelf(query: str, top_k_total: int = 10) -> str:
            """跨全书架搜索内容（基于已构建 PageIndex 的书籍）。

            Args:
                query: 搜索关键词
                top_k_total: 最多返回多少条全局结果

            Returns:
                聚合搜索结果摘要
            """
            logger.info(f"工具调用: search_bookshelf(query='{query}', top_k_total={top_k_total})")
            if not query or not query.strip():
                return "query 不能为空"

            try:
                k_total = int(top_k_total or 10)
            except Exception:
                k_total = 10
            if k_total <= 0:
                k_total = 1

            book_ids = _pageindex_service.list_book_ids()
            if not book_ids:
                return "书架索引为空（尚未构建任何 PageIndex）"

            aggregated = []
            for book_id in book_ids:
                hits = _pageindex_service.search(book_id=book_id, query=query.strip(), top_k=3)
                for h in hits:
                    aggregated.append({"book_id": book_id, **h})

            aggregated.sort(key=lambda x: int(x.get("score") or 0), reverse=True)
            aggregated = aggregated[:k_total]
            if not aggregated:
                return "未命中相关片段"

            lines = []
            for h in aggregated:
                lines.append(
                    f"- book_id={h.get('book_id')} #{h.get('chunk_id')} [{h.get('chapter_name')}] (score={h.get('score')}): {str(h.get('snippet') or '')[:200]}"
                )
            return "\n".join(lines)
        
        @tool
        def get_book_summary(book_id: str, chapter: Optional[str] = None) -> str:
            """
            获取书籍或章节的摘要。如果书籍非常长,建议先获取 TOC 以确定具体章节。
            
            Args:
                book_id: 书籍 ID (如 'epub_1df25471381a97f9db3ecb724bf01c96')
                    ⚠️ 重要: 用户通常只提供书名,不知道 book_id
                    请先调用 get_book_id_by_title(书名) 获取 book_id
                chapter: 章节标识 (可选,支持以下格式):
                    - 章节标题: "第一章 引言" 或 "冥想的心和无解的问题" (支持模糊匹配)
                    - 文件路径: "Text/chapter043.html" (精确匹配)
                    - 不提供则返回全书摘要
                
            Returns:
                摘要内容
                
            使用流程:
                1. 用户说 "获取《智慧的觉醒》中'冥想的心'章节的摘要"
                2. 先调用 get_book_id_by_title("智慧的觉醒") 获取 book_id
                3. 再调用 get_book_summary(book_id, "冥想的心") 获取摘要
                
            章节匹配建议:
                - 首次使用建议先调用 get_book_toc 查看目录结构
                - 章节标题支持模糊匹配,可以只输入部分名称
                - 如果标题匹配失败,可以使用 TOC 中的 href 字段 (文件路径)
            """
            logger.info(f"工具调用: get_book_summary(book_id='{book_id}', chapter='{chapter}')")
            if not book_id or not book_id.strip():
                return "错误: book_id 不能为空"
            
            bid = book_id.strip()
            if not _pageindex_service.exists(bid):
                return f"错误: 索引 ID '{bid}' 不存在。请确认 ID 是否正确，或先构建 PageIndex。"

            try:
                index_doc = _pageindex_service.load(bid)
            except Exception as e:
                logger.error(f"加载索引失败: {e}")
                return f"错误: 无法加载书籍索引 ({str(e)})"

            chunks = index_doc.get("chunks", [])
            if not chunks:
                return "错误: 该书籍索引中没有内容文本（chunks 为空）"

            # 提取文本逻辑
            texts = []
            if chapter:
                chapter_input = chapter.strip()
                chapter_lower = chapter_input.lower()
                
                # 策略1: 如果输入看起来像文件路径 (包含 / 或 .html),直接按路径匹配
                if "/" in chapter_input or ".html" in chapter_lower or ".xhtml" in chapter_lower:
                    texts = [c.get("text") or "" for c in chunks if chapter_input in (c.get("chapter_name") or "")]
                    if texts:
                        logger.info(f"通过文件路径匹配到 {len(texts)} 个文本块")
                
                # 策略2: 尝试通过 TOC 标题匹配 (支持模糊匹配)
                if not texts and index_doc.get("toc"):
                    def find_in_toc(items, depth=0):
                        """递归查找 TOC,返回所有匹配的 href"""
                        matches = []
                        for item in items:
                            title = (item.get("title") or "").lower()
                            # 多种匹配策略:
                            # 1. 完全匹配
                            if title == chapter_lower:
                                href = item.get("href")
                                if href:
                                    matches.append((href, title, depth, 0))  # 优先级0最高
                            # 2. 双向包含匹配
                            elif chapter_lower in title or title in chapter_lower:
                                href = item.get("href")
                                if href:
                                    matches.append((href, title, depth, 1))
                            # 3. 分词匹配 (处理 "冥想的心和无解的问题" 这种复合标题)
                            else:
                                # 去除常见连接词后分词
                                chapter_words = [w for w in chapter_lower.replace("和", " ").replace("与", " ").replace("的", " ").replace("及", " ").replace("或", " ").split() if len(w) >= 1]
                                if chapter_words:
                                    # 计算匹配的词数
                                    matched_words = sum(1 for word in chapter_words if word in title)
                                    # 额外尝试：如果 title 包含 chapter_words 中的任意一个较长词，也视为可能匹配
                                    if matched_words >= len(chapter_words) * 0.4 or any(len(w) >= 2 and w in title for w in chapter_words):
                                        href = item.get("href")
                                        if href:
                                            matches.append((href, title, depth, 2))  # 优先级2
                            
                            # 递归查找子章节
                            if item.get("sections"):
                                matches.extend(find_in_toc(item["sections"], depth + 1))
                        return matches
                    
                    toc_matches = find_in_toc(index_doc["toc"])
                    if toc_matches:
                        # 优先使用: 1.优先级最高 2.标题最短 3.层级最深(子章节优先)
                        toc_matches.sort(key=lambda x: (x[3], len(x[1]), -x[2]))
                        target_href = toc_matches[0][0]
                        matched_title = toc_matches[0][1]
                        pure_href = target_href.split("#")[0]
                        texts = [c.get("text") or "" for c in chunks if pure_href in (c.get("chapter_name") or "")]
                        if texts:
                            logger.info(f"通过 TOC 标题匹配: '{chapter}' -> '{matched_title}' (href='{pure_href}'),共 {len(texts)} 个文本块")
                
                # 策略3: 直接在 chapter_name 或 chapter_title 中模糊搜索 (增强逻辑)
                if not texts:
                    texts = [
                        c.get("text") or "" 
                        for c in chunks 
                        if chapter_lower in (c.get("chapter_name") or "").lower() or 
                           chapter_lower in (c.get("chapter_title") or "").lower()
                    ]
                    if texts:
                        logger.info(f"通过 chapter_name/title 模糊匹配到 {len(texts)} 个文本块")
            else:
                # 全书摘要：取前中后部分以节省 Token 并保证覆盖面
                if len(chunks) > 50:
                    texts = [c.get("text") or "" for c in (chunks[:15] + chunks[len(chunks)//2-10:len(chunks)//2+10] + chunks[-15:])]
                else:
                    texts = [c.get("text") or "" for c in chunks]

            merged = "\n".join([t for t in texts if t.strip()])
            if not merged:
                hint = f"提示: 未找到关于 '{chapter}' 的内容。\n"
                hint += "建议:\n"
                hint += "1. 使用 get_book_toc 查看完整目录结构\n"
                hint += "2. 使用目录中的章节标题 (如 '第一章 引言') 或文件路径 (如 'Text/chapter001.html')\n"
                hint += "3. 支持模糊匹配,可以只输入部分章节名称"
                return hint

            # 限制发送给 LLM 的长度
            max_chars = 6000
            if len(merged) > max_chars:
                merged = merged[:max_chars//2] + "\n\n...(中间内容已省略)...\n\n" + merged[-max_chars//2:]

            try:
                prompt = (
                    "你是一个资深书籍编辑。请根据以下提供的书籍片段内容，生成一个深刻且详细的中文摘要（300-500字）。\n"
                    "要求：\n"
                    "1. 概括核心论点或故事情节。\n"
                    "2. 提取关键术语或背景信息。\n"
                    "3. 保持条理清晰，使用 Markdown 格式。\n\n"
                    f"书籍内容片段：\n{merged}\n"
                )
                msg = self.llm.invoke(prompt)
                return getattr(msg, "content", str(msg))
            except Exception as e:
                logger.error(f"调用 LLM 生成摘要失败: {e}")
                return f"错误: AI 摘要生成失败 ({str(e)})"
        
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
            search_bookshelf,
            list_indexed_bookshelf,
            get_book_id_by_title,
            get_book_toc,
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
1.1 跨全书架搜索内容（已构建索引的书籍）
1.2 列出已索引的书籍列表（book_id）
1.3 获取书籍目录（TOC）
1.4 在特定章节内搜索内容
2. 生成章节摘要
3. 解释概念和术语
4. 翻译文本
5. 分析阅读进度

核心指令：
- 当用户的问题需要使用工具时，请务必调用相关工具。
- 在工具调用完成后，你必须根据工具返回的结果，继续为用户提供完整、详细的回答。
- 绝不要在调用工具后就停止回复。
- 如果工具返回“未找到”或“错误”，请如实告知用户，并根据你的知识或书籍上下文尝试给出建议。
- 始终使用中文回答。"""
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

核心指令：
- 当用户的问题需要使用工具时，请务必调用相关工具。
- 在工具调用完成后，你必须根据工具返回的结果，继续为用户提供完整、详细的回答。
- 绝不要在调用工具后就停止回复。
- 如果工具返回“未找到”或“错误”，请如实告知用户，并根据你的知识或书籍上下文尝试给出建议。
- 始终使用中文回答。"""
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
                    tool_input = event["data"].get("input", {})
                    logger.info(f"工具开始: {tool_name}, 输入: {tool_input}")
                    yield f"\n\n🔧 正在使用工具: `{tool_name}`"
                    if tool_input:
                        yield f"\n参数: `{json.dumps(tool_input, ensure_ascii=False)}`"
                    yield "\n\n"
                
                elif kind == "on_tool_end":
                    # 工具执行完成
                    tool_name = event["name"]
                    output = event["data"].get("output")
                    logger.info(f"工具完成: {tool_name}")
                    # 如果工具返回了错误或空结果，给用户一个提示，避免看起来像卡住了
                    if output and isinstance(output, str) and ("错误" in output or "不存在" in output or "未找到" in output):
                        yield f"\n\n📢 工具提示: {output}\n\n"
                    elif not output:
                        yield f"\n\n📢 工具未返回任何结果。\n\n"
            
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
