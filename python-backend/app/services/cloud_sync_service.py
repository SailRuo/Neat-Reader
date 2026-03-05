"""
云端同步服务
负责定时将数据库、书籍文件、索引文件同步到百度网盘
"""
import asyncio
import json
import time
from pathlib import Path
from typing import Optional, Dict, Any, List
from loguru import logger

from app.db.database import get_db
from app.services.baidu_service import BaiduNetdiskService


class CloudSyncService:
    """云端同步服务"""
    
    def __init__(self):
        self.db = get_db()
        self.baidu_service = BaiduNetdiskService()
        self.sync_interval = 300  # 5分钟
        self.is_running = False
        self.last_sync_time = 0
        
        # 同步状态缓存
        self.last_db_mtime = 0
        self.last_db_sync_time = 0  # 上次数据库同步时间（用于冷却）
        self.db_sync_cooldown = 300  # 数据库同步冷却时间（5分钟，避免频繁上传）
        self.synced_books: Dict[str, float] = {}  # book_id -> last_modified
        self.synced_pageindex: Dict[str, float] = {}  # book_id -> last_modified
        
        logger.info("云端同步服务初始化完成")
    
    async def start(self, delay_first_sync: bool = True):
        """
        启动定时同步任务
        
        Args:
            delay_first_sync: 是否延迟首次同步（默认 True，避免阻塞启动）
        """
        if self.is_running:
            logger.warning("云端同步服务已在运行")
            return
        
        self.is_running = True
        logger.info(f"云端同步服务已启动，同步间隔: {self.sync_interval}秒")
        
        # 如果延迟首次同步，先等待一个周期
        if delay_first_sync:
            logger.info(f"首次同步将在 {self.sync_interval} 秒后执行")
            await asyncio.sleep(self.sync_interval)
        
        while self.is_running:
            try:
                await self._sync_cycle()
            except Exception as e:
                logger.error(f"同步周期执行失败: {e}")
            
            # 等待下一个同步周期
            await asyncio.sleep(self.sync_interval)
    
    def stop(self):
        """停止同步服务"""
        self.is_running = False
        logger.info("云端同步服务已停止")
    
    async def _sync_cycle(self):
        """执行一次同步周期"""
        logger.info("开始云端同步周期...")
        
        # 检查是否有百度网盘 Token
        token_data = self.db.get_token('baidu')
        logger.info(f"[Sync] 从数据库读取 Token: {token_data is not None}")
        
        if not token_data or not token_data.get('access_token'):
            logger.warning("未配置百度网盘 Token，跳过同步")
            return
        
        access_token = token_data['access_token']
        logger.info(f"[Sync] 使用 Token: {access_token[:20]}...")
        
        try:
            # 1. 同步数据库文件（如果有更新）
            await self._sync_database(access_token)
            
            # 2. 同步书籍文件（增量）
            await self._sync_books(access_token)
            
            # 3. 同步 PageIndex 文件（增量）
            await self._sync_pageindex(access_token)
            
            # 4. 同步 AI 对话记录
            await self._sync_conversations(access_token)
            
            self.last_sync_time = time.time()
            logger.info("云端同步周期完成")
            
        except Exception as e:
            logger.error(f"云端同步失败: {e}")
    
    async def _sync_database(self, access_token: str):
        """同步数据库文件"""
        logger.info("[Sync DB] 开始检查数据库同步...")
        db_path = Path("data/neat-reader.db")
        
        if not db_path.exists():
            logger.warning("[Sync DB] 数据库文件不存在，跳过同步")
            return
        
        # 检查数据库文件是否有更新
        current_mtime = db_path.stat().st_mtime
        logger.debug(f"[Sync DB] 当前修改时间: {current_mtime}, 上次同步时间: {self.last_db_mtime}")
        
        if current_mtime <= self.last_db_mtime:
            logger.debug("[Sync DB] 数据库文件未更新，跳过同步")
            return
        
        # 检查冷却时间（防止频繁上传）
        current_time = time.time()
        time_since_last_sync = current_time - self.last_db_sync_time
        
        if time_since_last_sync < self.db_sync_cooldown:
            remaining = self.db_sync_cooldown - time_since_last_sync
            logger.info(f"[Sync DB] 数据库同步冷却中，还需等待 {remaining:.0f} 秒")
            return
        
        logger.info("[Sync DB] 数据库文件已更新，开始同步...")
        
        try:
            # 读取数据库文件
            with open(db_path, 'rb') as f:
                db_content = f.read()
            
            logger.info(f"[Sync DB] 读取数据库文件，大小: {len(db_content) / 1024 / 1024:.2f} MB")
            
            # 上传到百度网盘
            result = self.baidu_service.upload_file(
                file_name="neat-reader.db",
                file_data=db_content,
                access_token=access_token,
                path="/apps/Neat Reader/sync"
            )
            
            logger.info(f"[Sync DB] 上传结果: {result}")
            
            if result.get('success'):
                self.last_db_mtime = current_mtime
                self.last_db_sync_time = current_time
                logger.info(f"✅ 数据库文件同步成功: {result.get('path', 'neat-reader.db')}")
            else:
                logger.error(f"❌ 数据库文件同步失败: {result.get('error', '未知错误')}")
                
        except Exception as e:
            logger.error(f"[Sync DB] 同步数据库文件异常: {e}", exc_info=True)
    
    async def _sync_books(self, access_token: str):
        """增量同步书籍文件"""
        books_dir = Path("data/books")
        
        if not books_dir.exists():
            logger.debug("书籍目录不存在，跳过同步")
            return
        
        # 获取所有书籍记录
        books = self.db.list_books(limit=10000)
        
        synced_count = 0
        skipped_count = 0
        
        for book in books:
            book_id = book['id']
            file_path = books_dir / f"{book_id}.{book['format']}"
            
            if not file_path.exists():
                logger.debug(f"书籍文件不存在: {book_id}")
                continue
            
            # 检查文件是否有更新
            current_mtime = file_path.stat().st_mtime
            last_synced = self.synced_books.get(book_id, 0)
            
            if current_mtime <= last_synced:
                skipped_count += 1
                continue
            
            try:
                # 读取书籍文件
                with open(file_path, 'rb') as f:
                    book_content = f.read()
                
                # 上传到百度网盘
                file_name = f"{book['title']}.{book['format']}"
                result = self.baidu_service.upload_file(
                    file_name=file_name,
                    file_data=book_content,
                    access_token=access_token,
                    path="/apps/Neat Reader/books"
                )
                
                if result.get('success'):
                    self.synced_books[book_id] = current_mtime
                    synced_count += 1
                    logger.info(f"✅ 书籍文件同步成功: {book['title']}")
                else:
                    logger.error(f"❌ 书籍文件同步失败: {book['title']} - {result.get('error', '未知错误')}")
                    
            except Exception as e:
                logger.error(f"同步书籍文件异常 ({book['title']}): {e}")
        
        if synced_count > 0 or skipped_count > 0:
            logger.info(f"书籍文件同步完成: 同步 {synced_count} 个，跳过 {skipped_count} 个")
    
    async def _sync_pageindex(self, access_token: str):
        """增量同步 PageIndex 文件"""
        pageindex_dir = Path("cache/pageindex")
        
        if not pageindex_dir.exists():
            logger.debug("PageIndex 目录不存在，跳过同步")
            return
        
        synced_count = 0
        skipped_count = 0
        
        for index_file in pageindex_dir.glob("*.json"):
            book_id = index_file.stem
            
            # 检查文件是否有更新
            current_mtime = index_file.stat().st_mtime
            last_synced = self.synced_pageindex.get(book_id, 0)
            
            if current_mtime <= last_synced:
                skipped_count += 1
                continue
            
            try:
                # 读取索引文件
                with open(index_file, 'rb') as f:
                    index_content = f.read()
                
                # 上传到百度网盘
                result = self.baidu_service.upload_file(
                    file_name=index_file.name,
                    file_data=index_content,
                    access_token=access_token,
                    path="/apps/Neat Reader/sync/pageindex"
                )
                
                if result.get('success'):
                    self.synced_pageindex[book_id] = current_mtime
                    synced_count += 1
                    logger.debug(f"✅ PageIndex 同步成功: {book_id}")
                else:
                    logger.error(f"❌ PageIndex 同步失败: {book_id} - {result.get('error', '未知错误')}")
                    
            except Exception as e:
                logger.error(f"同步 PageIndex 异常 ({book_id}): {e}")
        
        if synced_count > 0 or skipped_count > 0:
            logger.info(f"PageIndex 同步完成: 同步 {synced_count} 个，跳过 {skipped_count} 个")
    
    async def _sync_conversations(self, access_token: str):
        """
        同步 AI 对话记录
        注意：对话已经存储在数据库中，会随数据库文件一起同步
        这里只是额外导出一份 JSON 格式的备份
        """
        try:
            # 获取所有对话
            conversations = self.db.list_conversations(limit=1000)
            
            if not conversations:
                logger.debug("没有对话记录，跳过同步")
                return
            
            # 构建对话数据
            conversations_data = []
            
            for conv in conversations:
                # 获取对话消息
                messages = self.db.get_conversation_messages(conv['id'])
                
                conversations_data.append({
                    'id': conv['id'],
                    'title': conv['title'],
                    'context': conv.get('context', {}),
                    'messages': messages,
                    'created_at': conv['created_at'],
                    'updated_at': conv['updated_at']
                })
            
            # 转换为 JSON
            conversations_json = json.dumps({
                'conversations': conversations_data,
                'synced_at': int(time.time())
            }, ensure_ascii=False, indent=2)
            
            # 上传到百度网盘（作为备份）
            result = self.baidu_service.upload_file(
                file_name="conversations_backup.json",
                file_data=conversations_json.encode('utf-8'),
                access_token=access_token,
                path="/apps/Neat Reader/sync"
            )
            
            if result.get('success'):
                logger.info(f"✅ AI 对话备份同步成功: {len(conversations_data)} 个对话")
            else:
                logger.error(f"❌ AI 对话备份同步失败: {result.get('error', '未知错误')}")
                
        except Exception as e:
            logger.error(f"同步 AI 对话备份异常: {e}")
    
    async def force_sync(self):
        """强制执行一次完整同步"""
        logger.info("开始强制同步...")
        
        # 重置同步状态（包括冷却时间）
        self.last_db_mtime = 0
        self.last_db_sync_time = 0  # 重置冷却时间，允许立即同步
        self.synced_books.clear()
        self.synced_pageindex.clear()
        
        # 执行同步
        await self._sync_cycle()
        
        logger.info("强制同步完成")


# 全局同步服务实例
_sync_service: Optional[CloudSyncService] = None


def get_sync_service() -> CloudSyncService:
    """获取全局同步服务实例"""
    global _sync_service
    
    if _sync_service is None:
        _sync_service = CloudSyncService()
    
    return _sync_service
