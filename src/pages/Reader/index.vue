<template>
  <div class="reader" :class="{ 'theme-dark': theme === 'dark' }">
    <!-- 阅读器容器 -->
    <div class="reader-container">
      <!-- 顶部控制栏 -->
      <div v-if="showControls" class="top-bar">
        <div class="left-actions">
          <button class="btn btn-secondary" @click="goBack">
            ← 返回
          </button>
        </div>
        <div class="center-title">
          <h2>{{ book?.title || '阅读中' }}</h2>
        </div>
        <div class="right-actions">
          <button class="btn btn-secondary" @click="toggleContents">
            目录
          </button>
          <button class="btn btn-secondary" @click="toggleSettings">
            设置
          </button>
        </div>
      </div>

      <!-- 阅读内容区 -->
      <div class="content-area" @click="toggleControls">
        <!-- EPUB 内容区 -->
        <div v-if="book?.format === 'epub'" class="epub-content" ref="epubContainer">
          <!-- EPUB 内容将由 Ebook.js 渲染 -->
          <div class="epub-controls" v-if="showControls">
            <button class="btn btn-secondary epub-prev-btn" @click.stop="prevPage">
              ← 上一页
            </button>
            <button class="btn btn-secondary epub-next-btn" @click.stop="nextPage">
              下一页 →
            </button>
          </div>
        </div>
        
        <!-- PDF 内容区 -->
        <div v-else-if="book?.format === 'pdf'" class="pdf-content">
          <canvas ref="pdfCanvas"></canvas>
          <div class="pdf-controls">
            <button class="btn btn-secondary" @click="renderPdfPage(currentPage - 1)" :disabled="currentPage <= 1">
              上一页
            </button>
            <span>{{ currentPage }} / {{ totalPages }}</span>
            <button class="btn btn-secondary" @click="renderPdfPage(currentPage + 1)" :disabled="currentPage >= totalPages">
              下一页
            </button>
          </div>
        </div>
        
        <!-- TXT 内容区 -->
        <div v-else-if="book?.format === 'txt'" class="txt-content">
          <!-- TXT 内容将由 loadTxtBook 方法渲染 -->
        </div>
        
        <!-- 初始加载状态 -->
        <div v-else class="loading-content">
          <h1>{{ book?.title || '测试电子书' }}</h1>
          <h2>{{ book?.author || '未知作者' }}</h2>
          <div class="chapter-content">
            <h3>第1章 开始阅读</h3>
            <p>这是一本测试电子书的内容。在这里，你可以看到电子书阅读器的基本功能演示。</p>
            <p>点击屏幕中央可以显示或隐藏控制栏，点击屏幕左侧或右侧可以进行翻页。</p>
            <p>你可以在设置中调整字体大小、主题、亮度等阅读偏好。</p>
            <p>阅读进度会自动保存，你可以在不同设备间同步阅读进度。</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
          </div>
        </div>
      </div>

      <!-- 底部控制栏 -->
      <div v-if="showControls" class="bottom-bar">
        <div class="progress-info">
          <span>{{ currentPage }} / {{ totalPages }}</span>
          <div class="progress">
            <div class="progress-bar" :style="{ width: `${readingProgress}%` }"></div>
          </div>
          <span>{{ readingProgress }}%</span>
        </div>
        <div class="bottom-actions">
          <button class="btn btn-secondary" @click="decreaseFontSize">
            A-
          </button>
          <button class="btn btn-secondary" @click="increaseFontSize">
            A+
          </button>
          <button class="btn btn-secondary" @click="toggleTheme">
            {{ theme === 'dark' ? '☀️' : '🌙' }}
          </button>
          <button class="btn btn-secondary" @click="syncProgress">
            同步
          </button>
        </div>
      </div>
    </div>

    <!-- 目录侧边栏 -->
    <div v-if="showContents" class="sidebar contents-sidebar">
      <div class="sidebar-header">
        <h3>目录</h3>
        <button class="btn btn-secondary" @click="toggleContents">
          × 关闭
        </button>
      </div>
      <div class="sidebar-content">
        <ul class="chapter-list">
          <li 
            v-for="(chapter, index) in chapters" 
            :key="index"
            class="chapter-item"
            :class="{ active: currentChapter === index }"
            @click="goToChapter(index)"
          >
            {{ chapter.title }}
          </li>
        </ul>
      </div>
    </div>

    <!-- 设置侧边栏 -->
    <div v-if="showSettings" class="sidebar settings-sidebar">
      <div class="sidebar-header">
        <h3>设置</h3>
        <button class="btn btn-secondary" @click="toggleSettings">
          × 关闭
        </button>
      </div>
      <div class="sidebar-content">
        <div class="setting-item">
          <h4>字体大小</h4>
          <div class="setting-controls">
            <button class="btn btn-secondary" @click="decreaseFontSize">
              A-
            </button>
            <span>{{ fontSize }}px</span>
            <button class="btn btn-secondary" @click="increaseFontSize">
              A+
            </button>
          </div>
        </div>

        <div class="setting-item">
          <h4>主题</h4>
          <div class="setting-controls">
            <button 
              class="btn btn-secondary" 
              @click="theme = 'light'"
              :class="{ active: theme === 'light' }"
            >
              浅色
            </button>
            <button 
              class="btn btn-secondary" 
              @click="theme = 'sepia'"
              :class="{ active: theme === 'sepia' }"
            >
              护眼
            </button>
            <button 
              class="btn btn-secondary" 
              @click="theme = 'dark'"
              :class="{ active: theme === 'dark' }"
            >
              深色
            </button>
          </div>
        </div>

        <div class="setting-item">
          <h4>翻页模式</h4>
          <div class="setting-controls">
            <button 
              class="btn btn-secondary" 
              @click="pageMode = 'page'"
              :class="{ active: pageMode === 'page' }"
            >
              单页
            </button>
            <button 
              class="btn btn-secondary" 
              @click="pageMode = 'scroll'"
              :class="{ active: pageMode === 'scroll' }"
            >
              滚动
            </button>
          </div>
        </div>

        <div class="setting-item">
          <h4>亮度</h4>
          <div class="setting-controls">
            <input 
              type="range" 
              v-model="brightness" 
              min="0" 
              max="100" 
              class="brightness-slider"
            >
            <span>{{ brightness }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 背景遮罩 -->
    <div 
      v-if="showContents || showSettings" 
      class="overlay" 
      @click="closeSidebars"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ePub from 'epubjs'
import * as pdfjsLib from 'pdfjs-dist'
const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).href
import localforage from 'localforage'
import { useEbookStore } from '../../stores/ebook'

// 配置 PDF.js 工作器
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// 初始化路由和状态管理
const route = useRoute()
const router = useRouter()
const ebookStore = useEbookStore()

// 响应式数据
const showControls = ref(true)
const showContents = ref(false)
const showSettings = ref(false)
const bookId = computed(() => route.params.id as string)
const book = ref<any>(null)
const currentPage = ref(1)
const totalPages = ref(100)
const readingProgress = ref(0)
const currentChapter = ref(0)
const chapters = ref<any[]>([])

// 阅读器实例
const epubReader = ref<any>(null)
const epubRendition = ref<any>(null)
const pdfReader = ref<any>(null)
const pdfCanvas = ref<HTMLCanvasElement | null>(null)
const epubContainer = ref<HTMLElement | null>(null)

// 阅读设置
const fontSize = ref(18)
const theme = ref<'light' | 'sepia' | 'dark'>('light')
const pageMode = ref<'page' | 'scroll'>('page')
const brightness = ref(100)

// 方法
const goBack = () => {
  router.back()
}

const toggleControls = () => {
  showControls.value = !showControls.value
}

const toggleContents = () => {
  showContents.value = !showContents.value
  showSettings.value = false
}

const toggleSettings = () => {
  showSettings.value = !showSettings.value
  showContents.value = false
}

const closeSidebars = () => {
  showContents.value = false
  showSettings.value = false
}

const goToChapter = (index: number) => {
  currentChapter.value = index
  
  // 根据电子书格式跳转到对应章节
  if (book.value.format === 'epub' && epubRendition.value && chapters.value[index]) {
    // EPUB 跳转章节
    const chapter = chapters.value[index]
    epubRendition.value.display(chapter.href)
  } else if (book.value.format === 'pdf' && pdfReader.value) {
    // PDF 跳转页码
    pdfReader.value.goToPage(index + 1)
  }
  
  showContents.value = false
}

const prevPage = () => {
  if (book.value.format === 'epub' && epubRendition.value) {
    epubRendition.value.prev()
  } else if (book.value.format === 'pdf' && pdfReader.value) {
    renderPdfPage(currentPage.value - 1)
  }
}

const nextPage = () => {
  if (book.value.format === 'epub' && epubRendition.value) {
    epubRendition.value.next()
  } else if (book.value.format === 'pdf' && pdfReader.value) {
    renderPdfPage(currentPage.value + 1)
  }
}

const increaseFontSize = () => {
  if (fontSize.value < 32) {
    fontSize.value += 2
    updateReaderStyles()
  }
}

const decreaseFontSize = () => {
  if (fontSize.value > 12) {
    fontSize.value -= 2
    updateReaderStyles()
  }
}

const toggleTheme = () => {
  // 确保主题值有效
  const validThemes: Array<'light' | 'sepia' | 'dark'> = ['light', 'sepia', 'dark']
  // 验证当前主题是否在有效列表中
  if (!validThemes.includes(theme.value)) {
    theme.value = 'light' // 默认使用浅色主题
  }
  const currentIndex = validThemes.indexOf(theme.value)
  theme.value = validThemes[(currentIndex + 1) % validThemes.length]
  updateReaderStyles()
}

const syncProgress = async () => {
  await ebookStore.syncReadingProgress()
}

// 更新阅读器样式
const updateReaderStyles = () => {
  if (book.value.format === 'epub' && epubRendition.value) {
    // 更新 EPUB 阅读器样式
    epubRendition.value.themes.fontSize(`${fontSize.value}px`)
    epubRendition.value.themes.select(theme.value)
  }
}

// 加载 EPUB 电子书
const loadEpubBook = async (ebookData: ArrayBuffer) => {
  console.log('1. [EPUB] 开始加载流程');
  
  try {
    // 1. 初始化书籍
    const book = ePub(ebookData);
    epubReader.value = book;

    // 2. 确保容器存在
    await nextTick();
    if (!epubContainer.value) throw new Error('容器引用失败');

    // 3. 配置渲染实例 (增加 manager 和 flow 的显式配置)
    const rendition = book.renderTo(epubContainer.value, {
      width: '100%',
      height: '100%',
      flow: 'paginated', // 分页模式
      manager: 'default', // 显式指定管理器
    });
    epubRendition.value = rendition;

    // 4. 注册主题
    registerEpubThemes(rendition);

    // 5. 【关键修改】：先 display，再处理元数据
    console.log('2. [EPUB] 执行 rendition.display()');
    await rendition.display(); 
    console.log('3. [EPUB] 渲染成功');

    // 6. 应用初始设置
    rendition.themes.select(theme.value);
    rendition.themes.fontSize(`${fontSize.value}px`);

    // 7. 异步加载目录和位置信息
    book.loaded.navigation.then((nav) => {
      chapters.value = nav.toc.map((c, i) => ({
        title: c.label?.trim() || `第 ${i + 1} 章`,
        href: c.href
      }));
      totalPages.value = chapters.value.length;
      console.log('4. [EPUB] 目录加载完成');
    });

    // 8. 监听翻页更新进度
    rendition.on('relocated', (location: any) => {
      const percent = location.start.percentage;
      readingProgress.value = Math.round(percent * 100);
    });

  } catch (error) {
    console.error('EPUB 加载崩溃:', error);
    if (epubContainer.value) {
      epubContainer.value.innerHTML = `<div class="error">渲染失败，请刷新重试</div>`;
    }
  }
};

// 抽取主题注册逻辑使代码整洁
const registerEpubThemes = (rendition: any) => {
  const themes = {
    light: { body: { color: '#333', background: '#fff' } },
    dark: { body: { color: '#eee', background: '#1F2937' } },
    sepia: { body: { color: '#5B4636', background: '#F4ECD8' } }
  };
  Object.entries(themes).forEach(([name, style]) => {
    rendition.themes.register(name, style);
  });
};

// 加载 PDF 电子书
const loadPdfBook = async (ebookPath: string) => {
  try {
    // 加载 PDF 文件
    const loadingTask = pdfjsLib.getDocument(ebookPath)
    const pdfDocument = await loadingTask.promise
    
    // 设置总页数
    totalPages.value = pdfDocument.numPages
    pdfReader.value = pdfDocument
    
    // 渲染第一页
    await renderPdfPage(1)
    
  } catch (error) {
    console.error('加载 PDF 电子书失败:', error)
  }
}

// 渲染 PDF 页面
const renderPdfPage = async (pageNumber: number) => {
  if (!pdfReader.value || !pdfCanvas.value) return
  
  try {
    // 获取页面
    const page = await pdfReader.value.getPage(pageNumber)
    
    // 设置渲染参数
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = pdfCanvas.value
    const context = canvas.getContext('2d')
    
    if (!context) return
    
    // 设置画布大小
    canvas.width = viewport.width
    canvas.height = viewport.height
    
    // 渲染页面
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise
    
    // 更新当前页
    currentPage.value = pageNumber
    readingProgress.value = Math.round((pageNumber / totalPages.value) * 100)
    
    // 保存阅读进度
    ebookStore.saveReadingProgress({
      ebookId: bookId.value,
      chapterIndex: pageNumber - 1,
      chapterTitle: `第${pageNumber}页`,
      position: readingProgress.value,
      timestamp: Date.now(),
      deviceId: ebookStore.deviceInfo.id,
      deviceName: ebookStore.deviceInfo.name,
      readingTime: 0
    })
    
  } catch (error) {
    console.error('渲染 PDF 页面失败:', error)
  }
}

// 加载 TXT 电子书
const loadTxtBook = async (ebookPath: string) => {
  try {
    // 读取 TXT 文件
    const response = await fetch(ebookPath)
    const content = await response.text()
    
    // 简单处理 TXT 内容，按换行分割段落
    const paragraphs = content.split('\n').filter(p => p.trim())
    
    // 设置章节（简单处理为一个章节）
    chapters.value = [{ title: '全文', index: 0 }]
    
    // 显示 TXT 内容
    const contentArea = document.querySelector('.txt-content')
    if (contentArea) {
      contentArea.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('')
    }
    
  } catch (error) {
    console.error('加载 TXT 电子书失败:', error)
  }
}

// 加载电子书
const loadBook = async () => {
  try {
    // 初始化电子书存储
    await ebookStore.initialize()
    
    // 获取电子书信息
    const ebook = ebookStore.getBookById(bookId.value)
    if (!ebook) {
      console.error('电子书不存在')
      return
    }
    
    book.value = ebook
    
    // 调试信息：输出电子书信息
    console.log('电子书信息:', {
      id: ebook.id,
      path: ebook.path,
      format: ebook.format
    })
    
    // 确保 DOM 已经根据 book.value 渲染完成
    await nextTick()
    
    // 从 IndexedDB 获取文件内容并创建 Blob URL
    let fileContent = null
    let key = null
    
    // 尝试使用 ebook.id 作为键名
    key = `ebook_content_${ebook.id}`
    console.log('尝试从 IndexedDB 获取文件内容，键名:', key)
    fileContent = await localforage.getItem(key)
    
    // 如果失败，尝试直接使用 ebook.path 作为键名
    if (!fileContent || !(fileContent instanceof ArrayBuffer)) {
      key = `ebook_content_${ebook.path}`
      console.log('尝试使用 path 作为键名从 IndexedDB 获取文件内容，键名:', key)
      fileContent = await localforage.getItem(key)
    }
    
    // 调试信息：输出获取到的文件内容
    console.log('获取到的文件内容:', {
      type: typeof fileContent,
      isArrayBuffer: fileContent instanceof ArrayBuffer,
      size: fileContent instanceof ArrayBuffer ? fileContent.byteLength : undefined
    })
    
    if (fileContent && fileContent instanceof ArrayBuffer) {
      // 根据文件格式设置正确的 MIME 类型
      let mimeType = 'application/octet-stream'
      switch (ebook.format) {
        case 'epub':
          mimeType = 'application/epub+zip'
          break
        case 'pdf':
          mimeType = 'application/pdf'
          break
        case 'txt':
          mimeType = 'text/plain'
          break
      }
      
      // 根据电子书格式加载
      try {
        if (ebook.format === 'epub') {
          // 直接传递 ArrayBuffer，不要创建 Blob URL
          await loadEpubBook(fileContent)
          // 只有EPUB加载成功后，才加载阅读进度
          const progress = await ebookStore.loadReadingProgress(bookId.value)
          if (progress) {
            currentChapter.value = progress.chapterIndex
            readingProgress.value = progress.position
            currentPage.value = progress.chapterIndex + 1
          }
        } else {
          // PDF 和 TXT 依然可以使用 Blob URL
          const blob = new Blob([fileContent], { type: mimeType })
          const blobUrl = URL.createObjectURL(blob)
          
          if (ebook.format === 'pdf') {
            await loadPdfBook(blobUrl)
            // PDF加载成功后，加载阅读进度
            const pdfProgress = await ebookStore.loadReadingProgress(bookId.value)
            if (pdfProgress) {
              currentChapter.value = pdfProgress.chapterIndex
              readingProgress.value = pdfProgress.position
              currentPage.value = pdfProgress.chapterIndex + 1
            }
          } else if (ebook.format === 'txt') {
            await loadTxtBook(blobUrl)
            // TXT加载成功后，加载阅读进度
            const txtProgress = await ebookStore.loadReadingProgress(bookId.value)
            if (txtProgress) {
              currentChapter.value = txtProgress.chapterIndex
              readingProgress.value = txtProgress.position
              currentPage.value = txtProgress.chapterIndex + 1
            }
          }
        }
      } catch (loadError) {
        console.error('根据格式加载电子书失败:', loadError)
        console.error('加载错误详情:', loadError instanceof Error ? loadError.message : String(loadError))
        console.error('加载错误堆栈:', loadError instanceof Error ? loadError.stack : undefined)
        
        // 显示错误信息
        const contentArea = document.querySelector('.epub-content, .pdf-content, .txt-content')
        if (contentArea) {
          contentArea.innerHTML = `
            <div class="error-message">
              <h3>加载失败</h3>
              <p>无法加载 ${ebook.format.toUpperCase()} 文件</p>
              <p>错误详情: ${loadError instanceof Error ? loadError.message : String(loadError)}</p>
              <p class="debug-info">请检查浏览器控制台获取更多调试信息</p>
              <p class="debug-info">建议：尝试重新导入文件或检查文件完整性</p>
            </div>
          `
        }
      }
    } else {
      console.error('无法获取电子书文件内容')
      const contentArea = document.querySelector('.epub-content, .pdf-content, .txt-content')
      if (contentArea) {
        contentArea.innerHTML = `
          <div class="error-message">
            <h3>加载失败</h3>
            <p>无法获取电子书文件内容</p>
            <p>请尝试重新导入文件</p>
            <p class="debug-info">调试信息：键名=${key}, 电子书ID=${ebook.id}, 电子书path=${ebook.path}</p>
            <p class="debug-info">建议：检查文件是否存在或已损坏</p>
          </div>
        `
      }
    }
    
  } catch (error) {
    console.error('加载电子书失败:', error)
  }
}

// 生命周期钩子
onMounted(async () => {
  await loadBook()
})

// 清理资源
onUnmounted(() => {
  if (epubRendition.value) {
    // 清理 EPUB 渲染实例
    epubRendition.value.destroy()
  }
  if (epubReader.value) {
    // 清理 EPUB 书籍实例
    epubReader.value.destroy()
  }
})
</script>

<style scoped>
.reader {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: #f5f7fa;
  position: relative;
}

/* 阅读器容器 */
.reader-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

/* 主题样式 */
.reader.theme-dark {
  background-color: #1F2937;
  color: #F3F4F6;
}

.reader.theme-dark .content-area {
  background-color: #1F2937;
}

/* 主题样式 */
.reader.theme-dark .content-area {
  background-color: #1F2937;
}

.reader.theme-dark .epub-content :deep(body) {
  color: #F3F4F6;
  background-color: #1F2937;
}

.reader.theme-sepia .content-area {
  background-color: #F4ECD8;
}

.reader.theme-sepia .epub-content :deep(body) {
  color: #5B4636;
  background-color: #F4ECD8;
}

/* 顶部控制栏 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.theme-dark .top-bar {
  background-color: rgba(31, 41, 55, 0.9);
}

.theme-sepia .top-bar {
  background-color: rgba(244, 236, 216, 0.9);
}

.top-bar h2 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
}

/* 阅读内容区 */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  background-color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.theme-dark .content-area {
  background-color: #1F2937;
}

.theme-sepia .content-area {
  background-color: #F4ECD8;
}

/* EPUB 内容区 */
.epub-content {
  width: 100%;
  height: 100%;
  font-size: 18px;
  line-height: 1.8;
  padding: 0;
  margin: 0;
  overflow: hidden;
  position: relative;
}

.epub-content :deep(iframe) {
  border: none;
  width: 100%;
  height: 100%;
}

.epub-content :deep(body) {
  margin: 0;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.epub-controls {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  pointer-events: none;
  z-index: 10;
}

.epub-controls .btn {
  pointer-events: auto;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #E4E7ED;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.epub-controls .btn:hover {
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.theme-dark .epub-controls .btn {
  background-color: rgba(55, 65, 81, 0.9);
  border-color: #4B5563;
  color: #F3F4F6;
}

.theme-dark .epub-controls .btn:hover {
  background-color: rgba(55, 65, 81, 1);
}

.theme-sepia .epub-controls .btn {
  background-color: rgba(244, 236, 216, 0.9);
  border-color: #D7C8B7;
  color: #5B4636;
}

.theme-sepia .epub-controls .btn:hover {
  background-color: rgba(244, 236, 216, 1);
}

.error-message {
  padding: 40px;
  text-align: center;
}

.error-message h3 {
  color: #EF4444;
  margin-bottom: 16px;
}

.error-message p {
  color: #666;
  margin-bottom: 12px;
}

.debug-info {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 8px;
  font-style: italic;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 18px;
  color: #666;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

.theme-dark .loading {
  color: #9CA3AF;
}

.theme-sepia .loading {
  color: #7C6656;
}

/* PDF 内容区 */
.pdf-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding-bottom: 40px;
}

.pdf-content canvas {
  max-width: 100%;
  max-height: 70vh;
  border: 1px solid #E4E7ED;
  border-radius: 8px;
}

.pdf-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
}

/* TXT 内容区 */
.txt-content {
  max-width: 800px;
  margin: 0 auto;
  font-size: 18px;
  line-height: 1.8;
  padding-bottom: 40px;
}

.txt-content p {
  margin-bottom: 16px;
  text-indent: 2em;
}

/* 加载状态 */
.loading-content {
  max-width: 800px;
  margin: 0 auto;
  font-size: 18px;
  line-height: 1.8;
  padding-bottom: 40px;
}

.loading-content h1 {
  font-size: 32px;
  margin-bottom: 16px;
}

.loading-content h2 {
  font-size: 24px;
  margin-bottom: 32px;
  color: #666;
}

.loading-content h3 {
  font-size: 20px;
  margin: 32px 0 16px 0;
}

.loading-content p {
  margin-bottom: 16px;
  text-indent: 2em;
}

.theme-dark .loading-content h2,
.theme-dark .ebook-content h2 {
  color: #9CA3AF;
}

.theme-sepia .loading-content h2,
.theme-sepia .ebook-content h2 {
  color: #7C6656;
}

/* 底部控制栏 */
.bottom-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 24px;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.theme-dark .bottom-bar {
  background-color: rgba(31, 41, 55, 0.9);
}

.theme-sepia .bottom-bar {
  background-color: rgba(244, 236, 216, 0.9);
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-info span {
  font-size: 14px;
  color: #666;
  min-width: 60px;
}

.theme-dark .progress-info span {
  color: #9CA3AF;
}

.theme-sepia .progress-info span {
  color: #7C6656;
}

.progress-info .progress {
  flex: 1;
  margin: 0;
}

.bottom-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* 侧边栏 */
.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 300px;
  height: 100vh;
  background-color: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.theme-dark .sidebar {
  background-color: #374151;
  color: #F3F4F6;
}

.theme-sepia .sidebar {
  background-color: #E8DFD0;
  color: #5B4636;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #E4E7ED;
}

.theme-dark .sidebar-header {
  border-bottom-color: #4B5563;
}

.theme-sepia .sidebar-header {
  border-bottom-color: #D7C8B7;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 目录列表 */
.chapter-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.chapter-item {
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.chapter-item:hover {
  background-color: #F5F7FA;
}

.theme-dark .chapter-item:hover {
  background-color: #4B5563;
}

.theme-sepia .chapter-item:hover {
  background-color: #D7C8B7;
}

.chapter-item.active {
  background-color: #4A90E2;
  color: white;
}

/* 设置项 */
.setting-item {
  margin-bottom: 24px;
}

.setting-item h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: bold;
}

.setting-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* 亮度滑块 */
.brightness-slider {
  flex: 1;
  min-width: 150px;
  margin: 0;
}

/* 背景遮罩 */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 50;
  cursor: pointer;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .content-area {
    padding: 20px;
  }

  .ebook-content {
    font-size: 16px;
  }

  .ebook-content h1 {
    font-size: 24px;
  }

  .ebook-content h2 {
    font-size: 20px;
  }

  .sidebar {
    width: 100%;
  }

  .top-bar,
  .bottom-bar {
    padding: 12px 16px;
  }

  .top-bar h2 {
    font-size: 16px;
  }
}
</style>