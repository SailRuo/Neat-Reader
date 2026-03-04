<template>
  <div class="settings-panel">
    <div class="settings-header">
      <h2 class="settings-title">设置</h2>
    </div>
    
    <div class="settings-content">
      <section class="setting-section">
        <h3 class="section-title">百度网盘</h3>
        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">授权状态</span>
              <span class="setting-desc" v-if="baidupanUser">已连接：{{ baidupanUser.baidu_name }}</span>
              <span class="setting-desc" v-else>点击"获取授权"按钮打开授权页面获取密钥信息</span>
            </div>
            <div class="setting-control">
              <span v-if="baidupanUser" class="status connected">已授权</span>
              <span v-else class="status disconnected">未授权</span>
            </div>
          </div>
          
          <div class="setting-row" v-if="!baidupanUser">
            <div class="setting-info" style="width: 100%;">
              <button 
                class="btn btn-secondary" 
                style="width: 100%; margin-bottom: 12px;"
                @click="getAuthorization"
              >
                获取授权
              </button>
              <input 
                type="text" 
                class="form-control" 
                v-model="refreshToken" 
                placeholder="Refresh Token（授权后自动填入或手动粘贴）" 
                style="width: 100%; margin-bottom: 12px;"
                @input="handleRefreshTokenInput"
              >
              <p v-if="isAutoConnecting" style="font-size: 12px; color: #4A90E2; margin: 0 0 12px 0;">
                检测到 Token，正在自动连接...
              </p>
            </div>
          </div>
          
          <div class="setting-row" v-else>
            <div class="setting-info" style="width: 100%;">
              <button 
                class="btn btn-primary" 
                style="width: 100%; margin-bottom: 12px;"
                @click="syncFromCloud"
                :disabled="isSyncing"
              >
                <Icons.RefreshCw :size="16" :class="{ 'spinning': isSyncing }" />
                {{ isSyncing ? '同步中...' : '同步数据' }}
              </button>
              <button 
                class="btn btn-danger" 
                style="width: 100%;"
                @click="disconnect"
              >
                取消授权
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="setting-section">
        <h3 class="section-title">AI 配置</h3>
        <div class="setting-card">
          <!-- 模式切换：OAuth / 自定义 API -->
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">接入方式</span>
              <span class="setting-desc">选择 OAuth 授权或自定义 API（OpenAI 兼容格式）</span>
            </div>
            <div class="setting-control">
              <div class="toggle-group">
                <button 
                  class="toggle-btn" 
                  :class="{ active: aiMode === 'oauth' }"
                  @click="setAIMode('oauth')"
                >OAuth 授权</button>
                <button 
                  class="toggle-btn" 
                  :class="{ active: aiMode === 'custom' }"
                  @click="setAIMode('custom')"
                >自定义 API</button>
              </div>
            </div>
          </div>

          <!-- OAuth 模式 -->
          <template v-if="aiMode === 'oauth'">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">授权状态</span>
              <span class="setting-desc" v-if="qwenAccessToken">已授权，可以使用 AI 功能</span>
              <span class="setting-desc" v-else>点击"获取授权"按钮完成 OAuth 授权</span>
            </div>
            <div class="setting-control">
              <span v-if="qwenAccessToken" class="status connected">已授权</span>
              <span v-else class="status disconnected">未授权</span>
            </div>
          </div>
          
          <div class="setting-row" v-if="!qwenAccessToken">
            <div class="setting-info" style="width: 100%;">
              <button 
                class="btn btn-primary" 
                style="width: 100%; margin-bottom: 12px;"
                @click="startQwenAuth"
                :disabled="isQwenLoading"
              >
                {{ isQwenLoading ? '授权中...' : '获取 Qwen 授权' }}
              </button>
              <p style="font-size: 12px; color: #999; margin: 0;">
                使用 Device Code Flow 授权（RFC 8628）
              </p>
              <p v-if="qwenUserCode" style="font-size: 14px; color: #4A90E2; margin: 8px 0 0 0; font-weight: 600;">
                用户码: {{ qwenUserCode }}
              </p>
            </div>
          </div>
          
          <div class="setting-row" v-else>
            <div class="setting-info" style="width: 100%;">
              <button 
                class="btn btn-secondary" 
                style="width: 100%; margin-bottom: 12px;"
                @click="testAIAPI"
                :disabled="isAITesting"
              >
                {{ isAITesting ? '测试中...' : '测试 API 连接' }}
              </button>
              <button 
                class="btn btn-danger" 
                style="width: 100%;"
                @click="disconnectQwen"
              >
                取消授权
              </button>
            </div>
          </div>
          
          <!-- 测试结果显示 -->
          <div class="setting-row" v-if="qwenTestResult && aiMode === 'oauth'">
            <div class="setting-info" style="width: 100%;">
              <div class="test-result">
                <div class="test-result-header">
                  <span class="test-result-label">测试结果</span>
                  <span class="test-result-badge success">成功</span>
                </div>
                <div class="test-result-content">
                  {{ qwenTestResult }}
                </div>
              </div>
            </div>
          </div>
          </template>

          <!-- 自定义 API 模式 -->
          <template v-if="aiMode === 'custom'">
          <div class="setting-row">
            <div class="setting-info" style="width: 100%;">
              <label class="custom-api-label">base_url 预设</label>
              <select
                class="form-control form-input"
                v-model="customBaseUrlPreset"
                @change="applyCustomBaseUrlPreset"
                style="margin-bottom: 12px;"
              >
                <option v-for="p in customBaseUrlPresets" :key="p.value" :value="p.value">
                  {{ p.label }}
                </option>
              </select>
              <label class="custom-api-label">API 基础地址 (base_url)</label>
              <input 
                type="text" 
                class="form-control form-input" 
                v-model="customBaseUrl" 
                placeholder="https://api.openai.com/v1 或自建服务地址"
              >
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info" style="width: 100%;">
              <label class="custom-api-label">API 密钥 (api_key)</label>
              <div class="input-with-icon">
                <input 
                  :type="showCustomApiKey ? 'text' : 'password'" 
                  class="form-control form-input input-with-icon__input" 
                  v-model="customApiKey" 
                  placeholder="sk-xxx 或 Bearer token"
                >
                <button
                  type="button"
                  class="input-with-icon__btn"
                  @click="showCustomApiKey = !showCustomApiKey"
                  :aria-label="showCustomApiKey ? '隐藏 API Key' : '显示 API Key'"
                >
                  <component :is="showCustomApiKey ? Icons.EyeOff : Icons.Eye" :size="16" />
                </button>
              </div>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info" style="width: 100%;">
              <label class="custom-api-label">模型 ID (model)</label>
              <div class="custom-model-row">
                <select
                  v-if="customModelOptions.length"
                  class="form-control form-input"
                  v-model="customModelId"
                  :disabled="isCustomModelsLoading || !customModelOptions.length"
                >
                  <option v-for="m in customModelOptions" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
              <input
                v-if="!customModelOptions.length"
                type="text"
                class="form-control form-input"
                v-model="customModelId"
                placeholder="gpt-3.5-turbo / qwen-plus / 自建模型名"
                :disabled="isCustomModelsLoading"
              >
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info" style="width: 100%;">
              <button 
                class="btn btn-primary" 
                style="width: 100%; margin-bottom: 8px;"
                @click="saveCustomAPIConfig"
                :disabled="isSavingCustomConfig"
              >
                {{ isSavingCustomConfig ? '保存中...' : '保存配置' }}
              </button>
              <p style="font-size: 12px; color: #999; margin: 8px 0 0 0;">
                兼容 OpenAI API 格式，可用于通义千问 API、自建模型等
              </p>
            </div>
          </div>
          </template>
        </div>
      </section>

      <section class="setting-section">
        <h3 class="section-title">外观</h3>
        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">视图模式</span>
              <span class="setting-desc">{{ viewMode === 'grid' ? '网格' : '列表' }}</span>
            </div>
            <div class="setting-control">
              <div class="toggle-group">
                <button 
                  class="toggle-btn" 
                  :class="{ active: viewMode === 'grid' }"
                  @click="$emit('updateViewMode', 'grid')"
                >网格</button>
                <button 
                  class="toggle-btn" 
                  :class="{ active: viewMode === 'list' }"
                  @click="$emit('updateViewMode', 'list')"
                >列表</button>
              </div>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">语言</span>
              <span class="setting-desc">{{ ebookStore.userConfig.ui.language === 'zh-CN' ? '简体中文' : 'English' }}</span>
            </div>
            <div class="setting-control">
              <select class="form-control" :value="ebookStore.userConfig.ui.language" @change="handleLanguageChange">
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useEbookStore } from '../../stores/ebook'
import { useDialogStore } from '../../stores/dialog'
import { api } from '../../api/adapter'
import * as aiAPI from '../../api/ai'
import { qwenTokenManager } from '../../utils/qwenTokenManager'
import * as Icons from 'lucide-vue-next'

const ebookStore = useEbookStore()
const dialogStore = useDialogStore()

defineProps<{
  baidupanUser: { baidu_name: string; avatar_url: string; vip_type: number } | null
  viewMode: 'grid' | 'list'
}>()

defineEmits<{
  cancelBaidupanAuth: []
  showBaidupanAuthDialog: []
  updateViewMode: [mode: 'grid' | 'list']
}>()

const storageConfig = computed(() => ebookStore.userConfig.storage)
const refreshToken = ref('')
const inputAccessToken = ref('')
const isLoading = ref(false)
const isAutoConnecting = ref(false)
const isSyncing = ref(false)
const clipboardMonitorInterval = ref<number | null>(null)
const lastClipboardContent = ref('')

// AI 配置：OAuth / 自定义 API
const aiMode = computed(() => ebookStore.userConfig.ai?.mode ?? 'oauth')
const customBaseUrl = ref('')
const customApiKey = ref('')
const customModelId = ref('')
const customBaseUrlPreset = ref<'custom' | 'openai' | 'deepseek' | 'dashscope'>('custom')
const showCustomApiKey = ref(false)
const isCustomModelsLoading = ref(false)
const customModelOptions = ref<string[]>([])
const isSavingCustomConfig = ref(false)

// Qwen OAuth 相关状态
const qwenAccessToken = ref('')
const qwenTestResult = ref('')
const isQwenLoading = ref(false)

const customBaseUrlPresets = [
  { label: '自定义', value: 'custom' as const },
  { label: 'OpenAI', value: 'openai' as const },
  { label: 'DeepSeek', value: 'deepseek' as const },
  { label: '阿里百炼（DashScope 兼容）', value: 'dashscope' as const }
]

const applyCustomBaseUrlPreset = () => {
  const v = customBaseUrlPreset.value
  if (v === 'openai') customBaseUrl.value = 'https://api.openai.com/v1'
  if (v === 'deepseek') customBaseUrl.value = 'https://api.deepseek.com/v1'
  if (v === 'dashscope') customBaseUrl.value = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
}

const setAIMode = async (mode: 'oauth' | 'custom') => {
  await ebookStore.updateUserConfig({
    ai: { ...ebookStore.userConfig.ai, mode }
  })
  // 切换到 OAuth 时清除后端保存的自定义配置
  if (mode === 'oauth') {
    aiAPI.clearCustomAPIConfigFromBackend().catch((e) =>
      console.warn('清除后端自定义 API 配置失败:', e)
    )
  }

  if (ebookStore.userConfig.ai?.mode === 'custom' && customBaseUrl.value.trim() && customApiKey.value.trim()) {
    refreshCustomModels().catch(() => {})
  }
}

const saveCustomAPIConfig = async () => {
  const baseUrl = customBaseUrl.value.trim()
  const apiKey = customApiKey.value.trim()
  const modelId = customModelId.value.trim()

  if (!baseUrl || !apiKey) {
    dialogStore.showErrorDialog('配置不完整', '请填写 API 基础地址和密钥')
    return
  }

  if (!modelId) {
    dialogStore.showErrorDialog('配置不完整', '请先选择或输入模型 ID')
    return
  }

  isSavingCustomConfig.value = true
  try {
    const config = {
      baseUrl,
      apiKey,
      modelId
    }
    await ebookStore.updateUserConfig({
      ai: {
        ...ebookStore.userConfig.ai,
        mode: 'custom',
        custom: config
      }
    })
    // 同步保存到后端，便于重启后继续使用
    await aiAPI.saveCustomAPIConfigToBackend({
      base_url: config.baseUrl,
      api_key: config.apiKey,
      model_id: config.modelId
    })
    dialogStore.showToast('自定义 API 配置已保存', 'success')
    // 异步测试自定义 API 连接（不阻塞保存）
    ;(async () => {
      try {
        const result = await aiAPI.testCustomAPI({
          base_url: config.baseUrl,
          api_key: config.apiKey,
          model_id: config.modelId
        })
        // 测试成功只在控制台输出
        console.log('[Custom API] 连接测试成功:', {
          modelId: config.modelId,
        response: result.response,
        usage: result.usage
      })
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        '测试连接失败，请检查配置'
      dialogStore.showErrorDialog('自定义 API 测试失败', message)
    }
  })()
  } finally {
    isSavingCustomConfig.value = false
  }
}

const refreshCustomModels = async () => {
  if (!customBaseUrl.value.trim() || !customApiKey.value.trim()) {
    customModelOptions.value = []
    return
  }
  isCustomModelsLoading.value = true
  try {
    const resp = await aiAPI.listCustomModelsFromBackend({
      base_url: customBaseUrl.value.trim(),
      api_key: customApiKey.value.trim()
    })
    console.log('🔍 [refreshCustomModels] 完整响应:', resp)
    
    // 响应结构: { success, cached, base_url, fetched_at, models: { object: "list", data: [...] } }
    const modelsData = resp?.models?.data
    console.log('🔍 [refreshCustomModels] models.data:', modelsData)
    
    const ids: string[] = Array.isArray(modelsData)
      ? modelsData.map((x: any) => String(x?.id || '')).filter(Boolean)
      : []
    
    console.log('🔍 [refreshCustomModels] 解析出的模型 IDs:', ids)
    customModelOptions.value = ids
    
    if (ids.length && !ids.includes(customModelId.value.trim())) {
      customModelId.value = ids[0]
      console.log('🔍 [refreshCustomModels] 自动选择第一个模型:', ids[0])
    }
  } catch (e: any) {
    customModelOptions.value = []
    console.warn('获取自定义 API 模型列表失败:', e)
  } finally {
    isCustomModelsLoading.value = false
  }
}

// 防抖定时器
let autoConnectTimer: number | null = null
let customModelsTimer: number | null = null

// Qwen OAuth 相关状态（已在上面定义，这里添加缺失的变量）
const qwenRefreshToken = ref('')
const qwenResourceUrl = ref('')  // 添加 resource_url
const isAITesting = ref(false)
const aiTestResult = ref('')
const qwenSessionId = ref('')
const qwenUserCode = ref('')
const qwenPollInterval = ref<number | null>(null)

// 同步自定义 API 配置到本地 ref
const syncCustomConfig = () => {
  const aiCustom = ebookStore.userConfig.ai?.custom
  if (aiCustom) {
    customBaseUrl.value = aiCustom.baseUrl || ''
    customApiKey.value = aiCustom.apiKey || ''
    customModelId.value = aiCustom.modelId || ''
  }
}

const syncCustomBaseUrlPreset = () => {
  const v = customBaseUrl.value.trim()
  if (v === 'https://api.openai.com/v1') {
    customBaseUrlPreset.value = 'openai'
  } else if (v === 'https://api.deepseek.com/v1') {
    customBaseUrlPreset.value = 'deepseek'
  } else if (v === 'https://dashscope.aliyuncs.com/compatible-mode/v1') {
    customBaseUrlPreset.value = 'dashscope'
  } else {
    customBaseUrlPreset.value = 'custom'
  }
}

watch(() => ebookStore.userConfig.ai, () => syncCustomConfig(), { deep: true })

watch(
  () => customBaseUrl.value,
  () => syncCustomBaseUrlPreset(),
)

watch(
  () => [customBaseUrl.value, customApiKey.value],
  () => {
    if (aiMode.value !== 'custom') return
    if (customModelsTimer) window.clearTimeout(customModelsTimer)
    customModelsTimer = window.setTimeout(() => {
      refreshCustomModels().catch(() => {})
    }, 600)
  }
)

// 从 localStorage、userConfig 及后端加载
onMounted(async () => {
  syncCustomConfig()
  syncCustomBaseUrlPreset()
  // 若本地无自定义配置，尝试从后端恢复（如重启后、新设备）
  const ai = ebookStore.userConfig.ai
  if (ai?.mode === 'custom' && (!ai.custom?.baseUrl || !ai.custom?.apiKey)) {
    try {
      const saved = await aiAPI.getCustomAPIConfigFromBackend()
      if (saved) {
        await ebookStore.updateUserConfig({
          ai: {
            ...ai,
            mode: 'custom',
            custom: {
              baseUrl: saved.base_url,
              apiKey: saved.api_key,
              modelId: saved.model_id
            }
          }
        })
        syncCustomConfig()
      }
    } catch (e) {
      console.warn('从后端加载自定义 API 配置失败:', e)
    }
  }

  const savedAccessToken = localStorage.getItem('qwen_access_token')
  const savedRefreshToken = localStorage.getItem('qwen_refresh_token')
  const savedResourceUrl = localStorage.getItem('qwen_resource_url')
  if (savedAccessToken) {
    qwenAccessToken.value = savedAccessToken
  }
  if (savedRefreshToken) {
    qwenRefreshToken.value = savedRefreshToken
  }
  if (savedResourceUrl) {
    qwenResourceUrl.value = savedResourceUrl
  }
  
  // 设置 token 管理器回调
  qwenTokenManager.onRefresh((tokens) => {
    console.log('✅ [Settings] Token 自动刷新成功')
    qwenAccessToken.value = tokens.accessToken
    qwenRefreshToken.value = tokens.refreshToken
    if (tokens.resourceUrl) {
      qwenResourceUrl.value = tokens.resourceUrl
    }
    // 刷新后同步到后端
    aiAPI.saveQwenToken({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: Math.floor(tokens.expiresAt / 1000),
      resource_url: tokens.resourceUrl
    }).catch(e => console.warn('保存 Qwen Token 到后端失败:', e))
  })
  
  qwenTokenManager.onError((error) => {
    console.error('❌ [Settings] Token 自动刷新失败:', error)
    dialogStore.showErrorDialog(
      'Token 刷新失败',
      '您的 Qwen AI 授权已过期，请重新授权'
    )
  })
})

// 组件卸载时清理
onBeforeUnmount(() => {
  qwenTokenManager.destroy()
  stopClipboardMonitor()
})

/**
 * 启动剪贴板监听（用于百度网盘授权）
 */
const startClipboardMonitor = () => {
  console.log('🔍 [剪贴板监听] 开始监听剪贴板')
  
  // 清除之前的监听
  stopClipboardMonitor()
  
  // 每 1 秒检查一次剪贴板
  clipboardMonitorInterval.value = window.setInterval(async () => {
    try {
      // 读取剪贴板内容
      const text = await navigator.clipboard.readText()
      
      // 如果内容没有变化，跳过
      if (text === lastClipboardContent.value) {
        return
      }
      
      lastClipboardContent.value = text
      const trimmedText = text.trim()
      
      // 验证是否是百度 Refresh Token 格式
      // 百度 token 通常是 122.xxx 格式，长度较长
      if (trimmedText.length > 20 && /^[\d\.]+[a-zA-Z0-9\-_]+/.test(trimmedText)) {
        console.log('✅ [剪贴板监听] 检测到疑似 Refresh Token，自动填入')
        
        // 自动填入输入框
        refreshToken.value = trimmedText
        
        // 触发自动连接
        handleRefreshTokenInput({ target: { value: trimmedText } } as any)
        
        // 停止监听
        stopClipboardMonitor()
        
        // 提示用户
        dialogStore.showToast('已自动填入 Refresh Token', 'success')
      }
    } catch (error) {
      // 剪贴板读取失败（可能是权限问题），静默处理
      console.debug('剪贴板读取失败:', error)
    }
  }, 1000)
  
  console.log('✅ [剪贴板监听] 监听已启动')
}

/**
 * 停止剪贴板监听
 */
const stopClipboardMonitor = () => {
  if (clipboardMonitorInterval.value) {
    clearInterval(clipboardMonitorInterval.value)
    clipboardMonitorInterval.value = null
    lastClipboardContent.value = ''
    console.log('🛑 [剪贴板监听] 监听已停止')
  }
}

const getAuthorization = () => {
  console.log('=== 开始获取授权 ===')
  
  // 使用固定的百度授权URL（alist提供的）
  const authUrl = 'https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id=hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf&redirect_uri=https://alistgo.com/tool/baidu/callback&scope=basic,netdisk&qrcode=1'
  
  console.log('授权URL:', authUrl)
  
  try {
    // 统一使用系统浏览器打开授权页面
    console.log('✓ 使用系统浏览器打开授权页面')
    
    // 尝试使用 Tauri shell.open（如果可用）
    const isTauri = !!(window as any).__TAURI_INTERNALS__
    if (isTauri) {
      import('@tauri-apps/plugin-shell')
        .then(({ open }) => open(authUrl))
        .catch((e) => {
          console.error('Tauri shell.open 失败，回退到 window.open:', e)
          window.open(authUrl, '_blank')
        })
    } else {
      // 浏览器环境直接使用 window.open
      window.open(authUrl, '_blank')
    }
    
    // 启动剪贴板监听
    startClipboardMonitor()
    
    dialogStore.showDialog({
      title: '百度网盘授权',
      message: '已在系统浏览器中打开授权页面。\n\n📋 完成授权后，请按以下步骤操作：\n\n1️⃣ 在授权页面完成登录和授权\n2️⃣ 授权成功后会显示 Refresh Token\n3️⃣ 复制 Refresh Token\n\n✨ 系统会自动检测剪贴板并填入 Token\n💡 也可以手动粘贴到下方输入框',
      type: 'info'
    })
    return
  } catch (error: any) {
    console.error('✗ 获取授权过程异常:', error)
    console.error('异常详情:', {
      message: error?.message || '未知错误',
      stack: error?.stack,
      name: error?.name
    })
    dialogStore.showErrorDialog('打开失败', '无法打开授权页面: ' + (error?.message || '未知错误'))
  }
  
  console.log('=== 获取授权函数执行完成 ===')
}

// 通过alist API处理授权码
const handleAuthCodeViaAlist = async (code: string) => {
  console.log('=== 开始通过alist API处理授权码 ===')
  console.log('授权码:', code)
  isLoading.value = true
  
  try {
    console.log('准备调用后端API: /api/baidu/alist-token')
    
    // 调用后端代理alist API
    const response = await fetch(`/api/baidu/alist-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code })
    })
    
    console.log('后端API响应状态:', response.status, response.statusText)
    
    // 检查响应是否成功
    if (!response.ok) {
      const errorText = await response.text()
      console.error('✗ 后端API返回错误:', errorText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    // 获取响应文本
    const responseText = await response.text()
    console.log('后端API响应文本:', responseText)
    
    // 尝试解析JSON
    let data
    try {
      data = JSON.parse(responseText)
      console.log('后端API响应数据:', data)
    } catch (parseError) {
      console.error('✗ JSON解析失败:', parseError)
      console.error('响应内容:', responseText)
      throw new Error('服务器返回了无效的JSON格式')
    }
    
    if (!data.error && data.access_token && data.refresh_token) {
      console.log('✓ 成功获取token')
      console.log('- access_token:', data.access_token ? '已获取' : '未获取')
      console.log('- refresh_token:', data.refresh_token ? '已获取' : '未获取')
      
      inputAccessToken.value = data.access_token
      refreshToken.value = data.refresh_token
      
      console.log('开始自动验证并连接...')
      // 自动验证并连接
      verifyAndConnect()
    } else {
      console.error('✗ 获取Token失败:', data.error || '响应数据格式错误')
      dialogStore.showErrorDialog('获取Token失败', data.error || '未知错误')
    }
  } catch (error: any) {
    console.error('✗ 调用alist API异常:', error)
    console.error('异常详情:', {
      message: error?.message || '未知错误',
      stack: error?.stack,
      name: error?.name
    })
    dialogStore.showErrorDialog('获取Token失败', '网络错误，请重试: ' + (error?.message || '未知错误'))
  } finally {
    isLoading.value = false
    console.log('=== alist API处理完成 ===')
  }
}

const refreshAccessToken = async () => {
  if (!refreshToken.value) return
  isLoading.value = true
  
  try {
    // 使用固定的alist配置
    const data = await api.refreshToken(
      refreshToken.value,
      'hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf', // alist固定的client_id
      'YH2VpZcFJHYNnV6vLfHQXDBhcE7ZChyE'  // alist固定的client_secret
    )
    
    if (!data.error && data.access_token) {
      inputAccessToken.value = data.access_token
      // 更新 refresh_token（百度 API 每次刷新都会返回新的 refresh_token）
      if (data.refresh_token) {
        refreshToken.value = data.refresh_token
      }
      verifyAndConnect()
    } else {
      dialogStore.showErrorDialog('获取失败', data.error || '未知错误')
    }
  } catch (error) {
    dialogStore.showErrorDialog('获取失败', '网络错误，请重试')
  } finally {
    isLoading.value = false
  }
}

const verifyAndConnect = async () => {
  if (!inputAccessToken.value) return
  isLoading.value = true
  
  try {
    const data = await api.verifyToken(inputAccessToken.value)
    
    if (!data.error) {
      await ebookStore.updateUserConfig({
        storage: {
          ...storageConfig.value,
          baidupan: {
            ...storageConfig.value.baidupan,
            accessToken: inputAccessToken.value,
            refreshToken: refreshToken.value,
            userId: String(data.uk),
            expiration: Date.now() + 30 * 24 * 60 * 60 * 1000,
            rootPath: storageConfig.value.baidupan?.rootPath || '',
            namingStrategy: storageConfig.value.baidupan?.namingStrategy || '0'
          }
        }
      })
      
      await ebookStore.fetchBaidupanUserInfo(true)
      
      dialogStore.showToast('百度网盘授权成功', 'success')
    } else {
      dialogStore.showToast('验证失败', 'error')
    }
  } catch (error) {
    dialogStore.showToast('验证失败', 'error')
  } finally {
    isLoading.value = false
  }
}

const disconnect = async () => {
  await ebookStore.updateUserConfig({
    storage: {
      ...storageConfig.value,
      baidupan: {
        ...storageConfig.value.baidupan,
        accessToken: '',
        refreshToken: '',
        userId: '',
        expiration: 0,
        rootPath: '',
        namingStrategy: '0'
      }
    }
  })
  
  // 清空输入框
  refreshToken.value = ''
  inputAccessToken.value = ''
  
  // 立即刷新用户信息状态
  await ebookStore.fetchBaidupanUserInfo(true)
  
  dialogStore.showToast('已取消授权', 'info')
}

/**
 * 同步数据（云端和本地保持一致）
 */
const syncFromCloud = async () => {
  if (isSyncing.value) return
  
  try {
    isSyncing.value = true
    console.log('🔄 [手动同步] 开始同步数据（云端 ↔ 本地）...')
    
    // 🎯 调用后端强制同步 API
    try {
      const response = await fetch('http://localhost:8000/api/sync/force', {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ [后端同步] 数据已同步到云端:', result)
      } else {
        console.warn('⚠️ [后端同步] 同步失败:', await response.text())
      }
    } catch (syncError) {
      console.warn('⚠️ [后端同步] 调用失败:', syncError)
    }
    
    // 🎯 从云端加载数据到本地
    await ebookStore.loadBaidupanBooks()
    
    dialogStore.showToast('同步成功', 'success')
    console.log('✅ [手动同步] 同步完成')
  } catch (error) {
    console.error('❌ [手动同步] 同步失败:', error)
    dialogStore.showErrorDialog('同步失败', '请检查网络连接或授权状态')
  } finally {
    isSyncing.value = false
  }
}

const handleLanguageChange = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  await ebookStore.updateUserConfig({
    ui: { ...ebookStore.userConfig.ui, language: target.value }
  })
}

/**
 * 处理 Refresh Token 输入 - 自动连接
 */
const handleRefreshTokenInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const token = target.value.trim()
  
  // 清除之前的定时器
  if (autoConnectTimer) {
    clearTimeout(autoConnectTimer)
    autoConnectTimer = null
  }
  
  // 如果 token 为空，不处理
  if (!token) {
    isAutoConnecting.value = false
    return
  }
  
  // 验证 token 格式（基本检查：长度 > 20）
  if (token.length < 20) {
    isAutoConnecting.value = false
    return
  }
  
  // 防抖：等待 500ms 后自动连接
  isAutoConnecting.value = true
  autoConnectTimer = window.setTimeout(async () => {
    console.log('🔄 [自动连接] 检测到有效 Token，开始自动连接...')
    
    try {
      await refreshAccessToken()
      console.log('✅ [自动连接] 连接成功')
    } catch (error) {
      console.error('❌ [自动连接] 连接失败:', error)
    } finally {
      isAutoConnecting.value = false
    }
  }, 500)
}

// ============ Qwen OAuth 相关函数 ============

/**
 * 启动 Qwen Device Code Flow 授权
 */
const startQwenAuth = async () => {
  console.log('=== 开始 Qwen Device Code Flow 授权 ===')
  isQwenLoading.value = true
  qwenTestResult.value = ''
  
  try {
    // 1. 启动 Device Code Flow
    const deviceAuth = await aiAPI.startDeviceAuth()
    qwenSessionId.value = deviceAuth.session_id
    qwenUserCode.value = deviceAuth.user_code
    
    console.log('Device Code Flow 启动成功')
    console.log('User Code:', deviceAuth.user_code)
    console.log('Auth URL:', deviceAuth.auth_url)
    console.log('Session ID:', deviceAuth.session_id)
    
    // 2. 统一使用系统浏览器打开授权页面
    console.log('✓ 使用系统浏览器打开授权页面')
    
    const isTauriEnv = !!(window as any).__TAURI_INTERNALS__
    if (isTauriEnv) {
      // Tauri 环境：使用 shell.open
      import('@tauri-apps/plugin-shell')
        .then(({ open }) => open(deviceAuth.auth_url))
        .catch((e) => {
          console.error('Tauri shell.open 失败，回退到 window.open:', e)
          window.open(deviceAuth.auth_url, '_blank')
        })
    } else {
      // 浏览器环境：直接使用 window.open
      window.open(deviceAuth.auth_url, '_blank')
    }
    
    // 3. 显示用户码和操作指引
    dialogStore.showDialog({
      title: 'Qwen 授权',
      message: `已在系统浏览器中打开授权页面。\n\n📋 请按以下步骤完成授权：\n\n1️⃣ 在浏览器页面中输入用户码：\n   ${deviceAuth.user_code}\n\n2️⃣ 点击"确认"完成授权\n\n3️⃣ 看到"认证成功"后，可以关闭浏览器窗口\n\n⏳ 应用将自动获取 token，请稍候...`,
      type: 'info'
    })
    
    // 4. 开始轮询 token
    startPolling(deviceAuth.session_id, deviceAuth.interval)
    
  } catch (error: any) {
    console.error('✗ Qwen 授权失败:', error)
    dialogStore.showErrorDialog('授权失败', error.message || '未知错误')
    isQwenLoading.value = false
  }
}

/**
 * 轮询获取 token
 */
const startPolling = async (sessionId: string, interval: number) => {
  console.log('=== 开始轮询 token ===')
  console.log('Session ID:', sessionId)
  console.log('Interval:', interval, 'seconds')
  
  let pollCount = 0
  const maxPolls = 60 // 最多轮询 60 次（5 分钟）
  let currentInterval = interval * 1000
  
  const poll = async () => {
    pollCount++
    console.log(`轮询第 ${pollCount} 次...`)
    
    // 每 10 次轮询（约 50 秒）提醒一次用户
    if (pollCount % 10 === 0 && pollCount < maxPolls) {
      console.log(`⏳ 已等待 ${pollCount * interval} 秒，继续等待授权...`)
    }
    
    try {
      const result = await aiAPI.pollForToken(sessionId)
      
      if (result.status === 'pending') {
        // 还在等待授权
        if (result.slow_down) {
          // 服务器要求减慢轮询速度
          currentInterval = currentInterval * 1.5
          console.log('服务器要求减慢轮询，新间隔:', currentInterval / 1000, 'seconds')
        }
        
        if (pollCount < maxPolls) {
          // 继续轮询
          qwenPollInterval.value = window.setTimeout(poll, currentInterval)
        } else {
          // 超时
          throw new Error('授权超时，请重新开始')
        }
      } else if (result.status === 'success') {
        // 获取到 token
        console.log('✓ 成功获取 token')
        
        if (result.is_mock) {
          console.warn('⚠️ 使用模拟 token（真实 API 不可用）')
        }
        
        qwenAccessToken.value = result.access_token!
        qwenRefreshToken.value = result.refresh_token!
        qwenResourceUrl.value = result.resource_url || ''
        localStorage.setItem('qwen_access_token', result.access_token!)
        localStorage.setItem('qwen_refresh_token', result.refresh_token!)
        if (result.resource_url) {
          localStorage.setItem('qwen_resource_url', result.resource_url)
        }
        
        // 设置 token 管理器（启动自动刷新）
        if (result.expires_in) {
          qwenTokenManager.setTokens(
            result.access_token!,
            result.refresh_token!,
            result.expires_in,
            result.resource_url
          )
          console.log('✅ [Settings] Token 管理器已启动自动刷新')
        }
        // 授权后同步到后端，后续调用 Qwen 时前端可不传 token
        aiAPI.saveQwenToken({
          access_token: result.access_token!,
          refresh_token: result.refresh_token,
          expires_at: result.expires_in ? Math.floor(Date.now() / 1000) + result.expires_in : undefined,
          resource_url: result.resource_url
        }).catch(e => console.warn('保存 Qwen Token 到后端失败:', e))

        isQwenLoading.value = false
        
        if (result.is_mock) {
          dialogStore.showDialog({
            title: 'Qwen 授权成功（模拟模式）',
            message: '已获取模拟 token。\n\n注意：由于 Qwen 真实 API 端点未知，当前使用模拟数据。\n\n要使用真实 API，需要获取正确的端点信息。',
            type: 'info'
          })
        } else {
          dialogStore.showDialog({
            title: '✅ Qwen 授权成功',
            message: '🎉 已成功获取 access token！\n\n💡 提示：您现在可以关闭浏览器中的授权页面了。\n\n应用将自动测试 API 连接...',
            type: 'success'
          })
        }
        
        // 自动测试 API（如果不是模拟模式）
        if (!result.is_mock) {
          setTimeout(() => {
            testAIAPI()
          }, 1000)
        }
      }
    } catch (error: any) {
      console.error('✗ 轮询失败:', error)
      isQwenLoading.value = false
      
      if (qwenPollInterval.value) {
        clearTimeout(qwenPollInterval.value)
        qwenPollInterval.value = null
      }
      
      dialogStore.showErrorDialog('获取 Token 失败', error.message || '未知错误')
    }
  }
  
  // 开始第一次轮询
  qwenPollInterval.value = window.setTimeout(poll, currentInterval)
}

/**
 * 测试 AI API
 */
const testAIAPI = async () => {
  console.log('=== 测试 AI API ===')
  isAITesting.value = true
  aiTestResult.value = ''
  
  try {
    // Qwen OAuth 只支持两个模型（硬编码，不通过 API 获取）
    const availableModels = ['qwen3-coder-plus', 'qwen3-coder-flash']
    const testModel = availableModels[0]
    
    console.log('可用模型（硬编码）:', availableModels)
    console.log('使用模型:', testModel)
    console.log('Resource URL:', qwenResourceUrl.value || '(未设置，使用默认)')
    
    const result = await aiAPI.testAIAPI(
      qwenAccessToken.value,
      '你好，请用一句话介绍你自己。',
      qwenResourceUrl.value  // 传递 resource_url
    )
    
    console.log('✓ API 测试成功')
    console.log('响应:', result.response)
    console.log('Token 使用:', result.usage)
    
    aiTestResult.value = result.response
    
    dialogStore.showDialog({
      title: '✅ API 测试成功',
      message: `模型: ${testModel}\n\nAI 响应：\n\n${result.response}\n\n使用 Token: ${result.usage.total_tokens}`,
      type: 'success'
    })
  } catch (error: any) {
    console.error('✗ API 测试失败:', error)
    
    // 如果是 token 过期，尝试刷新
    if (error.message?.includes('token') && qwenRefreshToken.value) {
      console.log('尝试刷新 token...')
      try {
        const tokens = await aiAPI.refreshToken(qwenRefreshToken.value)
        qwenAccessToken.value = tokens.access_token
        qwenRefreshToken.value = tokens.refresh_token
        localStorage.setItem('qwen_access_token', tokens.access_token)
        localStorage.setItem('qwen_refresh_token', tokens.refresh_token)
        
        // 重试测试
        await testAIAPI()
        return
      } catch (refreshError: any) {
        console.error('✗ 刷新 token 失败:', refreshError)
      }
    }
    
    dialogStore.showErrorDialog('API 测试失败', error.message || '未知错误')
  } finally {
    isAITesting.value = false
  }
}

/**
 * 取消 Qwen 授权
 */
const disconnectQwen = () => {
  // 停止轮询
  if (qwenPollInterval.value) {
    clearTimeout(qwenPollInterval.value)
    qwenPollInterval.value = null
  }
  
  // 清除状态
  qwenAccessToken.value = ''
  qwenRefreshToken.value = ''
  qwenResourceUrl.value = ''
  aiTestResult.value = ''
  qwenSessionId.value = ''
  qwenUserCode.value = ''
  
  // 清除本地存储
  localStorage.removeItem('qwen_access_token')
  localStorage.removeItem('qwen_refresh_token')
  localStorage.removeItem('qwen_resource_url')
  
  // 清除 token 管理器
  qwenTokenManager.clearTokens()
  console.log('✅ [Settings] Token 管理器已清除')
  
  dialogStore.showSuccessDialog('已取消 Qwen 授权')
}


</script>

<style scoped>
.settings-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.settings-header {
  padding: 24px 0;
  border-bottom: 1px solid var(--color-border);
}

.settings-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 0;
}

.setting-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--color-accent);
}

.setting-card {
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  padding: 8px 0;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.setting-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.setting-control {
  flex-shrink: 0;
}

.form-control {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  min-width: 150px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23737373' d='M6 9L1 4l1-1 4 4 4-1-1zm0 0L1 4l5 5 5-5 1 1-5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.form-control:hover {
  border-color: var(--color-border-hover);
}

.form-control:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.form-control option {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: 8px 12px;
}

.status {
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
}

.status.connected {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.status.disconnected {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

.toggle-group {
  display: flex;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.toggle-btn {
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.toggle-btn.active {
  background-color: var(--color-accent);
  color: white;
}

.btn {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--color-accent);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--color-accent-hover);
}

.btn-danger {
  background-color: var(--color-error);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn-secondary {
  background-color: var(--color-text-secondary);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-text-primary);
}

/* 旋转动画 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinning {
  animation: spin 1s linear infinite;
}

.test-result {
  background: var(--color-accent-light);
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-top: 8px;
}

.test-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.test-result-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent);
}

.test-result-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.test-result-badge.success {
  background-color: #D1FAE5;
  color: #065F46;
}

.test-result-badge.error {
  background-color: #FEE2E2;
  color: #991B1B;
}

.test-result-error {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.3);
}

.custom-api-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  min-width: 0;
  margin-bottom: 4px;
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 0;
}

.btn-link:hover {
  text-decoration: underline;
}

.input-with-icon {
  position: relative;
  width: 100%;
}

.input-with-icon__input {
  padding-right: 36px;
}

.input-with-icon__btn {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 0;
  color: #64748B;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.input-with-icon__btn:hover {
  color: #334155;
}

.custom-model-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.test-result-content {
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 768px) {
  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .setting-control {
    width: 100%;
  }
  
  .form-control {
    width: 100%;
    min-width: 0;
  }
}
</style>

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #FFFFFF, #F8FAFC);
  border-radius: 0.5rem;
}

.user-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(74, 144, 226, 0.3);
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.2);
}

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-name {
  font-weight: 600;
  color: #1E293B;
  font-size: 0.9375rem;
}

.user-vip {
  font-size: 0.8125rem;
  color: #64748B;
}
