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
    <div class="reader-content">
      <!-- Foliate EPUB 阅读器 -->
      <FoliateReader
        v-if="book && book.format === 'epub'"
        ref="foliateReaderRef"
        :book-id="book.id"
        :book-content="book.content"
        :theme="theme"
        :font-size="fontSize"
        :line-height="lineHeight"
        :annotations="bookAnnotations"
        :initial-progress="progress"
        :initial-cfi="initialCfi"
        @ready="handleReaderReady"
        @progress-change="handleProgressChange"
        @chapter-change="handleChapterChange"
        @click="handleContentClick"
        @text-selected="handleTextSelected"
        @annotation-click="handleAnnotationClick"
      />
      
      <!-- PDF 原生渲染 -->
      <PdfReader
        v-else-if="book?.format === 'pdf' && !isPdfTextMode"
        ref="pdfReaderRef"
        :book-id="book.id"
        :theme="theme"
        :initial-progress="progress"
        @ready="handleReaderReady"
        @progress-change="handleProgressChange"
        @click="handleContentClick"
      />
      
      <!-- PDF 文本重排模式 -->
      <TextReflowReader
        v-else-if="book?.format === 'pdf' && isPdfTextMode"
        :content="pdfReflowContent"
        :theme="theme"
        :font-size="fontSize"
        :line-height="lineHeight"
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
      :is-pdf-text-mode="isPdfTextMode"
      :is-parsing-pdf="isParsingPdf"
      :format="book?.format"
      @update:progress="handleUpdateProgress"
      @update:theme="theme = $event as 'light' | 'sepia' | 'dark' | 'green'"
      @update:font-size="fontSize = $event"
      @update:line-height="lineHeight = $event"
      @toggle-pdf-text-mode="togglePdfTextMode"
    />
    
    <!-- 侧边栏 -->
    <Sidebar
      v-if="activeSidebar"
      :type="activeSidebar"
      :chapters="chapters"
      :current-chapter-index="currentChapterIndex"
      :notes="sidebarNotes"
      :theme="theme"
      :tts="tts"
      :current-page-text="currentPageText"
      :search-results="searchResults"
      :is-searching="isSearching"
      @close="activeSidebar = null"
      @navigate="handleNavigate"
      @delete-note="handleDeleteNote"
      @search="handleSearch"
      @go-to-result="handleGoToResult"
    />
    
    <!-- 文本选择菜单 -->
    <TextSelectionMenu
      :visible="showSelectionMenu"
      :selected-text="selectedText"
      :position="selectionPosition"
      @underline="handleCreateUnderline"
      @note="handleCreateNote"
      :color="selectedAnnotationColor"
      @color-change="selectedAnnotationColor = $event"
      @ask-ai="handleAskAI"
      @close="handleCloseSelectionMenu"
    />
    
    <!-- 笔记对话框 -->
    <NoteDialog
      v-model:visible="showNoteDialog"
      :selected-text="annotationSelectedText"
      :note="noteDialogContent"
      :is-edit="!!currentAnnotation"
      @save="handleSaveNote"
      @delete="handleDeleteCurrentAnnotation"
    />
    
    <!-- AI 浮动按钮 -->
    <AIFloatingButton
      :is-open="showAIChat"
      @toggle="handleToggleAIChat"
    />
    
    <!-- 书籍专用 AI 对话面板 -->
    <BookAIChatPanel
      v-if="book"
      :is-open="showAIChat"
      :book-id="book.id"
      :book-title="book.title"
      :selected-text="selectedTextForAI"
      :current-page-context="currentPageText"
      @close="showAIChat = false"
    />
    
    <!-- 亮度遮罩 -->
    <div class="brightness-overlay" :style="{ opacity: (100 - brightness) / 100 }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEbookStore } from '../../stores/ebook'
import localforage from 'localforage'
import LoadingOverlay from './components/LoadingOverlay.vue'
import TopBar from './components/TopBar.vue'
import BottomBar from './components/BottomBar.vue'
import Sidebar from './components/Sidebar.vue'
import FoliateReader from './components/FoliateReader.vue'
import PdfReader from './components/PdfReader.vue'
import TextReflowReader from './components/TextReflowReader.vue'
import TextSelectionMenu from './components/TextSelectionMenu.vue'
import AIFloatingButton from './components/AIFloatingButton.vue'
import BookAIChatPanel from './components/BookAIChatPanel.vue'
import { useTextToSpeech } from './composables/useTextToSpeech'
import { useAnnotationStore } from '../../stores/annotation'
import { useAnnotations } from './composables/useAnnotations'
import NoteDialog from './components/NoteDialog.vue'

const route = useRoute()
const router = useRouter()
const ebookStore = useEbookStore()

// 核心状态
const book = ref<any>(null)
const isLoading = ref(true)
const showControls = ref(false) // 控制栏默认隐藏，点击切换
const activeSidebar = ref<'contents' | 'search' | 'notes' | 'tts' | null>(null)

// 🎯 修复：增加初始化超时保护，防止卡在加载页面
const initTimeout = ref<any>(null)
onMounted(() => {
  initTimeout.value = setTimeout(() => {
    if (isLoading.value) {
      console.warn('⚠️ [Reader] 初始化超时，强制关闭加载动画')
      isLoading.value = false
    }
  }, 10000) // 10秒超时
})
onBeforeUnmount(() => {
  if (initTimeout.value) clearTimeout(initTimeout.value)
})

// 阅读器引用
const foliateReaderRef = ref<any>(null)
const pdfReaderRef = ref<any>(null)
const isPdfTextMode = ref(false)
const pdfReflowContent = ref('')
const isParsingPdf = ref(false)

// 阅读设置
const theme = ref<'light' | 'sepia' | 'dark' | 'green'>('light')
const fontSize = ref(18)
const lineHeight = ref(1.5)
const pageMode = ref<'page' | 'scroll'>('page')
const brightness = ref(100)

// 阅读进度
const progress = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)
const currentChapterIndex = ref(0)
const currentChapterTitle = ref('')
const chapters = ref<any[]>([]) // 初始化为空数组
const readingTime = ref(0)

const initialCfi = ref('')
const initialProgress = ref(0)

const isRestoringProgress = ref(false)
const restoreTargetProgress = ref(0)
const restoreStartTime = ref(0)
const RESTORE_TIMEOUT = 5000 // 5秒超时

// 初始化 TTS
const tts = useTextToSpeech()

// 初始化注释功能
const bookId = computed(() => route.params.id as string)
const annotationStore = useAnnotationStore()
const {
  selectedText: annotationSelectedText,
  showNoteDialog,
  noteDialogContent,
  currentAnnotation,
  bookAnnotations,
  handleTextSelection,
  createUnderline,
  showNoteDialogForSelection,
  saveNote,
  updateNote,
  deleteAnnotation,
  clearSelection: clearAnnotationSelection,
} = useAnnotations(bookId.value)

// 获取当前页面文本（用于 TTS）- 使用 ref 而不是 computed
const currentPageText = ref('')

// 文本选择相关
const showSelectionMenu = ref(false)
const selectedText = ref('')
const selectionPosition = ref({ x: 0, y: 0 })
const selectedCfi = ref('')
const selectedChapterIndex = ref(0)
const selectedChapterTitle = ref('')
const selectedTextForAI = ref('') // 传递给 AI 的选中文本
const selectedAnnotationColor = ref('#FBBF24')

// AI 对话相关
const showAIChat = ref(false)

// 更新当前页面文本（带重试机制）
const updateCurrentPageText = (retryCount = 0) => {
  const reader = book.value?.format === 'epub' ? foliateReaderRef.value : pdfReaderRef.value
  if (!reader || !reader.getCurrentPageText) {
    currentPageText.value = ''
    return
  }
  const text = reader.getCurrentPageText()
  
  // 如果文本为空且还有重试次数，延迟重试
  if (!text && retryCount < 3) {
    setTimeout(() => {
      updateCurrentPageText(retryCount + 1)
    }, 500)
    return
  }
  
  currentPageText.value = text
}

// 内容点击处理 - 切换控制栏显示/隐藏，同时关闭 AI 对话框
const handleContentClick = () => {
  showControls.value = !showControls.value
  
  // 如果 AI 对话框打开，点击阅读区域时关闭它
  if (showAIChat.value) {
    showAIChat.value = false
  }
}

// 侧边栏切换
const handleToggleSidebar = (type: 'contents' | 'search' | 'notes' | 'tts') => {
  const wasOpen = activeSidebar.value === type
  activeSidebar.value = wasOpen ? null : type

  // 如果打开 TTS 侧边栏，立即更新文本
  if (!wasOpen && type === 'tts') {
    updateCurrentPageText()
  }
}

// 搜索相关状态
const searchResults = ref<any[]>([])
const isSearching = ref(false)

// 搜索
const handleSearch = (query: string) => {
  const reader = book.value?.format === 'epub' ? foliateReaderRef.value : pdfReaderRef.value
  if (reader && reader.search) {
    console.log('🔍 [Reader] 触发搜索:', query)
    isSearching.value = true
    reader.search(query).then((results: any[]) => {
      console.log(`✅ [Reader] 搜索完成, 结果数: ${results.length}`)
      searchResults.value = results
      isSearching.value = false
    }).catch((err: any) => {
      console.error('❌ [Reader] 搜索失败:', err)
      isSearching.value = false
    })
  } else {
    console.warn('⚠️ [Reader] 阅读器未准备好或不支持搜索')
  }
}

// 跳转到搜索结果
const handleGoToResult = (index: number) => {
  const result = searchResults.value[index]
  if (result && result.cfi) {
    handleNavigate({ cfi: result.cfi })
  }
}

// 侧边栏笔记列表数据
const sidebarNotes = computed(() => {
  const annos = bookAnnotations.value || []
  return annos
    .filter(a => a.type === 'note' || a.type === 'underline')
    .map(a => ({
      id: a.id,
      cfi: a.cfi,
      chapterIndex: a.chapterIndex, // 🎯 直接使用保存的章节索引（可能是 undefined）
      chapter: a.chapterTitle || (a.chapterIndex !== undefined ? `第 ${a.chapterIndex + 1} 章` : '未知章节'),
      text: a.text,
      content: a.type === 'underline' ? '下划线' : (a.note || ''),
      color: a.color,
      timestamp: a.updatedAt || a.createdAt || Date.now(),
    }))
})

const handleDeleteNote = async (noteId: string) => {
  try {
    await annotationStore.deleteAnnotation(bookId.value, noteId)
  } catch (e) {
    console.error('删除笔记失败:', e)
  }
}

// 阅读器就绪
const handleReaderReady = (data: any) => {
  if (data.chapters) {
    chapters.value = data.chapters
  }
  
  // 清除超时计时器
  if (initTimeout.value) {
    clearTimeout(initTimeout.value)
    initTimeout.value = null
  }

  // 延迟隐藏加载动画，确保内容已渲染
  setTimeout(() => {
    isLoading.value = false
    // 延迟更新当前页面文本，等待章节完全加载
    setTimeout(() => {
      updateCurrentPageText()
    }, 500)
  }, 500)
}

// 进度变化
const handleProgressChange = (data: any) => {
  // 验证进度值是否有效
  if (typeof data.progress === 'number' && !isNaN(data.progress) && data.progress >= 0 && data.progress <= 100) {
    progress.value = data.progress
  } else {
    return // 无效进度不保存
  }
  
  currentPage.value = data.currentPage || 1
  totalPages.value = data.totalPages || 1
  
  // 更新当前页面文本
  updateCurrentPageText()
  
  // 检查进度恢复状态
  if (isRestoringProgress.value) {
    const elapsed = Date.now() - restoreStartTime.value
    const diff = Math.abs(progress.value - restoreTargetProgress.value)
    
    // 检查是否超时
    if (elapsed > RESTORE_TIMEOUT) {
      isRestoringProgress.value = false
      return
    }
    
    // 检查是否恢复成功（允许 5% 的误差）
    if (diff <= 5) {
      isRestoringProgress.value = false
    } else {
      return // 恢复中不自动保存进度
    }
  }

  // 🎯 核心修复: 进度变化时不自动保存到数据库/云端
  // 只有在 relocate (用户翻页完成) 时才保存，或者手动调用保存
}

// 章节变化
const handleChapterChange = (data: any) => {
  currentChapterIndex.value = data.index
  currentChapterTitle.value = data.title
  
  // 更新当前页面文本
  updateCurrentPageText()
}

// 更新进度
const handleUpdateProgress = (newProgress: number) => {
  const reader = book.value?.format === 'epub' ? foliateReaderRef.value : pdfReaderRef.value
  if (reader && reader.goToProgress) {
    reader.goToProgress(newProgress)
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 't' && e.altKey && book.value?.format === 'pdf') {
    togglePdfTextMode()
  }
  if (showAIChat.value) return
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

// 导航
const handleNavigate = (data: any) => {
  console.log('🎯 [Reader] handleNavigate 被调用:', data)
  const reader = book.value?.format === 'epub' ? foliateReaderRef.value : pdfReaderRef.value
  
  if (data.cfi) {
    console.log('📍 [Reader] 准备跳转到 CFI:', data.cfi, '章节索引:', data.chapterIndex)
    if (reader && reader.goToCfi) {
      // 🎯 修复：增加 chapterIndex 兜底，防止 CFI 失效导致无法跳转
      reader.goToCfi(data.cfi, data.chapterIndex)
    } else {
      console.warn('⚠️ [Reader] reader 或 goToCfi 方法不存在')
    }
    activeSidebar.value = null
    return
  }

  if (data.index !== undefined) {
    console.log('📍 [Reader] 准备跳转到章节:', data.index)
    // 导航到章节
    if (reader && reader.goToChapter) {
      reader.goToChapter(data.index)
    }
  }
  
  activeSidebar.value = null
}

// 处理文本选择
const handleTextSelected = (data: { text: string; position: { x: number; y: number }; cfi?: string; chapterIndex?: number; chapterTitle?: string }) => {
  selectedText.value = data.text
  selectionPosition.value = data.position
  selectedCfi.value = data.cfi || ''
  selectedChapterIndex.value = data.chapterIndex ?? 0
  selectedChapterTitle.value = data.chapterTitle || ''
  showSelectionMenu.value = true
  
  // 🎯 传递章节信息给注释系统
  console.log('📍 [Reader] 文本选择包含章节信息:', selectedChapterIndex.value, selectedChapterTitle.value)
}

// 处理 AI 对话
const handleAskAI = (text: string) => {
  console.log(' [AI 对话] 选中文本:', text.substring(0, 50))
  
  // 保存选中的文本，传递给 AI 面板
  selectedTextForAI.value = text
  
  // 关闭选择菜单，打开 AI 面板
  showSelectionMenu.value = false
  showAIChat.value = true
  
  console.log(' 选中文本已传递给 AI 面板')
}

// 处理创建下划线
const handleCreateUnderline = async () => {
  console.log('🎯 [注释] 创建下划线')
  try {
    handleTextSelection({
      text: selectedText.value,
      cfi: selectedCfi.value,
      chapterIndex: selectedChapterIndex.value,
      chapterTitle: selectedChapterTitle.value,
      position: selectionPosition.value,
    })

    const created = await createUnderline(selectedAnnotationColor.value)
    showSelectionMenu.value = false
    if (created) console.log('✅ 下划线创建成功')
  } catch (error) {
    console.error('❌ 创建下划线失败:', error)
  }
}

// 处理创建笔记
const handleCreateNote = () => {
  console.log('🎯 [注释] 打开笔记对话框')
  handleTextSelection({
    text: selectedText.value,
    cfi: selectedCfi.value,
    chapterIndex: selectedChapterIndex.value,
    chapterTitle: selectedChapterTitle.value,
    position: selectionPosition.value,
  })
  
  showNoteDialogForSelection()
  showSelectionMenu.value = false
}

// 保存笔记
const handleSaveNote = async (note: string) => {
  console.log(' [注释] 保存笔记:', note.substring(0, 50))
  try {
    if (currentAnnotation.value) {
      await updateNote(note)
    } else {
      await saveNote(note, selectedAnnotationColor.value)
    }
    console.log(' 笔记保存成功')
  } catch (error) {
    console.error(' 保存笔记失败:', error)
  }
}

// 点击已存在的注释（高亮/下划线/笔记）
const handleAnnotationClick = (annotation: any) => {
  // 笔记：打开对话框查看/编辑
  if (annotation?.type === 'note') {
    currentAnnotation.value = annotation
    noteDialogContent.value = annotation.note || ''
    selectedAnnotationColor.value = annotation.color || selectedAnnotationColor.value
    showNoteDialog.value = true
    return
  }

  // 下划线：也弹出对话框，允许删除或转为笔记
  if (annotation?.type === 'underline') {
    currentAnnotation.value = annotation
    noteDialogContent.value = ''
    selectedAnnotationColor.value = annotation.color || selectedAnnotationColor.value
    showNoteDialog.value = true
    return
  }
}

const handleDeleteCurrentAnnotation = async () => {
  if (!currentAnnotation.value) return
  try {
    await deleteAnnotation(currentAnnotation.value.id)
    showNoteDialog.value = false
    currentAnnotation.value = null
  } catch (e) {
    console.error('删除注释失败:', e)
  }
}

// 关闭选择菜单
const handleCloseSelectionMenu = () => {
  showSelectionMenu.value = false
  clearAnnotationSelection()
}

// 切换 AI 对话面板
const handleToggleAIChat = () => {
  console.log(' [AI 对话] 切换面板:', !showAIChat.value)
  
  // 如果关闭面板，清空选中文本
  if (showAIChat.value) {
    selectedTextForAI.value = ''
  }
  
  showAIChat.value = !showAIChat.value
}

// 保存进度
const saveProgress = async () => {
  if (!book.value) return
  
  const reader = book.value.format === 'epub' ? foliateReaderRef.value : pdfReaderRef.value
  if (!reader || !reader.getCurrentLocation) return
  
  // 验证进度值是否有效
  if (isNaN(progress.value) || progress.value < 0 || progress.value > 100) {
    return
  }
  
  const location = reader.getCurrentLocation()
  
  // 🎯 核心修复: 确保保存时使用当前最新的 CFI 和位置信息
  // 如果 reader 返回了 location，优先使用它
  const progressData = {
    ebookId: book.value.id,
    chapterIndex: location?.chapterIndex !== undefined ? Number(location.chapterIndex) : Number(currentChapterIndex.value),
    chapterTitle: String(currentChapterTitle.value),
    position: location?.fraction !== undefined ? Number(location.fraction) : Number(progress.value / 100),
    cfi: typeof location?.cfi === 'string' ? location.cfi : '',
    timestamp: Date.now(),
    readingTime: Number(readingTime.value),
    deviceId: String(ebookStore.deviceInfo.id),
    deviceName: String(ebookStore.deviceInfo.name)
  }

  console.log('💾 [进度保存] CFI:', progressData.cfi, '百分比:', (progressData.position * 100).toFixed(2) + '%')
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

const togglePdfTextMode = async () => {
  console.log('按钮被点击: togglePdfTextMode', { isPdfTextMode: isPdfTextMode.value, hasContent: !!pdfReflowContent.value })
  if (isPdfTextMode.value) {
    isPdfTextMode.value = false
    return
  }

  if (pdfReflowContent.value) {
    isPdfTextMode.value = true
    return
  }

  if (!pdfReaderRef.value) {
    console.error('pdfReaderRef 为空，无法解析')
    return
  }

  try {
    isParsingPdf.value = true
    isLoading.value = true
    console.log('开始调用 pdfReaderRef.value.extractAllTextToHTML()')
    const html = await pdfReaderRef.value.extractAllTextToHTML()
    console.log('解析完成，收到 HTML 长度:', html?.length)
    if (html) {
      pdfReflowContent.value = html
      isPdfTextMode.value = true
      console.log('已切换到重排模式')
    } else {
      console.warn('解析出的 HTML 为空')
      alert('该 PDF 似乎没有可提取的文本内容（可能是扫描版）')
    }
  } catch (e) {
    console.error('解析 PDF 失败:', e)
    alert('解析 PDF 文本失败')
  } finally {
    isParsingPdf.value = false
    isLoading.value = false
  }
}

// 生命周期
onMounted(async () => {
  console.log(' [Reader] onMounted 开始')
  const bookId = route.params.id as string
  
  // 初始化注释存储
  await annotationStore.initialize()
  
  // 先设置 book，避免 v-if 闪烁
  const bookData = ebookStore.getBookById(bookId)
  
  if (!bookData) {
    router.push('/')
    return
  }
  
  try {
    const contentExists = await localforage.getItem(`ebook_content_${bookId}`)
    if (!contentExists) {
      if (bookData.storageType === 'baidupan') {
        alert('该书籍尚未下载到本地，请先在首页下载后再阅读')
      } else {
        alert('书籍内容加载失败，文件可能已损坏，请重新导入')
      }
      router.push('/')
      return
    }
  } catch (error) {
    router.push('/')
    return
  }
  
  loadUserConfig()
  
  const savedProgress = await ebookStore.loadReadingProgress(bookId)
  if (savedProgress) {
    const savedProgressPercent = Math.floor(savedProgress.position * 100)
    progress.value = savedProgressPercent
    currentChapterIndex.value = savedProgress.chapterIndex || 0
    currentChapterTitle.value = savedProgress.chapterTitle || ''
    readingTime.value = savedProgress.readingTime || 0
    initialCfi.value = savedProgress.cfi || ''
    initialProgress.value = savedProgressPercent

    if (initialCfi.value) {
      console.log('📖 [Reader] 发现 CFI，将使用 CFI 精确恢复:', initialCfi.value)
      isRestoringProgress.value = true
      restoreTargetProgress.value = savedProgressPercent
      restoreStartTime.value = Date.now()
    } else if (savedProgressPercent > 0) {
      console.log('📖 [Reader] 未发现 CFI，将使用百分比恢复:', savedProgressPercent)
      isRestoringProgress.value = true
      restoreTargetProgress.value = savedProgressPercent
      restoreStartTime.value = Date.now()
    }
  }
  
  book.value = bookData
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(async () => {
  saveProgress().catch(() => {})
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
  transition: background-color 0.2s ease;
}

/* 主题颜色 */
.theme-light { background: #ffffff; color: #1a1a1a; }
.theme-sepia { background: #f4ecd8; color: #3d2817; }
.theme-green { background: #e8f5e9; color: #1b4d2e; }
.theme-dark { background: #1a1a1a; color: #e8e8e8; }

.reader-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  transition: background-color 0.2s ease;
  z-index: 1;
}

.theme-light .reader-content { background: #ffffff; }
.theme-sepia .reader-content { background: #f4ecd8; }
.theme-green .reader-content { background: #e8f5e9; }
.theme-dark .reader-content { background: #1a1a1a; }

.floating-progress {
  position: fixed;
  bottom: 12px;
  left: 12px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.95);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 500;
  pointer-events: none;
  user-select: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: opacity 0.2s ease;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.brightness-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #000;
  pointer-events: none;
  z-index: 10000;
  transition: opacity 0.2s ease;
}
</style>
