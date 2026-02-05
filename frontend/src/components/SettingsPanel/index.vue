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
import { ref, computed } from 'vue'
import { useEbookStore } from '../../stores/ebook'
import { useDialogStore } from '../../stores/dialog'
import { api } from '../../api/adapter'

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
    
    const data = await response.json()
    console.log('后端API响应数据:', data)
    
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
