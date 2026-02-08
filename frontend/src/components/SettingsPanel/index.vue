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
              >
              <button 
                class="btn btn-primary" 
                style="width: 100%;"
                @click="refreshAccessToken"
                :disabled="!refreshToken || isLoading"
              >
                {{ isLoading ? '获取中...' : '连接百度网盘' }}
              </button>
            </div>
          </div>
          
          <div class="setting-row" v-else>
            <div class="setting-info" style="width: 100%;">
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
        <h3 class="section-title">Qwen AI</h3>
        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">授权状态</span>
              <span class="setting-desc" v-if="qwenAccessToken">已授权，可以使用 Qwen AI 功能</span>
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
                @click="testQwenAPI"
                :disabled="isQwenTesting"
              >
                {{ isQwenTesting ? '测试中...' : '测试 Qwen API' }}
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
          <div class="setting-row" v-if="qwenTestResult">
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
import { ref, computed, onMounted } from 'vue'
import { useEbookStore } from '../../stores/ebook'
import { useDialogStore } from '../../stores/dialog'
import { api } from '../../api/adapter'
import * as qwenAPI from '../../api/qwen'

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

// Qwen OAuth 相关状态
const qwenAccessToken = ref('')
const qwenRefreshToken = ref('')
const qwenResourceUrl = ref('')  // 添加 resource_url
const isQwenLoading = ref(false)
const isQwenTesting = ref(false)
const qwenTestResult = ref('')
const qwenSessionId = ref('')
const qwenUserCode = ref('')
const qwenPollInterval = ref<number | null>(null)

// 从 localStorage 加载 Qwen token
onMounted(() => {
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
})

const getAuthorization = () => {
  console.log('=== 开始获取授权 ===')
  console.log('当前环境检测:')
  console.log('- window.electron 存在:', !!window.electron)
  console.log('- window.location.href:', window.location.href)
  
  // 使用固定的百度授权URL（alist提供的）
  const authUrl = 'https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id=hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf&redirect_uri=https://alistgo.com/tool/baidu/callback&scope=basic,netdisk&qrcode=1'
  
  console.log('授权URL:', authUrl)
  
  try {
    if (window.electron) {
      // Electron环境：使用内置窗口处理授权
      console.log('✓ 检测到Electron环境，使用内置窗口处理授权')
      console.log('调用 window.electron.openAuthWindow...')
      
      window.electron.openAuthWindow(authUrl).then((result) => {
        console.log('openAuthWindow 返回结果:', result)
        if (result.success && result.code) {
          console.log('✓ 获取到授权码:', result.code)
          // 使用alist API获取token
          handleAuthCodeViaAlist(result.code)
        } else {
          console.error('✗ 授权失败:', result.error)
          dialogStore.showErrorDialog('授权失败', result.error || '用户取消授权')
        }
      }).catch((error) => {
        console.error('✗ 授权窗口Promise异常:', error)
        dialogStore.showErrorDialog('授权失败', '无法打开授权窗口: ' + error.message)
      })
    } else {
      // 浏览器环境：使用外部浏览器并监听postMessage
      console.log('✓ 浏览器环境，使用外部浏览器打开授权页面')
      
      // 添加 postMessage 监听器
      const messageHandler = (event: MessageEvent) => {
        console.log('收到 postMessage:', event.data)
        
        // 验证消息来源
        if (event.origin !== window.location.origin) {
          console.warn('忽略来自不同源的消息:', event.origin)
          return
        }
        
        // 检查消息类型
        if (event.data && event.data.type === 'baidu-auth-code' && event.data.code) {
          console.log('✓ 收到授权码:', event.data.code)
          
          // 移除监听器
          window.removeEventListener('message', messageHandler)
          
          // 使用alist API获取token
          handleAuthCodeViaAlist(event.data.code)
        }
      }
      
      // 添加监听器
      window.addEventListener('message', messageHandler)
      console.log('✓ 已添加 postMessage 监听器')
      
      // 打开授权窗口
      const newWindow = window.open(authUrl, '_blank', 'width=800,height=600')
      if (newWindow) {
        console.log('✓ 外部浏览器窗口打开成功')
        dialogStore.showDialog({
          title: '授权提示',
          message: '请在打开的页面中完成授权，授权成功后会自动获取授权信息',
          type: 'info'
        })
      } else {
        console.error('✗ 外部浏览器窗口被阻止')
        window.removeEventListener('message', messageHandler)
        dialogStore.showErrorDialog('窗口被阻止', '请允许弹出窗口')
      }
    }
  } catch (error) {
    console.error('✗ 获取授权过程异常:', error)
    console.error('异常详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    dialogStore.showErrorDialog('打开失败', '无法打开授权页面: ' + error.message)
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
  } catch (error) {
    console.error('✗ 调用alist API异常:', error)
    console.error('异常详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    dialogStore.showErrorDialog('获取Token失败', '网络错误，请重试: ' + error.message)
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
      
      dialogStore.showSuccessDialog('百度网盘授权成功')
    } else {
      dialogStore.showErrorDialog('验证失败', data.message || '无效的token')
    }
  } catch (error) {
    dialogStore.showErrorDialog('验证失败', '网络错误，请重试')
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
  
  dialogStore.showSuccessDialog('已取消授权')
}

const handleLanguageChange = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  await ebookStore.updateUserConfig({
    ui: { ...ebookStore.userConfig.ui, language: target.value }
  })
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
    const deviceAuth = await qwenAPI.startDeviceAuth()
    qwenSessionId.value = deviceAuth.session_id
    qwenUserCode.value = deviceAuth.user_code
    
    console.log('Device Code Flow 启动成功')
    console.log('User Code:', deviceAuth.user_code)
    console.log('Auth URL:', deviceAuth.auth_url)
    console.log('Session ID:', deviceAuth.session_id)
    
    // 2. 打开授权页面
    if (window.electron) {
      // Electron 环境：使用系统默认浏览器打开（避免白屏）
      console.log('✓ Electron 环境，使用系统浏览器打开授权页面')
      window.electron.openExternal(deviceAuth.auth_url)
    } else {
      // 浏览器环境
      window.open(deviceAuth.auth_url, '_blank', 'width=800,height=600')
    }
    
    // 3. 显示用户码
    dialogStore.showDialog({
      title: 'Qwen 授权',
      message: `请在打开的页面中输入以下用户码完成授权：\n\n${deviceAuth.user_code}\n\n授权后将自动获取 token...`,
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
    
    try {
      const result = await qwenAPI.pollForToken(sessionId)
      
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
        
        isQwenLoading.value = false
        
        if (result.is_mock) {
          dialogStore.showDialog({
            title: 'Qwen 授权成功（模拟模式）',
            message: '已获取模拟 token。\n\n注意：由于 Qwen 真实 API 端点未知，当前使用模拟数据。\n\n要使用真实 API，需要获取正确的端点信息。',
            type: 'info'
          })
        } else {
          dialogStore.showSuccessDialog('Qwen 授权成功！')
        }
        
        // 自动测试 API（如果不是模拟模式）
        if (!result.is_mock) {
          setTimeout(() => {
            testQwenAPI()
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
 * 测试 Qwen API
 */
const testQwenAPI = async () => {
  console.log('=== 测试 Qwen API ===')
  isQwenTesting.value = true
  qwenTestResult.value = ''
  
  try {
    // Qwen OAuth 只支持两个模型（硬编码，不通过 API 获取）
    const availableModels = ['qwen3-coder-plus', 'qwen3-coder-flash']
    const testModel = availableModels[0]
    
    console.log('可用模型（硬编码）:', availableModels)
    console.log('使用模型:', testModel)
    console.log('Resource URL:', qwenResourceUrl.value || '(未设置，使用默认)')
    
    const result = await qwenAPI.testQwenAPI(
      qwenAccessToken.value,
      '你好，请用一句话介绍你自己。',
      qwenResourceUrl.value  // 传递 resource_url
    )
    
    console.log('✓ API 测试成功')
    console.log('响应:', result.response)
    console.log('Token 使用:', result.usage)
    
    qwenTestResult.value = result.response
    
    dialogStore.showDialog({
      title: 'API 测试成功',
      message: `模型: ${testModel}\n\nQwen AI 响应：\n\n${result.response}\n\n使用 Token: ${result.usage.total_tokens}`,
      type: 'success'
    })
  } catch (error: any) {
    console.error('✗ API 测试失败:', error)
    
    // 如果是 token 过期，尝试刷新
    if (error.message?.includes('token') && qwenRefreshToken.value) {
      console.log('尝试刷新 token...')
      try {
        const tokens = await qwenAPI.refreshToken(qwenRefreshToken.value)
        qwenAccessToken.value = tokens.access_token
        qwenRefreshToken.value = tokens.refresh_token
        localStorage.setItem('qwen_access_token', tokens.access_token)
        localStorage.setItem('qwen_refresh_token', tokens.refresh_token)
        
        // 重试测试
        await testQwenAPI()
        return
      } catch (refreshError: any) {
        console.error('✗ 刷新 token 失败:', refreshError)
      }
    }
    
    dialogStore.showErrorDialog('API 测试失败', error.message || '未知错误')
  } finally {
    isQwenTesting.value = false
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
  qwenTestResult.value = ''
  qwenSessionId.value = ''
  qwenUserCode.value = ''
  
  // 清除本地存储
  localStorage.removeItem('qwen_access_token')
  localStorage.removeItem('qwen_refresh_token')
  localStorage.removeItem('qwen_resource_url')
  
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
  border-bottom: 1px solid #e8e8e8;
}

.settings-title {
  font-size: 24px;
  font-weight: bold;
  color: #4A90E2;
  margin: 0;
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
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #4A90E2;
}

.setting-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 8px 0;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
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
  color: #333;
}

.setting-desc {
  font-size: 13px;
  color: #999;
}

.setting-control {
  flex-shrink: 0;
}

.form-control {
  padding: 8px 12px;
  border: 1px solid #DCDFE6;
  border-radius: 6px;
  font-size: 14px;
  min-width: 150px;
  background: linear-gradient(135deg, #FFFFFF, #F8FAFC);
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 9L1 4l1-1 4 4 4-1-1zm0 0L1 4l5 5 5-5 1 1-5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.form-control:hover {
  border-color: #4A90E2;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.05), rgba(74, 144, 226, 0.02));
}

.form-control:focus {
  outline: none;
  border-color: #4A90E2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
  background: linear-gradient(135deg, #FFFFFF, #F8FAFC);
}

.form-control option {
  background: white;
  color: #475569;
  padding: 8px 12px;
}

.status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status.connected {
  background-color: #F0F9EB;
  color: #67C23A;
}

.status.disconnected {
  background-color: #FEF0F0;
  color: #F56C6C;
}

.toggle-group {
  display: flex;
  background-color: #f5f7fa;
  border-radius: 6px;
  overflow: hidden;
}

.toggle-btn {
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.toggle-btn.active {
  background-color: #4A90E2;
  color: white;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background-color: #4A90E2;
  color: white;
}

.btn-primary:hover {
  background-color: #357ABD;
}

.btn-danger {
  background-color: #F56C6C;
  color: white;
}

.btn-danger:hover {
  background-color: #f23c3c;
}

.btn-danger:hover {
  background-color: #f23c3c;
}

.btn-secondary {
  background-color: #909399;
  color: white;
}

.btn-secondary:hover {
  background-color: #73767a;
}

.test-result {
  background: linear-gradient(135deg, #F0F9FF, #E0F2FE);
  border: 1px solid #BAE6FD;
  border-radius: 8px;
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
  color: #0369A1;
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
