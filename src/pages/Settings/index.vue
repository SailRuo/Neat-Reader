<template>
  <div class="settings">
    <!-- 顶部导航栏 -->
    <header class="header">
      <h1 class="title">设置</h1>
      <router-link to="/" class="btn btn-secondary">
        ← 返回
      </router-link>
    </header>

    <!-- 主要内容区 -->
    <main class="main">
      <div class="settings-container">
        <!-- 存储配置 -->
        <section class="setting-section">
          <h2 class="section-title">存储配置</h2>
          <div class="setting-card">
            <div class="form-group">
              <label class="form-label">默认存储方式</label>
              <div class="radio-group">
                <label class="radio-item">
                  <input 
                    type="radio" 
                    :model-value="storageConfig.default" 
                    @change="updateStorage('local')"
                    value="local" 
                    name="storage"
                  >
                  <span>本地存储</span>
                </label>
                <label class="radio-item">
                  <input 
                    type="radio" 
                    :model-value="storageConfig.default" 
                    @change="updateStorage('baidupan')"
                    value="baidupan" 
                    name="storage"
                  >
                  <span>百度网盘</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">本地存储路径</label>
              <div class="input-group">
                <input 
                  type="text" 
                  class="form-control" 
                  :model-value="storageConfig.localPath"
                  @input="updateLocalPath"
                  placeholder="选择本地存储路径"
                >
                <button class="btn btn-secondary">浏览</button>
              </div>
            </div>

            <div class="form-group" v-if="storageConfig.default === 'baidupan'">
              <label class="form-label">百度网盘配置</label>
              <div class="baidupan-config">
                <div class="form-group">
                  <label class="form-label">百度网盘根路径</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    :model-value="storageConfig.baidupan.rootPath"
                    @input="updateBaidupanRootPath"
                    placeholder="/NeatReader"
                  >
                </div>
                <div class="form-group">
                  <label class="form-label">App Key</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    :model-value="baidupanClientId"
                    @input="updateBaidupanClientId"
                    placeholder="请输入百度网盘 App Key"
                  >
                </div>
                <div class="form-group">
                  <label class="form-label">App Secret</label>
                  <input 
                    type="password" 
                    class="form-control" 
                    :model-value="baidupanClientSecret"
                    @input="updateBaidupanClientSecret"
                    placeholder="请输入百度网盘 App Secret"
                  >
                </div>
                <div class="form-group">
                  <label class="form-label">授权状态</label>
                  <div class="auth-status">
                    <span v-if="isBaidupanAuthorized" class="status success">已授权</span>
                    <span v-else class="status error">未授权</span>
                    <div class="auth-buttons">
                      <button 
                        class="btn btn-primary" 
                        @click="authorizeBaidupan"
                        :disabled="isBaidupanAuthorized"
                      >
                        {{ isBaidupanAuthorized ? '已授权' : '授权百度网盘' }}
                      </button>
                      <button 
                        v-if="isBaidupanAuthorized"
                        class="btn btn-danger" 
                        @click="revokeBaidupanAuthorization"
                      >
                        取消授权
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                <input type="checkbox" :checked="storageConfig.autoSync" @change="toggleAutoSync">
                自动同步
              </label>
              <p class="help-text">开启后，阅读进度将自动同步到百度网盘</p>
            </div>

            <div class="form-group" v-if="storageConfig.autoSync">
              <label class="form-label">同步间隔（分钟）</label>
              <select class="form-control" :model-value="storageConfig.syncInterval" @change="updateSyncInterval">
                <option value="5">5分钟</option>
                <option value="15">15分钟</option>
                <option value="30">30分钟</option>
                <option value="60">1小时</option>
              </select>
            </div>
          </div>
        </section>

        <!-- 阅读偏好设置 -->
        <section class="setting-section">
          <h2 class="section-title">阅读偏好</h2>
          <div class="setting-card">
            <div class="form-group">
              <label class="form-label">默认字体大小</label>
              <div class="input-group">
                <button class="btn btn-secondary" @click="decreaseDefaultFontSize">-</button>
                <input 
                  type="number" 
                  class="form-control" 
                  :model-value="readerConfig.fontSize"
                  @input="updateFontSize"
                  min="12"
                  max="32"
                >
                <button class="btn btn-secondary" @click="increaseDefaultFontSize">+</button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">默认字体</label>
              <select class="form-control" :model-value="readerConfig.fontFamily" @change="updateFontFamily">
                <option value="system">系统默认</option>
                <option value="sans-serif">Sans Serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">默认主题</label>
              <div class="radio-group">
                <label class="radio-item">
                  <input 
                    type="radio" 
                    :model-value="readerConfig.theme" 
                    @change="updateTheme('light')"
                    value="light" 
                    name="theme"
                  >
                  <span>浅色</span>
                </label>
                <label class="radio-item">
                  <input 
                    type="radio" 
                    :model-value="readerConfig.theme" 
                    @change="updateTheme('sepia')"
                    value="sepia" 
                    name="theme"
                  >
                  <span>护眼</span>
                </label>
                <label class="radio-item">
                  <input 
                    type="radio" 
                    :model-value="readerConfig.theme" 
                    @change="updateTheme('dark')"
                    value="dark" 
                    name="theme"
                  >
                  <span>深色</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">默认翻页模式</label>
              <div class="radio-group">
                <label class="radio-item">
                  <input 
                    type="radio" 
                    :model-value="readerConfig.pageMode" 
                    @change="updatePageMode('page')"
                    value="page" 
                    name="pageMode"
                  >
                  <span>单页</span>
                </label>
                <label class="radio-item">
                  <input 
                    type="radio" 
                    :model-value="readerConfig.pageMode" 
                    @change="updatePageMode('scroll')"
                    value="scroll" 
                    name="pageMode"
                  >
                  <span>滚动</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">自动保存间隔（秒）</label>
              <select class="form-control" :model-value="readerConfig.autoSaveInterval" @change="updateAutoSaveInterval">
                <option value="5">5秒</option>
                <option value="10">10秒</option>
                <option value="30">30秒</option>
                <option value="60">1分钟</option>
              </select>
            </div>
          </div>
        </section>

        <!-- 界面设置 -->
        <section class="setting-section">
          <h2 class="section-title">界面设置</h2>
          <div class="setting-card">
            <div class="form-group">
              <label class="form-label">默认视图模式</label>
              <div class="radio-group">
                <label class="radio-item">
                  <input 
                    type="radio" 
                    :model-value="uiConfig.viewMode" 
                    @change="updateViewMode('grid')"
                    value="grid" 
                    name="viewMode"
                  >
                  <span>网格视图</span>
                </label>
                <label class="radio-item">
                  <input 
                    type="radio" 
                    :model-value="uiConfig.viewMode" 
                    @change="updateViewMode('list')"
                    value="list" 
                    name="viewMode"
                  >
                  <span>列表视图</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">界面语言</label>
              <select class="form-control" :model-value="uiConfig.language" @change="updateLanguage">
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>
          </div>
        </section>

        <!-- 保存按钮 -->
        <div class="save-section">
          <button class="btn btn-primary btn-lg" @click="saveSettings">
            保存设置
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useEbookStore } from '../../stores/ebook'
import { useDialogStore } from '../../stores/dialog'

// 初始化状态管理
const ebookStore = useEbookStore()
const dialogStore = useDialogStore()

// 响应式数据
const isBaidupanAuthorized = computed(() => ebookStore.isBaidupanTokenValid())
const baidupanClientId = ref('')
const baidupanClientSecret = ref('')

// 存储配置
const storageConfig = computed(() => ebookStore.userConfig.storage)

// 阅读配置
const readerConfig = computed(() => ebookStore.userConfig.reader)

// UI配置
const uiConfig = computed(() => ebookStore.userConfig.ui)

// 方法
const updateStorage = async (type: 'local' | 'baidupan') => {
  await ebookStore.updateUserConfig({
    storage: {
      ...storageConfig.value,
      default: type
    }
  })
}

const updateLocalPath = async (event: Event) => {
  const target = event.target as HTMLInputElement
  await ebookStore.updateUserConfig({
    storage: {
      ...storageConfig.value,
      localPath: target.value
    }
  })
}

const updateBaidupanRootPath = async (event: Event) => {
  const target = event.target as HTMLInputElement
  await ebookStore.updateUserConfig({
    storage: {
      ...storageConfig.value,
      baidupan: {
        ...storageConfig.value.baidupan,
        rootPath: target.value
      }
    }
  })
}

const updateBaidupanClientId = (event: Event) => {
  const target = event.target as HTMLInputElement
  baidupanClientId.value = target.value
  ebookStore.updateBaidupanApiConfig(target.value, baidupanClientSecret.value)
}

const updateBaidupanClientSecret = (event: Event) => {
  const target = event.target as HTMLInputElement
  baidupanClientSecret.value = target.value
  ebookStore.updateBaidupanApiConfig(baidupanClientId.value, target.value)
}

const toggleAutoSync = async (event: Event) => {
  const target = event.target as HTMLInputElement
  await ebookStore.updateUserConfig({
    storage: {
      ...storageConfig.value,
      autoSync: target.checked
    }
  })
}

const updateSyncInterval = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  await ebookStore.updateUserConfig({
    storage: {
      ...storageConfig.value,
      syncInterval: parseInt(target.value)
    }
  })
}

const updateFontSize = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const size = parseInt(target.value)
  if (size >= 12 && size <= 32) {
    await ebookStore.updateUserConfig({
      reader: {
        ...readerConfig.value,
        fontSize: size
      }
    })
  }
}

const updateFontFamily = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  await ebookStore.updateUserConfig({
    reader: {
      ...readerConfig.value,
      fontFamily: target.value
    }
  })
}

const updateTheme = async (theme: 'light' | 'sepia' | 'dark') => {
  await ebookStore.updateUserConfig({
    reader: {
      ...readerConfig.value,
      theme
    }
  })
}

const updatePageMode = async (mode: 'page' | 'scroll') => {
  await ebookStore.updateUserConfig({
    reader: {
      ...readerConfig.value,
      pageMode: mode
    }
  })
}

const updateAutoSaveInterval = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  await ebookStore.updateUserConfig({
    reader: {
      ...readerConfig.value,
      autoSaveInterval: parseInt(target.value)
    }
  })
}

const updateViewMode = async (mode: 'grid' | 'list') => {
  await ebookStore.updateUserConfig({
    ui: {
      ...uiConfig.value,
      viewMode: mode
    }
  })
}

const updateLanguage = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  await ebookStore.updateUserConfig({
    ui: {
      ...uiConfig.value,
      language: target.value
    }
  })
}

const revokeBaidupanAuthorization = async () => {
  dialogStore.showDialog({
    title: '确认取消授权',
    message: '确定要取消百度网盘授权吗？',
    type: 'warning',
    buttons: [
      { text: '取消' },
      { 
        text: '确定', 
        primary: true,
        callback: async () => {
          await ebookStore.updateUserConfig({
            storage: {
              ...storageConfig.value,
              baidupan: {
                ...storageConfig.value.baidupan,
                accessToken: '',
                refreshToken: '',
                expiration: 0,
                userId: ''
              }
            }
          })
          dialogStore.showSuccessDialog('百度网盘授权已取消')
        }
      }
    ]
  })
}

const authorizeBaidupan = async () => {
  try {
    const success = await ebookStore.authorizeBaidupan()
    if (success) {
      dialogStore.showSuccessDialog('百度网盘授权成功')
    } else {
      dialogStore.showErrorDialog('百度网盘授权失败，请重试')
    }
  } catch (error) {
    console.error('百度网盘授权失败:', error)
    dialogStore.showErrorDialog('百度网盘授权失败，请重试', error instanceof Error ? error.message : String(error))
  }
}

const decreaseDefaultFontSize = async () => {
  if (readerConfig.value.fontSize > 12) {
    await ebookStore.updateUserConfig({
      reader: {
        ...readerConfig.value,
        fontSize: readerConfig.value.fontSize - 1
      }
    })
  }
}

const increaseDefaultFontSize = async () => {
  if (readerConfig.value.fontSize < 32) {
    await ebookStore.updateUserConfig({
      reader: {
        ...readerConfig.value,
        fontSize: readerConfig.value.fontSize + 1
      }
    })
  }
}

const saveSettings = async () => {
  try {
    await ebookStore.saveUserConfig()
    alert('设置已保存')
  } catch (error) {
    console.error('保存设置失败:', error)
    alert('保存设置失败，请重试')
  }
}

// 生命周期钩子
onMounted(async () => {
  // 初始化电子书存储
  await ebookStore.initialize()
})
</script>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

/* 顶部导航栏 */
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

/* 主要内容区 */
.main {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* 设置容器 */
.settings-container {
  max-width: 800px;
  margin: 0 auto;
}

/* 设置区块 */
.setting-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #4A90E2;
}

/* 设置卡片 */
.setting-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 24px;
}

/* 表单组 */
.form-group {
  margin-bottom: 20px;
}

/* 输入组 */
.input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-group .form-control {
  flex: 1;
  min-width: 0;
}

/* 单选按钮组 */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.radio-item input[type="radio"] {
  cursor: pointer;
}

/* 授权状态 */
.auth-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.status.success {
  background-color: #F0F9EB;
  color: #67C23A;
}

.status.error {
  background-color: #FEF0F0;
  color: #F56C6C;
}

/* 帮助文本 */
.help-text {
  font-size: 12px;
  color: #909399;
  margin: 4px 0 0 0;
}

/* 保存按钮区域 */
.save-section {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

/* 大按钮 */
.btn-lg {
  padding: 12px 32px;
  font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header {
    padding: 12px 16px;
  }

  .title {
    font-size: 20px;
  }

  .main {
    padding: 16px;
  }

  .setting-card {
    padding: 16px;
  }

  .radio-group {
    flex-direction: column;
  }

  .input-group {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>