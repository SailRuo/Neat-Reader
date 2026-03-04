# 前端迁移指南

## 📋 概述

前端已从 IndexedDB (localforage) 迁移到后端 API (SQLite3)。

---

## 🔄 迁移流程

### 自动迁移

访问 `/migration` 页面，点击"开始迁移"按钮，系统会自动：

1. 从 IndexedDB 读取书籍、分类、进度数据
2. 上传到后端 API
3. 保存到 SQLite 数据库

### 手动迁移

```typescript
import { migrateAll } from '@/utils/storeMigration'

// 执行迁移
const result = await migrateAll((progress) => {
  console.log(progress.message)
})

console.log(result.summary)
```

---

## 📚 新 API 使用方式

### 1. 上传书籍

**旧代码（IndexedDB）：**

```typescript
import localforage from 'localforage'

const arrayBuffer = await file.arrayBuffer()
await localforage.setItem(`ebook_content_${id}`, arrayBuffer)
```

**新代码（API）：**

```typescript
import { uploadBook } from '@/api/books'

const result = await uploadBook({
  file: file,
  title: '书名',
  author: '作者',
  category_id: 'category-id'
})

console.log('书籍 ID:', result.book_id)
```

### 2. 获取书籍列表

**旧代码：**

```typescript
const books = await localforage.getItem<EbookMetadata[]>('books')
```

**新代码：**

```typescript
import { listBooks } from '@/api/books'

const { books } = await listBooks({
  category_id: 'optional-category-id',
  limit: 100,
  offset: 0
})
```

### 3. 获取书籍内容

**旧代码：**

```typescript
const content = await localforage.getItem<ArrayBuffer>(`ebook_content_${bookId}`)
```

**新代码：**

```typescript
import { getBookContent } from '@/api/books'

const content = await getBookContent(bookId)
// 返回 ArrayBuffer
```

### 4. 保存阅读进度

**旧代码：**

```typescript
await localforage.setItem(`progress_${ebookId}`, progress)
```

**新代码：**

```typescript
import { saveProgress } from '@/api/books'

await saveProgress({
  ebook_id: ebookId,
  chapter_index: 5,
  position: 0.5,
  cfi: 'epubcfi(...)',
  device_id: 'device-1',
  device_name: '我的设备'
})
```

### 5. 创建注释

**新功能（之前没有）：**

```typescript
import { createAnnotation } from '@/api/books'

await createAnnotation({
  book_id: bookId,
  cfi: 'epubcfi(...)',
  text: '选中的文本',
  note: '我的笔记',
  color: '#ffeb3b'
})
```

---

## 🎯 PageIndex 构建

### 自动构建

上传 EPUB 书籍时，后端会自动构建 PageIndex：

```typescript
const result = await uploadBook({ file })

// result.pageindex 包含构建结果
if (result.pageindex) {
  console.log('PageIndex 已构建:', result.pageindex.chunk_count, '个片段')
}
```

### 手动构建（如果需要）

```typescript
import { buildPageIndex } from '@/api/pageindex'

await buildPageIndex(bookId, file)
```

### 查询 PageIndex

```typescript
import { answerPageIndex } from '@/api/pageindex'

const result = await answerPageIndex({
  book_id: bookId,
  query: '这本书讲了什么？',
  access_token: qwenToken,
  top_k: 5
})

console.log('AI 回答:', result.answer)
console.log('引用片段:', result.hits)
```

---

## 🔧 Store 更新

### Pinia Store 保持不变

Pinia Store 仍然用于状态管理，只是底层存储从 IndexedDB 改为 API：

```typescript
// stores/ebook.ts
import { uploadBook, listBooks } from '@/api/books'

export const useEbookStore = defineStore('ebook', () => {
  const books = ref<Book[]>([])

  // 加载书籍列表
  async function loadBooks() {
    const result = await listBooks()
    books.value = result.books
  }

  // 添加书籍
  async function addBook(file: File) {
    const result = await uploadBook({ file })
    await loadBooks() // 重新加载列表
    return result.book_id
  }

  return { books, loadBooks, addBook }
})
```

---

## 📦 依赖变化

### 可以移除的依赖

```bash
npm uninstall localforage
```

### 新增的 API 文件

- `frontend/src/api/books.ts` - 书籍管理 API
- `frontend/src/utils/storeMigration.ts` - 迁移工具
- `frontend/src/pages/Migration/index.vue` - 迁移页面

---

## ⚠️ 注意事项

### 1. 数据备份

迁移前建议备份 IndexedDB 数据：

```typescript
// 在浏览器控制台执行
const books = await localforage.getItem('books')
console.log(JSON.stringify(books))
// 复制输出内容保存
```

### 2. 迁移后清理

迁移成功后，可以清理 IndexedDB：

```typescript
import { cleanupIndexedDB } from '@/utils/storeMigration'

await cleanupIndexedDB()
```

### 3. 兼容性

- 旧版本数据会自动迁移
- 迁移过程中不影响使用
- 可以随时重新迁移

---

## 🐛 故障排查

### 问题 1：上传失败

**错误：** `Network Error` 或 `500 Internal Server Error`

**解决：**
1. 确认后端服务已启动
2. 检查文件大小（建议 < 100MB）
3. 查看后端日志

### 问题 2：迁移卡住

**解决：**
1. 刷新页面重试
2. 检查浏览器控制台错误
3. 手动迁移单个书籍

### 问题 3：书籍内容无法加载

**解决：**
1. 检查书籍是否已上传
2. 确认 book_id 正确
3. 查看网络请求状态

---

## 📚 完整示例

### 完整的书籍导入流程

```typescript
import { uploadBook } from '@/api/books'
import { buildPageIndex } from '@/api/pageindex'

async function importBook(file: File) {
  try {
    // 1. 上传书籍
    console.log('正在上传书籍...')
    const result = await uploadBook({
      file,
      title: file.name.replace(/\.[^/.]+$/, ''),
      author: '未知作者'
    })

    const bookId = result.book_id
    console.log('✅ 书籍上传成功:', bookId)

    // 2. PageIndex 已自动构建
    if (result.pageindex) {
      console.log('✅ PageIndex 已构建:', result.pageindex.chunk_count, '个片段')
    }

    // 3. 更新 Store
    await ebookStore.loadBooks()

    return bookId

  } catch (error) {
    console.error('❌ 导入失败:', error)
    throw error
  }
}
```

---

## 🎉 迁移完成

迁移完成后，你的应用将：

- ✅ 使用 SQLite 数据库存储元数据
- ✅ 书籍文件存储在后端文件系统
- ✅ 支持跨设备同步（只需同步数据库文件）
- ✅ 更好的性能和可靠性
- ✅ 自动构建 PageIndex（EPUB）
