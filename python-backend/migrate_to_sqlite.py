"""
数据迁移脚本：从 JSON 文件迁移到 SQLite3
"""
import json
from pathlib import Path
from loguru import logger
from app.db.database import Database


def migrate_tokens(db: Database):
    """迁移 Token 数据"""
    logger.info("开始迁移 Token 数据...")
    
    token_file = Path("data/auth_tokens.json")
    if not token_file.exists():
        logger.warning("Token 文件不存在，跳过")
        return
    
    try:
        with open(token_file, 'r', encoding='utf-8') as f:
            tokens = json.load(f)
        
        # 迁移 Qwen Token
        if 'qwen' in tokens:
            db.save_token('qwen', tokens['qwen'])
            logger.info("✅ Qwen Token 已迁移")
        
        # 迁移百度 Token
        if 'baidu' in tokens:
            db.save_token('baidu', tokens['baidu'])
            logger.info("✅ 百度 Token 已迁移")
        
        # 迁移自定义 API 配置
        if 'custom_api' in tokens:
            db.save_token('custom_api', tokens['custom_api'])
            logger.info("✅ 自定义 API 配置已迁移")
        
        logger.info("Token 数据迁移完成")
        
    except Exception as e:
        logger.error(f"Token 数据迁移失败: {e}")


def migrate_conversations(db: Database):
    """迁移对话数据"""
    logger.info("开始迁移对话数据...")
    
    conversations_dir = Path("data/conversations")
    if not conversations_dir.exists():
        logger.warning("对话目录不存在，跳过")
        return
    
    migrated_count = 0
    failed_count = 0
    
    for conv_file in conversations_dir.glob("*.json"):
        # 跳过同步元数据文件
        if conv_file.name == ".sync_meta.json":
            continue
        
        try:
            with open(conv_file, 'r', encoding='utf-8') as f:
                conversation = json.load(f)
            
            # 创建对话记录
            db.create_conversation({
                'id': conversation['id'],
                'user_id': conversation.get('user_id'),
                'title': conversation['title'],
                'context': conversation.get('context', {})
            })
            
            # 迁移消息
            for message in conversation.get('messages', []):
                db.add_message(
                    conversation_id=conversation['id'],
                    role=message['role'],
                    content=message['content'],
                    metadata=message.get('metadata')
                )
            
            migrated_count += 1
            logger.info(f"✅ 对话已迁移: {conversation['id']} ({len(conversation.get('messages', []))} 条消息)")
            
        except Exception as e:
            failed_count += 1
            logger.error(f"❌ 对话迁移失败 {conv_file.name}: {e}")
    
    logger.info(f"对话数据迁移完成: 成功 {migrated_count}, 失败 {failed_count}")


def migrate_pageindex_cache(db: Database):
    """迁移 PageIndex 缓存"""
    logger.info("开始迁移 PageIndex 缓存...")
    
    cache_dir = Path("cache/pageindex")
    if not cache_dir.exists():
        logger.warning("PageIndex 缓存目录不存在，跳过")
        return
    
    migrated_count = 0
    
    for cache_file in cache_dir.glob("*.json"):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cache_data = f.read()
            
            # 从文件名提取 book_id（格式: epub_{hash}.json）
            book_id = cache_file.stem
            
            # 保存到数据库
            import time
            now = int(time.time())
            
            db.execute(
                """
                INSERT INTO pageindex_cache (book_id, cache_data, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(book_id) DO UPDATE SET
                    cache_data = excluded.cache_data,
                    updated_at = excluded.updated_at
                """,
                (book_id, cache_data, now, now)
            )
            
            migrated_count += 1
            logger.info(f"✅ PageIndex 缓存已迁移: {book_id}")
            
        except Exception as e:
            logger.error(f"❌ PageIndex 缓存迁移失败 {cache_file.name}: {e}")
    
    logger.info(f"PageIndex 缓存迁移完成: {migrated_count} 个文件")


def main():
    """主迁移流程"""
    logger.info("=" * 60)
    logger.info("开始数据迁移：JSON → SQLite3")
    logger.info("=" * 60)
    
    # 初始化数据库
    db = Database()
    
    # 执行迁移
    migrate_tokens(db)
    migrate_conversations(db)
    migrate_pageindex_cache(db)
    
    logger.info("=" * 60)
    logger.info("数据迁移完成！")
    logger.info("=" * 60)
    logger.info("")
    logger.info("注意事项：")
    logger.info("1. 原 JSON 文件已保留，可以手动删除")
    logger.info("2. 数据库文件位置: data/neat-reader.db")
    logger.info("3. 前端 IndexedDB 数据需要单独迁移（通过 API）")
    logger.info("")


if __name__ == "__main__":
    main()
