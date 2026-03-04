# SQLite3 数据迁移指南

## 📋 概述

本项目已从 JSON 文件存储迁移到 SQLite3 数据库，实现统一的数据管理。

### 迁移内容

- ✅ Token 存储（Qwen、百度、自定义 API）
- ✅ 对话历史
- ✅ PageIndex 缓存
- ✅ 书籍管理（新增）
- ✅ 分类管理（新增）
- ✅ 阅读进度（新增）
- ✅ 注释管理（新增）

### 数据库位置

```
python-backend/data/neat-reader.db
```

---

## 🚀 迁移步骤

### 1. 备份现有数据（重要！）

```bash
# 备份整个 data 目录
cp -r python-backend/data python-backend/data_backup_$(date +%Y%m%d)
```

### 2. 安装依赖（如果需要）

SQLite3 是 Python 内置模块，无需额外安装。

### 3. 运行迁移脚本

```bash
cd python-backend
python migrate_to_sqlite.py
```

### 4. 验证迁移结果

```bash
# 使用 SQLite 命令行工具查看数据
sqlite3 data/neat-reader.db

# 查看所有表
.tables

# 查看 Token 数据
SELECT * FROM tokens;

# 查看对话数量
SELECT COUNT(*) FROM conversations;

# 退出
.quit
```

### 5. 启动后端服务

```bash
python main.py
```

---

## 📊 数据库结构

### 核心表

| 表名 | 说明 | 主要字段 |
|------|------|---------|
| `books` | 书籍信息 | id, title, author, file_path, format |
| `categories` | 分类 | id, name, color |
| `reading_progress` | 阅读进度 | ebook_id, cfi, position |
| `annotations` | 注释 | id, book_id, cfi, note |
| `conversations` | 对话会话 | id, title, message_count |
| `conversation_messages` | 对话消息 | id, conversation_id, role, content |
| `tokens` | Token 存储 | service, access_token, refresh_token |
| `pageindex_cache` | PageIndex 缓存 | book_id, cache_data |

### 文件存储

书籍文件仍然存储在文件系统中：

```
python-backend/data/books/
├── {book-id-1}.epub
├── {book-id-2}.pdf
└── ...
```

数据库只存储文件路径，不存储文件内容。

---

## 🔄 云同步策略

### 同步内容

1. **数据库文件**（必须）
   - `data/neat-reader.db`

2. **书籍文件**（按需）
   - `data/books/*.epub`
   - `data/books/*.pdf`

### 同步方式

#### 方案 A：完整同步（简单）

```
百度网盘/apps/Neat Reader/
├── neat-reader.db
└── books/
    ├── {id}.epub
    └── {id}.pdf
```

#### 方案 B：增量同步（推荐）

使用 `sync_log` 表记录变更：

```sql
SELECT * FROM sync_log WHERE synced = 0;
```

只同步未同步的变更。

---

## 🆕 新增 API 端点

### 书籍管理

```
POST   /api/books/upload          # 上传书籍
GET    /api/books                 # 列出书籍
GET    /api/books/{id}            # 获取书籍详情
GET    /api/books/{id}/content    # 下载书籍文件
PUT    /api/books/{id}            # 更新书籍信息
DELETE /api/books/{id}            # 删除书籍
```

### 分类管理

```
POST   /api/categories            # 创建分类
GET    /api/categories            # 列出分类
DELETE /api/categories/{id}       # 删除分类
```

### 阅读进度

```
POST   /api/progress              # 保存进度
GET    /api/progress/{ebook_id}   # 获取进度
```

### 注释管理

```
POST   /api/annotations           # 创建注释
GET    /api/annotations/{book_id} # 列出注释
DELETE /api/annotations/{id}      # 删除注释
```

---

## 🔧 前端迁移

### 步骤

1. **保留 Pinia Store**（状态管理）
2. **替换 localforage 调用**为 API 调用
3. **移除 IndexedDB 依赖**

### 示例：添加书籍

**旧代码（IndexedDB）：**

```typescript
const arrayBuffer = await file.arrayBuffer()
await localforage.setItem(`ebook_content_${id}`, arrayBuffer)
```

**新代码（API）：**

```typescript
const formData = new FormData()
formData.append('file', file)
formData.append('title', title)

const response = await axios.post('/api/books/upload', formData)
const bookId = response.data.book_id
```

### 示例：读取书籍

**旧代码：**

```typescript
const content = await localforage.getItem<ArrayBuffer>(`ebook_content_${bookId}`)
```

**新代码：**

```typescript
const response = await axios.get(`/api/books/${bookId}/content`, {
  responseType: 'arraybuffer'
})
const content = response.data
```

---

## ⚠️ 注意事项

### 1. 数据一致性

- 迁移后，原 JSON 文件仍保留，可手动删除
- 建议先测试一段时间再删除备份

### 2. 性能优化

- SQLite 对大文件（>100MB）性能一般
- 书籍文件建议存储在文件系统，数据库只存路径

### 3. 并发访问

- SQLite 支持多读单写
- 高并发场景建议使用 PostgreSQL

### 4. 备份策略

```bash
# 定期备份数据库
cp data/neat-reader.db data/neat-reader.db.backup

# 或使用 SQLite 备份命令
sqlite3 data/neat-reader.db ".backup data/neat-reader.db.backup"
```

---

## 🐛 故障排查

### 问题 1：数据库锁定

**错误：** `database is locked`

**解决：**
```python
# 增加超时时间
conn = sqlite3.connect('data/neat-reader.db', timeout=30.0)
```

### 问题 2：迁移失败

**解决：**
1. 检查原 JSON 文件格式是否正确
2. 查看日志文件定位具体错误
3. 恢复备份重新迁移

### 问题 3：前端无法访问

**解决：**
1. 确认后端服务已启动
2. 检查 API 端点是否正确
3. 查看浏览器控制台错误信息

---

## 📚 参考资料

- [SQLite 官方文档](https://www.sqlite.org/docs.html)
- [FastAPI 数据库教程](https://fastapi.tiangolo.com/tutorial/sql-databases/)
- [Python sqlite3 模块](https://docs.python.org/3/library/sqlite3.html)

---

## 🎯 下一步

1. [ ] 实现云同步 API
2. [ ] 前端迁移到新 API
3. [ ] 性能测试和优化
4. [ ] 添加数据库索引优化
5. [ ] 实现自动备份功能
