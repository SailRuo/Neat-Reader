/**
 * 获取 AI 调用凭证
 * 根据设置中的 ai.mode 返回 OAuth 或 自定义 API 配置
 * 当本地无自定义配置时，会尝试从后端加载（重启后可用）
 */
import { computed, shallowRef } from 'vue'
import { useEbookStore } from '../stores/ebook'
import { qwenTokenManager } from '../utils/qwenTokenManager'
import { getCustomAPIConfigFromBackend } from '../api/qwen'
import type { CustomAPIConfig } from '../api/qwen'

export type AICredentials =
  | { type: 'oauth'; accessToken: string; resourceUrl: string }
  | { type: 'custom'; config: CustomAPIConfig }
  | null

export function useAICredentials() {
  const ebookStore = useEbookStore()
  const backendConfig = shallowRef<CustomAPIConfig | null>(null)

  const credentials = computed<AICredentials>(() => {
    const ai = ebookStore.userConfig.ai
    const mode = ai?.mode ?? 'oauth'

    if (mode === 'custom') {
      const custom = ai?.custom
      if (custom?.baseUrl && custom?.apiKey && custom?.modelId) {
        return {
          type: 'custom',
          config: {
            base_url: custom.baseUrl.trim(),
            api_key: custom.apiKey.trim(),
            model_id: custom.modelId.trim()
          }
        }
      }
      if (backendConfig.value?.base_url && backendConfig.value?.api_key && backendConfig.value?.model_id) {
        return { type: 'custom', config: backendConfig.value }
      }
      return null
    }

    // OAuth 模式
    const token = qwenTokenManager.getAccessToken()
    const resourceUrl = qwenTokenManager.getResourceUrl()
    if (token && !qwenTokenManager.isTokenExpired()) {
      return {
        type: 'oauth',
        accessToken: token,
        resourceUrl: resourceUrl || ''
      }
    }
    return null
  })

  const hasCredentials = computed(() => !!credentials.value)
  const isExpired = computed(() => {
    if (credentials.value?.type === 'oauth') {
      return qwenTokenManager.isTokenExpired()
    }
    return false
  })

  async function loadFromBackend() {
    if (backendConfig.value) return
    try {
      const saved = await getCustomAPIConfigFromBackend()
      if (saved) backendConfig.value = saved
    } catch {
      // 忽略网络错误
    }
  }

  return { credentials, hasCredentials, isExpired, loadFromBackend }
}
