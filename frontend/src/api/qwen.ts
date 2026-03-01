import { invoke } from '@tauri-apps/api/tauri'

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

export interface QwenTestResponse {
  success: boolean
  response: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * 获取可用的模型列表
 */
export async function listModels(apiKey: string): Promise<QwenModelsResponse> {
  return invoke('qwen_list_models', { apiKey })
}

/**
 * 聊天（流式）
 */
export async function chatStream(
  apiKey: string,
  message: string,
  images?: string[],
  onChunk?: (content: string) => void
): Promise<void> {
  const messages = [
    {
      role: 'user',
      content: message
    }
  ]
  
  // Tauri command 返回完整响应，前端模拟流式
  const response: any = await invoke('qwen_chat', {
    messages,
    model: 'qwen-turbo',
    apiKey
  })
  
  if (onChunk && response.choices?.[0]?.message?.content) {
    const content = response.choices[0].message.content
    // 模拟流式输出
    for (let i = 0; i < content.length; i += 10) {
      onChunk(content.slice(i, i + 10))
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
}

/**
 * 测试 Qwen API
 */
export async function testQwenAPI(apiKey: string, message?: string): Promise<QwenTestResponse> {
  const messages = [
    {
      role: 'user',
      content: message || '你好'
    }
  ]
  
  const response: any = await invoke('qwen_chat', {
    messages,
    model: 'qwen-turbo',
    apiKey
  })
  
  return {
    success: true,
    response: response.choices?.[0]?.message?.content || '',
    usage: response.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  }
}
