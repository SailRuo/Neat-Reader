<template>
  <div class="reader-container" :class="`theme-${theme}`">
    <!-- 加载状态 -->
    <LoadingOverlay v-if="isLoading" />
    
    <!-- 顶部工具栏 -->
    <TopBar
      v-show="showControls"
      :book="book"
      :chapter-title="currentChapterTitle"
      :theme="theme"
      @back="handleBack"
      @toggle-sidebar="handleToggleSidebar"
    />
    
    <!-- 阅读内容区 -->
    <div class="reader-content" ref="contentRef">
      <!-- Foliate EPUB 阅读器 -->
      <FoliateReader
        v-if="book?.format === 'epub'"
        ref="foliateReaderRef"
        :book-id="book.id"
        :theme="theme"
        :font-size="fontSize"
        :line-height="lineHeight"
        :initial-progress="progress"
        @ready="handleReaderReady"
        @progress-change="handleProgressChange"
        @chapter-change="handleChapterChange"
        @click="handleContentClick"
      />
      
      <PdfReader
        v-else-if="book?.format === 'pdf'"
        ref="pdfReaderRef"
        :book-id="book.id"
        :theme="theme"
        :initial-progress="progress"
        @ready="handleReaderReady"
        @progress-change="handleProgressChange"
        @click="handleContentClick"
      />
      
      <!-- 浮动信息显示（控制栏隐藏时） -->
      <transition name="fade">
        <div v-if="!showControls" class="floating-progress">{{ progress }}%</div>
      </transition>
    </div>
    
    <!-- 底部控制栏 -->
    <BottomBar
      v-show="showControls"
      :progress="progress"
      :current-page="currentPage"
      :total-pages="totalPages"
      :theme="theme"
      :font-size="fontSize"
      :line-height="lineHeight"
      @update:progress="handleUpdateProgress"
      @update:theme="theme = $event as 'light' | 'sepia' | 'dark' | 'green'"
      @update:font-size="fontSize = $event"
      @update:line-height="lineHeight = $event"
    />
    
    <!-- 侧边栏 -->
    <Sidebar
      v-if="activeSidebar"
      :type="activeSidebar"
      :chapters="chapters"
      :current-chapter-index="currentChapterIndex"
      :theme="theme"
      @close="activeSidebar = null"
      @navigate="handleNavigate"
    />
    
    <!-- 亮度遮罩 -->
    <div class="brightness-overlay" :style="{ opacity: (100 - brightness) / 100 }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEbookStore } from '../../stores/ebook'
import localforage from 'localforage'
import LoadingOverlay from './components/LoadingOverlay.vue'
import TopBar from './components/TopBar.vue'
import BottomBar from './components/BottomBar.vue'
import Sidebar from './components/Sidebar.vue'
import FoliateReader from './components/FoliateReader.vue'
import PdfReader from './components/PdfReader.vue'

const route = useRoute()
const router = useRouter()
const ebookStore = useEbookStore()

// 核心状态
const book = ref<any>(null)
const isLoading = ref(true)
const showControls = ref(false) // 控制栏默认隐藏，点击切换
const activeSidebar = ref<'contents' | 'search' | 'notes' | 'tts' | null>(null)

// 阅读器引用
const foliateReaderRef = ref<any>(null)
const pdfReaderRef = ref<any>(null)
const contentRef = ref<HTMLElement | null>(null)
const noteTextareaRef = ref<HTMLTextAreaElement | null>(null)

// 阅读设置
const theme = ref<'light' | 'sepia' | 'dark' | 'green'>('light')
const fontSize = ref(18)
const lineHeight = ref(1.5)
const pageMode = ref<'page' | 'scroll'>('page')
const alignment = ref('left')
const brightness = ref(100)

// 阅读进度
const progress = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)
const currentChapterIndex = ref(0)
const currentChapterTitle = ref('')
const chapters = ref<any[]>([]) // 初始化为空数组
const readingTime = ref(0)

// 暂时移除的功能（后续恢复）
// const notes = ref<any[]>([])
// const showNoteDialog = ref(false)
// const selectedText = ref('')
// const searchResults = ref<any[]>([])
// const currentPageText = ref('')

// 内容点击处理 - 切换控制栏显示/隐藏
const handleContentClick = () => {
  showControls.value = !showControls.value
}

// 侧边栏切换
const handleToggleSidebar = (type: 'contents' | 'search' | 'notes' | 'tts') => {
  // 暂时只支持目录
  if (type === 'contents') {
    activeSidebar.value = activeSidebar.value === type ? null : type
  } else {
    console.log('该功能暂未实现:', type)
  }
}

// 阅读器就绪
const handleReaderReady = (data: any) => {
  if (data.chapters) {
    chapters.value = data.chapters
  }
  
  // 延迟隐藏加载动画，确保内容已渲染
  setTimeout(() => {
    isLoading.value = false
  }, 500)
}

// 进度变化
const handleProgressChange = (data: any) => {
  progress.value = data.progress
  currentPage.value = data.currentPage || 1
  totalPages.value = data.totalPages || 1
  
  // 保存进度
  saveProgress()
}

// 章节变化
const handleChapterChange = (data: any) => {
  currentChapterIndex.value = data.index
  currentChapterTitle.value = data.title
}

// 更新进度
const handleUpdateProgress = (newProgress: number) => {
  const reader = book.value?.format === 'epub' ? foliateReaderRef.value : pdfReaderRef.value
  if (reader && reader.goToProgress) {
    reader.goToProgress(newProgress)
  }
}

// 导航
const handleNavigate = (data: any) => {
  const reader = book.value?.format === 'epub' ? foliateReaderRef.value : pdfReaderRef.value
  
  if (data.index !== undefined) {
    // 导航到章节
    if (reader && reader.goToChapter) {
      reader.goToChapter(data.index)
    }
  }
  
  activeSidebar.value = null
}

// 保存进度
const saveProgress = async () => {
  if (!book.value) return
  
  const reader = book.value.format === 'epub' ? foliateReaderRef.value : pdfReaderRef.value
  if (!reader || !reader.getCurrentLocation) return
  
  const location = reader.getCurrentLocation()
  console.log('📍 获取到的位置信息:', location)
  
  // 确保所有数据都是可序列化的，使用 toRaw 去除 Vue 响应式代理
  const progressData = {
    ebookId: book.value.id,
    chapterIndex: Number(currentChapterIndex.value), // 转换为普通数字
    chapterTitle: String(currentChapterTitle.value), // 转换为普通字符串
    position: Number(progress.value / 100),
    cfi: typeof location?.start?.cfi === 'string' ? location.start.cfi : '',
    timestamp: Date.now(),
    readingTime: Number(readingTime.value),
    deviceId: String(ebookStore.deviceInfo.id),
    deviceName: String(ebookStore.deviceInfo.name)
  }
  
  console.log('💾 准备保存的进度数据:', progressData)
  
  await ebookStore.saveReadingProgress(progressData)
}

// 返回
const handleBack = async () => {
  await saveProgress()
  if (book.value) {
    ebookStore.syncCurrentBookProgress(book.value.id)
  }
  router.push('/')
}

// 加载用户配置
const loadUserConfig = () => {
  const config = ebookStore.userConfig.reader
  theme.value = config.theme || 'light'
  fontSize.value = config.fontSize || 18
  lineHeight.value = config.lineHeight || 1.5
  pageMode.value = config.pageMode || 'page'
  brightness.value = config.brightness || 100
}

// 保存用户配置
const saveUserConfig = async () => {
  await ebookStore.updateUserConfig({
    reader: {
      ...ebookStore.userConfig.reader,
      theme: theme.value,
      fontSize: fontSize.value,
      lineHeight: lineHeight.value,
      pageMode: pageMode.value,
      brightness: brightness.value
    }
  })
}

// 监听配置变化
watch([theme, fontSize, lineHeight, brightness], () => {
  saveUserConfig()
})

// 生命周期
onMounted(async () => {
  const bookId = route.params.id as string
  console.log('🚀 阅读器页面加载，书籍ID:', bookId)
  
  book.value = ebookStore.getBookById(bookId)
  
  if (!book.value) {
    console.error('❌ 未找到书籍信息')
    router.push('/')
    return
  }
  
  console.log('📚 书籍信息:', {
    id: book.value.id,
    title: book.value.title,
    format: book.value.format,
    storageType: book.value.storageType
  })
  
  // 详细检查书籍内容是否存在
  try {
    const contentExists = await localforage.getItem(`ebook_content_${bookId}`)
    if (!contentExists) {
      console.error('❌ 书籍内容不存在，键名:', `ebook_content_${bookId}`)
      
      // 检查是否是云端书籍需要下载
      if (book.value.storageType === 'baidupan') {
        console.log('📥 检测到云端书籍，需要先下载')
        alert('该书籍尚未下载到本地，请先在首页下载后再阅读')
      } else {
        console.log('💾 本地书籍内容丢失')
        alert('书籍内容加载失败，文件可能已损坏，请重新导入')
      }
      
      router.push('/')
      return
    }
    
    console.log('✅ 书籍内容存在，大小:', contentExists instanceof ArrayBuffer ? contentExists.byteLength : 'unknown')
  } catch (error) {
    console.error('❌ 检查书籍内容时出错:', error)
    alert('检查书籍内容时出错，请重试')
    router.push('/')
    return
  }
  
  // 立即加载用户配置（同步操作）
  loadUserConfig()
  console.log('⚙️ 用户配置加载完成')
  
  // 同步加载阅读进度（阻塞，确保进度在阅读器初始化前加载）
  const savedProgress = await ebookStore.loadReadingProgress(bookId)
  console.log('📖 加载的进度数据:', savedProgress)
  if (savedProgress) {
    progress.value = Math.floor(savedProgress.position * 100)
    currentChapterIndex.value = savedProgress.chapterIndex || 0
    currentChapterTitle.value = savedProgress.chapterTitle || ''
    readingTime.value = savedProgress.readingTime || 0
    console.log('📍 设置进度为:', progress.value, '%')
  } else {
    console.log('📍 没有找到保存的进度，从头开始')
  }
  
  console.log('🎉 阅读器页面初始化完成')
  
  // 添加键盘快捷键支持
  const handleKeyDown = (e: KeyboardEvent) => {
    const reader = book.value?.format === 'epub' ? foliateReaderRef.value : pdfReaderRef.value
    if (!reader) return
    
    switch(e.key) {
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault()
        reader.prevPage?.()
        break
      case 'ArrowRight':
      case 'PageDown':
      case ' ': // 空格键
        e.preventDefault()
        reader.nextPage?.()
        break
      case 'Home':
        e.preventDefault()
        handleUpdateProgress(0)
        break
      case 'End':
        e.preventDefault()
        handleUpdateProgress(100)
        break
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  
  // 清理函数
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
})

onBeforeUnmount(async () => {
  // 保存进度但不等待完成
  saveProgress().catch(err => console.warn('保存进度失败:', err))
  
  // 异步同步到云端，不阻塞页面关闭
  if (book.value) {
    ebookStore.syncCurrentBookProgress(book.value.id)
  }
})
</script>

<style scoped>
.reader-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.theme-light {
  background: #ffffff;
  color: #2c3e50;
}

.theme-sepia {
  background: #f4ecd8;
  color: #5b4636;
}

.theme-green {
  background: #e8f5e9;
  color: #2d5a3d;
}

.theme-dark {
  background: #1a1a1a;
  color: #e2e8f0;
}

.reader-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  transition: background-color 0.3s ease;
  z-index: 1;
}

.theme-light .reader-content {
  background: #ffffff;
}

.theme-sepia .reader-content {
  background: #f4ecd8;
}

.theme-green .reader-content {
  background: #e8f5e9;
}

.theme-dark .reader-content {
  background: #1a1a1a;
}

.floating-info {
  position: fixed;
  z-index: 500;
  pointer-events: none;
  user-select: none;
}

.floating-progress {
  position: fixed;
  bottom: 8px;
  left: 8px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 500;
  pointer-events: none;
  user-select: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.brightness-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  pointer-events: none;
  z-index: 10000;
  transition: opacity 0.3s ease;
}
</style>
