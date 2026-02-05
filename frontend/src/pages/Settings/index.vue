<template>
  <div class="settings">
    <header class="header">
      <h1 class="title">设置</h1>
      <router-link to="/" class="btn btn-secondary">← 返回</router-link>
    </header>

    <main class="main">
      <div class="settings-container">
        <section class="setting-section">
          <h2 class="section-title">百度网盘</h2>
          <div class="setting-card">
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">授权状态</span>
                <span class="setting-desc" v-if="baidupanUser">已连接：{{ baidupanUser.baidu_name }}</span>
                <span class="setting-desc" v-else>点击"获取授权"按钮打开授权页面获取密钥信息</span>
              </div>
              <div class="setting-control">
                <div class="baidupan-status">
                  <span v-if="baidupanUser" class="status connected">已授权</span>
                  <span v-else class="status disconnected">未授权</span>
                </div>
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
                  v-model="baiduClientId" 
                  placeholder="百度网盘 App Key" 
                  style="width: 100%; margin-bottom: 12px;"
                >
                <input 
                  type="text" 
                  class="form-control" 
                  v-model="baiduClientSecret" 
                  placeholder="百度网盘 App Secret" 
                  style="width: 100%; margin-bottom: 12px;"
                >
                <input 
                  type="text" 
                  class="form-control" 
                  v-model="refreshToken" 
                  placeholder="Refresh Token" 
                  style="width: 100%; margin-bottom: 12px;"
                  @paste="handlePaste"
                >
                <button 
                  class="btn btn-primary" 
                  style="width: 100%;"
                  @click="refreshAccessToken" 
                  :disabled="!baiduClientId || !baiduClientSecret || !refreshToken || isLoading"
                >
                  {{ isLoading ? '获取中...' : '获取 access_token' }}
                </button>
              </div>
            </div>

            <div class="setting-row" v-else>
              <div class="setting-info" style="width: 100%;">
                <div class="user-info">
                  <img :src="baidupanUser.avatar_url" class="user-avatar" alt="头像">
                  <div class="user-detail">
                    <span class="user-name">{{ baidupanUser.baidu_name }}</span>
                    <span class="user-vip">{{ baidupanUser.vip_type === 2 ? '超级会员' : baidupanUser.vip_type === 1 ? '普通会员' : '普通用户' }}</span>
                  </div>
                </div>
                <button 
                  class="btn btn-danger" 
                  style="width: 100%; margin-top: 12px;"
                  @click="disconnect"
                >
                  取消授权
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="setting-section">
          <h2 class="section-title">外观</h2>
          <div class="setting-card">
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">视图模式</span>
                <span class="setting-desc">书架的显示方式</span>
              </div>
              <div class="setting-control">
                <div class="toggle-group">
                  <button 
                    class="toggle-btn" 
                    :class="{ active: uiConfig.viewMode === 'grid' }"
                    @click="updateViewMode('grid')"
                  >网格</button>
                  <button 
                    class="toggle-btn" 
                    :class="{ active: uiConfig.viewMode === 'list' }"
                    @click="updateViewMode('list')"
                  >列表</button>
                </div>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">语言</span>
                <span class="setting-desc">界面语言</span>
              </div>
              <div class="setting-control">
                <select class="form-control" :model-value="uiConfig.language" @change="updateLanguage">
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">English</option>
                </select>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useEbookStore } from '../../stores/ebook'
import { useDialogStore } from '../../stores/dialog'
import { api } from '../../api/adapter'

const ebookStore = useEbookStore()
const dialogStore = useDialogStore()

const storageConfig = computed(() => ebookStore.userConfig.storage)
const uiConfig = computed(() => ebookStore.userConfig.ui)
const baidupanUser = computed(() => ebookStore.baidupanUser)

const baiduClientId = ref('hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf')
const baiduClientSecret = ref('YH2VpZcFJHYNnV6vLfHQXDBhcE7ZChyE')
const refreshToken = ref('')
const inputAccessToken = ref('')
const isLoading = ref(false)

const handlePaste = (event: ClipboardEvent) => {
  const text = event.clipboardData?.getData('text')
  if (text) {
    refreshToken.value = text
    event.preventDefault()
  }
}

const getAuthorization = () => {
  console.log('=== 开始获取授权 ===')
  console.log('当前环境:', window.location.href)
  
  // 打开授权页面（显示密钥信息）
  const infoUrl = 'https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id=hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf&redirect_uri=https://alistgo.com/tool/baidu/callback&scope=basic,netdisk&qrcode=1'
  console.log('尝试打开信息页面:', infoUrl)
  
  try {
    // 检查是否在 Electron 环境
    if (window.electron) {
      console.log('检测到 Electron 环境，使用 shell.openExternal')
      window.electron.openExternal(infoUrl)
      console.log('✓ 已调用 Electron openExternal')
    } else {
      console.log('非 Electron 环境，使用 window.open')
      const infoWindow = window.open(infoUrl, '_blank', 'width=800,height=600,noopener,noreferrer')
      if (infoWindow) {
        console.log('✓ 信息窗口打开成功')
      } else {
        console.error('✗ 信息窗口被阻止')
        dialogStore.showErrorDialog('窗口被阻止', '请在浏览器设置中允许弹出窗口，或手动访问授权页面')
      }
    }
    
    // 同时打开百度授权窗口
    const clientId = baiduClientId.value
    const redirectUri = 'https://alistgo.com/tool/baidu/callback'
    const scope = 'basic,netdisk'
    const authUrl = `https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&display=popup`
    
    console.log('准备打开授权窗口:', authUrl)
    
    setTimeout(() => {
      console.log('打开授权窗口...')
      try {
        if (window.electron) {
          console.log('使用 Electron openExternal 打开授权窗口')
          window.electron.openExternal(authUrl)
          console.log('✓ 已调用 Electron openExternal')
        } else {
          const authWindow = window.open(authUrl, '_blank', 'width=600,height=500,noopener,noreferrer')
          if (authWindow) {
            console.log('✓ 授权窗口打开成功')
          } else {
            console.error('✗ 授权窗口被阻止')
          }
        }
      } catch (error) {
        console.error('打开授权窗口失败:', error)
      }
    }, 500)
  } catch (error) {
    console.error('获取授权过程出错:', error)
    dialogStore.showErrorDialog('打开失败', '无法打开授权页面，请手动访问')
  }
  
  console.log('=== 获取授权完成 ===')
}

const refreshAccessToken = async () => {
  if (!baiduClientId.value || !baiduClientSecret.value || !refreshToken.value) return
  isLoading.value = true
  
  try {
    const data = await api.refreshToken(
      refreshToken.value,
      baiduClientId.value,
      baiduClientSecret.value
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
  
  // 重置为默认值
  baiduClientId.value = 'hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf'
  baiduClientSecret.value = 'YH2VpZcFJHYNnV6vLfHQXDBhcE7ZChyE'
  
  // 立即刷新用户信息状态
  await ebookStore.fetchBaidupanUserInfo(true)
  
  dialogStore.showSuccessDialog('已取消授权')
}

const updateViewMode = async (mode: 'grid' | 'list') => {
  await ebookStore.updateUserConfig({
    ui: { ...uiConfig.value, viewMode: mode }
  })
}

const updateLanguage = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  await ebookStore.updateUserConfig({
    ui: { ...uiConfig.value, language: target.value }
  })
}

onMounted(async () => {
  await ebookStore.initialize()
  
  if (storageConfig.value.baidupan?.accessToken) {
    await ebookStore.fetchBaidupanUserInfo()
  }
})
</script>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #4A90E2;
  margin: 0;
}

.main {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.settings-container {
  max-width: 600px;
  margin: 0 auto;
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
}

.baidupan-status {
  display: flex;
  align-items: center;
  gap: 12px;
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

.btn-secondary {
  background-color: #f5f7fa;
  color: #666;
}

.btn-secondary:hover {
  background-color: #e8e8e8;
}

.btn-danger {
  background-color: #F56C6C;
  color: white;
}

.btn-danger:hover {
  background-color: #f23c3c;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.user-vip {
  font-size: 12px;
  color: #999;
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
