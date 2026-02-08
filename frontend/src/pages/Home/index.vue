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

          <div class="sidebar-section">
            <h3 class="sidebar-title">书架</h3>
            <div class="category-list">
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
              <button 
                v-for="category in categories" 
                :key="category.id"
                class="category-item"
                :class="{ 'active': selectedCategory === category.id }"
                :style="{ '--category-color': category.color }"
                @click="selectedCategory = category.id"
              >
                <span class="category-icon" :style="{ backgroundColor: category.color + '20', color: category.color }">
                  <component :is="getCategoryIcon(category.name)" :size="20" />
                </span>
                <span class="category-name">{{ category.name }}</span>
                <span class="category-count">{{ getBooksByCategory(category.id).length }}</span>
              </button>
              <button class="category-item add-category" @click="showAddCategoryDialog">
                <span class="category-icon add-icon">
                  <Icons.Plus :size="20" />
                </span>
                <span class="category-name">新建分类</span>
              </button>
            </div>
          </div>

          <div class="sidebar-bottom">
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
          <!-- 内容头部 -->
          <div class="content-header" v-if="selectedCategory !== 'settings'">
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
                  <input 
                    type="text" 
                    v-model="searchKeyword" 
                    placeholder="输入书名、作者" 
                    class="search-input"
                    @keyup.enter="performSearch"
                  />
                  <button class="search-btn" @click="performSearch">
                    <Icons.Search :size="18" />
                  </button>
                </div>
              </div>
              <div class="view-controls">
                <button 
                  class="view-btn" 
                  :class="{ 'active': viewMode === 'grid' }"
                  @click="viewMode = 'grid'"
                >
                  <Icons.LayoutGrid :size="16" />
                  网格
                </button>
                <button 
                  class="view-btn" 
                  :class="{ 'active': viewMode === 'list' }"
                  @click="viewMode = 'list'"
                >
                  <Icons.List :size="16" />
                  列表
                </button>
              </div>
            </div>
          </div>

          <!-- 搜索结果提示 -->
          <div v-if="isSearching && selectedCategory !== 'settings'" class="search-loading">
            <div class="loading-spinner"></div>
            <p>正在搜索...</p>
          </div>

          <div v-else-if="searchResults.length > 0 && searchKeyword && selectedCategory !== 'settings'" class="search-results-info">
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

          <!-- 电子书列表 -->
          <div v-if="selectedCategory !== 'settings'">
            <div :class="viewMode === 'grid' ? 'books-grid' : 'books-list'">
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
                    
                    <div 
                      v-else
                      class="book-storage-badge" 
                      :class="{ 
                        'local': book.storageType === 'local',
                        'synced': book.storageType === 'synced',
                        'baidupan': book.storageType === 'baidupan'
                      }"
                      @click.stop="handleStorageBadgeClick(book)"
                      :title="getStorageBadgeTitle(book.storageType)"
                    >
                      <Icons.HardDrive v-if="book.storageType === 'local'" :size="14" />
                      <Icons.Cloud v-else-if="book.storageType === 'synced'" :size="14" />
                      <Icons.Download v-else-if="book.storageType === 'baidupan'" :size="14" />
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

            <!-- 空状态 -->
            <div v-if="displayBooks.length === 0 && !isSearching && selectedCategory !== 'settings'" class="empty-state">
              <Icons.BookOpen :size="64" class="empty-icon" />
              <h3>{{ selectedCategory === 'all' ? '书架是空的' : '该分类下没有书籍' }}</h3>
              <p>{{ selectedCategory === 'all' ? '添加一些电子书开始阅读吧' : '点击左侧添加书籍' }}</p>
              <button class="btn btn-primary add-books-btn" @click="triggerFileImport">
                <Icons.Upload :size="16" />
                添加书籍
              </button>
            </div>

            <!-- 搜索无结果状态 -->
            <div v-if="searchResults.length === 0 && searchKeyword && !isSearching && selectedCategory !== 'settings'" class="empty-state">
              <Icons.SearchX :size="64" class="empty-icon" />
              <h3>没有找到匹配的书籍</h3>
              <p>尝试其他关键词或检查拼写</p>
              <button class="btn btn-secondary" @click="clearSearch">
                <Icons.X :size="16" />
                清除搜索
              </button>
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

    <!-- 底部添加按钮 -->
    <button v-if="selectedCategory !== 'settings'" class="floating-add-btn" @click="triggerFileImport">
      <Icons.Plus :size="24" />
    </button>

    <!-- AI 对话按钮 -->
    <button v-if="selectedCategory !== 'settings'" class="floating-chat-btn" @click="showChatWindow = true">
      <Icons.MessageCircle :size="24" />
    </button>
    
    <!-- 隐藏的文件输入框 -->
    <input 
      type="file" 
      ref="fileInputRef"
      @change="handleFileSelect"
      style="display: none"
      accept=".epub,.pdf,.txt"
    />

    <!-- AI 对话窗口 -->
    <ChatWindow v-model:visible="showChatWindow" />

    <!-- 右键菜单 -->
    <div 
      v-if="showMenu" 
      class="context-menu"
      :style="{ left: menuX + 'px', top: menuY + 'px' }"
      @contextmenu.prevent
    >
      <div class="menu-item" @click="handleUploadToBaidupan(selectedBook)">
        <Icons.UploadCloud :size="18" class="menu-icon" />
        <span class="menu-text">上传到百度网盘</span>
      </div>
      <div class="menu-item" @click.stop="showCategoryManageDialog">
        <Icons.Folder :size="18" class="menu-icon" />
        <span class="menu-text">分类管理</span>
      </div>
      <div class="menu-item danger" @click="handleRemoveBook(selectedBook)">
        <Icons.Trash2 :size="18" class="menu-icon" />
        <span class="menu-text">删除书籍</span>
      </div>
    </div>

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
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h3 class="dialog-title">新建分类</h3>
          <button class="dialog-close" @click="closeAddCategoryDialog">
            <Icons.X :size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">分类名称</label>
            <input 
              type="text" 
              v-model="newCategoryName" 
              placeholder="输入分类名称"
              class="form-input"
              @keyup.enter="addCategory"
            />
          </div>
          <div class="form-group">
            <label class="form-label">分类颜色</label>
            <div class="color-picker-container">
              <input 
                type="color" 
                v-model="newCategoryColor" 
                class="color-picker"
              />
              <span class="color-preview" :style="{ backgroundColor: newCategoryColor }"></span>
              <span class="color-value">{{ newCategoryColor }}</span>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeAddCategoryDialog">取消</button>
          <button class="btn btn-primary" @click="addCategory" :disabled="!newCategoryName.trim()">创建</button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useEbookStore } from '../../stores/ebook'
import { useDialogStore } from '../../stores/dialog'
import SettingsPanel from '../../components/SettingsPanel/index.vue'
import ChatWindow from '../../components/ChatWindow/index.vue'
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

// 右键菜单相关
const showMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const selectedBook = ref<any>(null)

// 分类对话框相关
const showAddCategory = ref(false)
const newCategoryName = ref('')
const newCategoryColor = ref('#4A90E2')
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
  if (searchKeyword.value && searchResults.value.length > 0) {
    return searchResults.value
  }
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
    // 显示下载确认对话框
    dialogStore.showDialog({
      title: '需要下载',
      message: `《${book.title}》尚未下载到本地，是否立即下载？`,
      type: 'info',
      buttons: [
        { text: '取消' },
        { 
          text: '下载', 
          primary: true,
          callback: async () => {
            try {
              // 显示下载进度
              dialogStore.showDialog({
                title: '正在下载',
                message: `正在从百度网盘下载《${book.title}》...`,
                type: 'info',
                buttons: []
              })
              
              const result = await ebookStore.downloadFromBaidupan(book.baidupanPath || book.path)
              
              dialogStore.closeDialog()
              
              if (result) {
                dialogStore.showSuccessDialog('下载成功', '即将打开阅读器')
                // 等待一下让用户看到成功提示
                await new Promise(resolve => setTimeout(resolve, 500))
                router.push(`/reader/${bookId}`)
              } else {
                dialogStore.showErrorDialog('下载失败', '请检查网络连接或授权状态')
              }
            } catch (error) {
              dialogStore.closeDialog()
              console.error('下载失败:', error)
              const errorMessage = error instanceof Error ? error.message : '下载失败，请重试'
              dialogStore.showErrorDialog('下载失败', errorMessage)
            }
          }
        }
      ]
    })
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
  showMenu.value = true
  menuX.value = event.clientX
  menuY.value = event.clientY
  selectedBook.value = book
  
  // 点击其他区域关闭菜单
  document.addEventListener('click', closeContextMenuHandler)
}

// 关闭右键菜单
const closeContextMenu = (clearSelectedBook = true) => {
  showMenu.value = false
  if (clearSelectedBook) {
    selectedBook.value = null
  }
}

// 事件监听器包装函数
const closeContextMenuHandler = (event: Event) => {
  closeContextMenu()
  document.removeEventListener('click', closeContextMenuHandler)
}

// 处理上传到百度网盘
const handleUploadToBaidupan = async (book: any) => {
  if (!book) return
  const targetBook = book
  closeContextMenu()
  await uploadToBaidupan(targetBook)
}

// 处理删除书籍
const handleRemoveBook = (book: any) => {
  if (!book) return
  const targetBookId = book.id;
  const targetTitle = book.title;
  const targetStorage = book.storageType;

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
          console.log('开始执行删除逻辑, ID:', targetBookId);
          try {
            const result = await ebookStore.removeBook(targetBookId, targetStorage);
            if (result) {
              dialogStore.showSuccessDialog('书籍删除成功');
            } else {
              dialogStore.showErrorDialog('删除失败', '无法删除指定书籍');
            }
          } catch (error) {
            console.error('删除过程报错:', error);
            dialogStore.showErrorDialog('删除失败', error instanceof Error ? error.message : String(error));
          }
        }
      }
    ]
  })
  
  closeContextMenu(); // 这里虽然清空了 selectedBook，但上面的局部变量已锁定数据
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
  closeContextMenu()
}

// 关闭添加分类对话框
const closeAddCategoryDialog = () => {
  showAddCategory.value = false
  newCategoryName.value = ''
}

// 显示分类管理对话框
const showCategoryManageDialog = () => {
  showCategoryManage.value = true
  document.removeEventListener('click', closeContextMenuHandler)
  closeContextMenu(false)
}

// 关闭分类管理对话框
const closeCategoryManageDialog = () => {
  showCategoryManage.value = false
  selectedCategoryId.value = ''
  selectedBook.value = null
  closeContextMenu()
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
    
    dialogStore.showSuccessDialog('分类创建成功')
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
    const results = await ebookStore.searchBooks(searchKeyword.value.trim())
    searchResults.value = results
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

// 获取存储类型标题
const getStorageBadgeTitle = (storageType: string) => {
  const titles: Record<string, string> = {
    'local': '本地存储',
    'synced': '已同步到云端',
    'baidupan': '点击下载到本地'
  }
  return titles[storageType] || '未知'
}

// 处理存储徽章点击
const handleStorageBadgeClick = async (book: any) => {
  if (book.storageType === 'baidupan') {
    // 云端书籍，下载到本地
    try {
      dialogStore.showDialog({
        title: '正在下载',
        message: `正在从百度网盘下载《${book.title}》...`,
        type: 'info',
        buttons: []
      })
      
      const result = await ebookStore.downloadFromBaidupan(book.baidupanPath || book.path)
      
      dialogStore.closeDialog()
      
      if (result) {
        dialogStore.showSuccessDialog('下载成功')
      } else {
        dialogStore.showErrorDialog('下载失败', '请检查网络连接或授权状态')
      }
    } catch (error) {
      dialogStore.closeDialog()
      console.error('下载失败:', error)
      const errorMessage = error instanceof Error ? error.message : '下载失败，请重试'
      dialogStore.showErrorDialog('下载失败', errorMessage)
    }
  } else if (book.storageType === 'local') {
    // 本地书籍，上传到云端
    await uploadToBaidupan(book)
  }
}

// 上传到百度网盘
const uploadToBaidupan = async (book: any) => {
  if (!isBaidupanAuthorized.value) {
    dialogStore.showErrorDialog('未授权', '请先授权百度网盘')
    return
  }
  
  try {
    dialogStore.showDialog({
      title: '正在上传',
      message: `正在上传《${book.title}》到百度网盘...`,
      type: 'info',
      buttons: []
    })
    
    const result = await ebookStore.uploadToBaidupan(book.id)
    
    dialogStore.closeDialog()
    
    if (result) {
      dialogStore.showSuccessDialog('上传成功')
    } else {
      dialogStore.showErrorDialog('上传失败', '请检查网络连接或授权状态')
    }
  } catch (error) {
    dialogStore.closeDialog()
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
  [() => books.value.length, () => categories.value.length],
  () => {
    cachedResults.value = {
      categoryBooks: {},
      categoryNames: {},
      categoryColors: {}
    }
  }
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
  } catch (error) {
    console.error('初始化电子书存储失败:', error);
  }
})

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
  padding: 1.5rem 1.25rem;
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.03);
  position: relative;
}

.sidebar-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.5);
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
  margin-top: auto;
  margin-bottom: 0;
}

.sidebar-bottom {
  margin-top: auto;
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
  margin-bottom: 0.875rem;
  padding-left: 0.5rem;
  border-left: 3px solid #4A90E2;
  opacity: 0.8;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
  padding: 2rem;
  overflow-y: auto;
  background: linear-gradient(135deg, #FFFFFF, #F8FAFC);
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
  background: #F8FAFC;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  transition: all 0.2s ease;
}

.search-box:focus-within {
  border-color: #4A90E2;
  background: #FFFFFF;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.875rem;
  color: #1E293B;
  outline: none;
  min-width: 200px;
}

.search-input::placeholder {
  color: #94A3B8;
}

.search-btn {
  background: transparent;
  border: none;
  color: #64748B;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  transition: color 0.2s ease;
}

.search-btn:hover {
  color: #4A90E2;
}

.view-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.view-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748B;
  transition: all 0.2s ease;
}

.view-btn:hover {
  color: #1E293B;
  background-color: rgba(74, 144, 226, 0.05);
}

.view-btn.active {
  color: #4A90E2;
  background-color: rgba(74, 144, 226, 0.1);
}

/* 搜索结果信息 */
.search-results-info {
  margin-bottom: 2rem;
}

.search-info-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: rgba(74, 144, 226, 0.1);
  border: 1px solid rgba(74, 144, 226, 0.2);
  border-radius: 0.75rem;
  padding: 1rem 1.5rem;
}

.search-info-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.search-info-text {
  flex: 1;
}

.search-info-text h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1E293B;
  margin: 0 0 0.25rem 0;
}

.search-info-text p {
  font-size: 0.875rem;
  color: #64748B;
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
  gap: 1rem;
  margin-bottom: 2rem;
}

/* 书籍列表 */
.books-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

/* 书籍卡片 */
.book-card {
  background: #FFFFFF;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 0.5rem;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
}

.book-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: rgba(74, 144, 226, 0.3);
  z-index: 10;
}

.books-list .book-card {
  flex-direction: row;
  align-items: center;
  padding: 0.75rem;
  gap: 1rem;
  border-radius: 0.5rem;
}

.book-cover-container {
  position: relative;
  flex-shrink: 0;
}

.books-grid .book-cover-container {
  width: 100%;
  aspect-ratio: 3/4;
}

.books-list .book-cover-container {
  width: 60px;
  height: 84px;
}

.book-cover {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-color: #FFFFFF;
  border-radius: 0.5rem;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
}

.book-card:hover .book-cover {
  transform: scale(1.02);
}

.book-cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #4A90E2, #6366F1);
  color: white;
  text-align: center;
  border-radius: 0.5rem;
}

.placeholder-icon {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.placeholder-text {
  font-size: 2rem;
  font-weight: 700;
  opacity: 0.9;
}

.book-format-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
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
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.book-storage-badge:hover {
  transform: scale(1.1);
}

.book-storage-badge.local {
  background: rgba(100, 116, 139, 0.9);
}

.book-storage-badge.local:hover {
  background: #64748B;
}

.book-storage-badge.synced {
  background: rgba(74, 144, 226, 0.9);
}

.book-storage-badge.synced:hover {
  background: #4A90E2;
}

.book-storage-badge.baidupan {
  background: rgba(16, 185, 129, 0.9);
}

.book-storage-badge.baidupan:hover {
  background: #10B981;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.book-info {
  padding: 0.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.books-list .book-info {
  flex: 1;
  min-width: 0;
  padding: 0;
  gap: 0.25rem;
}

.book-title {
  font-size: 0.875rem;
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
  font-size: 0.75rem;
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
  max-width: 400px;
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

/* 浮动添加按钮 */
.floating-add-btn {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
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
  transition: all 0.2s ease;
  z-index: 50;
}

.floating-add-btn:hover {
  transform: scale(1.1) rotate(90deg);
  box-shadow: 0 8px 24px rgba(74, 144, 226, 0.5);
  background: linear-gradient(135deg, #357ABD, #4f46e5);
}

.floating-add-btn:active {
  transform: scale(1.05) rotate(90deg);
}

/* AI 对话按钮 */
.floating-chat-btn {
  position: fixed;
  bottom: 2rem;
  right: 6.5rem;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #10B981, #059669);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  transition: all 0.2s ease;
  z-index: 50;
}

.floating-chat-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.5);
  background: linear-gradient(135deg, #059669, #047857);
}

.floating-chat-btn:active {
  transform: scale(1.05);
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background-color: #FFFFFF;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
  overflow: hidden;
}

.category-submenu {
  margin-left: 0.25rem;
  border-left: 3px solid #4A90E2;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  color: #1E293B;
}

.menu-item:hover {
  background-color: #F8FAFC;
}

.menu-item.danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.menu-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.menu-text {
  flex: 1;
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
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.5);
}

.dialog-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1E293B;
  margin: 0;
}

.dialog-close {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  color: #64748B;
  transition: all 0.2s ease;
  border-radius: 0.375rem;
}

.dialog-close:hover {
  background: rgba(203, 213, 225, 0.3);
  color: #1E293B;
}

.dialog-body {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  margin-bottom: 0.5rem;
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
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  border-radius: var(--border-radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-normal);
  text-decoration: none;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left var(--transition-slow);
}

.btn:hover::before {
  left: 100%;
}

.btn:active {
  transform: scale(0.96);
  transition: all var(--transition-fast);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #4A90E2;
  color: white;
  border-color: #4A90E2;
}

.btn-primary:hover:not(:disabled) {
  background-color: #357ABD;
  border-color: #357ABD;
}

.btn-secondary {
  background-color: #F1F5F9;
  color: #1E293B;
  border-color: #CBD5E1;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #E2E8F0;
}

.btn-danger {
  background-color: #EF4444;
  color: white;
  border-color: #EF4444;
}

.btn-danger:hover:not(:disabled) {
  background-color: #DC2626;
  border-color: #DC2626;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  /* 平板设备 */
  .sidebar {
    width: 240px;
  }
  
  .books-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1.25rem;
  }
  
  .content {
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
  
  .floating-add-btn {
    bottom: 1.5rem;
    right: 1.5rem;
    width: 2.5rem;
    height: 2.5rem;
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