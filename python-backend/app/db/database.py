"""
SQLite3 数据库管理
"""
import sqlite3
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from contextlib import contextmanager
from loguru import logger
import json
import time


class Database:
    """SQLite3 数据库管理器"""
    
    def __init__(self, db_path: str = "data/neat-reader.db"):
        """
        初始化数据库
        
        Args:
            db_path: 数据库文件路径
        """
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 初始化数据库
        self._init_database()
        
        logger.info(f"数据库初始化完成: {self.db_path}")
    
    def _init_database(self):
        """初始化数据库表结构"""
        schema_path = Path(__file__).parent / "schema.sql"
        
        if not schema_path.exists():
            logger.error(f"数据库 schema 文件不存在: {schema_path}")
            return
        
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        with self.get_connection() as conn:
            conn.executescript(schema_sql)
            conn.commit()
        
        logger.info("数据库表结构初始化完成")
    
    @contextmanager
    def get_connection(self):
        """
        获取数据库连接（上下文管理器）
        
        使用方式:
            with db.get_connection() as conn:
                cursor = conn.execute("SELECT * FROM books")
        """
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row  # 返回字典格式
        try:
            yield conn
        finally:
            conn.close()
    
    def execute(
        self,
        sql: str,
        params: Optional[Tuple] = None,
        fetch_one: bool = False,
        fetch_all: bool = False
    ) -> Any:
        """
        执行 SQL 语句
        
        Args:
            sql: SQL 语句
            params: 参数元组
            fetch_one: 是否返回单条记录
            fetch_all: 是否返回所有记录
            
        Returns:
            根据参数返回不同结果
        """
        with self.get_connection() as conn:
            cursor = conn.execute(sql, params or ())
            
            if fetch_one:
                row = cursor.fetchone()
                return dict(row) if row else None
            elif fetch_all:
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
            else:
                conn.commit()
                return cursor.lastrowid
    
    # ============================================
    # 书籍管理
    # ============================================
    
    def create_book(self, book_data: Dict[str, Any]) -> str:
        """创建书籍记录"""
        now = int(time.time())
        
        sql = """
        INSERT INTO books (
            id, title, author, cover, file_path, format, size, file_hash,
            last_read, total_chapters, reading_progress, storage_type,
            baidupan_path, category_id, added_at, is_downloaded,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        params = (
            book_data['id'],
            book_data['title'],
            book_data.get('author'),
            book_data.get('cover'),
            book_data['file_path'],
            book_data['format'],
            book_data['size'],
            book_data.get('file_hash'),
            book_data.get('last_read'),
            book_data.get('total_chapters', 0),
            book_data.get('reading_progress', 0.0),
            book_data.get('storage_type', 'local'),
            book_data.get('baidupan_path'),
            book_data.get('category_id'),
            book_data.get('added_at', now),
            book_data.get('is_downloaded', 1),
            now,
            now
        )
        
        self.execute(sql, params)
        logger.info(f"创建书籍记录: {book_data['id']} - {book_data['title']}")
        
        return book_data['id']
    
    def get_book(self, book_id: str) -> Optional[Dict]:
        """获取书籍信息"""
        sql = "SELECT * FROM books WHERE id = ?"
        return self.execute(sql, (book_id,), fetch_one=True)
    
    def list_books(
        self,
        category_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict]:
        """列出书籍"""
        if category_id:
            sql = """
            SELECT * FROM books 
            WHERE category_id = ? 
            ORDER BY last_read DESC NULLS LAST, added_at DESC
            LIMIT ? OFFSET ?
            """
            params = (category_id, limit, offset)
        else:
            sql = """
            SELECT * FROM books 
            ORDER BY last_read DESC NULLS LAST, added_at DESC
            LIMIT ? OFFSET ?
            """
            params = (limit, offset)
        
        return self.execute(sql, params, fetch_all=True)
    
    def update_book(self, book_id: str, updates: Dict[str, Any]) -> bool:
        """更新书籍信息"""
        if not updates:
            return False
        
        updates['updated_at'] = int(time.time())
        
        set_clause = ', '.join([f"{k} = ?" for k in updates.keys()])
        sql = f"UPDATE books SET {set_clause} WHERE id = ?"
        
        params = tuple(updates.values()) + (book_id,)
        
        self.execute(sql, params)
        logger.info(f"更新书籍: {book_id}")
        
        return True
    
    def delete_book(self, book_id: str) -> bool:
        """删除书籍（级联删除相关数据）"""
        sql = "DELETE FROM books WHERE id = ?"
        self.execute(sql, (book_id,))
        logger.info(f"删除书籍: {book_id}")
        return True
    
    # ============================================
    # 分类管理
    # ============================================
    
    def create_category(self, category_data: Dict[str, Any]) -> str:
        """创建分类"""
        now = int(time.time())
        
        sql = """
        INSERT INTO categories (id, name, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        """
        
        params = (
            category_data['id'],
            category_data['name'],
            category_data['color'],
            now,
            now
        )
        
        self.execute(sql, params)
        logger.info(f"创建分类: {category_data['name']}")
        
        return category_data['id']
    
    def list_categories(self) -> List[Dict]:
        """列出所有分类"""
        sql = "SELECT * FROM categories ORDER BY created_at"
        return self.execute(sql, fetch_all=True)
    
    def update_category(self, category_id: str, updates: Dict[str, Any]) -> bool:
        """更新分类"""
        if not updates:
            return False
        
        updates['updated_at'] = int(time.time())
        
        set_clause = ', '.join([f"{k} = ?" for k in updates.keys()])
        sql = f"UPDATE categories SET {set_clause} WHERE id = ?"
        
        params = tuple(updates.values()) + (category_id,)
        
        self.execute(sql, params)
        return True
    
    def delete_category(self, category_id: str) -> bool:
        """删除分类（书籍的 category_id 会被设为 NULL）"""
        sql = "DELETE FROM categories WHERE id = ?"
        self.execute(sql, (category_id,))
        logger.info(f"删除分类: {category_id}")
        return True
    
    # ============================================
    # 阅读进度管理
    # ============================================
    
    def save_progress(self, progress_data: Dict[str, Any]) -> bool:
        """保存阅读进度（UPSERT）"""
        sql = """
        INSERT INTO reading_progress (
            ebook_id, chapter_index, chapter_title, position, cfi,
            timestamp, device_id, device_name, reading_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ebook_id) DO UPDATE SET
            chapter_index = excluded.chapter_index,
            chapter_title = excluded.chapter_title,
            position = excluded.position,
            cfi = excluded.cfi,
            timestamp = excluded.timestamp,
            device_id = excluded.device_id,
            device_name = excluded.device_name,
            reading_time = excluded.reading_time
        """
        
        params = (
            progress_data['ebook_id'],
            progress_data['chapter_index'],
            progress_data.get('chapter_title'),
            progress_data['position'],
            progress_data['cfi'],
            progress_data['timestamp'],
            progress_data['device_id'],
            progress_data['device_name'],
            progress_data.get('reading_time', 0)
        )
        
        self.execute(sql, params)
        return True
    
    def get_progress(self, ebook_id: str) -> Optional[Dict]:
        """获取阅读进度"""
        sql = "SELECT * FROM reading_progress WHERE ebook_id = ?"
        return self.execute(sql, (ebook_id,), fetch_one=True)
    
    # ============================================
    # 注释管理
    # ============================================
    
    def create_annotation(self, annotation_data: Dict[str, Any]) -> str:
        """创建注释"""
        now = int(time.time())
        
        sql = """
        INSERT INTO annotations (
            id, book_id, cfi, text, note, color, type, chapter_index, chapter_title, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        params = (
            annotation_data['id'],
            annotation_data['book_id'],
            annotation_data['cfi'],
            annotation_data.get('text'),
            annotation_data.get('note'),
            annotation_data.get('color'),
            annotation_data.get('type'),  # 🎯 修复：不使用默认值，保留原始类型
            annotation_data.get('chapter_index', 0),
            annotation_data.get('chapter_title'),
            now,
            now
        )
        
        self.execute(sql, params)
        return annotation_data['id']
    
    def list_annotations(self, book_id: str) -> List[Dict]:
        """列出书籍的所有注释"""
        sql = "SELECT * FROM annotations WHERE book_id = ? ORDER BY created_at"
        return self.execute(sql, (book_id,), fetch_all=True)
    
    def update_annotation(self, annotation_id: str, updates: Dict[str, Any]) -> bool:
        """更新注释"""
        if not updates:
            return False
        
        updates['updated_at'] = int(time.time())
        
        set_clause = ', '.join([f"{k} = ?" for k in updates.keys()])
        sql = f"UPDATE annotations SET {set_clause} WHERE id = ?"
        
        params = tuple(updates.values()) + (annotation_id,)
        
        self.execute(sql, params)
        return True
    
    def delete_annotation(self, annotation_id: str) -> bool:
        """删除注释"""
        sql = "DELETE FROM annotations WHERE id = ?"
        self.execute(sql, (annotation_id,))
        return True
    
    # ============================================
    # Token 管理
    # ============================================
    
    def save_token(self, service: str, token_data: Dict[str, Any]) -> bool:
        """保存 Token（UPSERT）"""
        now = int(time.time())
        
        sql = """
        INSERT INTO tokens (
            service, access_token, refresh_token, expires_at,
            resource_url, extra_data, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(service) DO UPDATE SET
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            expires_at = excluded.expires_at,
            resource_url = excluded.resource_url,
            extra_data = excluded.extra_data,
            updated_at = excluded.updated_at
        """
        
        params = (
            service,
            token_data.get('access_token'),
            token_data.get('refresh_token'),
            token_data.get('expires_at'),
            token_data.get('resource_url'),
            json.dumps(token_data.get('extra_data', {})),
            now
        )
        
        self.execute(sql, params)
        return True
    
    def get_token(self, service: str) -> Optional[Dict]:
        """获取 Token"""
        row = self.execute(
            "SELECT * FROM tokens WHERE service = ?",
            (service,),
            fetch_one=True
        )
        
        if row and row.get('extra_data'):
            row['extra_data'] = json.loads(row['extra_data'])
        
        return row
    
    # ============================================
    # 对话管理
    # ============================================
    
    def create_conversation(self, conversation_data: Dict[str, Any]) -> str:
        """创建对话"""
        now = int(time.time())
        
        sql = """
        INSERT INTO conversations (
            id, user_id, title, context, message_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        
        params = (
            conversation_data['id'],
            conversation_data.get('user_id'),
            conversation_data['title'],
            json.dumps(conversation_data.get('context', {})),
            0,
            now,
            now
        )
        
        self.execute(sql, params)
        return conversation_data['id']
    
    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict] = None
    ) -> int:
        """添加消息到对话"""
        now = int(time.time())
        
        # 插入消息
        sql = """
        INSERT INTO conversation_messages (
            conversation_id, role, content, metadata, timestamp
        ) VALUES (?, ?, ?, ?, ?)
        """
        
        params = (
            conversation_id,
            role,
            content,
            json.dumps(metadata or {}),
            now
        )
        
        message_id = self.execute(sql, params)
        
        # 更新对话的消息计数和更新时间
        self.execute(
            """
            UPDATE conversations 
            SET message_count = message_count + 1, updated_at = ?
            WHERE id = ?
            """,
            (now, conversation_id)
        )
        
        return message_id
    
    def get_conversation_messages(
        self,
        conversation_id: str,
        limit: Optional[int] = None
    ) -> List[Dict]:
        """获取对话消息"""
        if limit:
            sql = """
            SELECT * FROM conversation_messages 
            WHERE conversation_id = ? 
            ORDER BY timestamp DESC
            LIMIT ?
            """
            params = (conversation_id, limit)
        else:
            sql = """
            SELECT * FROM conversation_messages 
            WHERE conversation_id = ? 
            ORDER BY timestamp
            """
            params = (conversation_id,)
        
        messages = self.execute(sql, params, fetch_all=True)
        
        # 解析 metadata
        for msg in messages:
            if msg.get('metadata'):
                msg['metadata'] = json.loads(msg['metadata'])
        
        return messages
    
    def list_conversations(
        self,
        user_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """列出对话"""
        if user_id:
            sql = """
            SELECT * FROM conversations 
            WHERE user_id = ? 
            ORDER BY updated_at DESC
            LIMIT ?
            """
            params = (user_id, limit)
        else:
            sql = """
            SELECT * FROM conversations 
            ORDER BY updated_at DESC
            LIMIT ?
            """
            params = (limit,)
        
        conversations = self.execute(sql, params, fetch_all=True)
        
        # 解析 context
        for conv in conversations:
            if conv.get('context'):
                conv['context'] = json.loads(conv['context'])
        
        return conversations


# 全局数据库实例
_db_instance: Optional[Database] = None


def get_db() -> Database:
    """获取全局数据库实例"""
    global _db_instance
    
    if _db_instance is None:
        _db_instance = Database()
    
    return _db_instance
