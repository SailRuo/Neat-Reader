<template>
  <div class="ai-chat-panel" :class="{ 'is-open': isOpen }">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-title">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>AI 助手</span>
      </div>
      <button class="close-btn" @click="handleClose" title="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- 消息列表 -->
    <div class="messages-container" ref="messagesRef">
      <div v-if="messages.length === 0" class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
        <p>选中文本后点击"问 AI"开始对话</p>
        <p class="hint">AI 已了解当前书籍内容</p>
      </div>

      <div
        v-for="(message, index) in messages"
        :key="index"
        class="message"
        :class="message.role"
      >
        <div class="message-avatar">
          <svg v-if="message.role === 'user'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
        </div>
        <div class="message-content">
          <div class="message-text">{{ message.content }}</div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="isLoading" class="message assistant">
        <div class="message-avatar">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
        </div>
        <div class="message-content">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入框 -->
    <div class="input-container">
      <textarea
        ref="inputRef"
        v-model="inputText"
        class="input-textarea"
        placeholder="输入消息..."
        rows="1"
        @keydown.enter.exact.prevent="handleSend"
        @input="adjustTextareaHeight"
      ></textarea>
      <button
        class="send-btn"
        :disabled="!inputText.trim() || isLoading"
        @click="handleSend"
        title="发送"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { chatStream } from '@/api/ai'
import { useEbookStore } from '@/stores/ebook'
import { useAICredentials } from '@/composables/useAICredentials'

// Props
const props = defineProps<{
  isOpen: boolean
  bookId: string
  bookTitle: string
  initialQuestion?: string
}>()

// Emits
const emit = defineEmits<{
  close: []
}>()

// 状态
const ebookStore = useEbookStore()
const aiCreds = useAICredentials()
const messages = ref<Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>>([])
const inputText = ref('')
const isLoading = ref(false)
const messagesRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)

// 书籍上下文（异步加载）
const bookContext = ref('')
const isContextLoaded = ref(false)

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 调整输入框高度
const adjustTextareaHeight = () => {
  if (!inputRef.value) return
  inputRef.value.style.height = 'auto'
  inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 120) + 'px'
}

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

// 加载书籍上下文
const loadBookContext = async () => {
  try {
    console.log('📚 [AI] 开始加载书籍上下文:', props.bookTitle)
    
    // 从 IndexedDB 获取书籍内容
    const localforage = (await import('localforage')).default
    const content = await localforage.getItem<ArrayBuffer>(`ebook_content_${props.bookId}`)
    
    if (!content) {
      console.warn('⚠️ [AI] 无法获取书籍内容')
      bookContext.value = `书名：${props.bookTitle}`
      isContextLoaded.value = true
      return
    }

    // 提取文本内容（简化版，只提取前 5000 字作为上下文）
    const book = ebookStore.getBookById(props.bookId)
    if (book?.format === 'epub') {
      try {
        const ePub = (await import('epubjs')).default
        const epubBook = ePub(content as ArrayBuffer)
        await new Promise((resolve, reject) => {
          epubBook.ready.then(resolve).catch(reject)
        })

        // 获取书籍元数据
        const metadata = await epubBook.loaded.metadata
        let contextText = `书名：${metadata.title || props.bookTitle}\n`
        contextText += `作者：${metadata.creator || '未知'}\n\n`

        // 提取前几章内容作为上下文
        const spine = await epubBook.loaded.spine
        let extractedText = ''
        let chapterCount = 0
        const maxChapters = 3 // 只提取前3章
        const maxLength = 5000 // 最多5000字

        for (const item of spine.items) {
          if (chapterCount >= maxChapters || extractedText.length >= maxLength) break
          
          try {
            const doc = await item.load(epubBook.load.bind(epubBook))
            const text = doc.body?.textContent || ''
            extractedText += text.substring(0, maxLength - extractedText.length) + '\n\n'
            chapterCount++
          } catch (e) {
            console.warn('⚠️ [AI] 提取章节失败:', e)
          }
        }

        contextText += `内容摘要（前${chapterCount}章）：\n${extractedText.substring(0, maxLength)}`
        bookContext.value = contextText
        console.log('✅ [AI] 书籍上下文加载完成，长度:', contextText.length)
      } catch (e) {
        console.warn('⚠️ [AI] EPUB 解析失败:', e)
        bookContext.value = `书名：${props.bookTitle}`
      }
    } else {
      // 其他格式暂时只使用书名
      bookContext.value = `书名：${props.bookTitle}`
    }

    isContextLoaded.value = true
  } catch (error) {
    console.error('❌ [AI] 加载书籍上下文失败:', error)
    bookContext.value = `书名：${props.bookTitle}`
    isContextLoaded.value = true
  }
}

// 发送消息
const handleSend = async () => {
  const text = inputText.value.trim()
  if (!text || isLoading.value) return

  console.log('🚀 [AI] 开始发送消息:', text.substring(0, 50))

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: text,
    timestamp: Date.now()
  })

  inputText.value = ''
  adjustTextareaHeight()
  scrollToBottom()

  // 调用 AI
  isLoading.value = true
  let assistantMessage = ''

  try {
    // 检查 Qwen 配置（注意：Qwen token 也存储在 baidupan 配置中）
    console.log('🔍 [AI] 检查配置:', {
      hasBaidupan: !!ebookStore.userConfig.storage.baidupan,
      hasAccessToken: !!ebookStore.userConfig.storage.baidupan?.accessToken,
      hasResourceUrl: !!ebookStore.userConfig.storage.baidupan?.resource_url
    })

    const qwenConfig = ebookStore.userConfig.storage.baidupan
    const aiCreds = useAICredentials()
    if (!aiCreds.hasCredentials.value) {
      throw new Error('请先在设置中完成 AI 授权或配置自定义 API。')
    }

    console.log('✅ [AI] 配置检查通过')
    console.log('🔑 [AI] Token 前缀:', qwenConfig.accessToken.substring(0, 20) + '...')
    console.log('🌐 [AI] Resource URL:', qwenConfig.resource_url || '(未设置)')

    // 构建完整的提示词（包含书籍上下文）
    let fullPrompt = text
    if (isContextLoaded.value && bookContext.value) {
      fullPrompt = `你是一个阅读助手，正在帮助用户理解这本书：\n\n${bookContext.value}\n\n用户问题：${text}\n\n请基于书籍内容回答用户的问题。`
      console.log('📖 [AI] 使用书籍上下文，长度:', bookContext.value.length)
    } else {
      console.log('⚠️ [AI] 未使用书籍上下文')
    }

    console.log('🌐 [AI] 开始调用 API...')

    // 流式调用 AI
    await chatStream(
      qwenConfig.accessToken,
      fullPrompt,
      qwenConfig.resource_url,
      (chunk) => {
        assistantMessage += chunk
        
        // 更新最后一条消息（如果存在）
        if (messages.value[messages.value.length - 1]?.role === 'assistant') {
          messages.value[messages.value.length - 1].content = assistantMessage
        } else {
          messages.value.push({
            role: 'assistant',
            content: assistantMessage,
            timestamp: Date.now()
          })
        }
        
        scrollToBottom()
      }
    )

    console.log('✅ [AI] API 调用成功，响应长度:', assistantMessage.length)

    // 确保有完整的助手消息
    if (!assistantMessage) {
      throw new Error('AI 未返回响应')
    }

  } catch (error) {
    console.error('❌ [AI] 对话失败:', error)
    
    // 更友好的错误提示
    let errorMessage = '未知错误'
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        errorMessage = 'Token 已过期或无效，请在设置中重新授权 AI'
      } else if (error.message.includes('403')) {
        errorMessage = '没有权限访问该 API，请检查 AI 配置'
      } else if (error.message.includes('429')) {
        errorMessage = 'API 调用频率超限，请稍后再试'
      } else if (error.message.includes('500')) {
        errorMessage = 'Qwen 服务器错误，请稍后再试'
      } else {
        errorMessage = error.message
      }
    }
    
    messages.value.push({
      role: 'assistant',
      content: `抱歉，AI 对话失败：${errorMessage}`,
      timestamp: Date.now()
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// 处理初始问题
const handleInitialQuestion = async () => {
  if (props.initialQuestion) {
    inputText.value = props.initialQuestion
    await nextTick()
    handleSend()
  }
}

// 关闭面板
const handleClose = () => {
  emit('close')
}

// 监听打开状态
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    // 异步加载书籍上下文
    if (!isContextLoaded.value) {
      loadBookContext()
    }
    
    // 处理初始问题
    await nextTick()
    handleInitialQuestion()
    
    // 聚焦输入框
    inputRef.value?.focus()
  }
})

// 组件挂载时加载上下文
onMounted(() => {
  if (props.isOpen) {
    loadBookContext()
  }
})
</script>

<style scoped>
.ai-chat-panel {
  position: fixed;
  right: -400px;
  top: 0;
  bottom: 0;
  width: 400px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 9999;
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-chat-panel.is-open {
  right: 0;
}

/* 深色主题支持 */
.theme-dark .ai-chat-panel {
  background: rgba(26, 26, 26, 0.98);
  color: #e8e8e8;
}

.theme-sepia .ai-chat-panel {
  background: rgba(244, 236, 216, 0.98);
  color: #3d2817;
}

.theme-green .ai-chat-panel {
  background: rgba(232, 245, 233, 0.98);
  color: #1b4d2e;
}

/* 头部 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.theme-dark .panel-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.header-title .icon {
  width: 20px;
  height: 20px;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: inherit;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.theme-dark .close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

/* 消息容器 */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #999;
  padding: 40px 20px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 8px 0;
  font-size: 14px;
  line-height: 1.5;
}

.hint {
  font-size: 12px;
  color: #4a90e2;
}

/* 消息 */
.message {
  display: flex;
  gap: 12px;
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
}

.theme-dark .message-avatar {
  background: #333;
}

.message.user .message-avatar {
  background: #4a90e2;
  color: white;
}

.message.assistant .message-avatar {
  background: #10b981;
  color: white;
}

.message-avatar svg {
  width: 18px;
  height: 18px;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-text {
  background: #f5f5f5;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.theme-dark .message-text {
  background: #2a2a2a;
}

.message.user .message-text {
  background: #4a90e2;
  color: white;
}

.message-time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  padding-left: 4px;
}

/* 输入中动画 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 10px 14px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-8px);
  }
}

/* 输入框 */
.input-container {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.5);
}

.theme-dark .input-container {
  border-top-color: rgba(255, 255, 255, 0.1);
  background: rgba(26, 26, 26, 0.5);
}

.input-textarea {
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  background: white;
  color: inherit;
  font-family: inherit;
}

.theme-dark .input-textarea {
  background: #2a2a2a;
  border-color: rgba(255, 255, 255, 0.1);
}

.input-textarea:focus {
  outline: none;
  border-color: #4a90e2;
}

.send-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4a90e2;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #357abd;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn svg {
  width: 20px;
  height: 20px;
}
</style>
