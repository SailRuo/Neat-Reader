<template>
  <div class="reader-app" :class="[`theme-${theme}`]">
    <transition name="fade">
      <div v-if="isLoading" class="loading-mask">
        <div class="spinner"></div>
        <p>正在加载书籍资源...</p>
      </div>
    </transition>

    <transition name="slide-down">
      <header v-if="showControls" class="control-bar top-bar">
        <div class="bar-left">
          <button class="icon-btn" @click="goBack" title="返回">
            <svg viewBox="0 0 24 24" width="24" height="24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>
          </button>
          <span class="book-title">{{ book?.title || '阅读器' }}</span>
        </div>
        <div class="bar-right">
          <button class="icon-btn" @click="toggleSearch" title="搜索">
            <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>
          </button>
          <button class="icon-btn" @click="toggleContents" title="目录">
            <svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="currentColor"/></svg>
          </button>
          <button class="icon-btn" @click="toggleSettings" title="设置">
            <svg viewBox="0 0 24 24" width="22" height="22"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L5.09 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/></svg>
          </button>
        </div>
      </header>
    </transition>

    <main class="reader-viewport" ref="viewportRef">
      <div v-if="book?.format === 'epub'" id="epub-area" class="book-area"></div>

      <div v-else-if="book?.format === 'pdf'" class="book-area pdf-area" @click="handlePdfClick">
        <canvas ref="pdfCanvas"></canvas>
      </div>

      <div class="mini-info">
        <span class="progress-text">{{ readingProgress }}%</span>
        <span class="chapter-text" v-if="currentChapterTitle"> · {{ currentChapterTitle }}</span>
      </div>
    </main>

    <transition name="slide-up">
      <div v-if="showControls" class="control-bar bottom-bar">
        <div class="slider-container">
          <span class="time-text">上一章</span>
          <input
              type="range"
              :value="readingProgress"
              min="0"
              max="100"
              disabled
              class="progress-slider"
          >
          <span class="time-text">下一章</span>
        </div>

        <div class="bottom-actions">
          <button class="action-btn" @click="toggleTheme">
            <span class="btn-label">{{ themeLabels[theme] }}</span>
          </button>

          <div class="font-control">
            <button class="font-btn small" @click="adjustFontSize(-2)">A-</button>
            <span class="font-val">{{ fontSize }}</span>
            <button class="font-btn large" @click="adjustFontSize(2)">A+</button>
          </div>

          <button class="action-btn" @click="togglePageMode">
            <span class="btn-label">{{ pageMode === 'page' ? '翻页' : '滚动' }}</span>
          </button>
        </div>
      </div>
    </transition>

    <transition name="drawer">
      <div v-if="showSearch" class="sidebar">
        <div class="sidebar-header">
          <h3>全文搜索</h3>
          <button class="close-btn" @click="showSearch = false">×</button>
        </div>
        <div class="sidebar-body">
          <div class="search-input-wrapper">
            <input
                v-model="searchQuery"
                placeholder="搜索关键词..."
                @keyup.enter="executeSearch"
                ref="searchInput"
            >
            <button class="search-btn" @click="executeSearch">Go</button>
          </div>
          <div v-if="isSearching" class="status-msg">正在搜索中...</div>
          <div v-else-if="searchResults.length === 0 && hasSearched" class="status-msg">未找到相关内容</div>
          <ul class="result-list">
            <li v-for="(res, idx) in searchResults" :key="idx" @click="jumpToCfi(res.cfi)">
              <div class="res-text" v-html="res.excerpt"></div>
              <div class="res-cfi">位置匹配</div>
            </li>
          </ul>
        </div>
      </div>
    </transition>

    <transition name="drawer">
      <div v-if="showContents" class="sidebar">
        <div class="sidebar-header">
          <h3>目录</h3>
          <button class="close-btn" @click="showContents = false">×</button>
        </div>
        <div class="sidebar-body">
          <ul class="toc-list">
            <li
                v-for="(item, index) in chapters"
                :key="index"
                :class="{ active: currentChapterIndex === index }"
                @click="jumpToChapter(item.href, index)"
            >
              {{ item.title }}
            </li>
          </ul>
        </div>
      </div>
    </transition>

    <transition name="drawer">
      <div v-if="showSettings" class="sidebar">
        <div class="sidebar-header">
          <h3>阅读设置</h3>
          <button class="close-btn" @click="showSettings = false">×</button>
        </div>
        <div class="sidebar-body">
          <div class="setting-item">
            <label>亮度</label>
            <div class="range-wrapper">
              <span class="icon-sun-small">☀</span>
              <input type="range" v-model="brightness" min="20" max="100">
              <span class="icon-sun-large">☀</span>
            </div>
          </div>
          <div class="setting-item">
            <label>行间距</label>
            <div class="segment-control">
              <button @click="lineHeight = 1.2" :class="{active: lineHeight === 1.2}">紧凑</button>
              <button @click="lineHeight = 1.5" :class="{active: lineHeight === 1.5}">适中</button>
              <button @click="lineHeight = 1.8" :class="{active: lineHeight === 1.8}">宽松</button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <div class="brightness-overlay" :style="{ opacity: (100 - brightness) / 100 }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ePub from 'epubjs'
import localforage from 'localforage'
import { useEbookStore } from '../../stores/ebook'
import * as pdfjsLib from 'pdfjs-dist'

// Worker 配置 (保持原样)
const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).href
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const route = useRoute()
const router = useRouter()
const ebookStore = useEbookStore()

// --- 响应式状态 ---
const isLoading = ref(true)
const showControls = ref(true) // 默认显示控制栏
const showSearch = ref(false)
const showContents = ref(false)
const showSettings = ref(false)

// 书籍数据
const book = ref<any>(null)
const chapters = ref<any[]>([])
const currentChapterIndex = ref(0)
const currentChapterTitle = ref('')
const readingProgress = ref(0)

// 样式与设置
const theme = ref<'light' | 'sepia' | 'dark'>('light')
const themeLabels = { light: '明亮', sepia: '护眼', dark: '暗夜' }
const fontSize = ref(18)
const lineHeight = ref(1.5)
const brightness = ref(100)
const pageMode = ref<'page' | 'scroll'>('page')

// 搜索状态
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const hasSearched = ref(false)

// 实例引用
const epubInstance = ref<any>(null)
const rendition = ref<any>(null)
const viewportRef = ref<HTMLElement | null>(null)
const pdfCanvas = ref<HTMLCanvasElement | null>(null)

// --- 核心逻辑区 ---

/**
 * 核心交互：处理点击区域
 * 左 30%: 上一页
 * 中 40%: 显隐菜单
 * 右 30%: 下一页
 */
const handleInteraction = (clientX: number, width: number) => {
  const ratio = clientX / width
  if (ratio < 0.3) {
    prevPage()
  } else if (ratio > 0.7) {
    nextPage()
  } else {
    toggleControls()
  }
}

const prevPage = () => {
  if (rendition.value) rendition.value.prev()
}

const nextPage = () => {
  if (rendition.value) rendition.value.next()
}

const toggleControls = () => {
  showControls.value = !showControls.value
  // 关闭其他面板
  if (showControls.value) {
    showSearch.value = false
    showContents.value = false
    showSettings.value = false
  }
}

/**
 * 初始化 EPUB 阅读器
 * 重点修复：主题注册、事件监听
 */
const initEpub = async (arrayBuffer: ArrayBuffer) => {
  try {
    if (epubInstance.value) epubInstance.value.destroy()

    // 1. 实例化书籍
    epubInstance.value = ePub(arrayBuffer)

    // 2. 渲染配置
    rendition.value = epubInstance.value.renderTo('epub-area', {
      width: '100%',
      height: '100%',
      flow: pageMode.value === 'page' ? 'paginated' : 'scrolled',
      manager: 'default',
      // 允许脚本访问内容
      allowScriptedContent: true
    })

    // 3. 注册主题 (关键：使用 !important 覆盖书籍原生样式)
    rendition.value.themes.register('light', {
      body: { color: '#333 !important', background: '#ffffff !important' },
      'p': { 'font-family': 'Helvetica, sans-serif !important' }
    })
    rendition.value.themes.register('sepia', {
      body: { color: '#5B4636 !important', background: '#Fbf0d9 !important' },
      'p': { 'font-family': 'Helvetica, sans-serif !important' }
    })
    rendition.value.themes.register('dark', {
      body: { color: '#cecece !important', background: '#1a1a1a !important' },
      'p': { 'font-family': 'Helvetica, sans-serif !important' }
    })

    // 4. 显示内容
    await rendition.value.display()

    // 5. 应用初始设置
    applyStyles()

    // 6. 绑定事件 (关键：必须监听 iframe 内部事件)
    rendition.value.on('click', (e: any) => {
      // 获取 iframe 内部的 clientX 和 窗口宽度
      const width = e.view.innerWidth
      const x = e.clientX
      handleInteraction(x, width)
    })

    // 修复滚轮翻页
    rendition.value.on('wheel', (e: WheelEvent) => {
      if (pageMode.value === 'page') {
        // 阻止默认滚动
        // e.preventDefault() // 注意：Epub.js 内部可能需要被动监听，此处主要做触发
        if (e.deltaY > 0) nextPage()
        else prevPage()
      }
    })

    // 绑定键盘事件
    rendition.value.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPage()
      if (e.key === 'ArrowRight') nextPage()
    })

    // 7. 进度与目录处理
    rendition.value.on('relocated', (location: any) => {
      updateProgress(location)
    })

    // 生成 Locations 以获取准确百分比
    epubInstance.value.ready.then(() => {
      epubInstance.value.locations.generate(1000)
    })

    const nav = await epubInstance.value.loaded.navigation
    chapters.value = nav.toc.map((t: any) => ({ title: t.label, href: t.href }))

    isLoading.value = false

  } catch (err) {
    console.error('EPUB Init Failed:', err)
    isLoading.value = false
  }
}

const updateProgress = (location: any) => {
  // 更新百分比
  if (epubInstance.value?.locations?.length() > 0) {
    const percentage = epubInstance.value.locations.percentageFromCfi(location.start.cfi)
    readingProgress.value = Math.floor(percentage * 100)
  }
  // 更新章节名（简单逻辑）
  if (location.start.index !== undefined && chapters.value[location.start.index]) {
    currentChapterIndex.value = location.start.index
    currentChapterTitle.value = chapters.value[location.start.index].title
  }
}

// --- 样式控制 ---

const applyStyles = () => {
  if (!rendition.value) return
  // 强制切换主题
  rendition.value.themes.select(theme.value)
  rendition.value.themes.fontSize(`${fontSize.value}px`)
  // 如果 epubjs 支持 line-height 设置，也可以在此注入 CSS 规则
}

const toggleTheme = () => {
  const modes: ('light' | 'sepia' | 'dark')[] = ['light', 'sepia', 'dark']
  const nextIndex = (modes.indexOf(theme.value) + 1) % modes.length
  theme.value = modes[nextIndex]
  applyStyles()
}

const adjustFontSize = (delta: number) => {
  fontSize.value += delta
  if (fontSize.value < 12) fontSize.value = 12
  if (fontSize.value > 36) fontSize.value = 36
  applyStyles()
}

const togglePageMode = () => {
  pageMode.value = pageMode.value === 'page' ? 'scroll' : 'page'
  // 模式改变需要重新加载书籍流
  isLoading.value = true
  loadBookData()
}

// --- 搜索功能 ---

const executeSearch = async () => {
  if (!searchQuery.value || !epubInstance.value) return

  isSearching.value = true
  hasSearched.value = true
  searchResults.value = []

  // 遍历所有 spine (章节) 进行搜索
  try {
    const spine = epubInstance.value.spine
    const spineItems = spine.spineItems

    const results = []
    for (const item of spineItems) {
      await item.load(epubInstance.value.load.bind(epubInstance.value))
      const matches = await item.find(searchQuery.value)
      item.unload() // 释放内存
      results.push(...matches)
    }

    // 处理结果高亮
    searchResults.value = results.map((r: any) => ({
      cfi: r.cfi,
      excerpt: r.excerpt.replace(
          new RegExp(searchQuery.value, 'gi'),
          match => `<span class="highlight">${match}</span>`
      )
    }))
  } catch (e) {
    console.error(e)
  } finally {
    isSearching.value = false
  }
}

const jumpToCfi = (cfi: string) => {
  rendition.value.display(cfi)
  // 可选：高亮显示
  rendition.value.annotations.add('highlight', cfi)
  showSearch.value = false
  showControls.value = false
}

// --- 导航逻辑 ---

const jumpToChapter = (href: string, index: number) => {
  currentChapterIndex.value = index
  rendition.value.display(href)
  showContents.value = false
  showControls.value = false
}

const loadBookData = async () => {
  await ebookStore.initialize()
  const b = ebookStore.getBookById(route.params.id as string)
  if (!b) {
    alert('书籍不存在')
    router.back()
    return
  }
  book.value = b

  // 从离线存储获取文件
  const key = `ebook_content_${b.id}`
  const fileData = await localforage.getItem(key) as ArrayBuffer

  if (!fileData) {
    alert('文件内容丢失')
    return
  }

  if (b.format === 'epub') {
    await nextTick() // 等待 DOM 挂载
    initEpub(fileData)
  } else if (b.format === 'pdf') {
    // PDF 处理逻辑保留
    isLoading.value = false
  }
}

// --- 辅助方法 ---
const goBack = () => router.back()
const toggleSearch = () => { showSearch.value = !showSearch.value; showContents.value = false; showSettings.value = false }
const toggleContents = () => { showContents.value = !showContents.value; showSearch.value = false; showSettings.value = false }
const toggleSettings = () => { showSettings.value = !showSettings.value; showContents.value = false; showSearch.value = false }

// --- 生命周期 ---
onMounted(() => {
  loadBookData()
  // 绑定全局键盘监听
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevPage()
    if (e.key === 'ArrowRight') nextPage()
  })
})

onUnmounted(() => {
  if (epubInstance.value) epubInstance.value.destroy()
})
</script>

<style scoped>
/* 引入 Google Fonts (Inter) 或使用系统字体 */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

/* 全局变量与基础样式 */
.reader-app {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  transition: background-color 0.4s ease, color 0.4s ease;
}

/* 主题配色定义 */
.theme-light {
  background-color: #ffffff;
  color: #333333;
  --bar-bg: rgba(255, 255, 255, 0.85);
  --bar-border: rgba(0, 0, 0, 0.05);
  --btn-hover: rgba(0, 0, 0, 0.05);
  --sidebar-bg: #ffffff;
  --accent: #3b82f6;
}

.theme-sepia {
  background-color: #fbf0d9;
  color: #5f4b32;
  --bar-bg: rgba(251, 240, 217, 0.9);
  --bar-border: rgba(95, 75, 50, 0.1);
  --btn-hover: rgba(95, 75, 50, 0.08);
  --sidebar-bg: #fbf0d9;
  --accent: #8d6e63;
}

.theme-dark {
  background-color: #1a1a1a;
  color: #cecece;
  --bar-bg: rgba(26, 26, 26, 0.85);
  --bar-border: rgba(255, 255, 255, 0.1);
  --btn-hover: rgba(255, 255, 255, 0.1);
  --sidebar-bg: #262626;
  --accent: #60a5fa;
}

/* 布局区域 */
.reader-viewport {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.book-area {
  width: 100%;
  height: 100%;
}

/* 顶部与底部控制栏 (Glassmorphism) */
.control-bar {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 50;
  padding: 0 24px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background-color: var(--bar-bg);
  border-bottom: 1px solid var(--bar-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.top-bar {
  top: 0;
  height: 56px;
}

.bottom-bar {
  bottom: 0;
  height: auto;
  min-height: 80px;
  flex-direction: column;
  padding: 16px 24px;
  border-top: 1px solid var(--bar-border);
  border-bottom: none;
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.05);
}

.bar-left, .bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.book-title {
  font-weight: 600;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* 按钮样式 */
.icon-btn {
  background: transparent;
  border: none;
  color: inherit;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.icon-btn:hover {
  background-color: var(--btn-hover);
}

/* 底部操作区 */
.slider-container {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  max-width: 600px;
}

.progress-slider {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(128,128,128,0.3);
  appearance: none;
}
.progress-slider::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
}

.time-text {
  font-size: 12px;
  opacity: 0.6;
}

.bottom-actions {
  display: flex;
  width: 100%;
  max-width: 600px;
  justify-content: space-between;
  align-items: center;
}

.action-btn {
  background: transparent;
  border: 1px solid var(--bar-border);
  color: inherit;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
}

.font-control {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--btn-hover);
  padding: 4px 12px;
  border-radius: 20px;
}

.font-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  font-weight: bold;
}
.font-btn.small { font-size: 14px; }
.font-btn.large { font-size: 20px; }
.font-val { font-size: 14px; opacity: 0.8; min-width: 30px; text-align: center; }

/* 侧边栏 */
.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 320px;
  background-color: var(--sidebar-bg);
  z-index: 100;
  box-shadow: -4px 0 24px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  color: inherit;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--bar-border);
}
.sidebar-header h3 { margin: 0; font-size: 18px; font-weight: 600; }

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: inherit;
  cursor: pointer;
  opacity: 0.5;
}
.close-btn:hover { opacity: 1; }

/* 搜索结果 */
.search-input-wrapper {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.search-input-wrapper input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--bar-border);
  background: rgba(128,128,128,0.1);
  color: inherit;
}
.search-btn {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0 16px;
  cursor: pointer;
}

.result-list { list-style: none; padding: 0; margin: 0; }
.result-list li {
  padding: 12px 0;
  border-bottom: 1px solid var(--bar-border);
  cursor: pointer;
}
.result-list li:hover { opacity: 0.8; }
.res-text { font-size: 14px; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;}
.res-text :deep(.highlight) { background-color: #fde047; color: #000; padding: 0 2px; border-radius: 2px; }
.res-cfi { font-size: 10px; opacity: 0.5; text-transform: uppercase; }

/* 目录 */
.toc-list { list-style: none; padding: 0; }
.toc-list li {
  padding: 12px 8px;
  border-bottom: 1px solid var(--bar-border);
  cursor: pointer;
  font-size: 15px;
  transition: color 0.2s;
}
.toc-list li:hover { background: var(--btn-hover); }
.toc-list li.active { color: var(--accent); font-weight: 600; }

/* 微型常驻信息 */
.mini-info {
  position: fixed;
  bottom: 12px;
  left: 16px;
  font-size: 11px;
  opacity: 0.5;
  pointer-events: none;
  z-index: 40;
  font-family: monospace;
}

/* 遮罩与加载 */
.loading-mask {
  position: absolute;
  inset: 0;
  background: inherit;
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(128,128,128,0.2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.brightness-overlay {
  position: fixed; inset: 0; background: #000; pointer-events: none; z-index: 999;
}

/* Vue Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-down-enter-active, .slide-down-leave-active { transition: transform 0.3s ease, opacity 0.3s; }
.slide-down-enter-from, .slide-down-leave-to { transform: translateY(-100%); opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s ease, opacity 0.3s; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }

.drawer-enter-active, .drawer-leave-active { transition: transform 0.3s ease; }
.drawer-enter-from, .drawer-leave-to { transform: translateX(100%); }
</style>