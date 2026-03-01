# 快速开始指南

## 第一步：安装依赖

### Windows

```cmd
cd python-backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### macOS/Linux

```bash
cd python-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 第二步：启动服务器

### 方式 1：使用启动脚本（推荐）

**Windows:**
```cmd
start.bat
```

**macOS/Linux:**
```bash
chmod +x start.sh
./start.sh
```

### 方式 2：直接运行

```bash
python main.py
```

服务器将在 `http://127.0.0.1:3002` 启动。

## 第三步：验证 Qwen API 集成

### 方式 1：快速测试（推荐）

```bash
python test_simple.py
```

这会测试 Python 后端是否正常运行，并显示如何获取 token。

### 方式 2：完整测试（需要前端授权）

**前提条件：**
1. Neat Reader 前端已启动（`npm run dev`）
2. 已在前端完成 Qwen AI 授权

**步骤：**

1. **从前端获取 token（自动）：**
   ```bash
   python test_qwen_from_frontend.py
   ```
   
   脚本会引导你：
   - 打开前端（http://localhost:5173）
   - 打开浏览器开发者工具（F12）
   - 在 Console 中运行命令获取 token
   - 粘贴 token 到脚本

2. **手动测试（如果你已有 token）：**
   ```bash
   python test_qwen_api.py <access_token> <resource_url>
   ```
   
   示例：
   ```bash
   python test_qwen_api.py eyJhbGc... portal.qwen.ai
   ```

### 如何从前端获取 token？

1. 打开 Neat Reader 前端（http://localhost:5173）
2. 确保已在设置中完成 Qwen AI 授权
3. 打开浏览器开发者工具（F12）
4. 进入 Console 标签
5. 运行以下命令：

```javascript
// 获取 access_token
localStorage.getItem('qwen_access_token')

// 获取 resource_url
localStorage.getItem('qwen_resource_url')
```

6. 复制输出的值，用于测试

### 3. 查看测试结果

**快速测试（test_simple.py）：**
- ✅ 健康检查
- 📝 显示如何获取 token 的说明

**完整测试（test_qwen_from_frontend.py）：**
- 引导你从前端获取 token
- 自动测试 Qwen API 连接

**手动测试（test_qwen_api.py）：**
测试脚本将运行 6 个测试：

1. ✅ 健康检查
2. ✅ Qwen API 连接测试（非流式）
3. ✅ Qwen 对话（非流式）
4. ✅ Qwen 流式响应（SSE）
5. ✅ 长文本输入测试
6. ✅ 错误处理（无效 Token）

如果所有测试通过，说明 Qwen API 集成验证成功！

## 第四步：手动测试 API

### 使用 curl

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

### 使用 Postman

1. 导入 API 端点：`http://127.0.0.1:3002`
2. 创建 POST 请求到 `/api/qwen/test`
3. 设置 Body（JSON）：
   ```json
   {
     "access_token": "your_token",
     "resource_url": "portal.qwen.ai"
   }
   ```
4. 发送请求

### 使用 Python

```python
import requests

response = requests.post(
    "http://127.0.0.1:3002/api/qwen/test",
    json={
        "access_token": "your_token",
        "resource_url": "portal.qwen.ai"
    }
)

print(response.json())
```

## 常见问题

### Q: 端口 3002 被占用

**A:** 修改 `.env` 文件中的 `PORT` 配置：

```env
PORT=3003
```

### Q: 找不到 Python

**A:** 确保 Python 3.8+ 已安装并在 PATH 中：

```bash
python --version
# 或
python3 --version
```

### Q: pip 安装依赖失败

**A:** 尝试使用国内镜像：

```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### Q: Qwen API 调用失败（401）

**A:** 检查 access_token 是否有效：

1. Token 可能已过期，需要重新授权
2. 确保 resource_url 正确
3. 检查网络连接

### Q: 如何查看日志

**A:** 日志会输出到控制台，级别可在 `.env` 中配置：

```env
LOG_LEVEL=DEBUG  # DEBUG, INFO, WARNING, ERROR
```

## 下一步

- [ ] 实现 EPUB 解析模块
- [ ] 实现 PageIndex 树结构构建
- [ ] 实现树搜索检索
- [ ] 实现 RAG 生成管道
- [ ] 前端集成

## 需要帮助？

查看完整文档：[README.md](README.md)
