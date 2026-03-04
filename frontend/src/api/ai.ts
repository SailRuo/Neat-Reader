import service, { API_BASE_URL } from './request'

const API_BASE = '/api/ai'

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

/** 自定义 API 配置（OpenAI 兼容） */
export interface CustomAPIConfig {
  base_url: string
  api_key: string
  model_id: string
}

/**
 * 启动 Device Code Flow
 */
export async function startDeviceAuth(): Promise<QwenDeviceAuthResponse> {
  const response = await service.post(`${API_BASE}/device-auth`)
  return response.data
}

/**
 * 轮询获取 token
 */
export async function pollForToken(sessionId: string): Promise<QwenPollResponse> {
  const response = await service.post(`${API_BASE}/poll-token`, { session_id: sessionId })
  return response.data
}

/**
 * 刷新 token
 */
export async function refreshToken(refreshToken: string): Promise<QwenTokenResponse> {
  const response = await service.post(`${API_BASE}/refresh`, { refresh_token: refreshToken })
  return response.data
}

/**
 * 保存 Qwen Token 到后端。
 * 用户授权/刷新后调用，后端会存到 data/qwen_token.json，调用 Qwen 时若前端未传 token 则使用已存 token。
 */
export async function saveQwenToken(params: {
  access_token: string
  refresh_token?: string
  expires_at?: number
  resource_url?: string
}): Promise<void> {
  await service.post(`${API_BASE}/token`, params)
}

/**
 * 获取可用的模型列表
 */
export async function listModels(accessToken: string, resourceUrl?: string): Promise<QwenModelsResponse> {
  const response = await service.post(`${API_BASE}/models`, {
    access_token: accessToken,
    resource_url: resourceUrl
  })
  return response.data
}

/**
 * 测试 Qwen API（流式）- 支持会话历史（默认混合模式）
 * 支持 OAuth 模式(accessToken+resourceUrl) 或 自定义 API 模式(custom_api 对象)
 */
export async function chatStream(
  accessTokenOrConfig: string | CustomAPIConfig,
  message: string,
  resourceUrl?: string,
  images?: string[],  // 图片 Base64 数组
  onChunk?: (content: string) => void,
  chatHistory?: Array<{role: string, content: string}>,  // 对话历史
  conversationId?: string,  // 会话 ID
  saveToBackend: boolean = true,  // 默认启用后端存储（混合模式）
  abortController?: AbortController // 用于终止请求
): Promise<void> {
  // 构建消息数组
  const messages: Array<{role: string, content: string}> = []
  
  // 添加历史记录
  if (chatHistory && chatHistory.length > 0) {
    messages.push(...chatHistory)
  }
  
  // 添加当前消息
  messages.push({
    role: 'user',
    content: message
  })
  
  const isCustom = typeof accessTokenOrConfig === 'object'
  const body: Record<string, unknown> = {
    messages,
    images,
    conversation_id: conversationId,
    save_to_backend: saveToBackend
  }
  if (isCustom) {
    body.custom_api = accessTokenOrConfig
  } else {
    body.access_token = accessTokenOrConfig
    body.resource_url = resourceUrl
  }
  
  const response = await fetch(`${API_BASE_URL}${API_BASE}/chat-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: abortController?.signal
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
      // 💡 检查信号是否已中止
      if (abortController?.signal.aborted) {
        console.log('🛑 [chatStream] 请求已被手动中止')
        break
      }

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
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      console.log('ℹ️ [chatStream] 捕获到 AbortError，流已正常关闭')
      return
    }
    if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
      throw e
    }
  } finally {
    try {
      if (reader) {
        await reader.cancel()
        reader.releaseLock()
      }
    } catch (cancelError) {
      // 忽略取消流时的错误
    }
  }
}

/**
 * 测试 AI API（OAuth 模式）
 */
export async function testAIAPI(accessToken: string, message?: string, resourceUrl?: string): Promise<QwenTestResponse> {
  const response = await service.post(`${API_BASE}/test`, {
    access_token: accessToken,
    message,
    resource_url: resourceUrl
  })
  return response.data
}

/**
 * 测试自定义 API（OpenAI 兼容格式）
 */
export async function testCustomAPI(config: CustomAPIConfig): Promise<QwenTestResponse> {
  const response = await service.post(`${API_BASE}/test-custom`, config)
  return response.data
}

/**
 * 从后端获取已保存的自定义 API 配置（用于同步/恢复）
 */
export async function getCustomAPIConfigFromBackend(): Promise<CustomAPIConfig | null> {
  const response = await service.get(`${API_BASE}/custom-api`)
  if (response.data?.has_config && response.data?.base_url && response.data?.api_key && response.data?.model_id) {
    return {
      base_url: response.data.base_url,
      api_key: response.data.api_key,
      model_id: response.data.model_id
    }
  }
  return null
}

/**
 * 保存自定义 API 配置到后端。
 * 后端会写入 data/auth_tokens.json，重启后仍可使用。
 */
export async function saveCustomAPIConfigToBackend(config: CustomAPIConfig): Promise<void> {
  await service.post(`${API_BASE}/custom-api`, config)
}

export interface CustomModelsResponse {
  success: boolean
  cached: boolean
  base_url: string
  fetched_at?: number
  models: unknown
}

export async function listCustomModelsFromBackend(params?: {
  base_url?: string
  api_key?: string
}): Promise<CustomModelsResponse> {
  const response = await service.post(`${API_BASE}/custom-models`, params || {})
  return response.data
}

/**
 * 清除后端保存的自定义 API 配置
 */
export async function clearCustomAPIConfigFromBackend(): Promise<void> {
  await service.delete(`${API_BASE}/custom-api`)
}
