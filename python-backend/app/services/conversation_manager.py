"""
会话管理服务
使用 LangChain 管理对话历史，支持持久化存储和百度网盘同步
"""
from typing import List, Dict, Optional
from pathlib import Path
import json
import time
import asyncio
from loguru import logger
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.utils.api_logger import log_api_failure


class ConversationManager:
    """会话管理器 - 支持多用户、多会话、百度网盘同步"""
    
    def __init__(self, storage_path: str = "data/conversations"):
        """
        初始化会话管理器
        
        Args:
            storage_path: 会话数据存储路径
        """
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        # 内存中的会话缓存 {conversation_id: conversation_data}
        self.conversations_cache: Dict[str, Dict] = {}
        
        # 百度网盘同步配置
        self.baidu_sync_enabled = False
        self.baidu_service = None
        self.baidu_remote_path = "/apps/Neat Reader/conversations"
        self.sync_meta_path = self.storage_path / ".sync_meta.json"
        self.sync_meta = self._load_sync_meta()
        
        logger.info(f"会话管理器初始化完成，存储路径: {self.storage_path}")
    
    def _load_sync_meta(self) -> Dict[str, float]:
        """加载同步元数据（文件修改时间）"""
        if self.sync_meta_path.exists():
            try:
                with open(self.sync_meta_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"加载同步元数据失败: {e}")
        return {}

    def _save_sync_meta(self):
        """保存同步元数据"""
        try:
            with open(self.sync_meta_path, 'w', encoding='utf-8') as f:
                json.dump(self.sync_meta, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存同步元数据失败: {e}")
    
    def load_baidu_token(self) -> Optional[str]:
        """从统一 token 存储读取百度 access_token（内存缓存或 data/auth_tokens.json）"""
        from app.services.token_store import get_baidu_token
        return get_baidu_token()
    
    def load_qwen_token(self) -> Optional[Dict]:
        """从统一 token 存储读取 Qwen token（内存缓存或 data/auth_tokens.json）"""
        from app.services.token_store import get_qwen_token
        return get_qwen_token()
    
    def enable_baidu_sync(self, baidu_service):
        """
        启用百度网盘同步
        
        Args:
            baidu_service: BaiduNetdiskService 实例
        """
        self.baidu_service = baidu_service
        self.baidu_sync_enabled = True
        logger.info("✅ 百度网盘同步已启用")
    
    def disable_baidu_sync(self):
        """禁用百度网盘同步"""
        self.baidu_sync_enabled = False
        self.baidu_service = None
        logger.info("❌ 百度网盘同步已禁用")
    
    def _get_conversation_file(self, conversation_id: str) -> Path:
        """获取会话文件路径"""
        return self.storage_path / f"{conversation_id}.json"
    
    def create_conversation(
        self,
        conversation_id: str,
        user_id: Optional[str] = None,
        title: str = "新对话",
        context: Optional[Dict] = None
    ) -> Dict:
        """
        创建新会话
        
        Args:
            conversation_id: 会话 ID
            user_id: 用户 ID（可选）
            title: 会话标题
            context: 会话上下文（如书籍信息）
            
        Returns:
            会话数据
        """
        conversation = {
            "id": conversation_id,
            "user_id": user_id,
            "title": title,
            "context": context or {},
            "messages": [],
            "created_at": time.time(),
            "updated_at": time.time(),
            "message_count": 0
        }
        
        # 保存到缓存和文件
        self.conversations_cache[conversation_id] = conversation
        self._save_conversation(conversation_id)
        
        logger.info(f"创建新会话: {conversation_id}, 标题: {title}")
        
        return conversation
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        """
        获取会话数据
        
        Args:
            conversation_id: 会话 ID
            
        Returns:
            会话数据，不存在则返回 None
        """
        # 先从缓存获取
        if conversation_id in self.conversations_cache:
            return self.conversations_cache[conversation_id]
        
        # 从文件加载
        file_path = self._get_conversation_file(conversation_id)
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    conversation = json.load(f)
                    self.conversations_cache[conversation_id] = conversation
                    return conversation
            except Exception as e:
                logger.error(f"加载会话失败 {conversation_id}: {e}")
                return None
        
        return None
    
    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        添加消息到会话
        
        Args:
            conversation_id: 会话 ID
            role: 消息角色 (user/assistant/system)
            content: 消息内容
            metadata: 消息元数据（如工具调用信息）
            
        Returns:
            是否成功
        """
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            logger.error(f"会话不存在: {conversation_id}")
            return False
        
        message = {
            "role": role,
            "content": content,
            "timestamp": time.time(),
            "metadata": metadata or {}
        }
        
        conversation["messages"].append(message)
        conversation["message_count"] += 1
        conversation["updated_at"] = time.time()
        
        # 自动更新标题（使用第一条用户消息）
        if role == "user" and conversation["message_count"] == 1:
            conversation["title"] = content[:50] + ("..." if len(content) > 50 else "")
        
        self._save_conversation(conversation_id)
        
        logger.debug(f"添加消息到会话 {conversation_id}: {role} - {content[:50]}...")
        
        return True
    
    def get_messages(
        self,
        conversation_id: str,
        limit: Optional[int] = None,
        format: str = "dict"
    ) -> List:
        """
        获取会话消息
        
        Args:
            conversation_id: 会话 ID
            limit: 限制返回消息数量（最新的 N 条）
            format: 返回格式 ("dict" 或 "langchain")
            
        Returns:
            消息列表
        """
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            return []
        
        messages = conversation["messages"]
        
        # 限制数量
        if limit and limit > 0:
            messages = messages[-limit:]
        
        # 转换格式
        if format == "langchain":
            return self._convert_to_langchain_messages(messages)
        
        return messages
    
    def _convert_to_langchain_messages(self, messages: List[Dict]) -> List:
        """将字典格式消息转换为 LangChain 消息对象"""
        langchain_messages = []
        
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            
            if role == "user":
                langchain_messages.append(HumanMessage(content=content))
            elif role == "assistant":
                langchain_messages.append(AIMessage(content=content))
            elif role == "system":
                langchain_messages.append(SystemMessage(content=content))
        
        return langchain_messages
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """
        删除会话
        
        Args:
            conversation_id: 会话 ID
            
        Returns:
            是否成功
        """
        # 从缓存删除
        if conversation_id in self.conversations_cache:
            del self.conversations_cache[conversation_id]
        
        # 删除文件
        file_path = self._get_conversation_file(conversation_id)
        if file_path.exists():
            try:
                file_path.unlink()
                logger.info(f"删除会话: {conversation_id}")
                return True
            except Exception as e:
                logger.error(f"删除会话文件失败 {conversation_id}: {e}")
                return False
        
        return True
    
    def list_conversations(
        self,
        user_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """
        列出会话列表
        
        Args:
            user_id: 用户 ID（可选，用于过滤）
            limit: 限制返回数量
            
        Returns:
            会话列表（按更新时间倒序）
        """
        conversations = []
        
        # 遍历存储目录
        for file_path in self.storage_path.glob("*.json"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    conversation = json.load(f)
                    
                    # 过滤用户
                    if user_id and conversation.get("user_id") != user_id:
                        continue
                    
                    # 只返回摘要信息
                    conversations.append({
                        "id": conversation["id"],
                        "title": conversation["title"],
                        "message_count": conversation["message_count"],
                        "created_at": conversation["created_at"],
                        "updated_at": conversation["updated_at"],
                        "context": conversation.get("context", {})
                    })
            except Exception as e:
                logger.error(f"读取会话文件失败 {file_path}: {e}")
                continue
        
        # 按更新时间倒序排序
        conversations.sort(key=lambda x: x["updated_at"], reverse=True)
        
        return conversations[:limit]
    
    def clear_old_conversations(self, days: int = 30) -> int:
        """
        清理旧会话
        
        Args:
            days: 保留最近 N 天的会话
            
        Returns:
            删除的会话数量
        """
        cutoff_time = time.time() - (days * 24 * 60 * 60)
        deleted_count = 0
        
        for file_path in self.storage_path.glob("*.json"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    conversation = json.load(f)
                    
                    if conversation["updated_at"] < cutoff_time:
                        conversation_id = conversation["id"]
                        if self.delete_conversation(conversation_id):
                            deleted_count += 1
            except Exception as e:
                logger.error(f"清理会话失败 {file_path}: {e}")
                continue
        
        logger.info(f"清理了 {deleted_count} 个旧会话（超过 {days} 天）")
        
        return deleted_count
    
    def rollback_message(self, conversation_id: str) -> bool:
        """
        回滚最后一条消息（通常用于流式中断后清理残留的提问）
        
        Args:
            conversation_id: 会话 ID
            
        Returns:
            是否成功
        """
        conversation = self.get_conversation(conversation_id)
        if not conversation or not conversation["messages"]:
            return False
            
        # 移除最后一条消息
        conversation["messages"].pop()
        conversation["message_count"] -= 1
        conversation["updated_at"] = time.time()
        
        self._save_conversation(conversation_id)
        logger.info(f"回滚会话 {conversation_id} 的最后一条消息")
        return True
    
    def _save_conversation(self, conversation_id: str) -> bool:
        """保存会话到文件"""
        conversation = self.conversations_cache.get(conversation_id)
        if not conversation:
            return False
        
        file_path = self._get_conversation_file(conversation_id)
        
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(conversation, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"保存会话失败 {conversation_id}: {e}")
            return False
    
    async def sync_to_baidu(self, conversation_id: Optional[str] = None, access_token: Optional[str] = None) -> Dict[str, int]:
        """
        同步会话到百度网盘（已废弃）
        
        注意：对话现在存储在数据库中，会随数据库文件自动同步到百度网盘。
        不再需要单独的 JSON 文件同步。
        
        Args:
            conversation_id: 指定会话 ID（None 则同步所有）
            access_token: 百度网盘访问令牌（可选）
            
        Returns:
            同步结果统计 {success: 成功数, failed: 失败数}
        """
        logger.info("⚠️ 对话同步功能已废弃，对话会随数据库自动同步")
        return {"success": 0, "failed": 0}
    
    async def sync_from_baidu(self) -> Dict[str, int]:
        """
        从百度网盘同步会话（下载）
        
        Returns:
            同步结果统计 {success: 成功数, failed: 失败数, skipped: 跳过数}
        """
        if not self.baidu_sync_enabled or not self.baidu_service:
            logger.warning("百度网盘同步未启用")
            return {"success": 0, "failed": 0, "skipped": 0}
        
        result = {"success": 0, "failed": 0, "skipped": 0}
        
        try:
            # 列出远程目录的文件
            try:
                files = await self.baidu_service.list_files(self.baidu_remote_path)
            except Exception as e:
                logger.warning(f"远程目录不存在或为空: {e}")
                return result
            
            # 过滤出 JSON 文件
            json_files = [f for f in files if f.get("path", "").endswith(".json")]
            
            logger.info(f"开始从百度网盘同步 {len(json_files)} 个会话文件...")
            
            for file_info in json_files:
                remote_path = file_info.get("path")
                file_name = Path(remote_path).name
                local_path = self.storage_path / file_name
                
                try:
                    # 下载文件
                    content = await self.baidu_service.download_file(remote_path)
                    
                    # 保存到本地（覆盖）
                    with open(local_path, 'wb') as f:
                        f.write(content)
                    
                    # 加载到缓存
                    conversation_id = file_name.replace(".json", "")
                    try:
                        with open(local_path, 'r', encoding='utf-8') as f:
                            conversation = json.load(f)
                            self.conversations_cache[conversation_id] = conversation
                    except Exception:
                        pass
                    
                    result["success"] += 1
                    logger.debug(f"✅ 下载成功: {file_name}")
                    
                except Exception as e:
                    result["failed"] += 1
                    logger.error(f"❌ 下载失败 {file_name}: {e}")
            
            logger.info(f"同步完成: 成功 {result['success']}, 失败 {result['failed']}")
            
        except Exception as e:
            logger.error(f"从百度网盘同步失败: {e}")
        
        return result
    
    def get_conversation_summary(
        self,
        conversation_id: str,
        llm: Optional[ChatOpenAI] = None
    ) -> Optional[str]:
        """
        生成会话摘要（简单实现，基于消息统计）
        
        Args:
            conversation_id: 会话 ID
            llm: LangChain LLM 实例（可选，用于生成智能摘要）
            
        Returns:
            会话摘要
        """
        conversation = self.get_conversation(conversation_id)
        if not conversation or not conversation["messages"]:
            return None
        
        try:
            messages = conversation["messages"]
            user_count = sum(1 for msg in messages if msg["role"] == "user")
            assistant_count = sum(1 for msg in messages if msg["role"] == "assistant")
            
            # 简单摘要
            summary = f"共 {len(messages)} 条消息（用户: {user_count}, AI: {assistant_count}）"
            
            # 如果提供了 LLM，可以生成智能摘要
            if llm:
                try:
                    # 构建摘要提示
                    prompt = "请用一句话总结以下对话的主题：\n\n"
                    for msg in messages[:10]:  # 只取前 10 条
                        prompt += f"{msg['role']}: {msg['content'][:100]}\n"
                    
                    # 调用 LLM 生成摘要
                    response = llm.invoke([HumanMessage(content=prompt)])
                    summary = response.content
                    
                    logger.info(f"生成智能摘要: {conversation_id}")
                except Exception as e:
                    logger.warning(f"智能摘要生成失败，使用简单摘要: {e}")
            
            return summary
            
        except Exception as e:
            logger.error(f"生成会话摘要失败: {e}")
            return None


# 全局会话管理器实例
conversation_manager = ConversationManager()
