-- Neat Reader SQLite3 数据库 Schema
-- 版本: 1.0.0

-- ============================================
-- 书籍管理
-- ============================================

-- 书籍表
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    cover TEXT,                    -- Base64 或相对路径
    file_path TEXT NOT NULL,       -- 相对路径: books/{id}.epub
    format TEXT NOT NULL,          -- epub, pdf, mobi, etc.
    size INTEGER NOT NULL,         -- 文件大小（字节）
    file_hash TEXT,                -- MD5/SHA256，用于去重
    last_read INTEGER,             -- 最后阅读时间戳
    total_chapters INTEGER DEFAULT 0,
    reading_progress REAL DEFAULT 0.0,
    storage_type TEXT DEFAULT 'local',  -- 'local' | 'cloud' | 'both'
    baidupan_path TEXT,            -- 百度网盘路径
    category_id TEXT,              -- 分类 ID
    added_at INTEGER NOT NULL,     -- 添加时间戳
    is_downloaded INTEGER DEFAULT 1,    -- 本地是否有文件
    downloading INTEGER DEFAULT 0,      -- 是否正在下载
    uploading INTEGER DEFAULT 0,        -- 是否正在上传
    upload_progress REAL DEFAULT 0.0,   -- 上传进度 0-100
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_last_read ON books(last_read DESC);
CREATE INDEX IF NOT EXISTS idx_books_added_at ON books(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_file_hash ON books(file_hash);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 阅读进度表
CREATE TABLE IF NOT EXISTS reading_progress (
    ebook_id TEXT PRIMARY KEY,
    chapter_index INTEGER NOT NULL,
    chapter_title TEXT,
    position REAL NOT NULL,
    cfi TEXT NOT NULL,             -- EPUB CFI 位置
    timestamp INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    reading_time INTEGER DEFAULT 0,  -- 累计阅读时间（秒）
    FOREIGN KEY (ebook_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_progress_timestamp ON reading_progress(timestamp DESC);

-- 注释表
CREATE TABLE IF NOT EXISTS annotations (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    cfi TEXT NOT NULL,
    text TEXT,                     -- 选中的文本
    note TEXT,                     -- 用户笔记
    color TEXT,                    -- 高亮颜色
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_annotations_book ON annotations(book_id);
CREATE INDEX IF NOT EXISTS idx_annotations_created ON annotations(created_at DESC);

-- ============================================
-- AI 对话管理
-- ============================================

-- 对话会话表
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    context TEXT,                  -- JSON 格式的上下文（如书籍信息）
    message_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- 对话消息表
CREATE TABLE IF NOT EXISTS conversation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,            -- 'user' | 'assistant' | 'system'
    content TEXT NOT NULL,
    metadata TEXT,                 -- JSON 格式的元数据
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON conversation_messages(conversation_id, timestamp);

-- ============================================
-- Token 和配置管理
-- ============================================

-- Token 存储表
CREATE TABLE IF NOT EXISTS tokens (
    service TEXT PRIMARY KEY,      -- 'qwen' | 'baidu' | 'custom_api'
    access_token TEXT,
    refresh_token TEXT,
    expires_at INTEGER,
    resource_url TEXT,
    extra_data TEXT,               -- JSON 格式的额外数据
    updated_at INTEGER NOT NULL
);

-- 用户配置表
CREATE TABLE IF NOT EXISTS user_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,           -- JSON 格式的配置值
    updated_at INTEGER NOT NULL
);

-- ============================================
-- 云同步管理
-- ============================================

-- 同步日志表（用于增量同步）
CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,     -- 'book' | 'progress' | 'annotation' | 'conversation'
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,          -- 'create' | 'update' | 'delete'
    timestamp INTEGER NOT NULL,
    synced INTEGER DEFAULT 0,      -- 是否已同步到云端
    sync_error TEXT                -- 同步错误信息
);

CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_synced ON sync_log(synced, timestamp);

-- ============================================
-- PageIndex 缓存
-- ============================================

-- PageIndex 缓存表
CREATE TABLE IF NOT EXISTS pageindex_cache (
    book_id TEXT PRIMARY KEY,
    cache_data TEXT NOT NULL,      -- JSON 格式的 PageIndex 数据
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- ============================================
-- 版本管理
-- ============================================

CREATE TABLE IF NOT EXISTS schema_version (
    version TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES ('1.0.0', strftime('%s', 'now'));
