<template>
  <div class="foliate-reader">
    <!-- 错误显示 -->
    <div v-if="error" class="error-display">
      <div class="error-icon">📚</div>
      <h3>加载失败</h3>
      <p>{{ error }}</p>
      <button @click="initialize" class="retry-btn">重试</button>
    </div>

    <!-- 阅读器容器 -->
    <div
      v-show="!error"
      ref="viewerRef"
      class="foliate-viewer"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import localforage from 'localforage'

// Props
const props = defineProps<{
  bookId: string
  theme: 'light' | 'sepia' | 'green' | 'dark'
  fontSize: number
  lineHeight: number
  initialProgress?: number
}>()

// Emits
const emit = defineEmits<{
  ready: [data: { chapters: any[] }]
  'progress-change': [data: { progress: number; currentPage: number; totalPages: number; cfi?: string }]
  'chapter-change': [data: { index: number; title: string }]
  click: []
}>()

// 状态
const viewerRef = ref<HTMLElement | null>(null)
const view = ref<any>(null)
const isReady = ref(false)
const error = ref('')

// 章节信息
const chapters = ref<any[]>([])
const currentChapterIndex = ref(0)
const currentChapterTitle = ref('')

// 进度信息
const progress = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)

const relocateListener = (e: any) => handleRelocate(e.detail)
const loadListener = (e: any) => handleLoad(e.detail.doc, e.detail.index)

const cleanupView = () => {
  if (viewerRef.value && (viewerRef.value as any)._wheelHandler) {
    viewerRef.value.removeEventListener('wheel', (viewerRef.value as any)._wheelHandler)
    delete (viewerRef.value as any)._wheelHandler
  }
  if (viewerRef.value && (viewerRef.value as any)._clickHandler) {
    viewerRef.value.removeEventListener('click', (viewerRef.value as any)._clickHandler, true)
    delete (viewerRef.value as any)._clickHandler
  }

  if (view.value) {
    try {
      view.value.removeEventListener?.('relocate', relocateListener)
      view.value.removeEventListener?.('load', loadListener)
    } catch { }
    try {
      view.value.close?.()
    } catch { }
    try {
      view.value.remove?.()
    } catch { }
    view.value = null
  }
}

// 主题配置
const themeColors = {
  light: { background: '#ffffff', color: '#2c3e50' },
  sepia: { background: '#f4ecd8', color: '#5b4636' },
  green: { background: '#e8f5e9', color: '#2d5a3d' },
  dark: { background: '#1a1a1a', color: '#e2e8f0' }
}

// 初始化
const initialize = async () => {
  error.value = ''
  isReady.value = false

  if (!viewerRef.value) {
    error.value = '容器元素不存在'
    return
  }

  try {
    cleanupView()
    console.log('📚 开始加载书籍...')
    
    // 加载书籍内容
    const content = await localforage.getItem<ArrayBuffer>(`ebook_content_${props.bookId}`)
    if (!content) {
      error.value = '书籍内容不存在，请重新导入'
      return
    }

    console.log('📚 书籍内容加载完成，大小:', content.byteLength)

    // 转换为 File 对象
    const file = new File([content], 'book.epub', { type: 'application/epub+zip' })
    console.log('📦 File 对象创建完成')

    // 动态导入 Foliate-js
    console.log('📥 开始导入 Foliate 库...')
    const { View } = await import('@ray-d-song/foliate-js/view.js')
    console.log('✅ Foliate 库导入完成')

    // 创建视图元素
    view.value = document.createElement('foliate-view')
    console.log('🎨 视图元素创建完成')
    
    // 监听事件
    view.value.addEventListener('relocate', relocateListener)
    view.value.addEventListener('load', loadListener)
    console.log('👂 事件监听器已添加')

    // 添加到容器
    viewerRef.value.appendChild(view.value)
    console.log('📍 视图已添加到容器')

    // 打开书籍
    console.log('📖 开始打开书籍...')
    await view.value.open(file)
    console.log('✅ 书籍打开完成')

    // 初始化视图（不跳转到初始进度，让它自然加载）
    console.log('🚀 开始初始化视图...')
    await view.value.init({
      lastLocation: null, // 先不跳转，等加载完成后再跳转
      showTextStart: false
    })
    console.log('✅ 视图初始化完成')

    // 应用主题和样式
    applyTheme()
    console.log('🎨 主题已应用')

    // 添加点击事件监听到 Foliate 内部
    addClickListener()
    console.log('👆 点击监听器已添加')

    isReady.value = true
    console.log('✅ Foliate 阅读器初始化完成')
    
    // 延迟跳转到初始进度，避免阻塞初始化
    if (props.initialProgress && props.initialProgress > 0) {
      setTimeout(() => {
        console.log('⏩ 跳转到初始进度:', props.initialProgress)
        goToProgress(props.initialProgress)
      }, 500)
    }

  } catch (err) {
    console.error('❌ 初始化失败:', err)
    error.value = err instanceof Error ? err.message : '未知错误'
  }
}

// 章节加载完成
const handleLoad = (doc: Document, index: number) => {
  console.log('📄 章节加载:', index)

  try {
    const styleEl = doc.getElementById('neat-reader-foliate-style') as HTMLStyleElement | null
    if (!styleEl) {
      const style = doc.createElement('style')
      style.id = 'neat-reader-foliate-style'
      style.textContent = `
        html, body {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        body {
          box-sizing: border-box !important;
        }
        * {
          max-width: none !important;
        }
        img, svg, video, canvas, table, pre, code {
          max-width: 100% !important;
          height: auto !important;
        }
      `
      doc.head.appendChild(style)
    }
  } catch (e) {
    console.warn('⚠️ 章节样式注入失败:', e)
  }
  
  // 第一次加载时获取目录
  if (index === 0 && view.value?.book?.toc) {
    chapters.value = view.value.book.toc.map((item: any) => ({
      label: item.label,
      href: item.href
    }))
    
    emit('ready', { chapters: chapters.value })
  }
}

// 位置变化
const handleRelocate = (location: any) => {
  console.log('📍 位置变化:', location)
  
  // 提取可序列化的数据，避免 IndexedDB 克隆错误
  const { section, fraction, tocItem, cfi } = location
  
  // 更新章节（确保 section 是数字）
  if (section !== undefined) {
    const sectionIndex = typeof section === 'number' ? section : (typeof section === 'object' && section.current !== undefined ? section.current : 0)
    
    if (sectionIndex !== currentChapterIndex.value) {
      currentChapterIndex.value = sectionIndex
      currentChapterTitle.value = tocItem?.label || chapters.value[sectionIndex]?.label || ''
      
      emit('chapter-change', {
        index: sectionIndex,
        title: currentChapterTitle.value
      })
    }
  }
  
  // 更新进度
  if (fraction !== undefined) {
    progress.value = Math.round(fraction * 100)
  }
  
  // 发送进度变化事件（只传递可序列化的数据）
  emit('progress-change', {
    progress: progress.value,
    currentPage: currentPage.value,
    totalPages: totalPages.value,
    cfi: cfi || '' // 传递 CFI 用于保存位置
  })
}

// 应用主题
const applyTheme = () => {
  if (!view.value?.renderer) return

  const colors = themeColors[props.theme]
  
  // 设置分页模式 - 强制单列
  view.value.renderer.setAttribute('flow', 'paginated')
  view.value.renderer.setAttribute('gap', '0')
  view.value.renderer.setAttribute('max-column-count', '1')
  view.value.renderer.setAttribute('margin', '40 60 40 60')
  
  // 使用正确的 CSS 变量名（带下划线前缀）
  view.value.renderer.style.setProperty('--_gap', '0')
  view.value.renderer.style.setProperty('--_max-column-count', '1')
  view.value.renderer.style.setProperty('--_margin', '40 60 40 60')
  view.value.renderer.style.setProperty('--_max-column-width', '100%')
  view.value.renderer.style.setProperty('--_column-width', '100%')
  
  // 应用主题颜色
  view.value.renderer.style.setProperty('--bg', colors.background)
  view.value.renderer.style.setProperty('--fg', colors.color)
  
  // 应用字体大小和行高
  view.value.renderer.style.fontSize = `${props.fontSize}px`
  view.value.renderer.style.lineHeight = `${props.lineHeight}`
  
  // 设置内容宽度占满（通过 CSS 变量）
  view.value.renderer.style.setProperty('--inline-padding', '60px') // 左右60px
  view.value.renderer.style.setProperty('--block-padding', '40px') // 上下40px
  view.value.renderer.style.setProperty('--inline-start', '60px')
  view.value.renderer.style.setProperty('--inline-end', '60px')
  
  // 设置最大内容宽度为 100%（关键：控制列宽）
  view.value.renderer.style.setProperty('--max-inline-size', '100%')
  view.value.renderer.style.setProperty('--max-block-size', '100%')
  
  // 强制单列布局
  view.value.renderer.style.columns = '1'
  view.value.renderer.style.columnCount = '1'
  view.value.renderer.style.columnWidth = 'auto'
  
  // 强制设置容器宽度
  view.value.renderer.style.width = '100%'
  view.value.renderer.style.maxWidth = 'none'
  view.value.renderer.style.padding = '40px 60px' // 上下40px 左右60px
  view.value.renderer.style.margin = '0'
  view.value.renderer.style.boxSizing = 'border-box'
  
  // 尝试直接修改 Shadow DOM 内的样式
  setTimeout(() => {
    try {
      // 获取 Shadow Root
      const shadowRoot = view.value.renderer.shadowRoot
      if (shadowRoot) {
        // 移除旧的样式（如果存在）
        const oldStyle = shadowRoot.querySelector('#custom-width-style')
        if (oldStyle) oldStyle.remove()
        
        // 注入自定义样式
        const style = document.createElement('style')
        style.id = 'custom-width-style'
        style.textContent = `
          :host {
            width: 100% !important;
            max-width: none !important;
            padding: 10px 20px !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
          * {
            max-width: none !important;
          }
          /* 隐藏页眉和页脚 */
          #header,
          #footer {
            display: none !important;
          }
          /* 强制单列布局 - 隐藏多余的列 */
          .paginated {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .column {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            flex: 1 1 100% !important;
          }
          /* 隐藏第一个和第三个列（只保留中间的） */
          .column:first-child,
          .column:last-child {
            display: none !important;
          }
          /* 如果只有一个列，显示它 */
          .column:only-child {
            display: block !important;
          }
          .view, .viewport, .container {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* 隐藏可能的空白占位元素 */
          .header, .footer, .spacer, .placeholder {
            display: none !important;
          }
        `
        shadowRoot.appendChild(style)
        console.log('✅ Shadow DOM 样式已注入（Grid 单列布局）')
        
        // 直接查找并隐藏 header 和 footer 元素
        setTimeout(() => {
          const header = shadowRoot.querySelector('#header')
          const footer = shadowRoot.querySelector('#footer')
          if (header) {
            header.style.display = 'none'
            header.style.visibility = 'hidden'
            header.style.height = '0'
            console.log('✅ Header 已隐藏')
          }
          if (footer) {
            footer.style.display = 'none'
            footer.style.visibility = 'hidden'
            footer.style.height = '0'
            console.log('✅ Footer 已隐藏')
          }
        }, 200)
        
        // 调试：打印 Shadow DOM 结构
        console.log('🔍 Shadow DOM 结构:', shadowRoot.innerHTML.substring(0, 500))
      }
    } catch (err) {
      console.warn('⚠️ 无法访问 Shadow DOM:', err)
    }
  }, 100)
  
  console.log('🎨 主题配置:', {
    flow: 'paginated',
    margin: '10 20',
    fontSize: props.fontSize,
    lineHeight: props.lineHeight
  })
}

// 添加点击监听器到 Foliate 内部
const addClickListener = () => {
  if (!viewerRef.value) return

  const handleContainerClick = (e: MouseEvent) => {
    console.log('🖱️ 检测到点击事件')
    
    // 获取事件路径（包括 Shadow DOM）
    const path = (e.composedPath ? e.composedPath() : []) as any[]
    console.log('📍 事件路径长度:', path.length)

    // 检查是否点击了链接
    for (const node of path) {
      if (node && node.tagName === 'A') {
        console.log('🔗 点击了链接，不触发')
        return
      }
      if (node && typeof node.closest === 'function' && node.closest('a')) {
        console.log('🔗 点击了链接内部，不触发')
        return
      }
    }

    // 检查文本选择
    const targetNode = (path[0] || e.target) as any
    const ownerDoc = (targetNode && targetNode.ownerDocument) ? targetNode.ownerDocument : document
    const selection = ownerDoc.getSelection ? ownerDoc.getSelection() : window.getSelection()
    const selectedText = selection ? selection.toString() : ''
    
    if (selectedText && selectedText.length > 0) {
      console.log('🔤 有选中文本，不触发')
      return
    }

    console.log('✅ 触发控制栏切换')
    emit('click')
  }

  viewerRef.value.addEventListener('click', handleContainerClick, true)
  ;(viewerRef.value as any)._clickHandler = handleContainerClick
  
  console.log('✅ 点击监听器已绑定到 viewerRef')
}

// 翻页
const nextPage = async () => {
  if (!view.value) return
  console.log('👉 下一页')
  await view.value.next()
}

const prevPage = async () => {
  if (!view.value) return
  console.log('👈 上一页')
  await view.value.prev()
}

// 跳转到进度
const goToProgress = async (targetProgress: number) => {
  if (!view.value) return

  try {
    const fraction = targetProgress / 100
    await view.value.goToFraction(fraction)
  } catch (err) {
    console.error('跳转失败:', err)
  }
}

// 跳转到章节
const goToChapter = async (index: number) => {
  if (!view.value || index < 0 || index >= chapters.value.length) return

  try {
    await view.value.goTo(index)
  } catch (err) {
    console.error('跳转章节失败:', err)
  }
}

// 获取当前位置
const getCurrentLocation = () => {
  if (!view.value?.lastLocation) return null
  
  // 只返回可序列化的数据
  const { cfi, fraction } = view.value.lastLocation
  
  return {
    progress: progress.value,
    chapterIndex: currentChapterIndex.value,
    cfi: cfi || '',
    fraction: fraction || 0,
    start: {
      cfi: cfi || ''
    }
  }
}

// 点击处理（已废弃，改用 addClickListener）
// const handleClick = (e: MouseEvent) => {
//   // 此函数已不再使用
// }

// 监听主题变化
watch(() => props.theme, () => {
  applyTheme()
})

// 监听字体大小变化
watch(() => props.fontSize, () => {
  if (view.value?.renderer) {
    view.value.renderer.style.fontSize = `${props.fontSize}px`
  }
})

// 监听行高变化
watch(() => props.lineHeight, () => {
  if (view.value?.renderer) {
    view.value.renderer.style.lineHeight = `${props.lineHeight}`
  }
})

// 生命周期
onMounted(async () => {
  await initialize()
  
  // 添加滚轮事件监听
  const handleWheel = (e: WheelEvent) => {
    if (!view.value) return
    
    // 阻止默认滚动行为
    e.preventDefault()
    e.stopPropagation()
    
    // 根据滚动方向翻页
    if (e.deltaY > 0) {
      // 向下滚动 = 下一页
      nextPage()
    } else if (e.deltaY < 0) {
      // 向上滚动 = 上一页
      prevPage()
    }
  }
  
  // 添加滚轮监听到整个容器（使用 passive: false 以便可以阻止默认行为）
  if (viewerRef.value) {
    viewerRef.value.addEventListener('wheel', handleWheel, { passive: false })
    console.log('✅ 滚轮翻页监听已添加')
    
    // 保存引用以便清理
    ;(viewerRef.value as any)._wheelHandler = handleWheel
  }
})

onBeforeUnmount(() => {
  cleanupView()
  console.log('🧹 Foliate 视图已清理')
})

// 暴露方法
defineExpose({
  nextPage,
  prevPage,
  goToProgress,
  goToChapter,
  getCurrentLocation
})
</script>

<style scoped>
.foliate-reader {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.foliate-viewer {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 40px 60px; /* 上下40px 左右60px */
  box-sizing: border-box;
}

.error-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
  color: #666;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.error-display h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 18px;
}

.error-display p {
  margin: 0 0 20px 0;
  color: #666;
  max-width: 400px;
  line-height: 1.5;
}

.retry-btn {
  padding: 10px 24px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background: #357abd;
}

/* Foliate 渲染器样式 */
.foliate-viewer :deep(foliate-view) {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
}

/* 隐藏页眉和页脚 */
.foliate-viewer :deep(#header),
.foliate-viewer :deep(#footer) {
  display: none !important;
}

.foliate-viewer :deep(foliate-paginator),
.foliate-viewer :deep(foliate-fxl) {
  width: 100% !important;
  height: 100% !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
}

/* 强制单列布局 - 隐藏多余的列 */
.foliate-viewer :deep(.paginated) {
  display: flex !important;
  flex-direction: row !important;
  columns: 1 !important;
  column-count: 1 !important;
  width: 100% !important;
  max-width: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

.foliate-viewer :deep(.column) {
  width: 100% !important;
  max-width: none !important;
  padding: 0 !important;
  margin: 0 !important;
  display: block !important;
  flex: 1 1 100% !important;
}

/* 隐藏第一个和最后一个列（只保留中间的内容列） */
.foliate-viewer :deep(.column:first-child),
.foliate-viewer :deep(.column:last-child) {
  display: none !important;
}

/* 如果只有一个列，确保显示它 */
.foliate-viewer :deep(.column:only-child) {
  display: block !important;
}

/* 移除默认的页边距 */
.foliate-viewer :deep(iframe) {
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  max-width: none !important;
}

/* 强制覆盖所有可能的容器宽度限制 */
.foliate-viewer :deep(*) {
  max-width: none !important;
}

.foliate-viewer :deep(.view),
.foliate-viewer :deep(.viewport),
.foliate-viewer :deep(.container) {
  width: 100% !important;
  max-width: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* 针对 Web Components 的样式穿透 */
.foliate-viewer >>> * {
  max-width: none !important;
}

.foliate-viewer >>> .paginated {
  grid-template-columns: 1fr !important;
}

.foliate-viewer >>> .column {
  width: 100% !important;
  max-width: none !important;
  grid-column: 1 / -1 !important;
}

/* 使用 part 属性（如果 Foliate 支持） */
.foliate-viewer::part(view),
.foliate-viewer::part(viewport),
.foliate-viewer::part(container) {
  width: 100% !important;
  max-width: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

</style>
