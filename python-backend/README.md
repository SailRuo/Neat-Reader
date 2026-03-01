# Python Backend for PageIndex RAG

基于 PageIndex 框架的无向量 RAG 后端服务，用于 Neat Reader 的深度 AI 集成验证。

## 功能特性

- ✅ **Qwen API 集成**：使用 OpenAI SDK 调用 Qwen API
- ✅ **流式响应**：支持 SSE（Server-Sent Events）
- 🚧 **EPUB 解析**：提取章节结构和内容（开发中）
- 🚧 **PageIndex 构建**：生成树形索引结构（开发中）
- 🚧 **树搜索检索**：基于推理的检索（开发中）
- 🚧 **RAG 生成**：增强检索生成（开发中）

## 技术栈

- **FastAPI** - 现代异步 Web 框架
- **OpenAI SDK** - Qwen API 调用（兼容格式）
- **ebooklib** - EPUB 解析
- **loguru** - 日志管理

## 快速开始

### 1. 安装依赖

```bash
cd python-backend
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件（可选）
```

### 3. 启动服务器

```bash
python main.py
```

服务器将在 `http://127.0.0.1:3002` 启动。

## API 端点

### 健康检查

```bash
GET /api/health
```

### Qwen API 测试

**测试连接（非流式）：**
```bash
POST /api/qwen/test
Content-Type: application/json

{
  "access_token": "your_access_token",
  "resource_url": "portal.qwen.ai",
  "message": "你好"
}
```

**对话（非流式）：**
```bash
POST /api/qwen/chat
Content-Type: application/json

{
  "access_token": "your_access_token",
  "resource_url": "portal.qwen.ai",
  "messages": [
    {"role": "user", "content": "你好"}
  ],
  "model": "qwen3-coder-plus"
}
```

**对话（流式）：**
```bash
POST /api/qwen/chat-stream
Content-Type: application/json

{
  "access_token": "your_access_token",
  "resource_url": "portal.qwen.ai",
  "messages": [
    {"role": "user", "content": "你好"}
  ]
}
```

**长文本测试：**
```bash
POST /api/qwen/test-long-context
Content-Type: application/json

{
  "access_token": "your_access_token",
  "resource_url": "portal.qwen.ai",
  "messages": [
    {"role": "user", "content": "很长的文本..."}
  ]
}
```

### PageIndex（开发中）

```bash
# 构建 PageIndex
POST /api/pageindex/build

# 查询
POST /api/pageindex/query

# 获取树结构
GET /api/pageindex/tree/{book_id}

# 获取状态
GET /api/pageindex/status/{book_id}

# 删除
DELETE /api/pageindex/{book_id}
```

## 开发计划

### 阶段 1：Qwen API 验证 ✅
- [x] FastAPI 基础架构
- [x] Qwen API 客户端（OpenAI SDK）
- [x] 非流式响应
- [x] 流式响应（SSE）
- [x] 错误处理
- [x] 长文本测试

### 阶段 2：EPUB 解析 🚧
- [ ] EPUB 文件解析
- [ ] 章节结构提取
- [ ] 文本内容提取
- [ ] HTML 标签处理

### 阶段 3：PageIndex 构建 🚧
- [ ] 树结构生成
- [ ] 章节摘要生成
- [ ] 页码映射
- [ ] 缓存管理

### 阶段 4：树搜索检索 🚧
- [ ] 树搜索算法
- [ ] 基于推理的检索
- [ ] 相关章节定位

### 阶段 5：RAG 生成 🚧
- [ ] 增强提示词构建
- [ ] RAG 生成管道
- [ ] 引用溯源

## 测试

### 使用 curl 测试

```bash
# 健康检查
curl http://127.0.0.1:3002/api/health

# Qwen API 测试
curl -X POST http://127.0.0.1:3002/api/qwen/test \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "your_token",
    "resource_url": "portal.qwen.ai"
  }'
```

### 使用 Python 测试

```python
import requests

# 测试 Qwen API
response = requests.post(
    "http://127.0.0.1:3002/api/qwen/test",
    json={
        "access_token": "your_token",
        "resource_url": "portal.qwen.ai"
    }
)
print(response.json())
```

## 项目结构

```
python-backend/
├── main.py                 # 入口文件
├── requirements.txt        # 依赖
├── .env.example           # 环境变量示例
├── app/
│   ├── __init__.py
│   ├── config.py          # 配置管理
│   ├── routes/            # 路由
│   │   ├── health.py      # 健康检查
│   │   ├── qwen.py        # Qwen API
│   │   └── pageindex.py   # PageIndex
│   └── services/          # 服务
│       └── qwen_client.py # Qwen 客户端
└── cache/                 # 缓存目录
    └── pageindex/         # PageIndex 缓存
```

## 与现有系统集成

### 架构

```
前端 Vue 3 (端口 5173)
  ↓ (access_token, resource_url)
Node.js Express (端口 3001) - 现有后端
  ↓
Python FastAPI (端口 3002) - 新后端
  ↓ (OpenAI SDK)
Qwen API
```

### 集成方式

1. **前端**：从现有 Qwen 设置获取 `access_token` 和 `resource_url`
2. **调用**：前端直接调用 Python 后端 API
3. **认证**：Python 后端使用前端传递的 token
4. **响应**：返回 PageIndex 结果或 RAG 答案

## 注意事项

- Python 后端与 Node.js 后端独立运行（不同端口）
- 验证阶段复用现有 OAuth 认证（无需重新实现）
- PageIndex 树结构缓存在本地文件系统
- 生产环境需要考虑进程管理和部署方案

## License

MIT
