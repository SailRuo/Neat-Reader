# Qwen AI 功能使用指南

## 🎯 快速开始

### 1. 图像上传功能

**前端使用**（已集成在 ChatWindow 组件）：

```typescript
// 用户点击上传按钮
<input type="file" accept="image/*" @change="handleFileSelect" />

// 自动压缩并发送
const compressedBase64 = await compressImage(file);
await qwenAPI.chatStream(accessToken, '请描述这张图片', resourceUrl, [compressedBase64]);
```

**支持的图片格式**：JPG, PNG, GIF, WebP, BMP

**自动压缩**：
- 最大宽度：800px
- JPEG 质量：0.7
- 目标大小：< 500KB

### 2. 文件路径处理（新功能）

**API 调用**：

```javascript
// 处理单个或多个文件
const response = await axios.post('http://localhost:3001/api/qwen/chat-with-files', {
  access_token: 'your_token',
  message: '请分析这些文件',
  file_paths: [
    './src/main.js',      // 文本文件
    './assets/logo.png',  // 图像文件
    './docs/README.md'    // Markdown 文件
  ],
  resource_url: 'portal.qwen.ai'
});

console.log(response.data.response);
```

**支持的文件类型**：
- 📝 文本：.js, .ts, .vue, .py, .java, .md, .json, .txt
- 🖼️ 图像：.jpg, .png, .gif, .webp, .svg
- 📄 文档：.pdf, .doc, .docx
- 🎵 音频：.mp3, .wav, .ogg
- 🎬 视频：.mp4, .avi, .mov

## 📡 API 端点

### 图像上传 API

**POST /api/qwen/chat-stream**

```json
{
  "access_token": "your_token",
  "message": "请描述这张图片",
  "images": ["data:image/jpeg;base64,/9j/4AAQSkZJRg..."],
  "resource_url": "portal.qwen.ai"
}
```

### 文件处理 API

**POST /api/qwen/chat-with-files**

```json
{
  "access_token": "your_token",
  "message": "请分析这些文件",
  "file_paths": ["./file1.txt", "./image.jpg"],
  "resource_url": "portal.qwen.ai"
}
```

**POST /api/qwen/chat-with-files-stream** - 流式版本

## 🧪 测试

### 测试图像上传

```bash
export QWEN_ACCESS_TOKEN="your_token"
export QWEN_RESOURCE_URL="portal.qwen.ai"
cd backend
node test-image-upload.js
```

### 测试文件处理

```bash
export QWEN_ACCESS_TOKEN="your_token"
export QWEN_RESOURCE_URL="portal.qwen.ai"
cd backend
node test-file-processor.js
```

## 🔍 调试

### 前端日志

打开 Electron DevTools 查看：

```
📤 发送消息到 Qwen API {
  hasImages: true,
  imageCount: 1,
  firstImagePrefix: "data:image/jpeg;base64,..."
}
```

### 后端日志

查看终端输出：

```
[INFO] 发送多模态消息 { imageCount: 1 }
[INFO] 选择模型 { model: 'qwen3-coder-plus' }
[INFO] 开始调用 Qwen API（流式）
```

## 📚 详细文档

- **docs/QWEN_IMAGE_SUPPORT.md** - 图像上传完整说明
- **docs/FILE_PROCESSOR_FEATURE.md** - 文件处理功能详解
- **docs/IMPLEMENTATION_SUMMARY.md** - 实现总结
- **docs/QUICK_FIX_SUMMARY.md** - 快速修复参考

## 🎨 使用场景

### 场景 1：阅读辅助 + 图片理解

```typescript
// 用户在阅读时遇到图表
// 1. 截图上传
// 2. 询问："请解释这个图表的含义"
// 3. AI 结合书籍上下文回答
```

### 场景 2：代码分析

```javascript
// 分析项目文件
await chatWithFiles(token, '请分析这个项目的架构', [
  './src/main.js',
  './src/router.ts',
  './package.json'
], resourceUrl);
```

### 场景 3：文档理解

```javascript
// 分析 PDF 文档
await chatWithFiles(token, '请总结这份文档的要点', [
  './document.pdf'
], resourceUrl);
```

## ⚡ 性能提示

1. **图片压缩**：前端自动压缩，无需手动处理
2. **批量处理**：一次可处理多个文件
3. **流式响应**：使用 `-stream` 端点获得实时反馈
4. **错误处理**：单个文件失败不影响其他文件

## 🔐 安全注意

- ✅ 图像格式自动验证
- ✅ 文件类型自动检测
- ⚠️ 文件路径需要在服务器可访问范围内
- ⚠️ 建议添加文件大小限制

## 🆘 常见问题

**Q: 图片上传后没反应？**
A: 检查控制台日志，确认 token 有效，查看后端日志

**Q: 支持哪些图片格式？**
A: JPG, PNG, GIF, WebP, BMP, SVG

**Q: 文件太大怎么办？**
A: 前端会自动压缩图片到 < 500KB

**Q: 可以处理多少个文件？**
A: 理论上无限制，但建议一次不超过 10 个

**Q: 支持远程文件吗？**
A: 目前只支持本地文件路径，远程 URL 功能待开发

## 🚀 快速命令

```bash
# 启动开发环境
npm run dev

# 测试图像上传
cd backend && node test-image-upload.js

# 测试文件处理
cd backend && node test-file-processor.js

# 查看日志
# 前端：Electron DevTools Console
# 后端：终端输出
```

## 📞 获取帮助

查看详细文档：
- `docs/QWEN_IMAGE_SUPPORT.md`
- `docs/FILE_PROCESSOR_FEATURE.md`

---

**模型信息**：使用 `qwen3-coder-plus`，支持文本、代码和图像理解 ✅
