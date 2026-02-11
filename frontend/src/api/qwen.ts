import axios from 'axios'

const API_BASE = '/api/qwen'

export interface QwenTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  resource_url?: string
}

export interface QwenDeviceAuthResponse {
  session_id: string
  user_code: string
  auth_url: string
  verification_uri: string
  expires_in: number
  interval: number
}

export interface QwenPollResponse {
  status: 'pending' | 'success'
  slow_down?: boolean
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  resource_url?: string  // 添加 resource_url
}

export interface QwenTestResponse {
  success: boolean
  response: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface QwenModel {
  id: string
  object: string
  created: number
  owned_by: string
}

export interface QwenModelsResponse {
  object: string
  data: QwenModel[]
}

/**
 * 启动 Device Code Flow
 */
export async function startDeviceAuth(): Promise<QwenDeviceAuthResponse> {
  const response = await axios.post(`${API_BASE}/device-auth`)
  return response.data
}

/**
 * 轮询获取 token
 */
export async function pollForToken(sessionId: string): Promise<QwenPollResponse> {
  const response = await axios.post(`${API_BASE}/poll-token`, { session_id: sessionId })
  return response.data
}

/**
 * 刷新 token
 */
export async function refreshToken(refreshToken: string): Promise<QwenTokenResponse> {
  const response = await axios.post(`${API_BASE}/refresh`, { refresh_token: refreshToken })
  return response.data
}

/**
 * 获取可用的模型列表
 */
export async function listModels(accessToken: string, resourceUrl?: string): Promise<QwenModelsResponse> {
  const response = await axios.post(`${API_BASE}/models`, {
    access_token: accessToken,
    resource_url: resourceUrl
  })
  return response.data
}

/**
 * 测试 Qwen API（流式）
 */
export async function chatStream(
  accessToken: string, 
  message: string, 
  resourceUrl?: string,
  images?: string[],  // 新增：图片 Base64 数组
  onChunk?: (content: string) => void
): Promise<void> {
  const response = await fetch(`${API_BASE}/chat-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: accessToken,
      message,
      images,  // 传递图片数据
      resource_url: resourceUrl
    })
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('无法获取响应流')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          
          if (data === '[DONE]') {
            return
          }
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.content && onChunk) {
              onChunk(parsed.content)
            }
            if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * 测试 Qwen API
 */
export async function testQwenAPI(accessToken: string, message?: string, resourceUrl?: string): Promise<QwenTestResponse> {
  const response = await axios.post(`${API_BASE}/test`, {
    access_token: accessToken,
    message,
    resource_url: resourceUrl
  })
  return response.data
}
