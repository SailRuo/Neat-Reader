/**
 * 会话管理 API
 * 与后端 LangChain 会话管理系统交互
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_PYTHON_BACKEND_URL || 'http://localhost:3001'

export interface ConversationContext {
  book_id?: string
  book_title?: string
  [key: string]: any
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  metadata?: Record<string, any>
}

export interface Conversation {
  id: string
  user_id?: string
  title: string
  context?: ConversationContext
  messages: Message[]
  created_at: number
  updated_at: number
  message_count: number
}

export interface ConversationSummary {
  id: string
  title: string
  message_count: number
  created_at: number
  updated_at: number
  context?: ConversationContext
}

/**
 * 创建新会话
 */
export async function createConversation(
  conversationId: string,
  title: string = '新对话',
  context?: ConversationContext,
  userId?: string
): Promise<Conversation> {
  const response = await axios.post(`${API_BASE_URL}/api/conversation/create`, {
    conversation_id: conversationId,
    user_id: userId,
    title,
    context
  })
  
  if (!response.data.success) {
    throw new Error('创建会话失败')
  }
  
  return response.data.conversation
}

/**
 * 获取会话详情
 */
export async function getConversation(conversationId: string): Promise<Conversation> {
  const response = await axios.get(`${API_BASE_URL}/api/conversation/get/${conversationId}`)
  
  if (!response.data.success) {
    throw new Error('获取会话失败')
  }
  
  return response.data.conversation
}

/**
 * 添加消息到会话
 */
export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: Record<string, any>
): Promise<void> {
  const response = await axios.post(`${API_BASE_URL}/api/conversation/messages/add`, {
    conversation_id: conversationId,
    role,
    content,
    metadata
  })
  
  if (!response.data.success) {
    throw new Error('添加消息失败')
  }
}

/**
 * 获取会话消息
 */
export async function getMessages(
  conversationId: string,
  limit?: number
): Promise<Message[]> {
  const response = await axios.post(`${API_BASE_URL}/api/conversation/messages/get`, {
    conversation_id: conversationId,
    limit
  })
  
  if (!response.data.success) {
    throw new Error('获取消息失败')
  }
  
  return response.data.messages
}

/**
 * 删除会话
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await axios.delete(`${API_BASE_URL}/api/conversation/delete/${conversationId}`)
  
  if (!response.data.success) {
    throw new Error('删除会话失败')
  }
}

/**
 * 列出会话列表
 */
export async function listConversations(
  userId?: string,
  limit: number = 50
): Promise<ConversationSummary[]> {
  const params: Record<string, any> = { limit }
  if (userId) {
    params.user_id = userId
  }
  
  const response = await axios.get(`${API_BASE_URL}/api/conversation/list`, { params })
  
  if (!response.data.success) {
    throw new Error('列出会话失败')
  }
  
  return response.data.conversations
}

/**
 * 清理旧会话
 */
export async function clearOldConversations(days: number = 30): Promise<number> {
  const response = await axios.post(`${API_BASE_URL}/api/conversation/clear-old`, null, {
    params: { days }
  })
  
  if (!response.data.success) {
    throw new Error('清理旧会话失败')
  }
  
  return response.data.deleted_count
}

/**
 * 同步会话到百度网盘
 */
export async function syncToBaidu(conversationId?: string): Promise<{success: number, failed: number}> {
  const response = await axios.post(`${API_BASE_URL}/api/conversation/sync/to-baidu`, null, {
    params: conversationId ? { conversation_id: conversationId } : {}
  })
  
  if (!response.data.success) {
    throw new Error('同步到百度网盘失败')
  }
  
  return response.data.result
}

/**
 * 从百度网盘同步会话
 */
export async function syncFromBaidu(): Promise<{success: number, failed: number}> {
  const response = await axios.post(`${API_BASE_URL}/api/conversation/sync/from-baidu`)
  
  if (!response.data.success) {
    throw new Error('从百度网盘同步失败')
  }
  
  return response.data.result
}

/**
 * 启用百度网盘同步
 */
export async function enableBaiduSync(): Promise<void> {
  const response = await axios.post(`${API_BASE_URL}/api/conversation/sync/enable`)
  
  if (!response.data.success) {
    throw new Error('启用百度网盘同步失败')
  }
}

/**
 * 禁用百度网盘同步
 */
export async function disableBaiduSync(): Promise<void> {
  const response = await axios.post(`${API_BASE_URL}/api/conversation/sync/disable`)
  
  if (!response.data.success) {
    throw new Error('禁用百度网盘同步失败')
  }
}
