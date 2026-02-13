# Electron 崩溃诊断指南

## 常见崩溃原因

### 1. 内存泄漏
**症状：** 使用一段时间后崩溃，内存占用持续增长

**检查点：**
- EPUB/PDF 渲染后是否正确销毁实例
- 事件监听器是否正确移除
- IndexedDB 连接是否关闭

**修复：**
```typescript
// 在组件 onUnmounted 中清理
onUnmounted(() => {
  if (book) {
    book.destroy()
  }
  // 移除事件监听
  rendition?.off('relocated')
})
```

### 2. IPC 通信问题
**症状：** 特定操作后崩溃（如文件选择、读取）

**检查：**
```bash
# 启用 Electron 调试日志
set ELECTRON_ENABLE_LOGGING=1
npm run dev
```

### 3. WebView/iframe 内存问题
**症状：** 打开多本书或频繁切换后崩溃

**修复：**
- 限制同时打开的书籍数量
- 实现虚拟滚动
- 使用 `will-navigate` 事件控制 iframe 行为

### 4. 原生模块冲突
**症状：** 启动时崩溃或特定功能崩溃

**检查：**
```bash
# 重新编译原生模块
npm run rebuild
# 或
cd frontend && npm rebuild
cd ../backend && npm rebuild
```

### 5. GPU 加速问题
**症状：** 渲染时崩溃，特别是 PDF

**临时禁用测试：**
```javascript
// electron/main.js
const win = new BrowserWindow({
  webPreferences: {
    // ...
    disableHardwareAcceleration: true  // 测试用
  }
})
```

## 诊断步骤

1. **收集崩溃日志：**
   - Windows: `%APPDATA%\Neat Reader\logs\`
   - macOS: `~/Library/Logs/Neat Reader/`
   - Linux: `~/.config/Neat Reader/logs/`

2. **启用详细日志：**
```javascript
// electron/main.js 顶部添加
app.commandLine.appendSwitch('enable-logging')
app.commandLine.appendSwitch('v', '1')
```

3. **监控内存：**
```javascript
// 添加内存监控
setInterval(() => {
  const memoryUsage = process.memoryUsage()
  console.log('Memory:', {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
  })
}, 30000)
```

4. **测试场景：**
   - 打开单本 EPUB → 崩溃？
   - 打开单本 PDF → 崩溃？
   - 连续打开 5 本书 → 崩溃？
   - 使用 AI 功能 → 崩溃？
   - 长时间阅读（1小时+）→ 崩溃？

## 快速修复建议

### 修复 1：EPUB 实例清理
```typescript
// frontend/src/pages/Reader/components/EpubReader.vue
import { onUnmounted } from 'vue'

onUnmounted(() => {
  if (rendition) {
    rendition.destroy()
  }
  if (book) {
    book.destroy()
  }
})
```

### 修复 2：限制并发渲染
```typescript
// frontend/src/stores/ebook.ts
const MAX_OPEN_BOOKS = 3

actions: {
  openBook(bookId: string) {
    if (this.openBooks.length >= MAX_OPEN_BOOKS) {
      // 关闭最旧的书
      this.closeBook(this.openBooks[0])
    }
    // ...
  }
}
```

### 修复 3：PDF.js Worker 配置
```typescript
// frontend/src/pages/Reader/components/PdfReader.vue
import * as pdfjsLib from 'pdfjs-dist'

// 确保 worker 正确配置
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()
```

### 修复 4：Electron 版本升级
```bash
# 检查当前版本
npm list electron

# 升级到最新稳定版
npm install electron@latest --save-dev
```
