# 前端会话管理使用示例

## 快速开始

### 混合模式（默认推荐）

适用于 `BookAIChatPanel.vue` 和 `ChatWindow/index.vue`

**特点：**
- ✅ 前端 IndexedDB 快速展示
- ✅ 后端自动保存到百度网盘
- ✅ 启动时自动同步
- ✅ 最佳用户体验

```typescript
import { chatStream } from '@/api/qwen'
import { useEbookStore } from '@/stores/ebook'

const ebookStore = useEbookStore()

// 生成会话 ID（每本书一个会话）
const conversationId = `book_${bookId}`

// 获取历史记录（用于前端展示）
const conversation = ebookStore.getAIConversation(bookId)
const chatHistory = conversation.messages.map(msg => ({
  role: msg.role,
  content: msg.content
}))

// 发送消息（混合模式：前端展示 + 后端备份）
await chatStream(
  accessToken,
  userMessage,
  resourceUrl,
  undefined,  // images
  (chunk) => {
    // 实时更新 UI
    assistantMessage += chunk
  },
  chatHistory,     // ← 传递历史记录（前端管理）
  conversationId,  // ← 会话 ID（后端备份）
  true            // ← saveToBackend = true（默认，混合模式）
)

// 前端保存消息（用于快速展示）
await ebookStore.addAIMessage(bookId, {
  role: 'user',
  content: userMessage,
  timestamp: Date.now()
})

await ebookStore.addAIMessage(bookId, {
  role: 'assistant',
  content: assistantMessage,
  timestamp: Date.now()
})

// 后端会自动：
// - 保存到本地 JSON 文件
// - 退出时同步到百度网盘
```

### 方式 1：前端管理（不推荐，仅用于测试）

如果不需要后端备份：

```typescript
await chatStream(
  accessToken,
  userMessage,
  resourceUrl,
  undefined,
  (chunk) => { /* ... */ },
  chatHistory,  // 传递历史记录
  undefined,    // 不提供会话 ID
  false         // 禁用后端存储
)
```

### 方式 2：纯后端管理（不推荐，响应慢）

适用于需要跨设备同步的场景

```typescript
import { chatStream } from '@/api/qwen'
import { createConversation, getMessages } from '@/api/conversation'

// 1. 创建或获取会话 ID
const conversationId = `book_${bookId}_${Date.now()}`

// 2. 首次创建会话
await createConversation(conversationId, bookTitle, {
  book_id: bookId,
  book_title: bookTitle
})

// 3. 发送消息（后端自动管理历史）
await chatStream(
  accessToken,
  userMessage,
  resourceUrl,
  undefined,
  (chunk) => {
    assistantMessage += chunk
  },
  undefined,  // chatHistory（后端自动加载）
  conversationId,  // ← 会话 ID
  true        // ← saveToBackend = true
)

// 后端会自动：
// - 加载最近 20 条历史记录
// - 保存用户消息
// - 保存 AI 响应

// 4. 可选：从后端加载历史显示在 UI
const messages = await getMessages(conversationId)
```

## 修改现有组件（使用混合模式）

### 修改 BookAIChatPanel.vue

在 `sendMessage` 方法中（第 431 行）：

```typescript
// 生成会话 ID（每本书一个会话）
const conversationId = `book_${props.bookId}`

// 获取历史记录（用于前端快速展示）
const conversation = ebookStore.getAIConversation(props.bookId)
const chatHistory = conversation.messages.map(msg => ({
  role: msg.role,
  content: msg.content
}))

// 发送消息（混合模式）
await chatStream(
  accessToken,
  fullPrompt,
  resourceUrl,
  undefined,
  (chunk) => {
    // 实时更新 UI
    const conversation = ebookStore.getAIConversation(props.bookId)
    const lastMsg = conversation.messages[conversation.messages.length - 1]
    if (lastMsg?.role === 'assistant') {
      lastMsg.content += chunk
    }
  },
  chatHistory,     // ← 传递历史记录
  conversationId,  // ← 会话 ID
  true            // ← 混合模式（默认）
)

// 前端保存（用于快速展示）
await ebookStore.saveAIConversations()

// 后端会自动保存到百度网盘
```

### 修改 ChatWindow/index.vue

在 `sendMessage` 方法中（第 266 行）：

```typescript
// 生成会话 ID（全局助手）
const conversationId = `global_${currentConversationId.value}`

// 获取历史记录
const chatHistory = currentMessages.value.map(msg => ({
  role: msg.role,
  content: msg.content
}))

// 发送消息（混合模式）
await qwenAPI.chatStream(
  accessToken,
  fullPrompt,
  resourceUrl,
  undefined,
  (chunk) => {
    conv.messages[aiMessageIndex].content += chunk
    scrollToBottom()
  },
  chatHistory,     // ← 传递历史记录
  conversationId,  // ← 会话 ID
  true            // ← 混合模式（默认）
)

// 前端保存到 localStorage
updateConversation()

// 后端会自动保存到百度网盘
```

## 完整示例：启用后端存储

### 步骤 1：修改 BookAIChatPanel.vue

```typescript
<script setup lang="ts">
import { chatStream } from '@/api/qwen'
import { createConversation } from '@/api/conversation'
import { useEbookStore } from '@/stores/ebook'

const props = defineProps<{
  bookId: string
  bookTitle: string
  // ...
}>()

// 生成会话 ID（每本书一个会话）
const conversationId = computed(() => `book_${props.bookId}`)

// 初始化会话（组件挂载时）
onMounted(async () => {
  try {
    // 尝试创建会话（如果已存在会返回错误，忽略即可）
    await createConversation(
      conversationId.value,
      props.bookTitle,
      {
        book_id: props.bookId,
        book_title: props.bookTitle
      }
    )
  } catch (error) {
    // 会话已存在，忽略错误
    console.log('会话已存在或创建失败:', error)
  }
})

// 发送消息
const sendMessage = async (text: string) => {
  // ... 验证 token 等

  try {
    let assistantMessage = ''
    
    // 使用后端会话管理
    await chatStream(
      accessToken,
      text,
      resourceUrl,
      undefined,
      (chunk) => {
        assistantMessage += chunk
        // 实时更新 UI
        const conversation = ebookStore.getAIConversation(props.bookId)
        const lastMsg = conversation.messages[conversation.messages.length - 1]
        if (lastMsg?.role === 'assistant') {
          lastMsg.content = assistantMessage
          lastMsg.isStreaming = true
        }
      },
      undefined,  // 不传历史，后端自动加载
      conversationId.value,  // 会话 ID
      true  // 启用后端存储
    )
    
    // 流式完成后，同步到前端 store（用于 UI 显示）
    const conversation = ebookStore.getAIConversation(props.bookId)
    const lastMsg = conversation.messages[conversation.messages.length - 1]
    if (lastMsg?.role === 'assistant') {
      lastMsg.isStreaming = false
      await ebookStore.saveAIConversations()
    }
    
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}
</script>
```

### 步骤 2：修改 ChatWindow/index.vue

```typescript
<script setup lang="ts">
import * as qwenAPI from '../../api/qwen'
import * as conversationAPI from '../../api/conversation'

// 创建新对话时，同时在后端创建
const createNewConversation = async () => {
  const newConv: Conversation = {
    id: Date.now().toString(),
    title: `对话 ${conversations.value.length + 1}`,
    messages: [],
    lastMessage: '开始新对话...',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isLoading: false
  }
  
  conversations.value.unshift(newConv)
  currentConversationId.value = newConv.id
  saveConversations()
  
  // 同时在后端创建
  try {
    await conversationAPI.createConversation(
      `global_${newConv.id}`,
      newConv.title
    )
  } catch (error) {
    console.error('后端创建会话失败:', error)
  }
}

// 发送消息时使用后端存储
const sendMessage = async () => {
  // ... 验证等

  try {
    let assistantMessage = ''
    
    await qwenAPI.chatStream(
      accessToken,
      userMessage,
      resourceUrl,
      undefined,
      (chunk) => {
        assistantMessage += chunk
        conv.messages[aiMessageIndex].content += chunk
        scrollToBottom()
      },
      undefined,  // 不传历史，后端自动加载
      `global_${currentConversationId.value}`,  // 会话 ID
      true  // 启用后端存储
    )
    
    updateConversation()
    
  } catch (error) {
    console.error('发送消息失败:', error)
  } finally {
    conv.isLoading = false
    isLoading.value = false
  }
}
</script>
```

## 测试验证

### 测试 1：验证历史记录传递

```typescript
// 在浏览器控制台
console.log('发送前的历史记录:', chatHistory)

// 发送消息后，检查后端日志
// 应该看到：消息历史长度: X (包含系统提示词)
```

### 测试 2：验证后端存储

```bash
# 检查会话文件
ls -la python-backend/data/conversations/

# 查看会话内容
cat python-backend/data/conversations/book_123_*.json
```

### 测试 3：验证会话恢复

```typescript
// 刷新页面后
const messages = await getMessages(conversationId)
console.log('从后端加载的历史:', messages)
```

## 常见问题

### Q1: 为什么 AI 还是记不住之前的对话？

A: 检查以下几点：
1. 确保传递了 `chatHistory` 参数
2. 检查 `chatHistory` 格式是否正确（必须包含 `role` 和 `content`）
3. 查看后端日志，确认历史记录长度

### Q2: 如何在前端和后端之间切换？

A: 修改 `saveToBackend` 参数：
- `false`: 前端管理（默认）
- `true`: 后端管理

### Q3: 后端存储会影响性能吗？

A: 不会。后端会话管理是异步的，不会阻塞前端响应。

### Q4: 如何清理旧会话？

A:
```typescript
import { clearOldConversations } from '@/api/conversation'

// 清理 30 天前的会话
const deletedCount = await clearOldConversations(30)
console.log(`已清理 ${deletedCount} 个旧会话`)
```

## 下一步

1. 修改 `BookAIChatPanel.vue` 传递历史记录
2. 修改 `ChatWindow/index.vue` 传递历史记录
3. 测试验证功能
4. 可选：启用后端存储
5. 可选：添加会话列表 UI
