<template>
  <Teleport to="body">
    <Transition name="chat-window">
      <div v-if="isVisible" class="chat-window-overlay" @click.self="close">
        <div class="chat-window">
          <!-- 侧边栏：对话列表 -->
          <div class="chat-sidebar">
            <div class="sidebar-header">
              <h3>对话历史</h3>
              <button class="new-chat-btn" @click="createNewConversation" title="新建对话">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
            <div class="conversations-list">
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 主聊天区域 -->
          <div class="chat-main">
            <!-- 头部 -->
            <div class="chat-header">
              <div class="chat-header-left">
                <div class="chat-icon">🤖</div>
                <div class="chat-title">
                  <h3>{{ currentConversation?.title || 'Qwen AI 助手' }}</h3>
                  <span class="chat-status" :class="{ online: isOnline }">
                    {{ isOnline ? '在线' : '离线' }}
                  </span>
                </div>
              </div>
              <button class="close-btn" @click="close" title="关闭">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- 消息列表 -->
            <div class="chat-messages" ref="messagesContainer" @paste="handlePaste">
              <div v-if="currentMessages.length === 0" class="chat-empty">
                <div class="empty-icon">💬</div>
                <p>开始与 Qwen AI 对话吧！</p>
                <div class="quick-actions">
                  <button @click="sendQuickMessage('介绍一下你自己')">介绍自己</button>
                  <button @click="sendQuickMessage('推荐几本好书')">推荐好书</button>
                  <button @click="sendQuickMessage('如何提高阅读效率？')">阅读技巧</button>
                </div>
              </div>

              <div v-for="(msg, index) in currentMessages" :key="index" class="message" :class="msg.role">
                <div class="message-avatar">
                  {{ msg.role === 'user' ? '👤' : '🤖' }}
                </div>
                <div class="message-content">
                  <!-- 图片消息 -->
                  <div v-if="msg.images && msg.images.length > 0" class="message-images">
                    <img 
                      v-for="(img, imgIndex) in msg.images" 
                      :key="imgIndex"
                      :src="img" 
                      class="message-image"
                      @click="previewImage(img)"
                    />
                  </div>
                  <!-- 文本消息 -->
                  <div class="message-text">{{ msg.content }}</div>
                  <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
                </div>
              </div>

              <div v-if="isLoading" class="message assistant">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                  <div class="message-text typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 图片预览区 -->
            <div v-if="pendingImages.length > 0" class="pending-images">
              <div class="pending-images-header">
                <span>待发送图片 ({{ pendingImages.length }})</span>
                <button @click="clearPendingImages" class="clear-images-btn">清空</button>
              </div>
              <div class="pending-images-list">
                <div v-for="(img, index) in pendingImages" :key="index" class="pending-image-item">
                  <img :src="img" class="pending-image-preview" />
                  <button @click="removePendingImage(index)" class="remove-image-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- 输入框 -->
            <div class="chat-input-container">
              <button class="attach-btn" @click="triggerImageUpload" title="上传图片">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </button>
              <textarea
                v-model="inputMessage"
                class="chat-input"
                placeholder="输入消息... (Ctrl+V 粘贴图片)"
                rows="1"
                @keydown.enter.exact.prevent="sendMessage"
                @keydown.enter.shift.exact="inputMessage += '\n'"
                ref="inputRef"
              ></textarea>
              <button 
                class="send-btn" 
                @click="sendMessage"
                :disabled="(!inputMessage.trim() && pendingImages.length === 0) || isLoading || !isOnline"
                title="发送 (Enter)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>

            <!-- 底部提示 -->
            <div v-if="!isOnline" class="chat-footer">
              <span class="warning-icon">⚠️</span>
              <span>请先在设置中完成 Qwen AI 授权</span>
              <button class="link-btn" @click="goToSettings">前往设置</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 图片预览模态框 -->
    <Transition name="fade">
      <div v-if="previewImageUrl" class="image-preview-modal" @click="closeImagePreview">
        <img :src="previewImageUrl" class="preview-image" @click.stop />
        <button class="preview-close-btn" @click="closeImagePreview">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </Transition>

    <!-- 隐藏的文件输入 -->
    <input 
      type="file" 
      ref="fileInputRef"
      @change="handleFileSelect"
      accept="image/*"
      multiple
      style="display: none"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as qwenAPI from '../../api/qwen'
import { qwenTokenManager } from '../../utils/qwenTokenManager'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  images?: string[]
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
}>()

const router = useRouter()
const messagesContainer = ref<HTMLElement>()
const inputRef = ref<HTMLTextAreaElement>()
const fileInputRef = ref<HTMLInputElement>()
const inputMessage = ref('')
const isLoading = ref(false)
const pendingImages = ref<string[]>([])
const previewImageUrl = ref('')

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

// 检查是否已授权
const isOnline = computed(() => {
  const token = qwenTokenManager.getAccessToken()
  return !!token && !qwenTokenManager.isTokenExpired()
})

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
  router.push('/settings')
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

// 触发图片上传
const triggerImageUpload = () => {
  fileInputRef.value?.click()
}

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (files) {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            pendingImages.value.push(e.target.result as string)
          }
        }
        reader.readAsDataURL(file)
      }
    })
  }
  
  // 清空文件输入
  if (target) {
    target.value = ''
  }
}

// 处理粘贴
const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (!items) return
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            pendingImages.value.push(e.target.result as string)
          }
        }
        reader.readAsDataURL(file)
      }
    }
  }
}

// 清空待发送图片
const clearPendingImages = () => {
  pendingImages.value = []
}

// 移除单个待发送图片
const removePendingImage = (index: number) => {
  pendingImages.value.splice(index, 1)
}

// 预览图片
const previewImage = (url: string) => {
  previewImageUrl.value = url
}

// 关闭图片预览
const closeImagePreview = () => {
  previewImageUrl.value = ''
}

// 发送快捷消息
const sendQuickMessage = (text: string) => {
  inputMessage.value = text
  sendMessage()
}

// 发送消息
const sendMessage = async () => {
  if ((!inputMessage.value.trim() && pendingImages.value.length === 0) || !isOnline.value) {
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
  const images = [...pendingImages.value]
  inputMessage.value = ''
  pendingImages.value = []

  // 添加用户消息
  conv.messages.push({
    role: 'user',
    content: userMessage || '(发送了图片)',
    timestamp: Date.now(),
    images: images.length > 0 ? images : undefined
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
    const accessToken = qwenTokenManager.getAccessToken() || ''
    const resourceUrl = qwenTokenManager.getResourceUrl() || ''

    // 构建完整的提示词（如果有书籍上下文）
    let fullPrompt = userMessage || '请描述这张图片'
    if (props.bookContext && props.bookTitle) {
      fullPrompt = `你是一个阅读助手，正在帮助用户理解《${props.bookTitle}》这本书。\n\n书籍信息：\n${props.bookContext}\n\n用户问题：${fullPrompt}\n\n请基于书籍内容回答用户的问题。`
      console.log('📖 [ChatWindow] 使用书籍上下文，书名:', props.bookTitle)
    }

    // 使用流式 API
    await qwenAPI.chatStream(
      accessToken,
      fullPrompt,
      resourceUrl,
      (chunk) => {
        // 实时更新 AI 消息内容
        conv.messages[aiMessageIndex].content += chunk
        scrollToBottom()
      }
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.chat-window {
  width: 100%;
  max-width: 1000px;
  height: 80vh;
  max-height: 700px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  overflow: hidden;
}

/* 侧边栏 */
.chat-sidebar {
  width: 260px;
  background: linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%);
  border-right: 1px solid #E8E8E8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #E8E8E8;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1E293B;
}

.new-chat-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
  border: 1px solid transparent;
}

.conversation-item:hover {
  background: rgba(74, 144, 226, 0.05);
  border-color: rgba(74, 144, 226, 0.2);
}

.conversation-item.active {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(74, 144, 226, 0.05));
  border-color: #4A90E2;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-size: 14px;
  font-weight: 600;
  color: #1E293B;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.conversation-preview {
  font-size: 12px;
  color: #64748B;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-conversation-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: #94A3B8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  opacity: 0;
}

.conversation-item:hover .delete-conversation-btn {
  opacity: 1;
}

.delete-conversation-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444;
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
  padding: 16px 20px;
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  color: white;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-icon {
  font-size: 32px;
  line-height: 1;
}

.chat-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.chat-status {
  font-size: 12px;
  opacity: 0.8;
}

.chat-status.online {
  opacity: 1;
}

.chat-status.online::before {
  content: '●';
  color: #67C23A;
  margin-right: 4px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 消息列表 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #F5F7FA;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
  justify-content: center;
}

.quick-actions button {
  padding: 8px 16px;
  background: white;
  border: 1px solid #DCDFE6;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  transition: all 0.2s;
}

.quick-actions button:hover {
  background: #4A90E2;
  color: white;
  border-color: #4A90E2;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  animation: messageSlideIn 0.3s ease;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
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
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-content {
  flex: 1;
  max-width: 70%;
}

.message.user .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.message-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
  object-fit: cover;
}

.message-image:hover {
  transform: scale(1.05);
}

.message-text {
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.6;
}

.message.user .message-text {
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  color: white;
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  padding: 0 4px;
}

/* 输入中动画 */
.typing {
  display: flex;
  gap: 4px;
  padding: 16px;
}

.typing span {
  width: 8px;
  height: 8px;
  background: #4A90E2;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

/* 待发送图片 */
.pending-images {
  background: white;
  border-top: 1px solid #E8E8E8;
  padding: 12px 20px;
}

.pending-images-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #64748B;
  font-weight: 500;
}

.clear-images-btn {
  background: none;
  border: none;
  color: #EF4444;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.clear-images-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

.pending-images-list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.pending-image-item {
  position: relative;
  flex-shrink: 0;
}

.pending-image-preview {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #E8E8E8;
}

.remove-image-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #EF4444;
  border: 2px solid white;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.remove-image-btn:hover {
  transform: scale(1.1);
}

/* 输入框 */
.chat-input-container {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #E8E8E8;
}

.attach-btn {
  width: 44px;
  height: 44px;
  background: #F5F7FA;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  color: #64748B;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.attach-btn:hover {
  background: #E8E8E8;
  color: #4A90E2;
}

.chat-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #DCDFE6;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
  max-height: 120px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.chat-input:focus {
  outline: none;
  border-color: #4A90E2;
}

.send-btn {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 底部提示 */
.chat-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #FFF3E0;
  border-top: 1px solid #FFE0B2;
  font-size: 14px;
  color: #E65100;
}

.warning-icon {
  font-size: 16px;
}

.link-btn {
  background: none;
  border: none;
  color: #4A90E2;
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
  padding: 0;
  margin-left: auto;
}

.link-btn:hover {
  color: #357ABD;
}

/* 图片预览模态框 */
.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 40px;
}

.preview-image {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  border-radius: 8px;
}

.preview-close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.preview-close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 过渡动画 */
.chat-window-enter-active,
.chat-window-leave-active {
  transition: opacity 0.3s ease;
}

.chat-window-enter-active .chat-window,
.chat-window-leave-active .chat-window {
  transition: transform 0.3s ease;
}

.chat-window-enter-from,
.chat-window-leave-to {
  opacity: 0;
}

.chat-window-enter-from .chat-window {
  transform: scale(0.9) translateY(20px);
}

.chat-window-leave-to .chat-window {
  transform: scale(0.9) translateY(20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
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

  .message-content {
    max-width: 80%;
  }
}
</style>
