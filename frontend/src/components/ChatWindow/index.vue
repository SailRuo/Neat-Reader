<template>
  <Teleport to="body">
    <Transition name="chat-window">
      <div v-if="isVisible" class="chat-window-overlay" :class="{ 'is-maximized': isMaximized }" @click.self="close">
        <div class="chat-window" :class="{ 'is-maximized': isMaximized }">
          <!-- 侧边栏：对话列表 -->
          <div class="chat-sidebar" :class="{ collapsed: sidebarCollapsed }">
            <div class="sidebar-header">
              <h3 v-show="!sidebarCollapsed">对话历史</h3>
              <div class="sidebar-header-actions">
                <button
                  class="new-chat-btn"
                  @click="createNewConversation"
                  title="新建对话"
                >
                  <Icons.Plus :size="18" />
                </button>
                <button
                  class="sidebar-toggle-btn"
                  @click="sidebarCollapsed = !sidebarCollapsed"
                  :title="sidebarCollapsed ? '展开对话历史' : '折叠对话历史'"
                >
                  <Icons.PanelLeftClose v-if="!sidebarCollapsed" :size="18" />
                  <Icons.PanelLeftOpen v-else :size="18" />
                </button>
              </div>
            </div>
            <div v-show="!sidebarCollapsed" class="conversations-list">
              <div 
                v-for="conv in conversations" 
                :key="conv.id"
                class="conversation-item"
                :class="{ active: currentConversationId === conv.id }"
                @click="switchConversation(conv.id)"
              >
                <div class="conversation-info">
                  <div class="conversation-title">{{ conv.title }}</div>
                  <div class="conversation-preview">{{ conv.lastMessage }}</div>
                </div>
                <button 
                  class="delete-conversation-btn" 
                  @click.stop="deleteConversation(conv.id)"
                  title="删除对话"
                >
                  <Icons.Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>

          <!-- 主聊天区域 -->
          <div class="chat-main">
            <!-- 头部 -->
            <div class="chat-header">
              <div class="chat-header-left">
                <div class="chat-icon">
                  <Icons.Bot :size="20" />
                </div>
                <div class="chat-title">
                  <h3>{{ currentConversation?.title || 'Qwen AI 助手' }}</h3>
                  <span class="chat-status" :class="{ online: isOnline }">
                    {{ isOnline ? '在线' : '离线' }}
                  </span>
                </div>
              </div>
              <div class="chat-header-actions">
                <button
                  class="header-btn"
                  @click="isMaximized = !isMaximized"
                  :title="isMaximized ? '还原' : '最大化'"
                >
                  <Icons.Maximize2 v-if="!isMaximized" :size="18" />
                  <Icons.Minimize2 v-else :size="18" />
                </button>
                <button class="header-btn close-btn" @click="close" title="关闭">
                  <Icons.X :size="18" />
                </button>
              </div>
            </div>

            <!-- 消息列表 -->
            <div class="chat-messages" ref="messagesContainer">
              <div v-if="currentMessages.length === 0" class="chat-empty">
                <div class="empty-icon">
                  <Icons.MessageCircle :size="48" />
                </div>
                <p>开始与 Qwen AI 对话吧！</p>
                <div class="quick-actions">
                  <button @click="sendQuickMessage('介绍一下你自己')">介绍自己</button>
                  <button @click="sendQuickMessage('推荐几本好书')">推荐好书</button>
                  <button @click="sendQuickMessage('如何提高阅读效率？')">阅读技巧</button>
                </div>
              </div>

              <div v-for="(msg, index) in currentMessages" :key="index" class="message" :class="msg.role">
                <div class="message-avatar">
                  <Icons.User v-if="msg.role === 'user'" :size="20" />
                  <Icons.Bot v-else :size="20" />
                </div>
                <div class="message-content">
                  <!-- 用户消息：纯文本 -->
                  <div v-if="msg.role === 'user'" class="message-text">{{ msg.content }}</div>
                  <!-- AI 消息：加载中显示打字动画，否则 Markdown 渲染 -->
                  <template v-else>
                    <div
                      v-if="isLoading && index === currentMessages.length - 1 && !msg.content"
                      class="message-text typing"
                    >
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <div
                      v-else
                      class="message-text message-text-ai markdown-content"
                      v-html="renderMarkdown(msg.content)"
                    />
                  </template>
                  <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
                </div>
              </div>
            </div>

            <!-- 输入框 -->
            <div class="chat-input-container">
              <textarea
                v-model="inputMessage"
                class="chat-input"
                placeholder="输入消息..."
                rows="1"
                @keydown.enter.exact.prevent="sendMessage"
                @keydown.enter.shift.exact="inputMessage += '\n'"
                ref="inputRef"
              ></textarea>
              <button 
                class="send-btn" 
                @click="sendMessage"
                :disabled="!inputMessage.trim() || isLoading || !isOnline"
                title="发送 (Enter)"
              >
                <Icons.Send :size="20" />
              </button>
            </div>

            <!-- 底部提示 -->
            <div v-if="!isOnline" class="chat-footer">
              <div class="footer-content">
                <Icons.AlertTriangle :size="20" class="warning-icon" />
                <span class="footer-text">请先在设置中完成 Qwen AI 授权</span>
                <button class="link-btn" @click="goToSettings">
                  前往设置
                  <Icons.ArrowRight :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>


  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as qwenAPI from '../../api/qwen'
import { useAICredentials } from '../../composables/useAICredentials'
import { useEbookStore } from '../../stores/ebook'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import * as Icons from 'lucide-vue-next'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch (e) {
        console.error('代码高亮失败:', e)
      }
    }
    try {
      return `<pre class="hljs"><code>${hljs.highlightAuto(str).value}</code></pre>`
    } catch (e) {
      console.error('代码高亮失败:', e)
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

const renderMarkdown = (content: string) => {
  if (!content) return ''
  try {
    return md.render(content)
  } catch (error) {
    console.error('Markdown 渲染失败:', error)
    return md.utils.escapeHtml(content)
  }
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  lastMessage: string
  createdAt: number
  updatedAt: number
  isLoading?: boolean  // 🔧 每个对话独立的加载状态
}

const props = defineProps<{
  visible: boolean
  bookContext?: string  // 可选的书籍上下文
  bookTitle?: string    // 可选的书名
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'navigate-to-settings': []
}>()

const router = useRouter()
const ebookStore = useEbookStore()
const aiCreds = useAICredentials()
const messagesContainer = ref<HTMLElement>()
const inputRef = ref<HTMLTextAreaElement>()
const inputMessage = ref('')
const isLoading = ref(false)
const sidebarCollapsed = ref(false)
const isMaximized = ref(false)

// 对话管理
const conversations = ref<Conversation[]>([])
const currentConversationId = ref<string>('')

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 当前对话
const currentConversation = computed(() => 
  conversations.value.find(c => c.id === currentConversationId.value)
)

// 当前消息列表
const currentMessages = computed(() => 
  currentConversation.value?.messages || []
)

// 检查是否已授权或配置自定义 API
const isOnline = computed(() => 
  !!aiCreds.hasCredentials.value && !aiCreds.isExpired.value
)

// 初始化对话
const initConversations = () => {
  const saved = localStorage.getItem('qwen_conversations')
  if (saved) {
    try {
      conversations.value = JSON.parse(saved)
      // 🔧 重置所有对话的 isLoading 状态为 false（防止持久化的加载状态导致永久阻塞）
      conversations.value.forEach(conv => {
        conv.isLoading = false
      })
    } catch (e) {
      console.error('加载对话历史失败:', e)
    }
  }
  
  if (conversations.value.length === 0) {
    createNewConversation()
  } else {
    currentConversationId.value = conversations.value[0].id
  }
}

// 保存对话
const saveConversations = () => {
  localStorage.setItem('qwen_conversations', JSON.stringify(conversations.value))
}

// 创建新对话
const createNewConversation = () => {
  const newConv: Conversation = {
    id: Date.now().toString(),
    title: `对话 ${conversations.value.length + 1}`,
    messages: [],
    lastMessage: '开始新对话...',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isLoading: false  // 🔧 初始化加载状态
  }
  
  conversations.value.unshift(newConv)
  currentConversationId.value = newConv.id
  saveConversations()
}

// 切换对话
const switchConversation = (id: string) => {
  currentConversationId.value = id
}

// 删除对话
const deleteConversation = (id: string) => {
  const index = conversations.value.findIndex(c => c.id === id)
  if (index !== -1) {
    conversations.value.splice(index, 1)
    
    if (currentConversationId.value === id) {
      if (conversations.value.length > 0) {
        currentConversationId.value = conversations.value[0].id
      } else {
        createNewConversation()
      }
    }
    
    saveConversations()
  }
}

// 更新对话
const updateConversation = () => {
  const conv = currentConversation.value
  if (!conv) return
  
  conv.updatedAt = Date.now()
  
  if (conv.messages.length > 0) {
    const lastMsg = conv.messages[conv.messages.length - 1]
    conv.lastMessage = lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : '')
    
    if (conv.title.startsWith('对话')) {
      const firstUserMsg = conv.messages.find(m => m.role === 'user')
      if (firstUserMsg) {
        conv.title = firstUserMsg.content.substring(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
      }
    }
  }
  
  saveConversations()
}

// 关闭窗口
const close = () => {
  isVisible.value = false
}

// 前往设置页面
const goToSettings = () => {
  close()
  // 触发自定义事件，让父组件（Home）切换到设置面板
  emit('navigate-to-settings')
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`
  } else if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 发送快捷消息
const sendQuickMessage = (text: string) => {
  inputMessage.value = text
  sendMessage()
}

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || !isOnline.value) {
    return
  }

  const conv = currentConversation.value
  if (!conv) return
  
  // 🔧 检查当前对话是否正在加载（而不是全局 isLoading）
  if (conv.isLoading === true) {
    console.log('🚫 当前对话正在处理中，请稍候...')
    return
  }

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  // 添加用户消息
  conv.messages.push({
    role: 'user',
    content: userMessage,
    timestamp: Date.now()
  })

  updateConversation()
  scrollToBottom()
  
  // 🔧 设置当前对话的加载状态（而不是全局）
  conv.isLoading = true
  // 全局 isLoading 仅用于 UI 显示
  isLoading.value = true

  // 添加一个空的 AI 消息，用于流式更新
  const aiMessageIndex = conv.messages.length
  conv.messages.push({
    role: 'assistant',
    content: '',
    timestamp: Date.now()
  })

  try {
    const creds = aiCreds.credentials.value
    if (!creds) {
      conv.messages[aiMessageIndex].content = '请先在设置中完成 AI 授权或配置自定义 API'
      return
    }
    const tokenOrConfig = creds.type === 'oauth' ? creds.accessToken : creds.config
    const resourceUrl = creds.type === 'oauth' ? creds.resourceUrl : undefined

    // 构建完整的提示词（如果有书籍上下文）
    let fullPrompt = userMessage
    if (props.bookContext && props.bookTitle) {
      fullPrompt = `你是一个阅读助手，正在帮助用户理解《${props.bookTitle}》这本书。\n\n书籍信息：\n${props.bookContext}\n\n用户问题：${fullPrompt}\n\n请基于书籍内容回答用户的问题。`
      console.log('📖 [ChatWindow] 使用书籍上下文，书名:', props.bookTitle)
    }

    // 使用流式 API
    console.log('📤 发送消息到 AI API', {
      messageLength: fullPrompt.length,
      conversationId: currentConversationId.value,
      historyLength: currentMessages.value.length
    });
    
    await qwenAPI.chatStream(
      tokenOrConfig,
      fullPrompt,
      resourceUrl,
      undefined,  // 不传递图片
      (chunk) => {
        // 实时更新 AI 消息内容
        conv.messages[aiMessageIndex].content += chunk
        scrollToBottom()
      },
      currentMessages.value.slice(0, -1).map(msg => ({ role: msg.role, content: msg.content })),  // 传递历史记录（不包括刚添加的空消息）
      currentConversationId.value,  // 传递会话 ID
      true  // 启用后端存储（混合模式）
    )

    updateConversation()
    scrollToBottom()
  } catch (error: any) {
    console.error('发送消息失败:', error)
    
    // 更新错误消息
    conv.messages[aiMessageIndex].content = `抱歉，发生了错误：${error.message || '未知错误'}`
    updateConversation()
    scrollToBottom()
  } finally {
    // 🔧 清除当前对话的加载状态
    conv.isLoading = false
    isLoading.value = false
  }
}

// 监听窗口打开
watch(isVisible, (visible) => {
  if (visible) {
    initConversations()
    if (ebookStore.userConfig.ai?.mode === 'custom') {
      aiCreds.loadFromBackend()
    }
    nextTick(() => {
      inputRef.value?.focus()
      scrollToBottom()
    })
  }
})
</script>

<style scoped>
.chat-window-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.chat-window-overlay.is-maximized {
  padding: 0;
  align-items: stretch;
}

.chat-window-overlay.is-maximized .chat-window {
  flex: 1;
  width: 100%;
}

.chat-window {
  width: 100%;
  max-width: 1000px;
  height: 85vh;
  max-height: 720px;
  background: var(--color-bg-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--color-border);
  display: flex;
  overflow: hidden;
  transition: max-width var(--transition-base), height var(--transition-base), max-height var(--transition-base), border-radius var(--transition-base);
}

.chat-window.is-maximized {
  max-width: none;
  width: 100%;
  height: 100vh;
  max-height: none;
  border-radius: 0;
}

/* 侧边栏 */
.chat-sidebar {
  width: 260px;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--transition-base);
}

.chat-sidebar.collapsed {
  width: 48px;
}

.chat-sidebar.collapsed .sidebar-header {
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding: 10px 8px;
  gap: 8px;
}

.chat-sidebar.collapsed .sidebar-header-actions {
  flex-direction: column;
  width: 100%;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-primary);
}

.sidebar-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.new-chat-btn,
.sidebar-toggle-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.new-chat-btn:hover,
.sidebar-toggle-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #0F172A;
  letter-spacing: -0.01em;
}


.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 6px;
  border: 1px solid transparent;
  position: relative;
}

.conversation-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: var(--color-accent);
  border-radius: 0 2px 2px 0;
  transition: height var(--transition-fast);
}

.conversation-item:hover {
  background: var(--color-accent-light);
}

.conversation-item.active {
  background: var(--color-accent-light);
}

.conversation-item.active::before {
  height: 60%;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
  letter-spacing: -0.01em;
}

.conversation-preview {
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.delete-conversation-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: #94A3B8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
}

.conversation-item:hover .delete-conversation-btn {
  opacity: 1;
}

.delete-conversation-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

/* 主聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部 */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-accent-light);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chat-title {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.chat-title h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.chat-status {
  font-size: 11px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.header-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.15) !important;
  color: var(--color-error) !important;
}

.chat-status.online::before {
  content: '';
  width: 6px;
  height: 6px;
  background: var(--color-success);
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 消息列表 - ChatGPT 风格：居中、最大宽度 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px 32px;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chat-messages::-webkit-scrollbar {
  width: 8px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 4px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  flex: 1;
  min-height: 200px;
  color: var(--color-text-secondary);
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: var(--color-accent-light);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.chat-empty p {
  font-size: 15px;
  color: var(--color-text-secondary);
  margin: 0;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
  justify-content: center;
}

.quick-actions button {
  padding: 10px 18px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}

.quick-actions button:hover {
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-color: rgba(37, 99, 235, 0.3);
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  animation: messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  max-width: 768px;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
}

.message.user .message-avatar {
  background: var(--color-accent);
  color: white;
  border-color: transparent;
}

.message.assistant .message-avatar {
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-color: transparent;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message.user .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-text {
  background: white;
  padding: 14px 18px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.65;
  font-size: 14px;
  color: #1E293B;
  border: 1px solid #E2E8F0;
}

.message.user .message-text {
  background: #10A37F;
  color: white;
  border-color: transparent;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

/* AI 消息 Markdown 样式 */
.message-text-ai {
  white-space: normal;
  line-height: 1.75;
}

.message-text-ai :deep(p) {
  margin: 0 0 0.75em 0;
}

.message-text-ai :deep(p:last-child) {
  margin-bottom: 0;
}

.message-text-ai :deep(pre) {
  margin: 0.75em 0;
  padding: 1rem;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
}

.message-text-ai :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9em;
}

.message-text-ai :deep(pre code) {
  background: transparent;
  padding: 0;
}

.message-text-ai :deep(ul),
.message-text-ai :deep(ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.message-text-ai :deep(blockquote) {
  margin: 0.5em 0;
  padding-left: 1em;
  border-left: 4px solid #E2E8F0;
  color: #64748B;
}

.message-text-ai :deep(table) {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  margin: 0.5em 0;
}

.message-text-ai :deep(th),
.message-text-ai :deep(td) {
  border: 1px solid #E2E8F0;
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.message-text-ai :deep(th) {
  background: #F8FAFC;
  font-weight: 600;
}

.message-text-ai :deep(a) {
  color: #2563EB;
  text-decoration: underline;
}

.message-text-ai :deep(h1),
.message-text-ai :deep(h2),
.message-text-ai :deep(h3) {
  margin: 1em 0 0.5em 0;
  font-weight: 600;
  line-height: 1.3;
}

.message-text-ai :deep(h1) { font-size: 1.25em; }
.message-text-ai :deep(h2) { font-size: 1.15em; }
.message-text-ai :deep(h3) { font-size: 1.05em; }

.message-time {
  font-size: 11px;
  color: #94A3B8;
  margin-top: 6px;
  padding: 0 6px;
  font-weight: 500;
}

/* 输入中动画 */
.typing {
  display: flex;
  gap: 5px;
  padding: 18px;
}

.typing span {
  width: 8px;
  height: 8px;
  background: var(--color-accent);
  border-radius: 50%;
  animation: typing 1.4s ease-in-out infinite;
}

.typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.6;
  }
  30% {
    transform: translateY(-12px) scale(1.1);
    opacity: 1;
  }
}

/* 输入框 */
.chat-input-container {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  background: white;
  border-top: 1px solid #E2E8F0;
}

.chat-input {
  flex: 1;
  padding: 14px 18px;
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  font-size: 14px;
  resize: none;
  max-height: 120px;
  font-family: inherit;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: #F8FAFC;
  color: #1E293B;
  line-height: 1.5;
}

.chat-input::placeholder {
  color: #94A3B8;
}

.chat-input:focus {
  outline: none;
  border-color: var(--color-accent);
  background: var(--color-bg-primary);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.send-btn {
  width: 48px;
  height: 48px;
  background: #10A37F;
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: #0d8a6a;
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 底部提示 */
.chat-footer {
  padding: 14px 24px;
  background: rgba(245, 158, 11, 0.08);
  border-top: 1px solid rgba(245, 158, 11, 0.2);
}

.footer-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--color-warning);
}

.warning-icon {
  flex-shrink: 0;
  color: var(--color-warning);
}

.footer-text {
  flex: 1;
  font-weight: 500;
}

.link-btn {
  background: none;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.link-btn:hover {
  background: var(--color-accent-light);
  color: var(--color-accent-hover);
}

/* 过渡动画 */
.chat-window-enter-active,
.chat-window-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-window-enter-active .chat-window,
.chat-window-leave-active .chat-window {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-window-enter-from,
.chat-window-leave-to {
  opacity: 0;
}

.chat-window-enter-from .chat-window {
  transform: scale(0.92) translateY(30px);
}

.chat-window-leave-to .chat-window {
  transform: scale(0.92) translateY(30px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .chat-window {
    max-width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }

  .chat-window-overlay {
    padding: 0;
  }

  .chat-sidebar {
    display: none;
  }

  .chat-sidebar.collapsed {
    display: none;
  }

  .message-content {
    max-width: 85%;
  }

  .chat-messages {
    padding: 16px;
  }

  .chat-input-container {
    padding: 16px;
  }

}

@media (max-width: 480px) {
  .message-content {
    max-width: 90%;
  }

  .quick-actions {
    flex-direction: column;
    width: 100%;
  }

  .quick-actions button {
    width: 100%;
  }
}
</style>
