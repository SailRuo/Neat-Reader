<template>
  <div class="home">
    <!-- 主要内容区 -->
    <main class="main">
      <div class="content-wrapper">
        <!-- 左侧边栏：分类导航 -->
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="logo">
              <img src="/src/assets/icons/appicon.png" alt="Logo" class="logo-icon" style="width: 48px; height: 48px;" />
              <h1 class="logo-text">Reader</h1>
            </div>
          </div>

          <!-- 固定的"全部书籍" -->
          <div class="sidebar-fixed-section">
            <button 
              class="category-item" 
              :class="{ 'active': selectedCategory === 'all' }"
              @click="selectedCategory = 'all'"
            >
              <span class="category-icon">
                <Icons.Library :size="20" />
              </span>
              <span class="category-name">全部书籍</span>
              <span class="category-count">{{ books.length }}</span>
            </button>
          </div>

          <!-- 可滚动的分类区域 -->
          <div class="sidebar-content">
            <div class="sidebar-section">
              <h3 class="sidebar-title">我的分类</h3>
              <div class="category-list">
                <div 
                  v-for="category in categories" 
                  :key="category.id"
                  class="category-item-wrapper"
                >
                  <button 
                    class="category-item"
                    :class="{ 'active': selectedCategory === category.id }"
                    :style="{ '--category-color': category.color }"
                    @click="selectedCategory = category.id"
                    @contextmenu.prevent="showCategoryContextMenu($event, category)"
                  >
                    <span class="category-icon" :style="{ backgroundColor: category.color + '20', color: category.color }">
                      <component :is="getCategoryIcon(category.name)" :size="20" />
                    </span>
                    <span class="category-name">{{ category.name }}</span>
                    <span class="category-count">{{ getBooksByCategory(category.id).length }}</span>
                  </button>
                </div>
                
                <!-- 新建分类按钮 -->
                <button class="category-item add-category" @click="showAddCategoryDialog">
                  <span class="category-icon add-icon">
                    <Icons.Plus :size="20" />
                  </span>
                  <span class="category-name">新建分类</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 固定在底部的区域 -->
          <div class="sidebar-bottom">
            <!-- 百度网盘状态 -->
            <div class="sidebar-section">
              <div class="baidupan-status" v-if="isBaidupanAuthorized && ebookStore.baidupanUser" @click="selectedCategory = 'settings'">
                <img :src="ebookStore.baidupanUser.avatar_url" class="baidupan-avatar" alt="头像" />
                <div class="baidupan-info">
                  <span class="baidupan-name">{{ ebookStore.baidupanUser.baidu_name }}</span>
                  <span class="baidupan-vip">{{ ebookStore.baidupanUser.vip_type === 2 ? '超级会员' : ebookStore.baidupanUser.vip_type === 1 ? '普通会员' : '普通用户' }}</span>
                </div>
              </div>
              <div class="baidupan-status unauthorized" v-else-if="!isBaidupanAuthorized" @click="selectedCategory = 'settings'">
                <Icons.UserX :size="20" />
                <span class="baidupan-text">未授权</span>
              </div>
            </div>

            <!-- 设置按钮 -->
            <div class="sidebar-section">
              <button 
                class="category-item"
                :class="{ 'active': selectedCategory === 'settings' }"
                @click="selectedCategory = 'settings'"
              >
                <span class="category-icon">
                  <Icons.Settings :size="20" />
                </span>
                <span class="category-name">设置</span>
              </button>
            </div>
          </div>
        </aside>

        <!-- 右侧内容区：书籍列表 -->
        <section class="content">
          <!-- 固定的内容头部 -->
          <div class="content-header-fixed" v-if="selectedCategory !== 'settings'">
            <div class="section-info">
              <h2 class="section-title">
                {{ selectedCategory === 'all' ? '我的书架' : getCategoryName(selectedCategory) }}
              </h2>
              <p class="section-subtitle">
                {{ selectedCategory === 'all' ? `共 ${books.length} 本书籍` : `共 ${getBooksByCategory(selectedCategory).length} 本` }}
              </p>
            </div>
            <div class="header-controls">
              <div class="search-container">
                <div class="search-box">
                  <Icons.Search :size="18" class="search-icon" />
                  <input 
                    type="text" 
                    v-model="searchKeyword" 
                    placeholder="搜索书名、作者..." 
                    class="search-input"
                  />
                  <button 
                    v-if="searchKeyword" 
                    class="search-clear" 
                    @click="clearSearch"
                    title="清除搜索"
                  >
                    <Icons.X :size="16" />
                  </button>
                </div>
              </div>
              <div class="view-controls">
                <button 
                  class="view-btn" 
                  :class="{ 'active': viewMode === 'grid' }"
                  @click="viewMode = 'grid'"
                  title="网格视图"
                >
                  <Icons.LayoutGrid :size="16" />
                </button>
                <button 
                  class="view-btn" 
                  :class="{ 'active': viewMode === 'list' }"
                  @click="viewMode = 'list'"
                  title="列表视图"
                >
                  <Icons.List :size="16" />
                </button>
              </div>
            </div>
          </div>

          <!-- 可滚动的内容区域 -->
          <div class="content-scrollable" v-if="selectedCategory !== 'settings'">
            <!-- 搜索结果提示 -->
            <div v-if="isSearching" class="search-loading">
              <div class="loading-spinner"></div>
              <p>正在搜索...</p>
            </div>

            <div v-else-if="searchResults.length > 0 && searchKeyword" class="search-results-info">
              <div class="search-info-content">
                <Icons.SearchCheck :size="24" class="search-info-icon" />
                <div class="search-info-text">
                  <h3>搜索结果</h3>
                  <p>找到 {{ searchResults.length }} 个结果，关键词: {{ searchKeyword }}</p>
                </div>
                <button class="clear-search-btn" @click="clearSearch">
                  <Icons.X :size="16" />
                </button>
              </div>
            </div>

            <!-- 书籍网格/列表 -->
            <div v-if="displayBooks.length > 0" :class="viewMode === 'grid' ? 'books-grid' : 'books-list'">
              <div 
                v-for="book in displayBooks" 
                :key="book.id" 
                class="book-card"
                :class="{ 'has-progress': book.readingProgress > 0 }"
                @click="goToReader(book.id)"
                @contextmenu.prevent="showContextMenu($event, book)"
              >
                <!-- 书籍封面 -->
                <div class="book-cover-container">
                  <div class="book-cover" :style="{ backgroundImage: book.cover ? `url(${book.cover})` : 'none' }">
                    <div v-if="!book.cover" class="book-cover-placeholder">
                      <span class="placeholder-icon">📚</span>
                      <span class="placeholder-text">{{ book.title.charAt(0) }}</span>
                    </div>
                    <div class="book-format-badge">{{ book.format.toUpperCase() }}</div>
                    
                    <!-- 下载状态覆盖层 -->
                    <div v-if="book.downloading" class="book-downloading-overlay">
                      <div class="downloading-spinner"></div>
                      <span class="downloading-text">下载中...</span>
                    </div>
                    
                    <!-- 上传状态覆盖层 -->
                    <div v-else-if="book.uploading" class="book-uploading-overlay">
                      <div class="uploading-spinner"></div>
                      <span class="uploading-text">上传中...</span>
                    </div>
                    
                    <!-- 云端未下载状态覆盖层 -->
                    <div v-else-if="book.storageType === 'baidupan'" class="book-cloud-overlay">
                      <div class="cloud-icon-wrapper">
                        <Icons.CloudDownload :size="32" />
                      </div>
                      <span class="cloud-text">点击下载</span>
                    </div>
                    
                    <!-- 本地书籍上传提示覆盖层 -->
                    <div v-else-if="book.storageType === 'local' && isBaidupanAuthorized" class="book-upload-hint-overlay" @click.stop="handleUploadToBaidupan(book)">
                      <div class="upload-hint-icon-wrapper">
                        <Icons.CloudUpload :size="28" />
                      </div>
                      <span class="upload-hint-text">上传到云端</span>
                    </div>
                  </div>
                </div>
                
                <!-- 书籍信息 -->
                <div class="book-info">
                  <h3 class="book-title">{{ book.title }}</h3>
                  <p class="book-author">{{ book.author || '未知作者' }}</p>
                  
                  <!-- 阅读进度 -->
                  <div v-if="book.readingProgress > 0" class="book-progress">
                    <div class="progress-bar-container">
                      <div class="progress-bar" :style="{ width: `${book.readingProgress}%` }"></div>
                    </div>
                    <span class="progress-text">{{ book.readingProgress }}%</span>
                  </div>
                  
                  <!-- 其他信息 -->
                  <div class="book-meta">
                    <span class="book-last-read">{{ formatDate(book.lastRead) }}</span>
                    <span v-if="book.categoryId" class="book-category" :style="{ backgroundColor: getCategoryColor(book.categoryId) + '20', color: getCategoryColor(book.categoryId) }">
                      {{ getCategoryName(book.categoryId) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 空状态 - 统一处理所有空状态 -->
            <div v-else class="empty-state">
              <div class="empty-state-content">
                <!-- 搜索无结果状态 -->
                <template v-if="searchKeyword">
                  <div class="empty-state-illustration">
                    <div class="illustration-circle search-circle">
                      <Icons.SearchX :size="32" class="illustration-icon" />
                    </div>
                  </div>
                  <h3 class="empty-state-title">未找到 "{{ searchKeyword }}"</h3>
                  <p class="empty-state-description">
                    没有找到与您搜索内容相关的书籍
                  </p>
                  <div class="empty-state-suggestions">
                    <div class="suggestion-title">
                      <Icons.Lightbulb :size="16" />
                      <span>搜索建议</span>
                    </div>
                    <ul class="suggestion-list">
                      <li>检查关键词拼写是否正确</li>
                      <li>尝试使用更简短或更通用的关键词</li>
                      <li>使用书名或作者名进行搜索</li>
                    </ul>
                  </div>
                  <div class="empty-state-actions">
                    <button class="btn btn-secondary btn-action" @click="clearSearch">
                      <Icons.RotateCcw :size="16" />
                      清除搜索
                    </button>
                    <button class="btn btn-primary btn-action" @click="handleAddBookFromEmpty">
                      <Icons.Plus :size="16" />
                      添加新书籍
                    </button>
                  </div>
                </template>

                <!-- 无书籍状态 -->
                <template v-else>
                  <div class="empty-state-illustration">
                    <div class="illustration-circle book-circle">
                      <Icons.BookOpen :size="38" class="illustration-icon" />
                    </div>
                    <div class="illustration-sparkles">
                      <Icons.Sparkles :size="16" class="sparkle sparkle-1" />
                      <Icons.Sparkles :size="12" class="sparkle sparkle-2" />
                      <Icons.Sparkles :size="14" class="sparkle sparkle-3" />
                    </div>
                  </div>
                  <h3 class="empty-state-title">
                    {{ selectedCategory === 'all' ? '该分类暂无书籍' : '该分类暂无书籍' }}
                  </h3>
                  <p class="empty-state-description">
                    {{ selectedCategory === 'all' 
                      ? '将书籍添加到此分类，让您的书架更有条理' 
                      : '将书籍添加到此分类，让您的书架更有条理'
                    }}
                  </p>
                </template>
              </div>
            </div>
          </div>

          <!-- 设置面板 -->
          <SettingsPanel 
            v-else-if="selectedCategory === 'settings'"
            :baidupan-user="ebookStore.baidupanUser"
            :view-mode="viewMode"
            @update-view-mode="updateViewMode"
          />
        </section>
      </div>
    </main>

    <!-- 浮动操作按钮组 (Speed Dial) -->
    <div 
      v-if="selectedCategory !== 'settings'" 
      class="floating-action-menu" 
      :class="{ 'is-open': isSpeedDialOpen }"
    >
      <!-- 子按钮 -->
      <div class="floating-action-items">
        <button 
          class="floating-action-item" 
          @click="handleAddBook"
          title="添加书籍"
        >
          <Icons.Plus :size="20" />
          <span class="floating-action-label">添加书籍</span>
        </button>
        <button 
          class="floating-action-item" 
          @click="handleOpenChat"
          title="AI 助手"
        >
          <Icons.MessageCircle :size="20" />
          <span class="floating-action-label">AI 助手</span>
        </button>
      </div>
      
      <!-- 主按钮 -->
      <button 
        class="floating-action-main" 
        @click="toggleSpeedDial"
      >
        <Icons.Plus :size="24" class="icon-plus" />
        <Icons.X :size="24" class="icon-close" />
      </button>
    </div>
    
    <!-- 隐藏的文件输入框 -->
    <input 
      type="file" 
      ref="fileInputRef"
      @change="handleFileSelect"
      style="display: none"
      accept=".epub,.pdf,.txt"
    />

    <!-- AI 对话窗口 -->
    <ChatWindow 
      v-model:visible="showChatWindow" 
      @navigate-to-settings="handleNavigateToSettings"
    />

    <!-- 分类管理对话框 -->
    <div v-if="showCategoryManage" class="dialog-overlay" @click="closeCategoryManageDialog">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h3 class="dialog-title">分类管理</h3>
          <button class="dialog-close" @click="closeCategoryManageDialog">
            <Icons.X :size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <div class="category-manage-list">
            <div 
              v-for="category in categories" 
              :key="category.id"
              class="category-manage-item"
              :class="{ 'selected': selectedCategoryId === category.id }"
              @click="selectedCategoryId = category.id"
            >
              <span class="category-manage-icon" :style="{ backgroundColor: category.color + '20', color: category.color }">
                <component :is="getCategoryEmoji(category.name)" :size="18" />
              </span>
              <span class="category-manage-name">{{ category.name }}</span>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeCategoryManageDialog">取消</button>
          <button 
            class="btn btn-primary" 
            @click="confirmMoveToCategory"
            :disabled="!selectedCategoryId"
          >
            确定
          </button>
        </div>
      </div>
    </div>

    <!-- 添加分类对话框 -->
    <div v-if="showAddCategory" class="dialog-overlay" @click="closeAddCategoryDialog">
      <div class="dialog-content add-category-dialog" @click.stop>
        <div class="dialog-header">
          <div class="dialog-header-content">
            <div class="dialog-icon">
              <Icons.FolderPlus :size="24" />
            </div>
            <div>
              <h3 class="dialog-title">新建分类</h3>
              <p class="dialog-subtitle">为你的书籍创建一个新的分类</p>
            </div>
          </div>
          <button class="dialog-close" @click="closeAddCategoryDialog">
            <Icons.X :size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">
              <Icons.Tag :size="16" />
              <span>分类名称</span>
            </label>
            <input 
              ref="categoryNameInput"
              type="text" 
              v-model="newCategoryName" 
              placeholder="例如：小说、技术、历史..."
              class="form-input"
              maxlength="20"
              @keyup.enter="addCategory"
            />
            <div class="form-hint">
              <span v-if="newCategoryName.trim()" class="char-count">{{ newCategoryName.length }}/20</span>
              <span v-else class="hint-text">最多20个字符</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">
              <Icons.Palette :size="16" />
              <span>分类颜色</span>
            </label>
            <div class="color-options">
              <button
                v-for="color in presetColors"
                :key="color.value"
                class="color-option"
                :class="{ active: newCategoryColor === color.value }"
                :style="{ backgroundColor: color.value }"
                :title="color.name"
                @click="newCategoryColor = color.value"
              >
                <Icons.Check v-if="newCategoryColor === color.value" :size="16" class="check-icon" />
              </button>
              <div class="color-custom">
                <input 
                  type="color" 
                  v-model="newCategoryColor" 
                  class="color-picker-input"
                  title="自定义颜色"
                />
                <span class="custom-label">自定义</span>
              </div>
            </div>
          </div>
          <div class="category-preview">
            <label class="form-label">
              <Icons.Eye :size="16" />
              <span>预览效果</span>
            </label>
            <div class="preview-item">
              <span class="preview-icon" :style="{ backgroundColor: newCategoryColor }">
                <Icons.Folder :size="18" />
              </span>
              <span class="preview-name">{{ newCategoryName || '分类名称' }}</span>
              <span class="preview-count">0 本书</span>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeAddCategoryDialog">
            <Icons.X :size="16" />
            取消
          </button>
          <button 
            class="btn btn-primary" 
            @click="addCategory" 
            :disabled="!newCategoryName.trim()"
          >
            <Icons.Check :size="16" />
            创建分类
          </button>
        </div>
      </div>
    </div>

    <!-- 百度网盘授权对话框 -->
    <div v-if="showBaidupanAuth" class="dialog-overlay" @click="closeBaidupanAuthDialog">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h3 class="dialog-title">百度网盘授权</h3>
          <button class="dialog-close" @click="closeBaidupanAuthDialog">
            <Icons.X :size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">App Key</label>
            <input 
              type="text" 
              v-model="baidupanForm.appKey" 
              placeholder="输入百度网盘 App Key"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Secret Key</label>
            <input 
              type="password" 
              v-model="baidupanForm.secretKey" 
              placeholder="输入百度网盘 Secret Key"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Refresh Token</label>
            <input 
              type="password" 
              v-model="baidupanForm.refreshToken" 
              placeholder="输入百度网盘 Refresh Token"
              class="form-input"
            />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeBaidupanAuthDialog">取消</button>
          <button class="btn btn-primary" @click="saveBaidupanAuth">保存</button>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      :items="contextMenuItems"
      @close="closeContextMenu"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useEbookStore } from '../../stores/ebook'
import { useDialogStore } from '../../stores/dialog'
import SettingsPanel from '../../components/SettingsPanel/index.vue'
import ChatWindow from '../../components/ChatWindow/index.vue'
import ContextMenu from '../../components/ContextMenu/index.vue'
import type { MenuItem } from '../../components/ContextMenu/index.vue'
import * as Icons from 'lucide-vue-next'
import { api } from '../../api/adapter'

// 初始化路由和状态管理
const router = useRouter()
const ebookStore = useEbookStore()
const dialogStore = useDialogStore()

// 响应式数据
const viewMode = ref<'grid' | 'list'>('grid')
const fileInputRef = ref<HTMLInputElement | null>(null)
const searchKeyword = ref('')
const selectedCategory = ref('all')
const showChatWindow = ref(false)
const isSpeedDialOpen = ref(false)

// 监听分类切换，自动同步网盘数据
watch(selectedCategory, (newVal) => {
  if (newVal !== 'settings') {
    console.log('切换分类，触发网盘数据同步:', newVal);
    ebookStore.loadBaidupanBooks();
  }
})

// 右键菜单相关
const selectedBook = ref<any>(null)
const selectedCategoryForMenu = ref<any>(null)
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuItems = ref<MenuItem[]>([])

// 分类对话框相关
const showAddCategory = ref(false)
const newCategoryName = ref('')
const newCategoryColor = ref('#4A90E2')
const categoryNameInput = ref<HTMLInputElement | null>(null)

// 预设颜色
const presetColors = [
  { name: '蓝色', value: '#4A90E2' },
  { name: '紫色', value: '#9B59B6' },
  { name: '绿色', value: '#2ECC71' },
  { name: '橙色', value: '#E67E22' },
  { name: '红色', value: '#E74C3C' },
  { name: '青色', value: '#1ABC9C' },
  { name: '粉色', value: '#EC407A' },
  { name: '靛蓝', value: '#5C6BC0' },
  { name: '黄色', value: '#F39C12' },
  { name: '深蓝', value: '#34495E' },
  { name: '薄荷绿', value: '#16A085' },
  { name: '珊瑚红', value: '#FF6B6B' }
]

const showCategoryManage = ref(false)
const selectedCategoryId = ref<string>('')

// 百度网盘授权对话框相关
const showBaidupanAuth = ref(false)
const baidupanForm = ref({
  appKey: '',
  secretKey: '',
  refreshToken: ''
})

// 搜索相关
const searchResults = ref<any[]>([])
const isSearching = ref(false)

// 百度网盘授权状态
const isBaidupanAuthorized = computed(() => {
  return ebookStore.isBaidupanTokenValid()
})

// 显示百度网盘授权弹窗
const showBaidupanAuthDialog = () => {
  if (ebookStore.userConfig.storage.baidupan) {
    baidupanForm.value = {
      appKey: ebookStore.userConfig.storage.baidupan.appKey || '',
      secretKey: ebookStore.userConfig.storage.baidupan.secretKey || '',
      refreshToken: ebookStore.userConfig.storage.baidupan.refreshToken || ''
    }
  }
  showBaidupanAuth.value = true
}

// 关闭百度网盘授权弹窗
const closeBaidupanAuthDialog = () => {
  showBaidupanAuth.value = false
}

// 保存百度网盘授权信息
const saveBaidupanAuth = async () => {
  try {
    await ebookStore.updateUserConfig({
      storage: {
        ...ebookStore.userConfig.storage,
        baidupan: {
          appKey: baidupanForm.value.appKey,
          secretKey: baidupanForm.value.secretKey,
          refreshToken: baidupanForm.value.refreshToken,
          accessToken: '',
          expiration: 0,
          rootPath: '',
          userId: '',
          namingStrategy: '1'
        }
      }
    }, true)
    
    if (baidupanForm.value.refreshToken && baidupanForm.value.appKey && baidupanForm.value.secretKey) {
      const data = await api.refreshToken(baidupanForm.value.refreshToken, baidupanForm.value.appKey, baidupanForm.value.secretKey)
      if (!data.error && data.access_token) {
        await ebookStore.updateUserConfig({
          storage: {
            ...ebookStore.userConfig.storage,
            baidupan: {
              appKey: baidupanForm.value.appKey,
              secretKey: baidupanForm.value.secretKey,
              // 使用新的 refresh_token（百度 API 每次刷新都会返回新的）
              refreshToken: data.refresh_token || baidupanForm.value.refreshToken,
              accessToken: data.access_token,
              expiration: Date.now() + (data.expires_in * 1000),
              rootPath: '',
              userId: '',
              namingStrategy: '1'
            }
          }
        }, true)
        await ebookStore.fetchBaidupanUserInfo(true)
      }
    }
    
    closeBaidupanAuthDialog()
  } catch (error) {
    console.error('保存百度网盘授权信息失败:', error)
  }
}

// 取消百度网盘授权
const cancelBaidupanAuth = async () => {
  try {
    await ebookStore.updateUserConfig({
      storage: {
        ...ebookStore.userConfig.storage,
        baidupan: null
      }
    })
  } catch (error) {
    console.error('取消百度网盘授权失败:', error)
  }
}

// 获取字体名称
const updateViewMode = async (mode: 'grid' | 'list') => {
  viewMode.value = mode
  await ebookStore.updateUserConfig({
    ui: { ...ebookStore.userConfig.ui, viewMode: mode }
  })
}

// 计算属性：显示所有书籍（本地和百度网盘）
const books = computed(() => {
  return ebookStore.books
})

// 计算属性：分类列表
const categories = computed(() => {
  return (ebookStore.categories || []).filter(cat => cat.name !== '未分类')
})

// 计算属性：根据分类筛选书籍
const filteredBooks = computed(() => {
  if (selectedCategory.value === 'all') {
    return books.value
  } else {
    return books.value.filter(book => book.categoryId === selectedCategory.value)
  }
})

// 计算属性：显示的书籍
const displayBooks = computed(() => {
  // 如果有搜索关键词，只显示搜索结果（即使为空）
  if (searchKeyword.value.trim()) {
    return searchResults.value
  }
  // 否则显示过滤后的书籍
  return filteredBooks.value
})

// 优化：缓存常用计算结果
interface CachedResults {
  categoryBooks: Record<string, any[]>;
  categoryNames: Record<string, string>;
  categoryColors: Record<string, string>;
}

const cachedResults = ref<CachedResults>({
  categoryBooks: {},
  categoryNames: {},
  categoryColors: {}
})

// 方法
const goToReader = async (bookId: string) => {
  const book = ebookStore.getBookById(bookId)
  if (!book) {
    dialogStore.showErrorDialog('书籍不存在', '无法找到该书籍')
    return
  }

  // 检查云端书籍是否已下载到本地
  if (book.storageType === 'baidupan') {
    // 🎯 静默下载：不弹窗确认，直接后台下载
    try {
      // 设置下载状态（用于 UI 显示）
      book.downloading = true
      
      const result = await ebookStore.downloadFromBaidupan(book.baidupanPath || book.path)
      
      book.downloading = false
      
      if (result) {
        // 下载成功，直接进入阅读器，不弹窗
        router.push(`/reader/${bookId}`)
      } else {
        // 下载失败才提示
        dialogStore.showErrorDialog('下载失败', '请检查网络连接或授权状态')
      }
    } catch (error) {
      book.downloading = false
      console.error('下载失败:', error)
      const errorMessage = error instanceof Error ? error.message : '下载失败，请重试'
      dialogStore.showErrorDialog('下载失败', errorMessage)
    }
    return
  }

  // 本地书籍或已同步书籍，直接打开
  router.push(`/reader/${bookId}`)
}

// 触发文件选择
const triggerFileImport = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

// 速度拨号菜单控制
const toggleSpeedDial = () => {
  isSpeedDialOpen.value = !isSpeedDialOpen.value
}

const handleAddBook = () => {
  triggerFileImport()
  isSpeedDialOpen.value = false
}

const handleOpenChat = () => {
  showChatWindow.value = true
  isSpeedDialOpen.value = false
}

const handleAddBookFromEmpty = () => {
  clearSearch()
  triggerFileImport()
}

// 处理导航到设置
const handleNavigateToSettings = () => {
  selectedCategory.value = 'settings'
}

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // 检查文件扩展名
  const fileExt = file.name.toLowerCase().split('.').pop()
  if (!['epub', 'pdf', 'txt'].includes(fileExt || '')) {
    dialogStore.showErrorDialog('不支持的文件格式', '仅支持 EPUB、PDF 和 TXT 格式的电子书')
    return
  }
  
  try {
    // 显示导入进度
    dialogStore.showDialog({
      title: '正在导入',
      message: `正在导入 ${file.name} ...`,
      type: 'info',
      buttons: []
    })
    
    // 导入文件
    const result = await ebookStore.importEbookFile(file)
    
    if (result) {
      dialogStore.closeDialog()
      dialogStore.showSuccessDialog('导入成功')
    } else {
      dialogStore.closeDialog()
      dialogStore.showErrorDialog('导入失败', '无法导入所选文件')
    }
  } catch (error) {
    dialogStore.closeDialog()
    console.error('导入文件失败:', error)
    dialogStore.showErrorDialog('导入失败', error instanceof Error ? error.message : String(error))
  } finally {
    // 清空文件输入框
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

const formatDate = (timestamp: number) => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm')
}

// 显示右键菜单
const showContextMenu = (event: MouseEvent, book: any) => {
  event.preventDefault()
  selectedBook.value = book
  
  // 构建分类子菜单项
  const categoryMenuItems: MenuItem[] = categories.value.length > 0 
    ? categories.value.map(category => ({
        label: category.name,
        icon: getCategoryIcon(category.name),
        onClick: () => quickMoveToCategory(category.id)
      }))
    : [{ label: '暂无分类', disabled: true }]
  
  // 添加"新建分类"选项
  categoryMenuItems.push({
    label: '新建分类',
    icon: Icons.Plus,
    onClick: showAddCategoryFromMenu,
    divided: true
  })
  
  // 构建主菜单
  const menuItems: MenuItem[] = [
    {
      label: '移动到分类',
      icon: Icons.Folder,
      children: categoryMenuItems
    }
  ]
  
  // 只在本地书籍时显示上传选项
  if (book.storageType === 'local') {
    menuItems.push({
      label: '上传到百度网盘',
      icon: Icons.UploadCloud,
      onClick: () => handleUploadToBaidupan(book),
      divided: true
    })
  }
  
  // 删除选项
  menuItems.push({
    label: '删除书籍',
    icon: Icons.Trash2,
    onClick: () => handleRemoveBook(book),
    danger: true,
    divided: true
  })
  
  // 显示菜单
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuItems.value = menuItems
  contextMenuVisible.value = true
}

// 快捷移动到分类
const quickMoveToCategory = async (categoryId: string) => {
  if (!selectedBook.value) return
  
  const book = selectedBook.value
  
  try {
    const result = await ebookStore.addBookToCategory(book.id, categoryId)
    if (result) {
      console.log('书籍已移动到分类:', getCategoryName(categoryId))
    } else {
      dialogStore.showErrorDialog('分类更新失败', '无法找到指定书籍或分类')
    }
  } catch (error) {
    console.error('移动书籍到分类失败:', error)
    dialogStore.showErrorDialog('分类更新失败', error instanceof Error ? error.message : String(error))
  } finally {
    selectedBook.value = null
  }
}

// 从菜单显示添加分类对话框
const showAddCategoryFromMenu = () => {
  showAddCategoryDialog()
}

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenuVisible.value = false
  selectedBook.value = null
  selectedCategoryForMenu.value = null
}

// 显示分类右键菜单
const showCategoryContextMenu = (event: MouseEvent, category: any) => {
  event.preventDefault()
  selectedCategoryForMenu.value = category
  
  // 不允许删除"未分类"
  const canDelete = category.name !== '未分类'
  
  const menuItems: MenuItem[] = [
    {
      label: '重命名分类',
      icon: Icons.Edit,
      onClick: () => handleRenameCategory(category)
    }
  ]
  
  if (canDelete) {
    menuItems.push({
      label: '删除分类',
      icon: Icons.Trash2,
      onClick: () => handleDeleteCategory(category),
      danger: true,
      divided: true
    })
  }
  
  // 显示菜单
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuItems.value = menuItems
  contextMenuVisible.value = true
}

// 处理重命名分类
const handleRenameCategory = (category: any) => {
  // 这里可以添加重命名对话框的逻辑
  console.log('重命名分类:', category.name)
  // TODO: 实现重命名对话框
}

// 处理删除分类
const handleDeleteCategory = async (category: any) => {
  try {
    // 使用自定义确认对话框
    const bookCount = getBooksByCategory(category.id).length
    const message = bookCount > 0 
      ? `该分类下有 ${bookCount} 本书籍，删除后将移动到"未分类"。`
      : `确定要删除此分类吗？`
    
    dialogStore.showDialog({
      title: '删除分类',
      message: `确定要删除分类"${category.name}"吗？\n${message}`,
      type: 'warning',
      buttons: [
        {
          text: '取消',
          callback: () => {
            dialogStore.closeDialog()
            selectedCategoryForMenu.value = null
          }
        },
        {
          text: '删除',
          primary: true,
          callback: async () => {
            dialogStore.closeDialog()
            const result = await ebookStore.deleteCategory(category.id)
            if (result) {
              // 删除成功，不显示成功提示
              // 如果当前选中的是被删除的分类，切换到全部书籍
              if (selectedCategory.value === category.id) {
                selectedCategory.value = 'all'
              }
            } else {
              dialogStore.showErrorDialog('删除失败', '无法删除该分类')
            }
            selectedCategoryForMenu.value = null
          }
        }
      ]
    })
  } catch (error) {
    console.error('删除分类失败:', error)
    dialogStore.showErrorDialog('删除失败', error instanceof Error ? error.message : String(error))
    selectedCategoryForMenu.value = null
  }
}

// 处理上传到百度网盘
const handleUploadToBaidupan = async (book: any) => {
  if (!book) return
  await uploadToBaidupan(book)
  selectedBook.value = null
}

// 处理删除书籍
const handleRemoveBook = (book: any) => {
  if (!book) return
  const targetBookId = book.id
  const targetTitle = book.title
  const targetStorage = book.storageType
  const isCloudBook = targetStorage === 'baidupan' || targetStorage === 'synced'

  // 如果是云端书籍（包括 baidupan 和 synced），提供两个删除选项
  if (isCloudBook) {
    dialogStore.showDialog({
      title: '删除书籍',
      message: `《${targetTitle}》是云端书籍，请选择删除方式：`,
      type: 'warning',
      buttons: [
        { text: '取消' },
        { 
          text: '仅删除本地', 
          callback: async () => {
            try {
              const result = await ebookStore.removeBook(targetBookId, targetStorage, false)
              if (result) {
                dialogStore.showSuccessDialog('本地记录已删除', '云端文件保留')
              } else {
                dialogStore.showErrorDialog('删除失败', '无法删除指定书籍')
              }
            } catch (error) {
              console.error('删除过程报错:', error)
              dialogStore.showErrorDialog('删除失败', error instanceof Error ? error.message : String(error))
            }
          }
        },
        { 
          text: '删除本地和云端', 
          primary: true,
          callback: async () => {
            try {
              const result = await ebookStore.removeBook(targetBookId, targetStorage, true)
              if (result) {
                dialogStore.showSuccessDialog('书籍删除成功', '本地和云端文件已删除')
              } else {
                dialogStore.showErrorDialog('删除失败', '无法删除指定书籍')
              }
            } catch (error) {
              console.error('删除过程报错:', error)
              dialogStore.showErrorDialog('删除失败', error instanceof Error ? error.message : String(error))
            }
          }
        }
      ]
    })
  } else {
    // 本地书籍，直接删除
    dialogStore.showDialog({
      title: '确认删除',
      message: `确定要删除《${targetTitle}》吗？`,
      type: 'warning',
      buttons: [
        { text: '取消' },
        { 
          text: '删除', 
          primary: true,
          callback: async () => {
            try {
              const result = await ebookStore.removeBook(targetBookId, targetStorage)
              if (result) {
                dialogStore.showSuccessDialog('书籍删除成功')
              } else {
                dialogStore.showErrorDialog('删除失败', '无法删除指定书籍')
              }
            } catch (error) {
              console.error('删除过程报错:', error)
              dialogStore.showErrorDialog('删除失败', error instanceof Error ? error.message : String(error))
            }
          }
        }
      ]
    })
  }
  
  selectedBook.value = null
}

// 移动书籍到分类
const confirmMoveToCategory = async () => {
  if (!selectedBook.value || !selectedCategoryId.value) {
    console.error('selectedBook 或 selectedCategoryId 为 null，无法移动书籍')
    return
  }
  
  const book = selectedBook.value
  const categoryId = selectedCategoryId.value
  console.log('移动书籍到分类:', book.title, '->', categoryId)
  console.log('selectedBook:', selectedBook.value)
  
  try {
    console.log('调用 ebookStore.addBookToCategory')
    const result = await ebookStore.addBookToCategory(book.id, categoryId)
    console.log('addBookToCategory 返回结果:', result)
    
    if (result) {
      dialogStore.showSuccessDialog('书籍分类更新成功')
      closeCategoryManageDialog()
      console.log('书籍分类更新成功，对话框已关闭')
    } else {
      dialogStore.showErrorDialog('分类更新失败', '无法找到指定书籍或分类')
      console.log('书籍分类更新失败，对话框已关闭')
    }
  } catch (error) {
    console.error('移动书籍到分类失败:', error)
    dialogStore.showErrorDialog('分类更新失败', error instanceof Error ? error.message : String(error))
    closeCategoryManageDialog()
  }
}

// 显示添加分类对话框
const showAddCategoryDialog = () => {
  showAddCategory.value = true
  newCategoryName.value = ''
  newCategoryColor.value = '#4A90E2'
  
  // 自动聚焦到输入框
  nextTick(() => {
    categoryNameInput.value?.focus()
  })
}

// 关闭添加分类对话框
const closeAddCategoryDialog = () => {
  showAddCategory.value = false
  newCategoryName.value = ''
  newCategoryColor.value = '#4A90E2'
}

// 显示分类管理对话框
const showCategoryManageDialog = () => {
  showCategoryManage.value = true
}

// 关闭分类管理对话框
const closeCategoryManageDialog = () => {
  showCategoryManage.value = false
  selectedCategoryId.value = ''
  selectedBook.value = null
}

// 添加分类
const addCategory = async () => {
  if (!newCategoryName.value.trim()) return
  
  console.log('开始创建分类，名称:', newCategoryName.value.trim(), '颜色:', newCategoryColor.value);
  
  try {
    const result = await ebookStore.addCategory(newCategoryName.value.trim(), newCategoryColor.value)
    console.log('分类创建成功，返回结果:', result);
    
    // 等待一下确保数据已保存
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 验证分类是否真的保存了
    console.log('当前分类列表:', ebookStore.categories);
    console.log('分类数量:', ebookStore.categories.length);
    
    // 移除成功弹窗，直接关闭对话框
    closeAddCategoryDialog()
  } catch (error) {
    console.error('添加分类失败:', error)
    dialogStore.showErrorDialog('分类创建失败', error instanceof Error ? error.message : String(error))
  }
}

// 执行搜索
const performSearch = async () => {
  if (!searchKeyword.value.trim()) {
    clearSearch()
    return
  }
  
  isSearching.value = true
  try {
    // 先获取全局搜索结果
    const allResults = await ebookStore.searchBooks(searchKeyword.value.trim())
    
    // 根据当前选中的分类进行过滤
    if (selectedCategory.value === 'all') {
      // 全部书籍，不过滤
      searchResults.value = allResults
    } else {
      // 只显示当前分类的搜索结果
      searchResults.value = allResults.filter(book => book.categoryId === selectedCategory.value)
    }
  } catch (error) {
    console.error('搜索失败:', error)
    dialogStore.showErrorDialog('搜索失败', error instanceof Error ? error.message : String(error))
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// 清除搜索
const clearSearch = () => {
  searchKeyword.value = ''
  searchResults.value = []
}

// 上传到百度网盘
const uploadToBaidupan = async (book: any) => {
  if (!isBaidupanAuthorized.value) {
    dialogStore.showErrorDialog('未授权', '请先授权百度网盘')
    return
  }
  
  try {
    console.log('uploadToBaidupan - 开始上传，当前状态:', {
      id: book.id,
      title: book.title,
      storageType: book.storageType,
      uploading: book.uploading
    })
    
    // 设置上传状态（用于 UI 显示）
    book.uploadProgress = 0
    book.uploading = true
    
    const result = await ebookStore.uploadLocalBookToBaidupan(book)
    
    console.log('uploadToBaidupan - 上传结果:', result)
    
    if (result) {
      // 上传成功，等待状态更新完成
      console.log('uploadToBaidupan - 上传成功，等待状态同步')
      
      // 等待多次尝试获取更新后的数据
      let attempts = 0
      let updatedBook = null
      
      while (attempts < 5) {
        await new Promise(resolve => setTimeout(resolve, 100))
        updatedBook = ebookStore.getBookById(book.id)
        
        console.log(`uploadToBaidupan - 尝试 ${attempts + 1}，获取到的书籍状态:`, {
          storageType: updatedBook?.storageType,
          uploading: updatedBook?.uploading,
          baidupanPath: updatedBook?.baidupanPath
        })
        
        // 如果状态已更新为 synced，跳出循环
        if (updatedBook && updatedBook.storageType === 'synced') {
          console.log('uploadToBaidupan - 状态已同步为 synced')
          break
        }
        
        attempts++
      }
      
      if (updatedBook) {
        // 强制更新所有属性
        console.log('uploadToBaidupan - 强制更新本地 book 对象')
        Object.assign(book, updatedBook)
        // 显式确保封面也被同步（虽然 Object.assign 应该已经处理，但为了稳健性）
        if (updatedBook.cover) {
          book.cover = updatedBook.cover
        }
        book.uploading = false
        
        console.log('uploadToBaidupan - 最终状态:', {
          id: book.id,
          storageType: book.storageType,
          uploading: book.uploading,
          baidupanPath: book.baidupanPath
        })
      }
    } else {
      book.uploading = false
      dialogStore.showErrorDialog('上传失败', '请检查网络连接或授权状态')
    }
  } catch (error) {
    book.uploading = false
    console.error('上传失败:', error)
    const errorMessage = error instanceof Error ? error.message : '上传失败，请重试'
    dialogStore.showErrorDialog('上传失败', errorMessage)
  }
}

// 获取分类名称
const getCategoryName = (categoryId: string) => {
  // 检查缓存
  if (cachedResults.value.categoryNames[categoryId]) {
    return cachedResults.value.categoryNames[categoryId]
  }
  
  const category = ebookStore.categories.find(cat => cat.id === categoryId)
  const name = category ? category.name : '未分类'
  
  // 缓存结果
  cachedResults.value.categoryNames[categoryId] = name
  return name
}

// 获取分类颜色
const getCategoryColor = (categoryId: string) => {
  // 检查缓存
  if (cachedResults.value.categoryColors[categoryId]) {
    return cachedResults.value.categoryColors[categoryId]
  }
  
  const category = ebookStore.categories.find(cat => cat.id === categoryId)
  const color = category ? category.color : '#4A90E2'
  
  // 缓存结果
  cachedResults.value.categoryColors[categoryId] = color
  return color
}

// 获取分类对应的图标
const getCategoryIcon = (categoryName: string) => {
  const iconMap: Record<string, any> = {
    '技术': Icons.Cpu,
    '小说': Icons.BookOpen,
    '历史': Icons.Scroll,
    '哲学': Icons.Brain,
    '科学': Icons.FlaskConical,
    '艺术': Icons.Palette,
    '健康': Icons.HeartPulse,
    '经济': Icons.Banknote,
    '军事': Icons.Shield,
    '心理': Icons.BrainCircuit,
    '教育': Icons.GraduationCap,
    '计算机': Icons.Laptop,
    '编程': Icons.Code2,
    '医学': Icons.Stethoscope,
    '烹饪': Icons.ChefHat,
    '旅行': Icons.Plane,
    '体育': Icons.Trophy,
    '音乐': Icons.Music,
    '电影': Icons.Film,
    '摄影': Icons.Camera,
    '设计': Icons.PenTool,
    '商业': Icons.Briefcase,
    '金融': Icons.PieChart,
    '法律': Icons.Scale,
    '政治': Icons.Landmark,
    '宗教': Icons.Church,
    '文学': Icons.FileText,
    '传记': Icons.User,
    '科幻': Icons.Rocket,
    '奇幻': Icons.Wand2,
    '悬疑': Icons.Search,
    '爱情': Icons.Heart,
    '恐怖': Icons.Ghost,
    '儿童': Icons.Smile,
    '青春': Icons.Flower2,
    '职场': Icons.Users,
    '励志': Icons.Sparkles,
    '经典': Icons.Star,
    '现代': Icons.Building2,
    '古代': Icons.Castle,
    '外国': Icons.Globe,
    '中国': Icons.Flag
  }
  return iconMap[categoryName] || Icons.Folder
}

// 获取分类对应的 emoji
const getCategoryEmoji = (categoryName: string) => {
  return getCategoryIcon(categoryName)
}

// 获取分类下的书籍数量
const getBooksByCategory = (categoryId: string) => {
  // 检查缓存
  if (cachedResults.value.categoryBooks[categoryId]) {
    return cachedResults.value.categoryBooks[categoryId]
  }
  
  const books = ebookStore.books.filter(book => book.categoryId === categoryId)
  
  // 缓存结果
  cachedResults.value.categoryBooks[categoryId] = books
  return books
}

// 监听书籍或分类变化，清除缓存
watch(
  [
    () => books.value.length,
    () => categories.value.length,
    () => books.value.map(b => b.categoryId || '').join(',')
  ],
  () => {
    cachedResults.value = {
      categoryBooks: {},
      categoryNames: {},
      categoryColors: {}
    }
  }
)

// 监听搜索关键词变化，实时搜索（带防抖）
let searchDebounceTimer: number | null = null
watch(
  searchKeyword,
  async (newKeyword) => {
    // 清除之前的定时器
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }
    
    if (!newKeyword.trim()) {
      // 清空搜索
      searchResults.value = []
      isSearching.value = false
      return
    }
    
    // 显示搜索中状态
    isSearching.value = true
    
    // 防抖：300ms 后执行搜索
    searchDebounceTimer = window.setTimeout(async () => {
      await performSearch()
    }, 300)
  },
  { immediate: false }
)

// 生命周期钩子
onMounted(async () => {
  try {
    console.log('首页加载，开始初始化电子书存储...');
    // 初始化电子书存储
    await ebookStore.initialize();
    // console.log('电子书存储初始化完成');
    
    // 获取百度网盘用户信息（仅在 token 有效且没有缓存时）
    if (isBaidupanAuthorized.value && !ebookStore.baidupanUser) {
      await ebookStore.fetchBaidupanUserInfo();
    }
    
    // 初始化深色模式
    initDarkMode();
    
    // 添加全局点击监听，点击外部关闭速度拨号菜单
    document.addEventListener('click', handleClickOutside)
  } catch (error) {
    console.error('初始化电子书存储失败:', error);
  }
})

onUnmounted(() => {
  // 清理全局点击监听
  document.removeEventListener('click', handleClickOutside)
  
  // 清理搜索防抖定时器
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
})

// 点击外部关闭速度拨号菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  const menu = document.querySelector('.floating-action-menu')
  if (menu && !menu.contains(target) && isSpeedDialOpen.value) {
    isSpeedDialOpen.value = false
  }
}

// 初始化深色模式
const initDarkMode = () => {
  const theme = ebookStore.userConfig.reader.theme;
  if (theme === 'dark') {
    document.documentElement.classList.add('theme-dark');
  } else {
    document.documentElement.classList.remove('theme-dark');
  }
}

// 监听主题变化
watch(
  () => ebookStore.userConfig.reader.theme,
  (newTheme) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('theme-dark');
    } else {
      document.documentElement.classList.remove('theme-dark');
    }
  }
)
</script>

<style scoped>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary-color: #4A90E2;
  --secondary-color: #64748b;
  --background-color: #f8fafc;
  --card-background: #ffffff;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --border-radius-sm: 0.375rem;
  --border-radius-md: 0.5rem;
  --border-radius-lg: 0.75rem;
  --border-radius-xl: 1rem;
  --border-radius-full: 9999px;
  --transition-fast: 0.2s ease;
  --transition-normal: 0.3s ease;
  --transition-slow: 0.5s ease;
  --hover-scale: 1.02;
}

/* 深色模式 */
.theme-dark {
  --background-color: #0F172A;
  --card-background: #1E293B;
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --border-color: #334155;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.6);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: var(--text-primary);
  background-color: var(--background-color);
}

/* 主页容器 */
.home {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--background-color);
}

/* 主要内容区 */
.main {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: stretch;
}

.content-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧边栏 */
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%);
  border-right: 1px solid rgba(203, 213, 225, 0.5);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.03);
  position: relative;
  height: 100vh;
  overflow: hidden;
}

.sidebar-header {
  flex-shrink: 0;
  padding: 1.5rem 1.25rem 1rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.3);
}

/* 固定的"全部书籍"区域 */
.sidebar-fixed-section {
  flex-shrink: 0;
  padding: 1rem 1.25rem 0.5rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.2);
}

/* 可滚动的内容区域 */
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem 1.25rem 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
  transition: background var(--transition-base);
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

/* 固定在底部的区域 */
.sidebar-bottom {
  flex-shrink: 0;
  border-top: 1px solid rgba(203, 213, 225, 0.3);
  background: #FFFFFF;
  padding: 0.75rem 1.25rem 0.5rem;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.02);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 1.75rem;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1E293B;
  margin: 0;
}

.sidebar-section {
  margin-bottom: 1.5rem;
}

.sidebar-section:last-child {
  margin-bottom: 0;
}

.sidebar-bottom .sidebar-section {
  margin-bottom: 0.5rem;
}

.sidebar-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.75rem;
  padding-left: 0.5rem;
  opacity: 0.8;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.category-item-wrapper {
  position: relative;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-size: 0.875rem;
  color: #475569;
  position: relative;
  overflow: hidden;
  min-width: 100%;
}

.category-item:hover {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.05), rgba(74, 144, 226, 0.02));
  border-color: rgba(74, 144, 226, 0.2);
  transform: translateX(0);
}

.category-item.active {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(74, 144, 226, 0.05));
  border-color: #4A90E2;
  color: #4A90E2;
  transform: translateX(0);
  font-weight: 600;
}

.category-item:active {
  transform: translateX(4px) scale(0.98);
  transition: all var(--transition-fast);
}

.category-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  font-size: 1rem;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.category-item:hover .category-icon {
  transform: scale(1.05);
}

.category-item.active .category-icon {
  transform: scale(1.05);
}

.category-icon svg {
  width: 20px;
  height: 20px;
}

.category-name {
  flex: 1;
  font-weight: 500;
  letter-spacing: -0.01em;
  min-width: 60px;
}

.category-count {
  font-size: 0.7rem;
  color: #9CA3AF;
  background: linear-gradient(135deg, #F3F4F6, #FFFFFF);
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  min-width: 1.5rem;
  text-align: center;
  font-weight: 500;
  border: 1px solid rgba(203, 213, 225, 0.5);
}

.category-item.active .category-count {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.15), rgba(74, 144, 226, 0.08));
  color: #4A90E2;
  border-color: rgba(74, 144, 226, 0.3);
}

.category-item.add-category {
  border: 1px solid transparent;
  color: #64748B;
  background: rgba(74, 144, 226, 0.05);
}

.category-item.add-category:hover {
  border-color: rgba(74, 144, 226, 0.3);
  color: #4A90E2;
  background: rgba(74, 144, 226, 0.1);
  transform: translateX(6px) scale(1.02);
}

.add-icon {
  background: linear-gradient(135deg, #FFFFFF, #F8FAFC);
  color: #64748B;
  font-weight: bold;
  font-size: 1.25rem;
}

.category-item.add-category:hover .add-icon {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.2), rgba(99, 102, 241, 0.15));
  color: #4A90E2;
}

.baidupan-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #FFFFFF;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 0.75rem;
}

.baidupan-status:hover {
  border-color: rgba(74, 144, 226, 0.3);
  background: #F8FAFC;
}

.baidupan-status.unauthorized {
  justify-content: center;
  gap: 0.5rem;
  color: #64748B;
  background: #F8FAFC;
}

.baidupan-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(74, 144, 226, 0.3);
  flex-shrink: 0;
}

.baidupan-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.baidupan-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1E293B;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.baidupan-vip {
  font-size: 0.75rem;
  color: #64748B;
}

.baidupan-text {
  font-size: 0.875rem;
  font-weight: 500;
}

/* 右侧内容区 */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(135deg, #FFFFFF, #F8FAFC);
}

/* 固定的内容头部 */
.content-header-fixed {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 2rem 2rem 1rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.5);
  background: linear-gradient(135deg, #FFFFFF, #F8FAFC);
  z-index: 10;
}

/* 可滚动的内容区域 */
.content-scrollable {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.content-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.5);
}

.section-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1E293B;
  margin: 0;
}

.section-subtitle {
  font-size: 0.875rem;
  color: #64748B;
  margin: 0;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.search-container {
  position: relative;
}

.search-box {
  display: flex;
  align-items: center;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 0.75rem 1rem;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
  min-width: 280px;
  position: relative;
}

.search-box:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.search-icon {
  color: var(--color-text-tertiary);
  margin-right: 0.75rem;
  flex-shrink: 0;
  transition: color var(--transition-fast);
}

.search-box:focus-within .search-icon {
  color: var(--color-primary);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.875rem;
  color: var(--color-text-primary);
  outline: none;
  font-weight: 500;
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
  font-weight: 400;
}

.search-clear {
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  margin-left: 0.5rem;
}

.search-clear:hover {
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
}

.view-controls {
  display: flex;
  align-items: center;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: 0.25rem;
  border: 1px solid var(--color-border);
}

.view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  min-width: 2.5rem;
}

.view-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  box-shadow: var(--shadow-sm);
}

.view-btn.active {
  color: var(--color-primary);
  background: var(--color-bg-primary);
  box-shadow: var(--shadow-sm);
}

/* 搜索结果信息 */
.search-results-info {
  margin-bottom: 2rem;
}

.search-info-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--color-primary-light);
  border: 1px solid rgba(74, 144, 226, 0.2);
  border-radius: var(--radius-lg);
  padding: 1rem 1.5rem;
}

.search-info-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.search-info-text {
  flex: 1;
}

.search-info-text h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.25rem 0;
  white-space: nowrap;
}

.search-info-text p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.clear-search-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.clear-search-btn:hover {
  color: var(--color-text-primary);
  background: rgba(74, 144, 226, 0.1);
}

/* 空状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 450px;
  padding: 3rem 2rem;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.empty-state-content {
  text-align: center;
  max-width: 520px;
  width: 100%;
}

/* 插图容器 */
.empty-state-illustration {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
  height: 100px;
}

.illustration-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: float 3s ease-in-out infinite;
  transition: all 0.3s ease;
}

.search-circle {
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  box-shadow: 0 8px 32px rgba(245, 158, 11, 0.2);
}

.book-circle {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.2);
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
}

.illustration-icon {
  color: white;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.12));
}

/* 闪光装饰 */
.illustration-sparkles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.sparkle {
  position: absolute;
  color: #fbbf24;
  opacity: 0;
  animation: sparkle 2.5s ease-in-out infinite;
}

.sparkle-1 {
  top: 8%;
  right: 18%;
  animation-delay: 0s;
}

.sparkle-2 {
  bottom: 12%;
  left: 12%;
  animation-delay: 0.8s;
}

.sparkle-3 {
  top: 18%;
  left: 22%;
  animation-delay: 1.6s;
}

@keyframes sparkle {
  0%, 100% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }
  50% {
    opacity: 0.7;
    transform: scale(1) rotate(180deg);
  }
}

.empty-state-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.75rem 0;
  letter-spacing: -0.02em;
  text-align: center;
  line-height: 1.3;
}

.empty-state-description {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0 auto 2rem auto;
  text-align: center;
  max-width: 100%;
}

/* 搜索建议 */
.empty-state-suggestions {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(249, 115, 22, 0.04) 100%);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;
  text-align: left;
  border: 1px solid rgba(245, 158, 11, 0.15);
}

.suggestion-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.875rem;
}

.suggestion-title svg {
  color: #f59e0b;
  flex-shrink: 0;
}

.suggestion-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.suggestion-list li {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  padding-left: 1.25rem;
  position: relative;
  line-height: 1.5;
}

.suggestion-list li::before {
  content: "•";
  position: absolute;
  left: 0.375rem;
  color: #f59e0b;
  font-weight: bold;
  font-size: 1.125rem;
}

/* 功能特性 */
.empty-state-features {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.25s ease;
  cursor: default;
}

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
  transition: all 0.25s ease;
  border: 1px solid rgba(102, 126, 234, 0.12);
}

.feature-item:hover {
  color: var(--color-text-primary);
}

.feature-item:hover .feature-icon {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.15);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
  border-color: rgba(102, 126, 234, 0.2);
}

.empty-state-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-action {
  padding: 0.625rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.25s ease;
}

.btn-action:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn-action-large {
  padding: 0.75rem 2rem;
  font-size: 0.9375rem;
  font-weight: 600;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.25);
  transition: all 0.25s ease;
}

.btn-action-large:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(74, 144, 226, 0.35);
}

.search-info-text p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.clear-search-btn {
  background: transparent;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 9999px;
  padding: 0.5rem;
  cursor: pointer;
  color: #64748B;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.clear-search-btn:hover {
  border-color: #4A90E2;
  color: #4A90E2;
  background-color: rgba(74, 144, 226, 0.1);
}

/* 搜索加载状态 */
.search-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #64748B;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid rgba(203, 213, 225, 0.5);
  border-top: 2px solid #4A90E2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 书籍网格 */
.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
  padding: 0.5rem;
}

/* 书籍列表 */
.books-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 0.5rem;
}

/* 书籍卡片 - 基础样式 */
.book-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  position: relative;
}

/* Hover 状态 - 遵循 UX 最佳实践 */
.book-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(74, 144, 226, 0.12);
  border-color: var(--color-primary);
  z-index: 10;
}

/* Focus 状态 - 键盘导航可访问性 */
.book-card:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

/* 列表模式卡片 */
.books-list .book-card {
  flex-direction: row;
  align-items: stretch;
  padding: 1rem;
  gap: 1.25rem;
}

/* 封面容器 */
.book-cover-container {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
}

/* 网格模式封面 */
.books-grid .book-cover-container {
  width: 100%;
  aspect-ratio: 3/4;
}

/* 列表模式封面 */
.books-list .book-cover-container {
  width: 80px;
  height: 110px;
  border-radius: 6px;
}

/* 封面图片 */
.book-cover {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-color: var(--color-bg-secondary);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

/* 封面 Hover 效果 */
.book-card:hover .book-cover {
  transform: scale(1.03);
}

/* 封面占位符 */
.book-cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
}

.placeholder-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.9;
}

.placeholder-text {
  font-size: 2rem;
  font-weight: 700;
  opacity: 0.95;
}

/* 格式标签 */
.book-format-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
  backdrop-filter: blur(10px);
}

.book-storage-badge {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.375rem 0.625rem;
  border-radius: 9999px;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.book-storage-badge:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.book-storage-badge.local {
  background: linear-gradient(135deg, rgba(100, 116, 139, 0.95), rgba(71, 85, 105, 0.95));
}

.book-storage-badge.local:hover {
  background: linear-gradient(135deg, #64748B, #475569);
}

.book-storage-badge.synced {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95));
}

.book-storage-badge.synced:hover {
  background: linear-gradient(135deg, #3B82F6, #2563EB);
}

.book-storage-badge.baidupan {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95));
}

.book-storage-badge.baidupan:hover {
  background: linear-gradient(135deg, #10B981, #059669);
}

.book-downloading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  z-index: 10;
}

.downloading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.downloading-text {
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
}

/* 上传状态覆盖层 */
.book-uploading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(74, 144, 226, 0.9);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  z-index: 10;
}

.uploading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.uploading-text {
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
}

/* 云端未下载状态覆盖层 */
.book-cloud-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  z-index: 10;
  transition: all 0.3s ease;
  border-radius: 6px;
}

.book-card:hover .book-cloud-overlay {
  background: rgba(0, 0, 0, 0.75);
}

.cloud-icon-wrapper {
  color: white;
  opacity: 0.9;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.book-card:hover .cloud-icon-wrapper {
  opacity: 1;
  transform: translateY(-2px);
}

.cloud-text {
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  opacity: 0.9;
}

/* 本地书籍上传提示覆盖层 */
.book-upload-hint-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(59, 130, 246, 0.15);
  backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  z-index: 10;
  opacity: 0;
  transition: all 0.3s ease;
  border-radius: 6px;
  cursor: pointer;
}

.book-card:hover .book-upload-hint-overlay {
  opacity: 1;
  background: rgba(59, 130, 246, 0.85);
}

.upload-hint-icon-wrapper {
  color: white;
  opacity: 0.9;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.book-card:hover .upload-hint-icon-wrapper {
  opacity: 1;
  transform: translateY(-2px);
}

.upload-hint-text {
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  opacity: 0.9;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.book-info {
  padding: 0.75rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.books-list .book-info {
  flex: 1;
  min-width: 0;
  padding: 0;
  gap: 0.25rem;
}

.book-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #1E293B;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  box-orient: vertical;
  line-height: 1.3;
}

.books-list .book-title {
  font-size: 0.9375rem;
  -webkit-line-clamp: 1;
  line-clamp: 1;
}

.book-author {
  font-size: 0.6875rem;
  color: #64748B;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 400;
}

.book-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.25rem 0;
}

.progress-bar-container {
  flex: 1;
  height: 4px;
  background: #F1F5F9;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #4A90E2;
  border-radius: 9999px;
  transition: width 0.2s ease;
}

.progress-text {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #64748B;
  min-width: 2.5rem;
  text-align: right;
}

.book-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: auto;
  font-size: 0.6875rem;
  color: #64748B;
  flex-wrap: wrap;
}

.book-last-read {
  flex-shrink: 0;
  font-weight: 400;
}

.book-category {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 500;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(99, 102, 241, 0.05));
  color: #4A90E2;
  border: 1px solid rgba(74, 144, 226, 0.2);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 6rem 2rem;
  color: #64748B;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1E293B;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  font-size: 1rem;
  margin: 0 0 2rem 0;
}

/* 设置面板样式 */
.settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  margin: 0;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.5);
}

.settings-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1E293B;
  margin: 0;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
  width: 100%;
}

.setting-section {
  margin-bottom: 2rem;
}

.setting-section .section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #4A90E2;
}

.setting-card {
  background: linear-gradient(135deg, #FFFFFF, #F8FAFC);
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  overflow: hidden;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.5);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.setting-label {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1E293B;
}

.setting-desc {
  font-size: 0.8125rem;
  color: #64748B;
}

.setting-control {
  flex-shrink: 0;
}

.status {
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.status.connected {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10B981;
}

.status.disconnected {
  background-color: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

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

.form-control {
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #475569;
  background: linear-gradient(135deg, #FFFFFF, #F8FAFC);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.form-control:focus {
  outline: none;
  border-color: #4A90E2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.add-books-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 浮动操作菜单 (Speed Dial) */
.floating-action-menu {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 100;
}

/* 子按钮容器 */
.floating-action-items {
  position: absolute;
  bottom: 4.5rem;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  opacity: 0;
  transform: translateY(20px);
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.floating-action-menu.is-open .floating-action-items {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

/* 子按钮 */
.floating-action-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 2rem;
  color: #475569;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: 140px;
}

.floating-action-item:hover {
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  color: white;
  border-color: transparent;
  transform: translateX(-4px);
  box-shadow: 0 6px 16px rgba(74, 144, 226, 0.4);
}

.floating-action-item:active {
  transform: translateX(-4px) scale(0.96);
}

/* 标签文字 */
.floating-action-label {
  font-weight: 500;
}

/* 主按钮 */
.floating-action-main {
  position: relative;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #4A90E2, #6366F1);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.floating-action-main:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 24px rgba(74, 144, 226, 0.5);
  background: linear-gradient(135deg, #357ABD, #4f46e5);
}

.floating-action-main:active {
  transform: scale(1.05);
}

/* 图标切换动画 */
.floating-action-main .icon-plus,
.floating-action-main .icon-close {
  position: absolute;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.floating-action-main .icon-plus {
  opacity: 1;
  transform: rotate(0deg);
}

.floating-action-main .icon-close {
  opacity: 0;
  transform: rotate(-90deg);
}

.floating-action-menu.is-open .floating-action-main .icon-plus {
  opacity: 0;
  transform: rotate(90deg);
}

.floating-action-menu.is-open .floating-action-main .icon-close {
  opacity: 1;
  transform: rotate(0deg);
}

/* 子按钮进入动画 */
.floating-action-menu.is-open .floating-action-item:nth-child(1) {
  animation: slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.05s both;
}

.floating-action-menu.is-open .floating-action-item:nth-child(2) {
  animation: slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 优雅右键菜单设计 - 符合 Neat Reader 整体风格 */
:deep(.mx-context-menu) {
  /* 现代毛玻璃效果 - 使用应用设计系统 */
  background: var(--color-bg-primary) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  
  /* 精致边框和阴影 - 使用设计系统变量 */
  border: 1px solid var(--color-border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-xl) !important;
  
  /* 布局优化 */
  padding: 6px !important;
  min-width: 200px !important;
  max-width: 260px !important;
  
  /* 统一字体 */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 
               'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
  
  /* 流畅动画 */
  animation: contextMenuFadeIn var(--transition-base) cubic-bezier(0.16, 1, 0.3, 1) !important;
  transform-origin: top left !important;
}

@keyframes contextMenuFadeIn {
  0% {
    opacity: 0;
    transform: scale(0.96) translateY(-4px);
    filter: blur(4px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0);
  }
}

:deep(.mx-context-menu-item) {
  /* 现代化间距和排版 */
  padding: 10px 12px !important;
  border-radius: var(--radius-md) !important;
  margin: 1px 0 !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  color: var(--color-text-primary) !important;
  cursor: pointer !important;
  
  /* 流畅过渡 */
  transition: all var(--transition-fast) !important;
  display: flex !important;
  align-items: center !important;
  position: relative !important;
  
  /* 微妙的初始状态 */
  background: transparent !important;
  border: 1px solid transparent !important;
}

/* Hover 状态 - 使用应用主色调 */
:deep(.mx-context-menu-item:hover) {
  background: var(--color-primary-light) !important;
  color: var(--color-primary) !important;
  border-color: rgba(74, 144, 226, 0.1) !important;
  transform: translateX(1px) !important;
  box-shadow: 0 2px 4px rgba(74, 144, 226, 0.08) !important;
}

/* Active 状态 - 微妙的按压反馈 */
:deep(.mx-context-menu-item:active) {
  transform: translateX(1px) scale(0.99) !important;
  background: rgba(74, 144, 226, 0.15) !important;
}

/* 危险操作 - 统一的错误色 */
:deep(.mx-context-menu-item.danger-menu-item) {
  color: var(--color-error) !important;
}

:deep(.mx-context-menu-item.danger-menu-item:hover) {
  background: rgba(239, 68, 68, 0.08) !important;
  color: #DC2626 !important;
  border-color: rgba(239, 68, 68, 0.1) !important;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.08) !important;
}

/* 精致分隔线 */
:deep(.mx-context-menu-item-sperator) {
  margin: 6px 8px !important;
  height: 1px !important;
  background: var(--color-border) !important;
  border: none !important;
  opacity: 0.6 !important;
}

/* 图标优化 */
:deep(.mx-context-menu-item-icon) {
  margin-right: 10px !important;
  opacity: 0.7 !important;
  transition: all var(--transition-fast) !important;
  flex-shrink: 0 !important;
  width: 18px !important;
  height: 18px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.mx-context-menu-item:hover .mx-context-menu-item-icon) {
  opacity: 1 !important;
  transform: scale(1.05) !important;
}

/* 标签文本 */
:deep(.mx-context-menu-item-label) {
  flex: 1 !important;
  white-space: nowrap !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
}

/* 子菜单箭头 */
:deep(.mx-context-menu-item-arrow) {
  margin-left: auto !important;
  opacity: 0.4 !important;
  transition: all var(--transition-fast) !important;
  width: 16px !important;
  height: 16px !important;
}

:deep(.mx-context-menu-item:hover .mx-context-menu-item-arrow) {
  opacity: 0.8 !important;
  transform: translateX(1px) !important;
}

/* 分类图标特殊处理 */
:deep(.category-menu-icon) {
  transition: all var(--transition-fast) !important;
  border-radius: 4px !important;
}

:deep(.mx-context-menu-item:hover .category-menu-icon) {
  transform: scale(1.05) !important;
  box-shadow: var(--shadow-sm) !important;
}

/* 子菜单动画 */
:deep(.mx-context-menu.mx-context-menu-sub) {
  margin-left: 4px !important;
  animation: submenuSlideIn var(--transition-base) cubic-bezier(0.16, 1, 0.3, 1) !important;
}

@keyframes submenuSlideIn {
  0% {
    opacity: 0;
    transform: scale(0.95) translateX(-8px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateX(0);
  }
}

/* 禁用状态 */
:deep(.mx-context-menu-item.disabled) {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
}

:deep(.mx-context-menu-item.disabled:hover) {
  background: transparent !important;
  transform: none !important;
  box-shadow: none !important;
}

/* 暗色主题 - 优雅适配 */
.theme-dark :deep(.mx-context-menu) {
  background: var(--color-bg-primary) !important;
  border-color: var(--color-border) !important;
  box-shadow: var(--shadow-xl) !important;
}

.theme-dark :deep(.mx-context-menu-item) {
  color: var(--color-text-primary) !important;
}

.theme-dark :deep(.mx-context-menu-item:hover) {
  background: var(--color-primary-light) !important;
  color: var(--color-primary) !important;
  border-color: rgba(74, 144, 226, 0.2) !important;
}

.theme-dark :deep(.mx-context-menu-item.danger-menu-item) {
  color: #F87171 !important;
}

.theme-dark :deep(.mx-context-menu-item.danger-menu-item:hover) {
  background: rgba(248, 113, 113, 0.12) !important;
  color: #FCA5A5 !important;
  border-color: rgba(248, 113, 113, 0.2) !important;
}

.theme-dark :deep(.mx-context-menu-item-sperator) {
  background: var(--color-border) !important;
}

.theme-dark :deep(.mx-context-menu-item.disabled) {
  color: var(--color-text-tertiary) !important;
}

/* 无障碍 - 尊重用户偏好 */
@media (prefers-reduced-motion: reduce) {
  :deep(.mx-context-menu),
  :deep(.mx-context-menu.mx-context-menu-sub) {
    animation: none !important;
  }
  
  :deep(.mx-context-menu-item),
  :deep(.mx-context-menu-item-icon),
  :deep(.mx-context-menu-item-arrow),
  :deep(.category-menu-icon) {
    transition: none !important;
  }
  
  :deep(.mx-context-menu-item:hover),
  :deep(.mx-context-menu-item:active) {
    transform: none !important;
  }
}

/* Focus 状态 - 键盘导航 */
:deep(.mx-context-menu-item:focus-visible) {
  outline: 2px solid var(--color-primary) !important;
  outline-offset: 2px !important;
  border-radius: var(--radius-md) !important;
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog-content {
  background: #FFFFFF;
  border-radius: 0.75rem;
  padding: 1.5rem;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(203, 213, 225, 0.5);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 新建分类对话框特殊样式 */
.add-category-dialog {
  max-width: 480px;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.5);
}

.dialog-header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.dialog-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  border-radius: 0.75rem;
  color: white;
  flex-shrink: 0;
}

.dialog-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1E293B;
  margin: 0;
}

.dialog-subtitle {
  font-size: 0.8125rem;
  color: #64748B;
  margin: 0.25rem 0 0 0;
}

.dialog-close {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  color: #64748B;
  transition: all 0.2s ease;
  border-radius: 0.375rem;
  flex-shrink: 0;
}

.dialog-close:hover {
  background: rgba(203, 213, 225, 0.3);
  color: #1E293B;
  transform: rotate(90deg);
}

.dialog-body {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  margin-bottom: 0.625rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #1E293B;
  transition: all 0.2s ease;
  background: #F8FAFC;
}

.form-input:focus {
  outline: none;
  border-color: #4A90E2;
  background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.form-input::placeholder {
  color: #94A3B8;
}

.form-hint {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.375rem;
  font-size: 0.75rem;
}

.char-count {
  color: #4A90E2;
  font-weight: 500;
}

.hint-text {
  color: #94A3B8;
}

/* 颜色选择器 */
.color-options {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.625rem;
}

.color-option {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.color-option:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.color-option.active {
  border-color: #1E293B;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.check-icon {
  color: white;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.color-custom {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.color-picker-input {
  width: 100%;
  aspect-ratio: 1;
  border: 2px dashed rgba(203, 213, 225, 0.5);
  border-radius: 0.5rem;
  cursor: pointer;
  padding: 0;
  background: transparent;
  transition: all 0.2s ease;
}

.color-picker-input:hover {
  border-color: #4A90E2;
  border-style: solid;
}

.custom-label {
  font-size: 0.625rem;
  color: #64748B;
  text-align: center;
  position: absolute;
  bottom: -1.25rem;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
}

/* 预览效果 */
.category-preview {
  background: #F8FAFC;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 0.5rem;
  padding: 1rem;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 0.5rem;
  border: 1px solid rgba(203, 213, 225, 0.3);
}

.preview-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  color: white;
  flex-shrink: 0;
}

.preview-name {
  flex: 1;
  font-weight: 500;
  color: #1E293B;
  font-size: 0.875rem;
}

.preview-count {
  font-size: 0.75rem;
  color: #64748B;
}

.color-picker-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.category-manage-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.category-manage-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(203, 213, 225, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-manage-item:hover {
  background: #F8FAFC;
  border-color: rgba(74, 144, 226, 0.3);
}

.category-manage-item.selected {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(74, 144, 226, 0.05));
  border-color: #4A90E2;
  font-weight: 600;
}

.category-manage-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  font-size: 1rem;
  flex-shrink: 0;
}

.category-manage-name {
  flex: 1;
  font-weight: 500;
  color: #1E293B;
}

.color-picker {
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 0.5rem;
  cursor: pointer;
  padding: 0;
  background: transparent;
  transition: all 0.2s ease;
}

.color-picker:hover {
  border-color: #4A90E2;
}

.color-preview {
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 0.375rem;
}

.color-value {
  font-size: 0.8125rem;
  color: #64748B;
  font-family: 'Courier New', monospace;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* 按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  position: relative;
  overflow: hidden;
  min-width: 100px;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.5s ease;
}

.btn:hover::before {
  left: 100%;
}

.btn:active {
  transform: scale(0.96);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.btn:disabled::before {
  display: none;
}

/* 主要按钮 */
.btn-primary {
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  color: white;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #357ABD, #2868A8);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0) scale(0.96);
  box-shadow: 0 1px 4px rgba(74, 144, 226, 0.3);
}

/* 次要按钮 */
.btn-secondary {
  background: linear-gradient(to bottom, #FFFFFF, #F8FAFC);
  color: #475569;
  border: 1px solid rgba(203, 213, 225, 0.5);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-secondary:hover:not(:disabled) {
  background: linear-gradient(to bottom, #F8FAFC, #F1F5F9);
  border-color: rgba(203, 213, 225, 0.8);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.btn-secondary:active:not(:disabled) {
  transform: translateY(0) scale(0.96);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* 危险按钮 */
.btn-danger {
  background: linear-gradient(135deg, #EF4444, #DC2626);
  color: white;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.btn-danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #DC2626, #B91C1C);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  transform: translateY(-1px);
}

.btn-danger:active:not(:disabled) {
  transform: translateY(0) scale(0.96);
  box-shadow: 0 1px 4px rgba(239, 68, 68, 0.3);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  /* 平板设备 */
  .sidebar {
    width: 240px;
  }
  
  .books-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .content {
    padding: 1.5rem;
  }
  
  .content-header-fixed {
    padding: 1.5rem 1.5rem 1rem;
  }
  
  .content-scrollable {
    padding: 1.5rem;
  }
}

@media (max-width: 768px) {
  /* 移动端设备 */
  .logo-text {
    font-size: 1.25rem;
  }
  
  .content-wrapper {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    padding: 1rem;
    overflow-x: auto;
    white-space: nowrap;
  }
  
  .sidebar-section {
    margin-bottom: 1rem;
  }
  
  .category-list {
    flex-direction: row;
    gap: 0.75rem;
  }
  
  .category-item {
    white-space: nowrap;
    padding: 0.5rem 0.75rem;
  }
  
  .content {
    padding: 1rem;
  }
  
  .books-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .books-list .book-card {
    padding: 0.75rem;
    gap: 0.75rem;
  }
  
  .books-list .book-cover-container {
    width: 60px;
    height: 90px;
  }
  
  .floating-action-menu {
    bottom: 1.5rem;
    right: 1.5rem;
  }
  
  .floating-action-main {
    width: 3rem;
    height: 3rem;
  }
  
  .floating-action-item {
    min-width: 120px;
    padding: 0.625rem 0.875rem;
    font-size: 0.8125rem;
  }
  
  .section-title {
    font-size: 1.25rem;
  }
  
  .content-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .view-controls {
    align-self: stretch;
    justify-content: space-around;
  }
  
  .search-info-content {
    padding: 0.75rem 1rem;
  }
  
  .book-title {
    font-size: 0.75rem;
  }
  
  .book-author {
    font-size: 0.625rem;
  }
  
  .book-progress {
    margin: 0.125rem 0;
  }
  
  .book-meta {
    font-size: 0.5rem;
  }
}

@media (max-width: 480px) {
  /* 小屏幕移动端 */
  .books-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }
  
  .book-cover-overlay {
    opacity: 1;
  }
  
  .book-actions {
    position: static;
    margin-top: 0.5rem;
  }
  
  .empty-state {
    padding: 4rem 1rem;
  }
  
  .empty-icon {
    font-size: 3rem;
  }
  
  .empty-state h3 {
    font-size: 1rem;
  }
  
  .empty-state p {
    font-size: 0.875rem;
  }
}
</style>