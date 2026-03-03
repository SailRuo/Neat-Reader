# PageIndex 项目检索逻辑详解

## 目录
1. [项目概述](#项目概述)
2. [核心架构](#核心架构)
3. [索引构建流程](#索引构建流程)
4. [数据结构设计](#数据结构设计)
5. [检索逻辑实现](#检索逻辑实现)
6. [章节匹配机制](#章节匹配机制)
7. [工具函数详解](#工具函数详解)
8. [问题排查指南](#问题排查指南)

---

## 项目概述

PageIndex 是一个智能文档索引系统，支持 EPUB 和 PDF 文档的自动解析、层级结构提取和内容检索。系统分为两个主要部分：

- **PageIndex-Project**：核心索引构建引擎（支持 PDF 和 Markdown）
- **python-backend**：Web 服务层（支持 EPUB 解析和 RAG 检索）

### 技术栈
- **AI 模型**：GPT-4o（用于 TOC 提取、章节匹配、摘要生成）
- **文档解析**：ebooklib（EPUB）、PyPDF2/PyMuPDF（PDF）
- **后端框架**：FastAPI + LangChain
- **检索方式**：Token 重叠评分（非向量检索）

---

## 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户请求层                              │
│  (FastAPI Routes: /pageindex/build, /query, /search)       │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  服务层 (Services)                           │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │ PageIndexService     │  │ LangChainQwenService     │    │
│  │ - build_from_epub    │  │ - get_book_summary       │    │
│  │ - search             │  │ - get_book_toc           │    │
│  │ - load/exists        │  │ - search_book_content    │    │
│  └──────────────────────┘  └──────────────────────────┘    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  索引存储层                                  │
│  cache/pageindex/{book_id}.json                             │
│  {                                                           │
│    "book_id": "epub_xxx",                                   │
│    "book_title": "书名",                                     │
│    "toc": [...],          // 目录树                         │
│    "chunks": [            // 文本片段                       │
│      {                                                       │
│        "chunk_id": "0_1",                                   │
│        "chapter_index": 0,                                  │
│        "chapter_name": "chapter1.xhtml",                    │
│        "text": "...",                                       │
│        "tokens": ["word1", "word2", ...]                   │
│      }                                                       │
│    ]                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 索引构建流程

### EPUB 索引构建（python-backend）

```python
# 入口：PageIndexService.build_from_epub_bytes()
```

**流程图：**

```
上传 EPUB 文件
    │
    ▼
读取 EPUB 元数据
    │ (ebooklib.epub.read_epub)
    ▼
提取书籍标题
    │ (book.get_metadata("DC", "title"))
    ▼
提取目录树 (TOC)
    │ (_extract_toc → _parse_toc_items)
    │ 递归解析嵌套目录结构
    ▼
遍历所有文档项
    │ (book.get_items_of_type(ITEM_DOCUMENT))
    │
    ├─ 解析 HTML 内容 (BeautifulSoup)
    ├─ 提取纯文本 (soup.get_text)
    ├─ 分块处理 (_chunk_text)
    │   └─ 每块最多 1200 字符，重叠 150 字符
    └─ 生成 tokens (_tokens)
        └─ 正则提取单词：[A-Za-z0-9\u4e00-\u9fff]+
    ▼
构建索引文档
    │ {
    │   "book_id": "...",
    │   "book_title": "...",
    │   "toc": [...],
    │   "chunks": [...]
    │ }
    ▼
保存到 JSON 文件
    │ cache/pageindex/{book_id}.json
    ▼
完成 ✅
```

### PDF 索引构建（PageIndex-Project）

```python
# 入口：page_index_main() → tree_parser()
```

**三种处理模式：**

1. **有目录 + 有页码**：`process_toc_with_page_numbers()`
   - 直接提取页码映射
   - 验证准确性（随机抽样）

2. **有目录 + 无页码**：`process_toc_no_page_numbers()`
   - AI 匹配物理位置（`toc_index_extractor`）
   - 使用 `<physical_index_X>` 标签标记页面
   - 验证并修复错误（`fix_incorrect_toc`）

3. **无目录**：`process_no_toc()`
   - AI 自动生成文档结构
   - 递归处理大节点（超过 10 页或 20000 tokens）

---

## 数据结构设计

### EPUB 索引结构

```json
{
  "book_id": "epub_1df25471381a97f9db3ecb724bf01c96",
  "book_title": "克里希那穆提传",
  "source": {
    "filename": "book.epub",
    "byte_size": 524288
  },
  "built_at": 1709481234.567,
  "chunk_count": 156,
  "toc": [
    {
      "title": "第一章 早年生活",
      "href": "chapter1.xhtml",
      "sections": [
        {
          "title": "1.1 童年",
          "href": "chapter1.xhtml#section1"
        }
      ]
    }
  ],
  "chunks": [
    {
      "chunk_id": "0_0",
      "chapter_index": 0,
      "chapter_name": "chapter1.xhtml",
      "text": "这是第一章的内容...",
      "tokens": ["这是", "第一章", "的", "内容", ...]
    }
  ]
}
```

### PDF 索引结构

```json
{
  "doc_name": "document.pdf",
  "structure": [
    {
      "title": "第一章",
      "start_index": 1,
      "end_index": 10,
      "node_id": "0001",
      "summary": "本章概述...",
      "nodes": [
        {
          "title": "1.1 引言",
          "start_index": 1,
          "end_index": 3,
          "node_id": "0002",
          "text": "..."
        }
      ]
    }
  ]
}
```

### 关键字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `chunk_id` | string | 块唯一标识 | "0_1" (章节索引_块索引) |
| `chapter_index` | int | 章节索引（从 0 开始） | 0, 1, 2... |
| `chapter_name` | string | 章节文件名或标题 | "chapter1.xhtml" |
| `text` | string | 文本内容 | "这是一段文本..." |
| `tokens` | array | 分词结果（小写） | ["word1", "word2"] |
| `physical_index` | int | 物理页码（PDF） | 15 |
| `structure` | string | 层级编号（PDF） | "1.1.2" |

---

## 检索逻辑实现

### 1. Token 重叠评分检索

```python
# PageIndexService.search()
```

**算法流程：**

```python
def search(book_id, query, top_k=5, chapter_index=None):
    # 1. 加载索引
    index_doc = load(book_id)
    
    # 2. 查询分词
    q_tokens = set(tokenize(query.lower()))
    # 正则: [A-Za-z0-9\u4e00-\u9fff]+
    
    # 3. 遍历所有 chunks
    scored = []
    for chunk in index_doc["chunks"]:
        # 可选：按章节过滤
        if chapter_index and chunk["chapter_index"] != chapter_index:
            continue
        
        # 4. 计算 token 交集
        chunk_tokens = set(chunk["tokens"])
        score = len(q_tokens & chunk_tokens)
        
        if score > 0:
            scored.append((score, chunk))
    
    # 5. 按分数排序
    scored.sort(key=lambda x: x[0], reverse=True)
    
    # 6. 返回 top_k 结果
    return scored[:top_k]
```

**特点：**
- ✅ 无需向量化，速度快
- ✅ 支持中英文混合
- ✅ 支持章节过滤
- ❌ 无语义理解（纯关键词匹配）

### 2. 章节摘要生成

```python
# LangChainQwenService.get_book_summary()
```

**流程图：**

```
输入: book_id, chapter (可选)
    │
    ▼
加载索引文档
    │
    ▼
提取文本片段
    │
    ├─ 指定章节？
    │   ├─ Yes → 匹配 chapter_name
    │   │   ├─ 直接匹配: chapter_lower in chunk["chapter_name"].lower()
    │   │   └─ TOC 辅助: 在目录中查找 href，再匹配 chapter_name
    │   └─ No → 全书摘要
    │       └─ 取前中后部分（前 15 + 中间 20 + 后 15 块）
    ▼
合并文本
    │ merged = "\n".join(texts)
    ▼
限制长度
    │ 最多 6000 字符（前 3000 + 后 3000）
    ▼
调用 LLM 生成摘要
    │ Prompt: "生成 300-500 字摘要"
    ▼
返回结果
```

### 3. 目录树查询

```python
# LangChainQwenService.get_book_toc()
```

**返回格式：**

```json
{
  "book_title": "克里希那穆提传",
  "toc": [
    {
      "title": "第一章",
      "href": "chapter1.xhtml",
      "sections": [...]
    }
  ]
}
```

---

## 章节匹配机制

### 问题：为什么找不到"冥想的心和无解的问题"？

**原因分析：**

1. **chapter_name 字段来源**：
   - EPUB：`item.get_name()` → 文件名（如 "chapter1.xhtml"）
   - PDF：AI 提取的章节标题

2. **匹配逻辑**：
   ```python
   chapter_lower = "冥想的心和无解的问题".lower()
   texts = [
       c["text"] 
       for c in chunks 
       if chapter_lower in c["chapter_name"].lower()
   ]
   ```

3. **可能的问题**：
   - ❌ `chapter_name` 是文件名（如 "ch05.xhtml"），不是章节标题
   - ❌ 标题在 TOC 中，但 chunks 的 `chapter_name` 未关联
   - ❌ 标题有变体（标点、空格、繁简体）

### 解决方案

#### 方案 1：先查 TOC，再匹配 href

```python
# 当前代码已实现
if not texts and index_doc.get("toc"):
    def find_in_toc(items):
        for item in items:
            title = item.get("title", "").lower()
            if chapter_lower in title or title in chapter_lower:
                return item.get("href")
            if item.get("sections"):
                res = find_in_toc(item["sections"])
                if res: return res
        return None
    
    target_href = find_in_toc(index_doc["toc"])
    if target_href:
        pure_href = target_href.split("#")[0]
        texts = [
            c["text"] 
            for c in chunks 
            if pure_href in c["chapter_name"]
        ]
```

#### 方案 2：增强 chapter_name 字段

**在构建索引时，同时保存文件名和章节标题：**

```python
# 修改 PageIndexService.build_from_epub_bytes()

# 构建 href → title 映射
href_to_title = {}
def extract_titles(toc_items):
    for item in toc_items:
        if item.get("href"):
            href_to_title[item["href"].split("#")[0]] = item["title"]
        if item.get("sections"):
            extract_titles(item["sections"])
extract_titles(toc)

# 在生成 chunks 时添加 chapter_title
for item in book.get_items_of_type(ITEM_DOCUMENT):
    href = item.get_name()
    chapter_title = href_to_title.get(href, href)
    
    chunks.append({
        "chapter_name": href,           # 文件名
        "chapter_title": chapter_title,  # 章节标题 ✨
        "text": text,
        ...
    })
```

**修改匹配逻辑：**

```python
texts = [
    c["text"] 
    for c in chunks 
    if (chapter_lower in c.get("chapter_name", "").lower() or
        chapter_lower in c.get("chapter_title", "").lower())
]
```

#### 方案 3：模糊匹配

```python
from difflib import SequenceMatcher

def fuzzy_match(query, target, threshold=0.6):
    return SequenceMatcher(None, query, target).ratio() >= threshold

texts = [
    c["text"]
    for c in chunks
    if fuzzy_match(chapter_lower, c.get("chapter_title", "").lower())
]
```

---

## 工具函数详解

### 1. list_indexed_bookshelf

```python
@tool
def list_indexed_bookshelf() -> str:
    """列出所有已索引的书籍"""
    book_ids = _pageindex_service.list_book_ids()
    results = []
    for bid in book_ids:
        doc = _pageindex_service.load(bid)
        results.append({
            "book_id": bid,
            "title": doc.get("book_title", "Unknown"),
            "chunk_count": doc.get("chunk_count", 0)
        })
    return json.dumps(results, ensure_ascii=False)
```

### 2. get_book_toc

```python
@tool
def get_book_toc(book_id: str) -> str:
    """获取书籍目录"""
    index_doc = _pageindex_service.load(book_id)
    return json.dumps({
        "book_title": index_doc.get("book_title"),
        "toc": index_doc.get("toc", [])
    }, ensure_ascii=False)
```

### 3. get_book_summary

```python
@tool
def get_book_summary(book_id: str, chapter: Optional[str] = None) -> str:
    """生成书籍或章节摘要"""
    # 1. 加载索引
    index_doc = _pageindex_service.load(book_id)
    chunks = index_doc.get("chunks", [])
    
    # 2. 提取文本
    if chapter:
        # 章节摘要
        texts = [c["text"] for c in chunks 
                 if chapter.lower() in c["chapter_name"].lower()]
        
        # TOC 辅助匹配
        if not texts and index_doc.get("toc"):
            href = find_chapter_href_in_toc(chapter, index_doc["toc"])
            if href:
                texts = [c["text"] for c in chunks 
                         if href in c["chapter_name"]]
    else:
        # 全书摘要：前中后采样
        if len(chunks) > 50:
            texts = [c["text"] for c in 
                     (chunks[:15] + 
                      chunks[len(chunks)//2-10:len(chunks)//2+10] + 
                      chunks[-15:])]
        else:
            texts = [c["text"] for c in chunks]
    
    # 3. 合并并限制长度
    merged = "\n".join(texts)
    if len(merged) > 6000:
        merged = merged[:3000] + "\n...\n" + merged[-3000:]
    
    # 4. 调用 LLM
    prompt = f"""生成 300-500 字摘要：
    {merged}
    """
    return llm.invoke(prompt).content
```

### 4. search_book_content

```python
@tool
def search_book_content(book_id: str, query: str) -> str:
    """在书籍中搜索内容"""
    hits = _pageindex_service.search(
        book_id=book_id, 
        query=query, 
        top_k=5
    )
    return json.dumps(hits, ensure_ascii=False)
```

---

## 问题排查指南

### 问题 1：找不到章节

**症状：**
```
提示: 未找到关于章节 '冥想的心和无解的问题' 的具体内容
```

**排查步骤：**

1. **查看 TOC 结构**
   ```python
   get_book_toc(book_id="epub_xxx")
   ```
   确认章节标题的准确写法

2. **检查 chunks 的 chapter_name**
   ```python
   index_doc = load(book_id)
   chapter_names = set(c["chapter_name"] for c in index_doc["chunks"])
   print(chapter_names)
   # 输出: {'ch01.xhtml', 'ch02.xhtml', ...}
   ```

3. **尝试部分匹配**
   ```python
   get_book_summary(book_id="epub_xxx", chapter="冥想")
   ```

4. **使用 href 匹配**
   ```python
   # 从 TOC 中找到 href
   toc = get_book_toc(book_id)
   # 假设找到 href="ch05.xhtml"
   
   # 直接用 href 搜索
   search_book_content(book_id="epub_xxx", query="冥想的心")
   ```

### 问题 2：搜索结果不准确

**原因：**
- Token 重叠评分对短查询不友好
- 中文分词可能不准确

**优化方案：**

1. **增加查询词**
   ```python
   # Bad
   search("冥想")
   
   # Good
   search("冥想的心 无解的问题 克里希那穆提")
   ```

2. **使用章节过滤**
   ```python
   # 先找到章节索引
   chapter_index = 5
   
   # 在特定章节内搜索
   search(book_id, query, chapter_index=chapter_index)
   ```

3. **切换到 RAG 模式**
   ```python
   # 使用 LLM 理解语义
   answer_pageindex(book_id, query="解释冥想的心的含义")
   ```

### 问题 3：摘要生成失败

**可能原因：**
- 文本过长超过 LLM 上下文
- API 调用失败

**解决方案：**

1. **检查文本长度**
   ```python
   # 当前限制：6000 字符
   # 如果章节太长，考虑增加限制或分段处理
   ```

2. **查看日志**
   ```python
   logger.error(f"调用 LLM 生成摘要失败: {e}")
   ```

3. **降级方案**
   ```python
   # 直接返回原文片段
   if llm_failed:
       return merged[:500] + "..."
   ```

---

## 最佳实践

### 1. 构建索引

```python
# 上传 EPUB 文件
POST /pageindex/build
FormData:
  - book_id: "my_book_001"
  - epub_file: <file>

# 检查状态
GET /pageindex/status/my_book_001
```

### 2. 查询流程

```python
# Step 1: 查看目录
toc = get_book_toc("my_book_001")

# Step 2: 搜索关键词
results = search_book_content("my_book_001", "关键词")

# Step 3: 生成摘要
summary = get_book_summary("my_book_001", chapter="第一章")
```

### 3. RAG 问答

```python
POST /pageindex/answer
{
  "book_id": "my_book_001",
  "query": "作者的主要观点是什么？",
  "top_k": 5
}

# 流程：
# 1. 检索相关 chunks (search)
# 2. 构建 context
# 3. LLM 生成回答
```

---

## 配置参数

### EPUB 索引配置

```python
# PageIndexService._chunk_text()
max_chars = 1200        # 每块最大字符数
overlap_chars = 150     # 块之间重叠字符数
max_tokens = 2048       # 最多保留 2048 个 tokens
```

### PDF 索引配置

```yaml
# PageIndex-Project/pageindex/config.yaml
model: "gpt-4o-2024-11-20"
toc_check_page_num: 20          # 检查前 20 页找目录
max_page_num_each_node: 10      # 单节点最多 10 页
max_token_num_each_node: 20000  # 单节点最多 20000 tokens
if_add_node_summary: "yes"      # 生成节点摘要
```

### LLM 配置

```python
# LangChainQwenService
temperature = 0.7       # 生成多样性
streaming = True        # 流式响应
max_retries = 10        # 最大重试次数
```

---

## 性能优化

### 1. 索引构建优化

- ✅ 异步并发处理（`asyncio.gather`）
- ✅ 分块处理大文档
- ✅ 缓存 tokens 避免重复计算

### 2. 检索优化

- ✅ 提前过滤（chapter_index）
- ✅ 限制 top_k 结果数量
- ✅ Token 集合交集（O(n) 复杂度）

### 3. 存储优化

- ✅ JSON 格式（易读易调试）
- ✅ 原子写入（tmp → replace）
- ✅ 按需加载（不常驻内存）

---

## 总结

PageIndex 项目通过以下机制实现高效的文档检索：

1. **分层索引**：TOC（目录树） + Chunks（文本块）
2. **轻量检索**：Token 重叠评分，无需向量化
3. **AI 辅助**：章节匹配、摘要生成、结构提取
4. **灵活查询**：支持全书/章节/关键词多种模式

**核心优势：**
- 🚀 快速构建（无需训练模型）
- 💾 存储高效（纯 JSON，无向量库）
- 🎯 精准匹配（基于 TOC 的层级检索）
- 🤖 智能理解（LLM 生成摘要和回答）

**适用场景：**
- 📚 电子书阅读助手
- 📖 文档问答系统
- 🔍 知识库检索
- 📝 内容摘要生成
