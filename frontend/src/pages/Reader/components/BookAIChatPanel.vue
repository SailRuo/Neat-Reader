<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="book-ai-chat-overlay" @click="handleOverlayClick">
        <div class="book-ai-chat-panel" :class="{ 'is-open': isOpen }" @click.stop>
          <!-- 头部 -->
          <div class="panel-header">
            <div class="header-title">
              <div class="title-icon">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div class="title-info">
                <span class="title">AI 阅读助手</span>
                <span class="book-name">{{ bookTitle }}</span>
              </div>
            </div>
            <div class="header-actions">
              <button class="action-btn" @click="handleExport" title="导出对话">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
              <button class="action-btn" @click="handleClearHistory" title="清空对话">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
              <button class="close-btn" @click="handleClose" title="关闭 (Esc)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- 消息列表 -->
          <div class="messages-container" ref="messagesRef">
            <div v-if="messages.length === 0" class="empty-state">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 6.5a9.77 9.77 0 0 1 8.82 5.5 9.77 9.77 0 0 1-8.82 5.5A9.77 9.77 0 0 1 3.18 12 9.77 9.77 0 0 1 12 6.5z"/>
                  <circle cx="12" cy="12" r="2.5"/>
                </svg>
              </div>
              <h3>开始与 AI 对话</h3>
              <p>选中文本后点击"问 AI"或直接在下面输入问题并回车发送</p>
              <p class="hint">AI 已了解《{{ bookTitle }}》的内容</p>
              <div style="margin-top:12px; display:flex; gap:8px; justify-content:center;">
                <button class="toggle-btn" @click="insertSample('请解释这一段的主要观点')">示例：解释主要观点</button>
                <button class="toggle-btn" @click="insertSample('这段内容的历史背景是什么？')">示例：历史背景</button>
              </div>
            </div>

            <div
              v-for="(message, index) in messages"
              :key="index"
              class="message"
              :class="message.role"
            >
              <div class="message-avatar">
                <div class="avatar-wrapper user-avatar" v-if="message.role === 'user'">
                  <User :size="20" :stroke-width="2.5" />
                </div>
                <div class="avatar-wrapper ai-avatar" v-else>
                  <Bot :size="20" :stroke-width="2.5" />
                </div>
              </div>
              <div class="message-content">
                <!-- 选中的文本引用 -->
                <div v-if="message.selectedText" class="selected-text-quote">
                  <div class="quote-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                    </svg>
                  </div>
                  <div class="quote-text">{{ message.selectedText }}</div>
                </div>
                <!-- 用户消息：纯文本 -->
                <div v-if="message.role === 'user'" class="message-text user-message">{{ message.content }}</div>
                <!-- AI 消息：Markdown 渲染 / 流式或折叠处理 -->
                <div v-else class="message-text ai-message">
                  <div v-if="message.isStreaming" class="streaming-content" v-text="message.content"></div>
                  <div v-else class="markdown-wrapper">
                    <div
                      :class="['markdown-content', { collapsed: isCollapsed(message) }]"
                      v-html="renderMarkdown(message.content)"
                    ></div>
                    <button
                      v-if="shouldShowToggle(message)"
                      class="toggle-btn"
                      @click="toggleExpand(message)"
                    >{{ isCollapsed(message) ? '展开全文' : '收起' }}</button>
                  </div>
                </div>
                <div class="message-time">{{ formatTime(message.timestamp) }}</div>
              </div>
            </div>

            <!-- 加载中 -->
            <div v-if="isLoading" class="message assistant">
              <div class="message-avatar">
                <div class="avatar-wrapper ai-avatar">
                  <Bot :size="20" :stroke-width="2.5" />
                </div>
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

          <!-- 选中文本引用区（输入框上方） -->
          <div v-if="currentSelectedText" class="selected-text-reference">
            <div class="reference-header">
              <div class="reference-label">
                <svg class="quote-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                </svg>
                <span>选中的文本</span>
              </div>
              <button class="clear-reference-btn" @click="clearSelectedText" title="清除">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div class="reference-content">{{ currentSelectedText }}</div>
            
            <!-- AI生成的提示词建议 -->
            <div v-if="suggestedPrompts.length > 0 || isGeneratingPrompts" class="prompt-suggestions">
              <div v-if="isGeneratingPrompts" class="suggestions-loading">
                <div class="loading-spinner"></div>
                <span>AI 正在生成提示词建议...</span>
              </div>
              <div v-else class="suggestions-list">
                <button
                  v-for="(prompt, index) in suggestedPrompts"
                  :key="index"
                  class="suggestion-btn"
                  @click="useSuggestedPrompt(prompt)"
                >
                  <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                  {{ prompt }}
                </button>
              </div>
            </div>
          </div>

          <!-- 输入框 -->
          <div class="input-container">
            <div class="input-wrapper">
              <textarea
                ref="inputRef"
                v-model="inputText"
                class="input-textarea"
                placeholder="输入问题... (Enter 发送，Shift+Enter 换行)"
                rows="3"
                @keydown.enter.exact.prevent="handleSend"
                @keydown.shift.enter.exact="handleShiftEnter"
                @input="autoResize"
              ></textarea>
              <!-- 发送按钮已移除，使用 Enter 发送 -->
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { User, Bot } from 'lucide-vue-next'
import { chatStream } from '@/api/qwen'
import { useEbookStore, type AIChatMessage } from '@/stores/ebook'
import { qwenTokenManager } from '@/utils/qwenTokenManager'
import { marked } from 'marked'

// 配置 marked
marked.setOptions({
  breaks: true, // 支持 GitHub 风格的换行
  gfm: true, // 启用 GitHub Flavored Markdown
})

// Props
const props = defineProps<{
  isOpen: boolean
  bookId: string
  bookTitle: string
  selectedText?: string // 用户选中的文本
  currentPageContext?: string // 当前页面上下文
}>()

// Emits
const emit = defineEmits<{
  close: []
}>()

// 状态
const ebookStore = useEbookStore()
const inputText = ref('')
const isLoading = ref(false)
const messagesRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const currentSelectedText = ref('') // 当前选中的文本（显示在输入框上方）
const suggestedPrompts = ref<string[]>([]) // AI生成的提示词建议
const isGeneratingPrompts = ref(false) // 是否正在生成提示词

// 获取当前书籍的对话历史
const conversation = computed(() => ebookStore.getAIConversation(props.bookId))
const messages = computed(() => conversation.value.messages)

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 渲染 Markdown（仅用于 AI 回复）
const renderMarkdown = (content: string) => {
  try {
    return marked.parse(content)
  } catch (error) {
    console.error('Markdown 渲染失败:', error)
    return content
  }
}

// 在 DOM 中为代码块添加复制按钮（防抖式，不重复添加）
const addCopyButtons = () => {
  if (!messagesRef.value) return
  const container = messagesRef.value
  const pres = container.querySelectorAll('pre')
  pres.forEach(pre => {
    if (pre.dataset.hasCopy) return
    const btn = document.createElement('button')
    btn.className = 'copy-code-btn'
    btn.textContent = '复制'
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText((pre.textContent || '').trim())
        btn.textContent = '已复制'
        setTimeout(() => (btn.textContent = '复制'), 1500)
      } catch (e) {
        console.error('复制失败', e)
      }
    })
    btn.style.position = 'absolute'
    btn.style.top = '8px'
    btn.style.right = '8px'
    btn.style.zIndex = '5'
    btn.style.fontSize = '12px'
    btn.style.padding = '4px 8px'
    btn.style.borderRadius = '6px'
    btn.style.border = 'none'
    btn.style.cursor = 'pointer'
    btn.style.background = 'rgba(0,0,0,0.06)'
    btn.style.color = 'inherit'
    // pre 需要 position: relative
    ;(pre as HTMLElement).style.position = 'relative'
    pre.appendChild(btn)
    pre.dataset.hasCopy = '1'
  })
}

// 自动调整 textarea 高度
const autoResize = (e?: Event) => {
  const ta = inputRef.value
  if (!ta) return
  ta.style.height = 'auto'
  const newH = Math.min(ta.scrollHeight, 400)
  ta.style.height = `${newH}px`
}

// 导出当前会话为 JSON 并复制到剪贴板
const handleExport = async () => {
  try {
    const conv = ebookStore.getAIConversation(props.bookId)
    const text = JSON.stringify(conv, null, 2)
    await navigator.clipboard.writeText(text)
    alert('会话已复制到剪贴板（JSON）')
  } catch (e) {
    console.error('导出失败', e)
    alert('导出失败，请在控制台查看错误')
  }
}

// 插入示例问题到输入框
const insertSample = (text: string) => {
  inputText.value = text
  nextTick(() => {
    autoResize()
    inputRef.value?.focus()
  })
}

// 不再需要自动调整高度函数，使用 CSS resize 属性

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

// 发送消息
const handleSend = async () => {
  const text = inputText.value.trim()
  if (!text || isLoading.value) return

  console.log('🚀 [AI] 发送消息:', text.substring(0, 50))

  // 检查 token
  const accessToken = qwenTokenManager.getAccessToken()
  const resourceUrl = qwenTokenManager.getResourceUrl()
  
  console.log('🔍 [AI] Token 检查:', {
    hasAccessToken: !!accessToken,
    tokenPrefix: accessToken ? accessToken.substring(0, 20) + '...' : 'null',
    hasResourceUrl: !!resourceUrl,
    resourceUrl: resourceUrl || 'null',
    isExpired: qwenTokenManager.isTokenExpired()
  })
  
  if (!accessToken || qwenTokenManager.isTokenExpired()) {
    console.error('❌ [AI] Token 无效或已过期')
    
    const errorMsg: AIChatMessage = {
      role: 'assistant',
      content: '请先在设置中完成 Qwen AI 授权。Token 可能已过期或未配置。',
      timestamp: Date.now()
    }
    await ebookStore.addAIMessage(props.bookId, errorMsg)
    scrollToBottom()
    return
  }

  // 添加用户消息
  const userMessage: AIChatMessage = {
    role: 'user',
    content: text,
    timestamp: Date.now(),
    selectedText: currentSelectedText.value // 保存选中的文本引用
  }
  
  await ebookStore.addAIMessage(props.bookId, userMessage)
  
  // 发送后清空选中文本和输入框
  currentSelectedText.value = ''
  inputText.value = ''
  scrollToBottom()

  // 调用 AI
  isLoading.value = true
  let assistantMessage = ''
  // 判断用户是否在靠近底部（若不在底部，流式过程中不要强制滚动）
  const isUserNearBottom = () => {
    if (!messagesRef.value) return true
    const el = messagesRef.value
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  try {
    // 构建完整的提示词（包含书籍上下文、历史对话和选中文本）
    let fullPrompt = `你是《${props.bookTitle}}》的阅读助手。\n\n`
    
    // 添加历史对话上下文（最近 5 轮）
    const recentMessages = messages.value.slice(-10) // 最近 10 条消息（5 轮对话）
    if (recentMessages.length > 0) {
      fullPrompt += `历史对话：\n`
      recentMessages.forEach(msg => {
        const role = msg.role === 'user' ? '用户' : '助手'
        fullPrompt += `${role}：${msg.content}\n`
      })
      fullPrompt += `\n`
    }
    
    if (userMessage.selectedText) {
      fullPrompt += `用户选中的文本：\n"${userMessage.selectedText}"\n\n`
    }
    
    if (props.currentPageContext) {
      fullPrompt += `当前页面内容：\n${props.currentPageContext.substring(0, 1000)}\n\n`
    }
    
    fullPrompt += `当前问题：${text}\n\n请基于书籍内容和历史对话回答用户的问题。`

    console.log('📖 [AI] 使用上下文，长度:', fullPrompt.length)
    console.log('💬 [AI] 包含历史对话:', recentMessages.length, '条')
    console.log('🌐 [AI] 开始调用 API...')

    // 先添加一个空的 AI 消息占位
    const assistantMsg: AIChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      // 标记正在流式生成
      isStreaming: true
    }
    await ebookStore.addAIMessage(props.bookId, assistantMsg)
    if (isUserNearBottom()) scrollToBottom()

    // 流式调用 AI
    await chatStream(
      accessToken,
      fullPrompt,
      resourceUrl || '',
      undefined, // images 参数
      (chunk) => {
        assistantMessage += chunk
        
        // 直接更新最后一条消息的内容（不调用 addAIMessage）
        const conversation = ebookStore.getAIConversation(props.bookId)
        const lastMsg = conversation.messages[conversation.messages.length - 1]
        if (lastMsg?.role === 'assistant') {
          // 在流式阶段以纯文本展示，避免部分 Markdown 导致 HTML 结构抖动
          lastMsg.content = assistantMessage
          lastMsg.isStreaming = true
        }
        
        // 只有在用户靠近底部时才自动滚动，避免打断用户阅读历史消息
        if (isUserNearBottom()) {
          scrollToBottom()
        }
      }
    )

    // 流式响应完成后，保存完整的消息
    const conversation = ebookStore.getAIConversation(props.bookId)
    const lastMsg = conversation.messages[conversation.messages.length - 1]
    if (lastMsg?.role === 'assistant') {
      // 流式结束：将完整内容设为最终消息，移除流式标记以启用 Markdown 渲染
      lastMsg.content = assistantMessage
      lastMsg.isStreaming = false
      conversation.lastUpdated = Date.now()
    }
    
    // 手动保存到 localforage
    await ebookStore.saveAIConversations()
    // 等待 DOM 更新后为代码块添加复制按钮
    await nextTick()
    addCopyButtons()

    console.log('✅ [AI] 响应完成，长度:', assistantMessage.length)

  } catch (error) {
    console.error('❌ [AI] 对话失败:', error)
    
    let errorMessage = '未知错误'
    if (error instanceof Error) {
      console.error('❌ [AI] 错误详情:', {
        message: error.message,
        stack: error.stack
      })
      
      if (error.message.includes('401')) {
        errorMessage = 'Token 已过期或无效，请在设置中重新授权 Qwen AI'
      } else if (error.message.includes('403')) {
        errorMessage = '没有权限访问 API，请检查 Qwen 配置'
      } else if (error.message.includes('429')) {
        errorMessage = 'API 调用频率超限，请稍后再试'
      } else if (error.message.includes('500')) {
        errorMessage = 'Qwen 服务器错误，请稍后再试'
      } else {
        errorMessage = error.message
      }
    }
    
    const errorMsg: AIChatMessage = {
      role: 'assistant',
      content: `抱歉，AI 对话失败：${errorMessage}`,
      timestamp: Date.now()
    }
    await ebookStore.addAIMessage(props.bookId, errorMsg)
  } finally {
    isLoading.value = false
    // 如果用户此刻靠近底部，则流式结束后再滚动到底部
    if (isUserNearBottom()) {
      scrollToBottom()
    }
  }
}

// 处理遮罩层点击（关闭对话框）
const handleOverlayClick = () => {
  handleClose()
}

// Shift+Enter 换行处理
const handleShiftEnter = (e: KeyboardEvent) => {
  // 允许默认行为（换行）
  // 不需要额外处理，浏览器会自动插入换行
}

// 清空选中文本
const clearSelectedText = () => {
  currentSelectedText.value = ''
  suggestedPrompts.value = []
}

// 生成提示词建议
const generatePromptSuggestions = async (selectedText: string) => {
  if (!selectedText || isGeneratingPrompts.value) return
  
  isGeneratingPrompts.value = true
  suggestedPrompts.value = []
  
  try {
    const accessToken = qwenTokenManager.getAccessToken()
    const resourceUrl = qwenTokenManager.getResourceUrl()
    
    if (!accessToken || qwenTokenManager.isTokenExpired()) {
      console.warn('⚠️ [AI] Token 无效，跳过生成提示词')
      // 使用默认提示词
      suggestedPrompts.value = [
        '请解释这段话的含义',
        '这段内容的背景是什么？',
        '总结这段话的要点'
      ]
      return
    }
    
    const prompt = `用户选中了以下文本：
"${selectedText.substring(0, 200)}"

请生成3个简短的提示词（每个不超过15字），帮助用户更好地理解这段文本。
要求：
1. 每个提示词一行
2. 直接输出提示词，不要编号
3. 提示词要具体、实用
4. 不要有多余的解释

示例格式：
解释这段话的核心观点
分析作者的写作手法
这段话的历史背景`
    
    let response = ''
    await chatStream(
      accessToken,
      prompt,
      resourceUrl || '',
      undefined,
      (chunk) => {
        response += chunk
      }
    )
    
    // 解析响应，提取提示词
    const lines = response.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.match(/^[\d\.\-\*]+/) && line.length > 3 && line.length < 50)
      .slice(0, 3)
    
    if (lines.length > 0) {
      suggestedPrompts.value = lines
    } else {
      // 如果解析失败，使用默认提示词
      suggestedPrompts.value = [
        '请解释这段话的含义',
        '这段内容的背景是什么？',
        '总结这段话的要点'
      ]
    }
    
    console.log('✅ [AI] 生成提示词建议:', suggestedPrompts.value)
  } catch (error) {
    console.error('❌ [AI] 生成提示词失败:', error)
    // 使用默认提示词
    suggestedPrompts.value = [
      '请解释这段话的含义',
      '这段内容的背景是什么？',
      '总结这段话的要点'
    ]
  } finally {
    isGeneratingPrompts.value = false
  }
}

// 使用建议的提示词
const useSuggestedPrompt = (prompt: string) => {
  inputText.value = prompt
  nextTick(() => {
    autoResize()
    inputRef.value?.focus()
  })
}

// 管理折叠/展开状态（使用 timestamp 作为 key）
import { reactive } from 'vue'
const expandedMap = reactive<Record<string, boolean>>({})

const isCollapsed = (message: any) => {
  if (!message || !message.content) return false
  const threshold = 1200 // 字符阈值，超过则折叠
  return message.content.length > threshold && !expandedMap[message.timestamp]
}

const shouldShowToggle = (message: any) => {
  return message && message.content && message.content.length > 1200
}

const toggleExpand = (message: any) => {
  if (!message) return
  const key = String(message.timestamp)
  expandedMap[key] = !expandedMap[key]
}

// 清空对话历史（直接清空，不弹窗确认）
const handleClearHistory = async () => {
  await ebookStore.clearAIConversation(props.bookId)
  console.log('🗑️ [AI] 已清空对话历史')
}

// 关闭面板
const handleClose = () => {
  currentSelectedText.value = '' // 关闭时清空选中文本
  emit('close')
}

// 监听打开状态
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    await nextTick()
    
    // 如果有选中文本，显示在输入框上方并生成提示词建议
    if (props.selectedText) {
      currentSelectedText.value = props.selectedText
      // 异步生成提示词建议
      generatePromptSuggestions(props.selectedText)
    }
    
    inputRef.value?.focus()
    scrollToBottom()
    
    // 监听 Esc 键关闭
    document.addEventListener('keydown', handleEscKey)
  } else {
    // 移除 Esc 键监听
    document.removeEventListener('keydown', handleEscKey)
  }
})

// 处理 Esc 键
const handleEscKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleClose()
  }
}

// 监听选中文本变化
watch(() => props.selectedText, (newText) => {
  if (newText && props.isOpen) {
    currentSelectedText.value = newText
    // 生成新的提示词建议
    generatePromptSuggestions(newText)
  }
})
</script>

<style scoped>
/* 遮罩层 */
.book-ai-chat-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

/* 对话框主体 */
.book-ai-chat-panel {
  width: 90%;
  max-width: 800px;
  height: 85vh;
  max-height: 800px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25), 0 0 1px rgba(0, 0, 0, 0.1);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.8);
}

/* 过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .book-ai-chat-panel,
.modal-leave-active .book-ai-chat-panel {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .book-ai-chat-panel {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}

.modal-leave-to .book-ai-chat-panel {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}

/* 深色主题支持 */
.theme-dark .book-ai-chat-panel {
  background: rgba(26, 26, 26, 0.98);
  color: #e8e8e8;
}

.theme-sepia .book-ai-chat-panel {
  background: rgba(244, 236, 216, 0.98);
  color: #3d2817;
}

.theme-green .book-ai-chat-panel {
  background: rgba(232, 245, 233, 0.98);
  color: #1b4d2e;
}

/* 头部 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.03), transparent);
}

.theme-dark .panel-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), transparent);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.title-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.header-title .icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: white;
}

.title-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.book-name {
  font-size: 13px;
  color: #64748B;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.theme-dark .book-name {
  color: #94A3B8;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn,
.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: inherit;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn:hover,
.close-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  transform: scale(1.05);
}

.action-btn:active,
.close-btn:active {
  transform: scale(0.95);
}

.theme-dark .action-btn:hover,
.theme-dark .close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.action-btn svg,
.close-btn svg {
  width: 20px;
  height: 20px;
}

/* 消息容器 */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%);
}

/* 自定义滚动条样式 */
.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 4px;
  transition: background 0.2s;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}

.theme-dark .messages-container {
  background: linear-gradient(180deg, #1E293B 0%, #0F172A 100%);
}

.theme-dark .messages-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

.theme-dark .messages-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #64748B;
  padding: 60px 20px;
}

.empty-icon {
  width: 72px;
  height: 72px;
  margin-bottom: 20px;
  opacity: 0.4;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.05));
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #0F172A;
  margin-bottom: 8px;
}

.theme-dark .empty-state h3 {
  color: #F8FAFC;
}

.empty-state p {
  margin: 8px 0;
  font-size: 14px;
  line-height: 1.6;
  max-width: 400px;
}

.hint {
  font-size: 13px;
  color: #3B82F6;
  font-weight: 500;
  margin-top: 4px;
}

/* 消息 */
 .message {
   display: flex;
   gap: 12px;
   animation: slideIn 0.2s ease-out;
  width: 100%;
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
 
 .message.assistant {
   justify-content: flex-start; /* AI消息左对齐 */
 }
 
 .message.user {
   justify-content: flex-end; /* 用户消息右对齐 */
   flex-direction: row-reverse; /* 用户头像在右 */
 }
 
 .message-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
}

.avatar-wrapper {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar {
  background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
  color: white;
}

.ai-avatar {
  background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
  color: white;
}

.theme-dark .message-avatar {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
}

.message:hover .message-avatar {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.message-content {
  flex: 1;
  min-width: 0;
  max-width: 680px; /* 控制每条消息内容宽度，提升可读性 */
  display: flex; /* 内部 flex 布局 */
  flex-direction: column; /* 垂直排列 */
}

/* 选中文本引用 */
.selected-text-quote {
  background: rgba(74, 144, 226, 0.1);
  border-left: 3px solid #4a90e2;
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.quote-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #4a90e2;
  margin-top: 2px;
}

.quote-text {
  font-size: 13px;
  line-height: 1.5;
  color: #555;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.theme-dark .quote-text {
  color: #ccc;
}

.message-text {
  background: white;
  padding: 14px 18px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  max-width: 100%;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #F1F5F9;
}

/* AI 消息气泡圆角 */
.message.assistant .message-text {
  border-top-left-radius: 4px;
}

.theme-dark .message-text {
  background: #1E293B;
  border-color: #334155;
}

.message.user .message-text {
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: white;
  margin-left: auto;
  border-top-right-radius: 4px;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

/* Avatar 优化：更明显的圆形、边框和阴影 */
.message-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
}

.avatar-wrapper {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.avatar-wrapper svg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  flex-shrink: 0;
}

.user-avatar {
  background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
  color: white;
}

.ai-avatar {
  background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
  color: white;
}

.theme-dark .message-avatar {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
}

.message:hover .message-avatar {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

/* 选中文本引用增强 */
.selected-text-quote {
  background: rgba(74, 144, 226, 0.06);
  border-left: 4px solid #4a90e2;
  padding: 10px 14px;
  margin-bottom: 10px;
  border-radius: 10px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

/* Markdown 折叠样式 */
.markdown-content.collapsed {
  max-height: 240px;
  overflow: hidden;
  position: relative;
  transition: max-height 0.25s ease;
}

.toggle-btn {
  margin-top: 8px;
  background: transparent;
  border: 1px solid rgba(0,0,0,0.08);
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: inherit;
  cursor: pointer;
}

.theme-dark .toggle-btn {
  border-color: rgba(255,255,255,0.06);
}

/* 流式生成时的纯文本样式（避免部分 Markdown 导致 HTML 抖动） */
.streaming-content {
  white-space: pre-wrap;
  line-height: 1.8;
  font-size: 15px;
  color: inherit;
  font-family: inherit;
  opacity: 0.98;
}

/* Markdown 内容样式 */
.markdown-content {
  white-space: normal;
  line-height: 1.8;
  font-size: 15px;
  letter-spacing: 0.5px;
  overflow: hidden;
}

/* 防止 Markdown 内长单词/表格/链接撑破容器 */
.message-text,
.markdown-content,
.markdown-content *,
.markdown-wrapper {
  box-sizing: border-box;
  max-width: 100%;
  word-break: break-word;
  overflow-wrap: break-word;
  overflow: hidden;
}

/* 确保所有 Markdown 元素不超出边界 */
.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6,
.markdown-content p,
.markdown-content li,
.markdown-content blockquote,
.markdown-content div {
  max-width: 100%;
  word-break: break-word;
  overflow-wrap: break-word;
}

.markdown-content table {
  table-layout: fixed;
  width: 100%;
  max-width: 100%;
  word-break: break-word;
  overflow: hidden;
  display: block;
  overflow-x: auto;
}

.markdown-content th,
.markdown-content td {
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* 流式生成时的纯文本样式（避免部分 Markdown 导致 HTML 抖动） */
.streaming-content {
  white-space: pre-wrap;
  line-height: 1.8;
  font-size: 15px;
  color: inherit;
  font-family: inherit;
  opacity: 0.98;
}

.markdown-content p {
  margin: 0 0 14px 0;
}

.markdown-content p:last-child {
  margin-bottom: 0;
}

/* 标题样式 */
.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  margin: 24px 0 16px 0;
  font-weight: 600;
  line-height: 1.3;
  color: inherit;
  letter-spacing: -0.02em;
}

.markdown-content h1 { 
  font-size: 1.8em; 
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.12);
}

.markdown-content h2 { 
  font-size: 1.5em; 
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.markdown-content h3 { 
  font-size: 1.25em; 
}

.markdown-content h4 { 
  font-size: 1.1em; 
}

.markdown-content h5, .markdown-content h6 { 
  font-size: 1em; 
}

.theme-dark .markdown-content h1 {
  border-bottom-color: rgba(255, 255, 255, 0.15);
}

.theme-dark .markdown-content h2 {
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

/* 代码样式 */
.markdown-content code {
  background: rgba(0, 0, 0, 0.1);
  padding: 4px 10px;
  border-radius: 8px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.88em;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  word-break: break-all;
  overflow-wrap: break-word;
  max-width: 100%;
  display: inline-block;
}

.theme-dark .markdown-content code {
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.markdown-content pre {
  background: rgba(0, 0, 0, 0.08);
  padding: 20px;
  border-radius: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  margin: 16px 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.05);
  max-width: 100%;
  word-break: break-all;
}

.theme-dark .markdown-content pre {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
}

.markdown-content pre code {
  background: none;
  padding: 0;
  font-size: 0.85em;
  line-height: 1.7;
  color: inherit;
  box-shadow: none;
  word-break: break-all;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  display: block;
}

/* 代码块复制按钮 */
.copy-code-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 6;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 6px;
  border: none;
  background: rgba(0,0,0,0.06);
  cursor: pointer;
  color: inherit;
}

/* 列表样式 */
.markdown-content ul,
.markdown-content ol {
  margin: 16px 0;
  padding-left: 32px;
}

.markdown-content li {
  margin: 8px 0;
  line-height: 1.7;
  position: relative;
}

.markdown-content ul ul,
.markdown-content ul ol,
.markdown-content ol ul,
.markdown-content ol ol {
  margin: 8px 0;
  padding-left: 28px;
}

/* 引用样式 */
.markdown-content blockquote {
  border-left: 4px solid #4a90e2;
  padding: 16px 20px;
  margin: 16px 0;
  color: inherit;
  font-style: italic;
  background: rgba(74, 144, 226, 0.08);
  border-radius: 0 10px 10px 0;
  box-shadow: 0 2px 4px rgba(74, 144, 226, 0.1);
}

.theme-dark .markdown-content blockquote {
  background: rgba(74, 144, 226, 0.15);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 链接样式 */
.markdown-content a {
  color: #4a90e2;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(74, 144, 226, 0.4);
  padding-bottom: 2px;
  border-radius: 2px;
  word-break: break-all;
  overflow-wrap: break-word;
}

.markdown-content a:hover {
  text-decoration: none;
  color: #357ABD;
  border-bottom-color: #357ABD;
  background: rgba(74, 144, 226, 0.08);
}

.theme-dark .markdown-content a:hover {
  color: #6AA9F4;
  border-bottom-color: #6AA9F4;
  background: rgba(74, 144, 226, 0.15);
}

/* 表格样式 */
.markdown-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
  font-size: 0.95em;
  line-height: 1.6;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.theme-dark .markdown-content table {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.markdown-content th,
.markdown-content td {
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 10px 14px;
  text-align: left;
}

.theme-dark .markdown-content th,
.theme-dark .markdown-content td {
  border-color: rgba(255, 255, 255, 0.1);
}

.markdown-content th {
  background: rgba(0, 0, 0, 0.08);
  font-weight: 600;
  text-transform: capitalize;
  letter-spacing: 0.5px;
}

.theme-dark .markdown-content th {
  background: rgba(255, 255, 255, 0.1);
}

.markdown-content tr:hover {
  background: rgba(0, 0, 0, 0.03);
}

.theme-dark .markdown-content tr:hover {
  background: rgba(255, 255, 255, 0.06);
}

/* 分割线样式 */
.markdown-content hr {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  margin: 24px 0;
  position: relative;
}

.markdown-content hr::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -4px;
  width: 20px;
  height: 8px;
  background: inherit;
  transform: translateX(-50%);
  border-radius: 4px;
}

.theme-dark .markdown-content hr {
  border-top-color: rgba(255, 255, 255, 0.15);
}

/* 图片样式 */
.markdown-content img {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  margin: 16px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.markdown-content img:hover {
  transform: scale(1.02);
}

/* 粗体和斜体 */
.markdown-content strong {
  font-weight: 600;
  color: inherit;
}

.markdown-content em {
  font-style: italic;
  color: inherit;
  opacity: 0.9;
}

/* 主题适配优化 */
.theme-sepia .markdown-content {
  color: #3d2817;
}

.theme-green .markdown-content {
  color: #1b4d2e;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .markdown-content {
    font-size: 14.5px;
    line-height: 1.7;
  }
  
  .markdown-content h1 { font-size: 1.6em; }
  .markdown-content h2 { font-size: 1.4em; }
  .markdown-content h3 { font-size: 1.2em; }
  
  .markdown-content ul,
  .markdown-content ol {
    padding-left: 28px;
  }
  
  .markdown-content pre {
    padding: 16px;
  }
}

/* 动画效果 */
.markdown-content * {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 滚动条样式优化 */
.markdown-content pre::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.markdown-content pre::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.markdown-content pre::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.markdown-content pre::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.theme-dark .markdown-content pre::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.theme-dark .markdown-content pre::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

.theme-dark .markdown-content pre::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

 .message-time {
   font-size: 11px;
   color: #999;
   margin-top: 6px; /* 与内容分离 */
   padding-left: 4px; /* 小偏移 */
   align-self: flex-end; /* 默认右对齐 */
 }
 
 .message.assistant .message-time {
   align-self: flex-start; /* AI消息时间戳左对齐 */
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

/* 选中文本引用区 */
.selected-text-reference {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(74, 144, 226, 0.05);
  padding: 12px 20px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
  to {
    opacity: 1;
    max-height: 200px;
    padding-top: 12px;
    padding-bottom: 12px;
  }
}

.reference-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.reference-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #4a90e2;
}

.reference-label .quote-icon {
  width: 16px;
  height: 16px;
}

.clear-reference-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #999;
  transition: all 0.2s;
}

.clear-reference-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #666;
}

.theme-dark .clear-reference-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ccc;
}

.clear-reference-btn svg {
  width: 14px;
  height: 14px;
}

.reference-content {
  background: white;
  border-left: 3px solid #4a90e2;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #555;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.theme-dark .reference-content {
  background: #2a2a2a;
  color: #ccc;
}

.theme-sepia .reference-content {
  background: #f9f5eb;
  color: #3d2817;
}

.theme-green .reference-content {
  background: #f1f8f4;
  color: #1b4d2e;
}

/* 提示词建议 */
.prompt-suggestions {
  margin-top: 12px;
  animation: fadeIn 0.3s ease;
}

.suggestions-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #64748B;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(74, 144, 226, 0.2);
  border-top-color: #4a90e2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggestion-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: white;
  border: 1px solid rgba(74, 144, 226, 0.3);
  border-radius: 8px;
  font-size: 13px;
  color: #4a90e2;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  font-weight: 500;
}

.suggestion-btn:hover {
  background: rgba(74, 144, 226, 0.08);
  border-color: #4a90e2;
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.15);
}

.suggestion-btn:active {
  transform: translateX(2px);
}

.suggestion-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.suggestion-btn:hover .suggestion-icon {
  transform: translateX(2px);
}

.theme-dark .suggestion-btn {
  background: #2a2a2a;
  border-color: rgba(74, 144, 226, 0.4);
  color: #6AA9F4;
}

.theme-dark .suggestion-btn:hover {
  background: rgba(74, 144, 226, 0.15);
  border-color: #6AA9F4;
}

.theme-sepia .suggestion-btn {
  background: #f9f5eb;
  color: #4a90e2;
}

.theme-green .suggestion-btn {
  background: #f1f8f4;
  color: #2e7d5e;
}

/* 输入框 */
.input-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-top: 2px solid rgba(0, 0, 0, 0.06);
  background: white;
}

.theme-dark .input-container {
  border-top-color: rgba(255, 255, 255, 0.06);
  background: #1E293B;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  width: 100%;
}

.input-textarea {
  flex: 1;
  min-height: 52px;
  max-height: 240px;
  padding: 14px 16px;
  border: 2px solid #E2E8F0;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  background: #F8FAFC;
  color: inherit;
  font-family: inherit;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-textarea::placeholder {
  color: #94A3B8;
  font-weight: 400;
}

.theme-dark .input-textarea {
  background: #0F172A;
  border-color: #334155;
}

.theme-dark .input-textarea::placeholder {
  color: #64748B;
}

.input-textarea:focus {
  outline: none;
  border-color: #3B82F6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 6px 18px rgba(59, 130, 246, 0.12);
}

.theme-dark .input-textarea:focus {
  background: #1E293B;
}

.send-btn { /* removed - placeholder to avoid missing selector if referenced elsewhere */ }

/* 响应式调整 */
@media (max-width: 768px) {
  .book-ai-chat-panel {
    width: 95%;
    height: 90vh;
    max-height: 90vh;
  }

  .message-content {
    max-width: 85%;
  }
}
</style>
