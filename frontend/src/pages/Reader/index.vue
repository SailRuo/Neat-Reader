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
    <div class="reader-content" ref="contentRef" :style="{ top: contentTop + 'px', bottom: contentBottom + 'px' }">
      <EpubReader
        v-if="book?.format === 'epub'"
        ref="epubReaderRef"
        :book-id="book.id"
        :theme="theme"
        :font-size="fontSize"
        :line-height="lineHeight"
        :page-mode="pageMode"
        :alignment="alignment"
        :initial-progress="progress"
        @ready="handleReaderReady"
        @progress-change="handleProgressChange"
        @chapter-change="handleChapterChange"
        @click="handleContentClick"
        @text-selected="handleTextSelected"
        @highlight-clicked="handleHighlightClicked"
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
      :page-mode="pageMode"
      :alignment="alignment"
      @update:progress="handleUpdateProgress"
      @update:theme="theme = $event as 'light' | 'sepia' | 'dark' | 'green'"
      @update:font-size="fontSize = $event"
      @update:line-height="lineHeight = $event"
      @update:page-mode="handlePageModeChange"
      @update:alignment="alignment = $event"
    />
    
    <!-- 侧边栏 -->
    <Sidebar
      v-if="activeSidebar"
      :type="activeSidebar"
      :chapters="chapters"
      :current-chapter-index="currentChapterIndex"
      :notes="notes"
      :theme="theme"
      @close="activeSidebar = null"
      @navigate="handleNavigate"
      @delete-note="handleDeleteNote"
    />
    
    <!-- 笔记对话框 -->
    <div v-if="showNoteDialog" class="note-dialog-overlay" @click="showNoteDialog = false">
      <div class="note-dialog" @click.stop>
        <div class="note-dialog-header">
          <h3>添加笔记</h3>
          <button class="close-btn" @click="showNoteDialog = false">×</button>
        </div>
        <div class="note-dialog-body">
          <div class="selected-text">
            <label>选中文本</label>
            <p :style="{ backgroundColor: noteColor + '33', borderLeftColor: noteColor }">{{ selectedText }}</p>
          </div>
          <div class="color-picker">
            <label>高亮颜色</label>
            <div class="color-options">
              <button
                v-for="color in highlightColors"
                :key="color.value"
                :class="['color-btn', { active: noteColor === color.value }]"
                :style="{ backgroundColor: color.value }"
                @click="noteColor = color.value"
                :title="color.label"
              ></button>
            </div>
          </div>
          <div class="note-input">
            <label>笔记内容</label>
            <textarea
              v-model="noteContent"
              placeholder="输入你的笔记..."
              rows="4"
              ref="noteTextareaRef"
            ></textarea>
          </div>
        </div>
        <div class="note-dialog-footer">
          <button class="btn-secondary" @click="showNoteDialog = false">取消</button>
          <button class="btn-primary" @click="handleSaveNote">保存</button>
        </div>
      </div>
    </div>
    
    <!-- 查看笔记对话框 -->
    <div v-if="showViewNoteDialog && viewingNote" class="note-dialog-overlay" @click="showViewNoteDialog = false">
      <div class="note-dialog" @click.stop>
        <div class="note-dialog-header">
          <h3>查看笔记</h3>
          <button class="close-btn" @click="showViewNoteDialog = false">×</button>
        </div>
        <div class="note-dialog-body">
          <div class="selected-text">
            <label>选中文本</label>
            <p :style="{ backgroundColor: viewingNote.color + '33', borderLeftColor: viewingNote.color }">{{ viewingNote.text }}</p>
          </div>
          <div class="note-content" v-if="viewingNote.content">
            <label>笔记内容</label>
            <p class="note-text">{{ viewingNote.content }}</p>
          </div>
          <div class="note-meta">
            <span class="note-chapter">{{ viewingNote.chapter }}</span>
            <span class="note-time">{{ new Date(viewingNote.timestamp).toLocaleString('zh-CN') }}</span>
          </div>
        </div>
        <div class="note-dialog-footer">
          <button class="btn-secondary" @click="showViewNoteDialog = false">关闭</button>
          <button class="btn-danger" @click="handleDeleteViewingNote">删除</button>
        </div>
      </div>
    </div>
    
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
import EpubReader from './components/EpubReader.vue'
import PdfReader from './components/PdfReader.vue'

const route = useRoute()
const router = useRouter()
const ebookStore = useEbookStore()

// 核心状态
const book = ref<any>(null)
const isLoading = ref(true)
const showControls = ref(true) // 控制栏始终显示
const activeSidebar = ref<'contents' | 'search' | 'notes' | null>(null)

// 阅读器引用
const epubReaderRef = ref<any>(null)
const pdfReaderRef = ref<any>(null)
const contentRef = ref<HTMLElement | null>(null)
const noteTextareaRef = ref<HTMLTextAreaElement | null>(null)

const contentTop = ref(0)
const contentBottom = ref(0)

// 阅读设置
const theme = ref<'light' | 'sepia' | 'dark' | 'green'>('light')
const fontSize = ref(18)
const lineHeight = ref(1.5)
const pageMode = ref<'page' | 'scroll'>('page')
const alignment = ref('两端对齐')
const brightness = ref(100)

// 阅读进度
const progress = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)
const currentChapterIndex = ref(0)
const currentChapterTitle = ref('')
const chapters = ref<any[]>([])
const readingTime = ref(0)

// 笔记相关
const notes = ref<any[]>([])
const showNoteDialog = ref(false)
const showViewNoteDialog = ref(false)
const viewingNote = ref<any>(null)
const selectedText = ref('')
const selectedCfi = ref('')
const noteContent = ref('')
const noteColor = ref('#FFEB3B')

// 高亮颜色选项
const highlightColors = [
  { label: '黄色', value: '#FFEB3B' },
  { label: '绿色', value: '#4CAF50' },
  { label: '蓝色', value: '#2196F3' },
  { label: '粉色', value: '#E91E63' },
  { label: '橙色', value: '#FF9800' },
  { label: '紫色', value: '#9C27B0' }
]

// 内容点击处理 - 切换控制栏显示/隐藏
const handleContentClick = () => {
  showControls.value = !showControls.value
  nextTick(() => {
    updateContentInsets()
    const reader = book.value?.format === 'epub' ? epubReaderRef.value : pdfReaderRef.value
    reader?.resize?.()
  })
}

const updateContentInsets = () => {
  if (!showControls.value) {
    contentTop.value = 0
    contentBottom.value = 0
    return
  }

  const topEl = document.querySelector('.top-bar') as HTMLElement | null
  const bottomEl = document.querySelector('.bottom-bar') as HTMLElement | null
  contentTop.value = topEl ? Math.ceil(topEl.getBoundingClientRect().height) : 0
  contentBottom.value = bottomEl ? Math.ceil(bottomEl.getBoundingClientRect().height) : 0
}

// 侧边栏切换
const handleToggleSidebar = (type: 'contents' | 'search' | 'notes') => {
  activeSidebar.value = activeSidebar.value === type ? null : type
}

// 阅读器就绪
const handleReaderReady = (data: any) => {
  if (data.chapters) {
    chapters.value = data.chapters
  }
  
  // 将笔记传递给 EPUB 阅读器
  if (book.value?.format === 'epub' && epubReaderRef.value && epubReaderRef.value.setNotes) {
    epubReaderRef.value.setNotes(notes.value)
  }
  
  // 延迟隐藏加载动画，确保内容已渲染
  setTimeout(() => {
    isLoading.value = false

    nextTick(() => {
      updateContentInsets()
      const reader = book.value?.format === 'epub' ? epubReaderRef.value : pdfReaderRef.value
      reader?.resize?.()
    })
    
    // 阅读器就绪后的处理
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
  const reader = book.value?.format === 'epub' ? epubReaderRef.value : pdfReaderRef.value
  if (reader && reader.goToProgress) {
    reader.goToProgress(newProgress)
  }
}

// 导航
const handleNavigate = (data: any) => {
  const reader = book.value?.format === 'epub' ? epubReaderRef.value : pdfReaderRef.value
  
  if (data.cfi) {
    // 导航到笔记位置（使用 CFI）
    if (reader && reader.goToLocation) {
      reader.goToLocation({ cfi: data.cfi })
    }
  } else if (data.index !== undefined) {
    // 导航到章节
    if (reader && reader.goToChapter) {
      reader.goToChapter(data.index)
    }
  }
  
  activeSidebar.value = null
}

// 文本选中
const handleTextSelected = (data: { text: string, cfi: string }) => {
  console.log('触发文本选中事件:', data)
  selectedText.value = data.text
  selectedCfi.value = data.cfi
  noteContent.value = ''
  showNoteDialog.value = true
  
  // 不要切换控制栏显示状态
  // showControls.value = !showControls.value
  
  nextTick(() => {
    noteTextareaRef.value?.focus()
  })
}

// 高亮点击处理 - 查看笔记
const handleHighlightClicked = (note: any) => {
  console.log('高亮被点击，显示笔记:', note)
  viewingNote.value = note
  showViewNoteDialog.value = true
}

// 删除正在查看的笔记
const handleDeleteViewingNote = async () => {
  if (!viewingNote.value) return
  
  await handleDeleteNote(viewingNote.value.id)
  showViewNoteDialog.value = false
  viewingNote.value = null
}

// 保存笔记
const handleSaveNote = async () => {
  // 笔记内容改为非必填
  const note = {
    id: `note_${Date.now()}`,
    bookId: book.value.id,
    text: selectedText.value,
    content: noteContent.value.trim() || '', // 允许空内容
    color: noteColor.value,
    cfi: selectedCfi.value,
    chapter: currentChapterTitle.value,
    chapterIndex: currentChapterIndex.value,
    timestamp: Date.now()
  }
  
  console.log('保存笔记:', note)
  
  notes.value.push(note)
  
  try {
    // 转换为纯对象数组，移除 Vue 响应式
    const plainNotes = JSON.parse(JSON.stringify(notes.value))
    
    // 保存到本地
    await localforage.setItem(`notes_${book.value.id}`, plainNotes)
    console.log('笔记已保存到本地')
    
    // 在阅读器中添加高亮
    addHighlightToReader(note)
    
    // 异步同步到云端
    syncNotesToCloud()
    
    // 清除选区
    clearTextSelection()
    
    // 关闭对话框
    showNoteDialog.value = false
    selectedText.value = ''
    selectedCfi.value = ''
    noteContent.value = ''
    noteColor.value = '#FFEB3B'
  } catch (error) {
    console.error('保存笔记失败:', error)
    alert('保存笔记失败，请重试')
  }
}

// 在阅读器中添加高亮
const addHighlightToReader = (note: any) => {
  const reader = epubReaderRef.value
  if (reader && reader.addHighlight && note.cfi) {
    try {
      reader.addHighlight(note.cfi, note.color, note)
      console.log('✅ 高亮已添加到阅读器:', note.id)
    } catch (error) {
      console.warn('⚠️ 添加高亮失败:', error)
    }
  }
}

// 清除文本选区
const clearTextSelection = () => {
  const reader = epubReaderRef.value
  if (reader && reader.clearSelection) {
    reader.clearSelection()
  }
  
  // 也清除主窗口的选区
  if (window.getSelection) {
    window.getSelection()?.removeAllRanges()
  }
}

// 删除笔记
const handleDeleteNote = async (noteId: string) => {
  notes.value = notes.value.filter(n => n.id !== noteId)
  
  try {
    // 转换为纯对象数组
    const plainNotes = JSON.parse(JSON.stringify(notes.value))
    
    // 保存到本地
    await localforage.setItem(`notes_${book.value.id}`, plainNotes)
    console.log('笔记已删除并保存')
    
    // 异步同步到云端
    syncNotesToCloud()
  } catch (error) {
    console.error('删除笔记失败:', error)
  }
}

// 同步笔记到云端
const syncNotesToCloud = async () => {
  if (!book.value) return
  
  // 检查是否需要云端同步
  if (!ebookStore.uploadToBaidupanNew) {
    console.log('跳过云端同步')
    return
  }
  
  try {
    const notesData = JSON.stringify({
      bookId: book.value.id,
      notes: notes.value,
      timestamp: Date.now()
    })
    
    const notesFile = new File([notesData], `${book.value.id}_notes.json`, { 
      type: 'application/json' 
    })
    
    // 异步上传，不等待结果
    ebookStore.uploadToBaidupanNew(notesFile, '/sync/notes').catch((err: Error) => {
      console.warn('同步笔记到云端失败:', err)
    })
  } catch (error) {
    console.warn('同步笔记失败:', error)
  }
}

// 加载笔记
const loadNotes = async () => {
  if (!book.value) return
  
  const savedNotes = await localforage.getItem<any[]>(`notes_${book.value.id}`)
  if (savedNotes) {
    notes.value = savedNotes
    
    // 如果 EPUB 阅读器已经准备好，传递笔记
    if (book.value.format === 'epub' && epubReaderRef.value && epubReaderRef.value.setNotes) {
      epubReaderRef.value.setNotes(notes.value)
    }
  }
}

// 翻页模式切换
const handlePageModeChange = async (mode: string) => {
  const typedMode = mode as 'page' | 'scroll'
  // 保存当前进度
  const reader = book.value?.format === 'epub' ? epubReaderRef.value : pdfReaderRef.value
  const currentLocation = reader?.getCurrentLocation?.()
  
  pageMode.value = typedMode
  
  // 重新初始化阅读器
  isLoading.value = true
  
  await new Promise(resolve => setTimeout(resolve, 100))
  
  if (reader && reader.reinitialize) {
    await reader.reinitialize()
    
    // 恢复进度
    if (currentLocation && reader.goToLocation) {
      await reader.goToLocation(currentLocation)
    } else if (progress.value > 0 && reader.goToProgress) {
      await reader.goToProgress(progress.value)
    }
  }
  
  isLoading.value = false
}

// 保存进度
const saveProgress = async () => {
  if (!book.value) return
  
  const reader = book.value.format === 'epub' ? epubReaderRef.value : pdfReaderRef.value
  if (!reader || !reader.getCurrentLocation) return
  
  const location = reader.getCurrentLocation()
  
  const progressData = {
    ebookId: book.value.id,
    chapterIndex: currentChapterIndex.value,
    chapterTitle: currentChapterTitle.value,
    position: progress.value / 100,
    cfi: location?.cfi || '',
    timestamp: Date.now(),
    readingTime: readingTime.value,
    deviceId: ebookStore.deviceInfo.id,
    deviceName: ebookStore.deviceInfo.name
  }
  
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
watch([theme, fontSize, lineHeight, pageMode, alignment, brightness], () => {
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
  
  // 立即加载笔记
  loadNotes()
  console.log('📝 笔记加载完成')
  
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

  nextTick(() => {
    updateContentInsets()
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
  overflow: hidden;
  transition: background-color 0.3s ease;
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

.note-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.note-dialog {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  color: #2c3e50;
}

.theme-dark .note-dialog {
  background: #1a1a1a;
  color: #e2e8f0;
}

.theme-sepia .note-dialog {
  background: #f4ecd8;
  color: #5b4636;
}

.theme-green .note-dialog {
  background: #e8f5e9;
  color: #2d5a3d;
}

.note-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.theme-dark .note-dialog-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.theme-sepia .note-dialog-header {
  border-bottom-color: rgba(91, 70, 54, 0.08);
}

.theme-green .note-dialog-header {
  border-bottom-color: rgba(45, 90, 61, 0.08);
}

.note-dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: inherit;
  opacity: 0.6;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  opacity: 1;
}

.theme-dark .close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.theme-sepia .close-btn:hover {
  background: rgba(91, 70, 54, 0.05);
}

.theme-green .close-btn:hover {
  background: rgba(45, 90, 61, 0.05);
}

.note-dialog-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selected-text,
.note-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-text label,
.note-input label,
.color-picker label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
}

.selected-text p {
  margin: 0;
  padding: 10px 12px;
  border-left: 3px solid;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
}

.color-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-options {
  display: flex;
  gap: 8px;
}

.color-btn {
  width: 32px;
  height: 32px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.color-btn:hover {
  transform: scale(1.1);
}

.color-btn.active {
  border-color: white;
  box-shadow: 0 0 0 2px #4a90e2, 0 2px 6px rgba(0, 0, 0, 0.2);
}

.note-input textarea {
  padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.note-input textarea:focus {
  border-color: #4a90e2;
}

.theme-dark .note-input textarea {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: inherit;
}

.note-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.theme-dark .note-dialog-footer {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.theme-sepia .note-dialog-footer {
  border-top-color: rgba(91, 70, 54, 0.08);
}

.theme-green .note-dialog-footer {
  border-top-color: rgba(45, 90, 61, 0.08);
}

.btn-secondary,
.btn-primary {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: rgba(0, 0, 0, 0.05);
  color: inherit;
}

.btn-secondary:hover {
  background: rgba(0, 0, 0, 0.08);
}

.btn-primary {
  background: #4a90e2;
  color: white;
}

.btn-primary:hover {
  background: #3a80d2;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(74, 144, 226, 0.3);
}

.btn-danger {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(231, 76, 60, 0.3);
}

.note-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note-text {
  margin: 0;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.theme-dark .note-text {
  background: rgba(255, 255, 255, 0.05);
}

.note-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 11px;
  opacity: 0.6;
}

.theme-dark .note-meta {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.note-chapter {
  font-weight: 500;
}

.note-time {
  font-style: italic;
}
</style>
