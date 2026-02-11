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
            <div class="chat-messages" ref="messagesContainer">
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
                @paste="handlePaste"
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
              <div class="footer-content">
                <span class="warning-icon">⚠️</span>
                <span class="footer-text">请先在设置中完成 Qwen AI 授权</span>
                <button class="link-btn" @click="goToSettings">
                  前往设置
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </div>
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

// 压缩图片（更激进的压缩策略）
const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // 计算缩放比例（更激进）
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = (height * maxWidth) / width
            width = maxWidth
          } else {
            width = (width * maxWidth) / height
            height = maxWidth
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法获取 canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // 转换为 Base64，使用 JPEG 格式压缩
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
        
        // 检查压缩后的大小
        const sizeInKB = (compressedBase64.length * 0.75) / 1024
        console.log('图片压缩完成', {
          原始尺寸: `${img.width}x${img.height}`,
          压缩后尺寸: `${width}x${height}`,
          原始大小: `${(file.size / 1024).toFixed(2)}KB`,
          压缩后大小: `${sizeInKB.toFixed(2)}KB`
        })
        
        // 如果压缩后仍然太大（> 500KB），进一步压缩
        if (sizeInKB > 500 && quality > 0.3) {
          console.warn('图片仍然较大，进行二次压缩...')
          const furtherCompressed = canvas.toDataURL('image/jpeg', 0.5)
          resolve(furtherCompressed)
        } else {
          resolve(compressedBase64)
        }
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (files) {
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        try {
          // 更激进的压缩（最大 800px，质量 0.7）
          const compressedBase64 = await compressImage(file, 800, 0.7)
          pendingImages.value.push(compressedBase64)
        } catch (error) {
          console.error('图片压缩失败:', error)
          alert(`图片 "${file.name}" 处理失败，请尝试更小的图片`)
        }
      }
    }
  }
  
  // 清空文件输入
  if (target) {
    target.value = ''
  }
}

// 处理粘贴
const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (!items) return
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (file) {
        try {
          // 更激进的压缩（最大 800px，质量 0.7）
          const compressedBase64 = await compressImage(file, 800, 0.7)
          pendingImages.value.push(compressedBase64)
        } catch (error) {
          console.error('图片压缩失败:', error)
          alert('粘贴的图片处理失败，请尝试更小的图片')
        }
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

    // 使用流式 API，传递图片数据
    console.log('📤 发送消息到 Qwen API', {
      hasImages: images.length > 0,
      imageCount: images.length,
      firstImagePrefix: images[0]?.substring(0, 50),
      messageLength: fullPrompt.length
    });
    
    await qwenAPI.chatStream(
      accessToken,
      fullPrompt,
      resourceUrl,
      images.length > 0 ? images : undefined,  // 传递图片 Base64 数组
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
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.chat-window {
  width: 100%;
  max-width: 1100px;
  height: 85vh;
  max-height: 800px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25), 0 0 1px rgba(0, 0, 0, 0.1);
  display: flex;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.8);
}

/* 侧边栏 */
.chat-sidebar {
  width: 280px;
  background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%);
  border-right: 1px solid #E2E8F0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  border-bottom: 1px solid #E2E8F0;
  background: white;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #0F172A;
  letter-spacing: -0.01em;
}

.new-chat-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
}

.new-chat-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, #2563EB, #1D4ED8);
}

.new-chat-btn:active {
  transform: translateY(0);
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 8px;
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
  background: linear-gradient(180deg, #3B82F6, #2563EB);
  border-radius: 0 2px 2px 0;
  transition: height 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.conversation-item:hover {
  background: rgba(59, 130, 246, 0.06);
  border-color: rgba(59, 130, 246, 0.15);
}

.conversation-item.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.06));
  border-color: rgba(59, 130, 246, 0.3);
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
  color: #0F172A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
  letter-spacing: -0.01em;
}

.conversation-preview {
  font-size: 12px;
  color: #64748B;
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
  color: #EF4444;
  transform: scale(1.05);
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
  padding: 20px 24px;
  background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.chat-icon {
  font-size: 36px;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.chat-title h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.chat-status {
  font-size: 12px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.chat-status.online::before {
  content: '';
  width: 6px;
  height: 6px;
  background: #10B981;
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

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.close-btn:active {
  transform: scale(0.95);
}

/* 消息列表 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%);
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
  height: 100%;
  color: #64748B;
  text-align: center;
}

.empty-icon {
  font-size: 72px;
  margin-bottom: 20px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.05));
}

.chat-empty p {
  font-size: 15px;
  color: #475569;
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
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  color: #475569;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.quick-actions button:hover {
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: white;
  border-color: transparent;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.quick-actions button:active {
  transform: translateY(0);
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  animation: messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
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
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 2px solid #F1F5F9;
}

.message.user .message-avatar {
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  border-color: rgba(59, 130, 246, 0.2);
}

.message-content {
  flex: 1;
  max-width: 75%;
}

.message.user .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.message-image {
  max-width: 220px;
  max-height: 220px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  object-fit: cover;
  border: 2px solid #E2E8F0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.message-image:hover {
  transform: scale(1.03);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: #3B82F6;
}

.message-text {
  background: white;
  padding: 14px 18px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.65;
  font-size: 14px;
  color: #1E293B;
  border: 1px solid #F1F5F9;
}

.message.user .message-text {
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

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
  width: 9px;
  height: 9px;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  border-radius: 50%;
  animation: typing 1.4s ease-in-out infinite;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
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

/* 待发送图片 */
.pending-images {
  background: white;
  border-top: 1px solid #E2E8F0;
  padding: 16px 24px;
}

.pending-images-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 13px;
  color: #475569;
  font-weight: 600;
}

.clear-images-btn {
  background: none;
  border: none;
  color: #EF4444;
  cursor: pointer;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
}

.clear-images-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

.pending-images-list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.pending-images-list::-webkit-scrollbar {
  height: 6px;
}

.pending-images-list::-webkit-scrollbar-track {
  background: #F1F5F9;
  border-radius: 3px;
}

.pending-images-list::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 3px;
}

.pending-image-item {
  position: relative;
  flex-shrink: 0;
}

.pending-image-preview {
  width: 90px;
  height: 90px;
  object-fit: cover;
  border-radius: 12px;
  border: 2px solid #E2E8F0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.pending-image-item:hover .pending-image-preview {
  border-color: #3B82F6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.remove-image-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #EF4444;
  border: 2px solid white;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

.remove-image-btn:hover {
  transform: scale(1.15);
  background: #DC2626;
}

.remove-image-btn:active {
  transform: scale(1);
}

/* 输入框 */
.chat-input-container {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  background: white;
  border-top: 1px solid #E2E8F0;
}

.attach-btn {
  width: 48px;
  height: 48px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  color: #64748B;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.attach-btn:hover {
  background: #F1F5F9;
  color: #3B82F6;
  border-color: #CBD5E1;
  transform: translateY(-1px);
}

.attach-btn:active {
  transform: translateY(0);
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
  border-color: #3B82F6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.send-btn {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  border: none;
  border-radius: 14px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, #2563EB, #1D4ED8);
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
  padding: 16px 24px;
  background: linear-gradient(135deg, #FEF3C7, #FDE68A);
  border-top: 1px solid #FCD34D;
}

.footer-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #92400E;
}

.warning-icon {
  font-size: 18px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.footer-text {
  flex: 1;
  font-weight: 500;
}

.link-btn {
  background: white;
  border: 1px solid #FCD34D;
  color: #3B82F6;
  cursor: pointer;
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.link-btn:hover {
  background: #3B82F6;
  color: white;
  border-color: #3B82F6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.link-btn:active {
  transform: translateY(0);
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
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(8px);
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
  border-radius: 12px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
}

.preview-close-btn {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.preview-close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.preview-close-btn:active {
  transform: scale(0.95);
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

  .message-content {
    max-width: 85%;
  }

  .chat-messages {
    padding: 16px;
  }

  .chat-input-container {
    padding: 16px;
  }

  .pending-images {
    padding: 12px 16px;
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
