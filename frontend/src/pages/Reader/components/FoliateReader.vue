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
  initialCfi?: string // 添加 CFI 支持
}>()

// Emits
const emit = defineEmits<{
  ready: [data: { chapters: any[] }]
  'progress-change': [data: { progress: number; currentPage: number; totalPages: number; cfi?: string }]
  'chapter-change': [data: { index: number; title: string }]
  click: []
  'text-selected': [data: { text: string; position: { x: number; y: number } }]
}>()

// 状态
const viewerRef = ref<HTMLElement | null>(null)
const view = ref<any>(null)
const isReady = ref(false)
const error = ref('')

// 缓存书籍内容和 File 对象
const cachedBookContent = ref<ArrayBuffer | null>(null)
const cachedBookFile = ref<File | null>(null)
const cachedBookId = ref<string>('')

// 章节信息
const chapters = ref<any[]>([])
const currentChapterIndex = ref(0)
const currentChapterTitle = ref('')

// 缓存当前加载的章节 documents（用于 TTS 和样式更新）
const loadedDocs = ref<Map<number, Document>>(new Map())

// 进度信息
const progress = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)

// 存储当前可见章节的文本内容
const currentChapterTexts = ref<Map<number, string>>(new Map())

const relocateListener = (e: any) => handleRelocate(e.detail)
const loadListener = (e: any) => handleLoad(e.detail.doc, e.detail.index)

const bindDocClickForwarding = (doc: Document) => {
  const docAny = doc as any
  if (docAny._neatReaderClickForwarder) return

  const handler = (e: MouseEvent) => {
    // 忽略链接点击
    const target = e.target as HTMLElement | null
    if (target?.closest?.('a')) return

    // 忽略文本选择
    const selection = doc.getSelection ? doc.getSelection() : window.getSelection()
    const selectedText = selection ? selection.toString() : ''
    if (selectedText && selectedText.length > 0) return

    emit('click')
  }

  doc.addEventListener('click', handler, true)
  docAny._neatReaderClickForwarder = handler
}

// 绑定文本选择监听
const bindDocSelectionListener = (doc: Document) => {
  const docAny = doc as any
  if (docAny._neatReaderSelectionListener) return

  const handler = () => {
    const selection = doc.getSelection ? doc.getSelection() : window.getSelection()
    if (!selection) return

    const selectedText = selection.toString().trim()
    if (!selectedText || selectedText.length === 0) return

    // 获取选中文本的位置
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    
    // 获取 iframe 的位置偏移
    const iframe = (doc as any).defaultView?.frameElement
    let offsetX = 0
    let offsetY = 0
    
    if (iframe) {
      const iframeRect = iframe.getBoundingClientRect()
      offsetX = iframeRect.left
      offsetY = iframeRect.top
    }

    // 计算相对于视口的位置
    const position = {
      x: rect.left + offsetX + rect.width / 2,
      y: rect.bottom + offsetY
    }

    emit('text-selected', { text: selectedText, position })
  }

  doc.addEventListener('mouseup', handler)
  doc.addEventListener('touchend', handler)
  docAny._neatReaderSelectionListener = handler
}

// 绑定 iframe 内滚轮事件转发（用于滚轮翻页）
const bindDocWheelForwarding = (doc: Document) => {
  const docAny = doc as any
  if (docAny._neatReaderWheelForwarder) return

  const handler = (e: WheelEvent) => {
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

  doc.addEventListener('wheel', handler, { passive: false, capture: true })
  docAny._neatReaderWheelForwarder = handler
}

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
  dark: { background: '#1a1a1a', color: '#e8e8e8' }
}

// 初始化
const initialize = async () => {
  error.value = ''
  
  // 如果已经初始化且是同一本书，只需要恢复位置
  if (isReady.value && view.value && cachedBookId.value === props.bookId) {
    console.log('✅ [Foliate] 阅读器已初始化，跳过重新加载')
    
    // 如果有新的 CFI，跳转到新位置
    if (props.initialCfi) {
      await goToCfi(props.initialCfi)
    } else if (props.initialProgress && props.initialProgress > 0) {
      await goToProgress(props.initialProgress)
    }
    
    return
  }
  
  isReady.value = false

  if (!viewerRef.value) {
    error.value = '容器元素不存在'
    return
  }

  try {
    cleanupView()
    
    // 检查缓存：如果是同一本书且已缓存，直接使用
    let file: File
    if (cachedBookId.value === props.bookId && cachedBookFile.value) {
      console.log('✅ [Foliate] 使用缓存的书籍内容')
      file = cachedBookFile.value
    } else {
      console.log('📖 [Foliate] 从 IndexedDB 加载书籍内容')
      // 加载书籍内容
      const content = await localforage.getItem<ArrayBuffer>(`ebook_content_${props.bookId}`)
      if (!content) {
        error.value = '书籍内容不存在，请重新导入'
        return
      }

      // 转换为 File 对象并缓存
      file = new File([content], 'book.epub', { type: 'application/epub+zip' })
      cachedBookContent.value = content
      cachedBookFile.value = file
      cachedBookId.value = props.bookId
      console.log('✅ [Foliate] 书籍内容已缓存')
    }

    // 动态导入 Foliate-js
    const { View } = await import('@ray-d-song/foliate-js/view.js')

    // 创建视图元素
    view.value = document.createElement('foliate-view')
    
    // 监听事件
    view.value.addEventListener('relocate', relocateListener)
    view.value.addEventListener('load', loadListener)

    // 添加到容器
    viewerRef.value.appendChild(view.value)

    // 打开书籍
    await view.value.open(file)

    // 初始化视图 - 如果有 CFI，使用 CFI 恢复；否则使用百分比
    let lastLocation = null
    if (props.initialCfi) {
      // 构建完整的 location 对象
      lastLocation = {
        cfi: props.initialCfi,
        fraction: props.initialProgress ? props.initialProgress / 100 : 0,
        location: props.initialProgress || 0,
        tocItem: null,
        section: null
      }
      console.log('📍 [Foliate] 准备使用 CFI 恢复:', lastLocation)
    }
    
    await view.value.init({
      lastLocation: lastLocation,
      showTextStart: !lastLocation // 如果没有保存位置，显示开头
    })

    // 应用主题和样式
    applyTheme()

    // 添加点击事件监听到 Foliate 内部
    addClickListener()

    isReady.value = true
    console.log('✅ [Foliate] 阅读器初始化完成')
    
    // 获取目录并触发 ready 事件
    if (view.value?.book?.toc) {
      chapters.value = view.value.book.toc.map((item: any) => ({
        label: item.label,
        href: item.href
      }))
      console.log('📚 [Foliate] 目录加载完成，章节数:', chapters.value.length)
    }
    
    // 立即触发 ready 事件，不要等待章节加载
    emit('ready', { chapters: chapters.value })
    
    // 如果没有 CFI 但有百分比进度，延迟跳转
    if (!props.initialCfi && props.initialProgress && props.initialProgress > 0) {
      setTimeout(() => {
        console.log('📍 [Foliate] 使用百分比恢复进度:', props.initialProgress)
        goToProgress(props.initialProgress)
      }, 500)
    } else if (props.initialCfi) {
      console.log('✅ [Foliate] CFI 恢复已应用')
    } else {
      // 即使没有初始进度，也要等待一下让第一个章节加载
      setTimeout(() => {
        console.log('✅ [Foliate] 初始章节已加载')
      }, 300)
    }

  } catch (err) {
    console.error('❌ [Foliate] 初始化失败:', err)
    error.value = err instanceof Error ? err.message : '未知错误'
  }
}

// 章节加载完成
const handleLoad = (doc: Document, index: number) => {
  console.log('📄 [章节加载]', index)

  // 缓存文档对象
  loadedDocs.value.set(index, doc)

  // 保存章节文本内容（用于 TTS）
  try {
    const bodyText = doc.body?.innerText || doc.body?.textContent || ''
    if (bodyText.trim()) {
      currentChapterTexts.value.set(index, bodyText.trim())
      console.log(`📝 [章节文本] 章节 ${index} 文本长度:`, bodyText.trim().length)
    }
  } catch (e) {
    console.warn('⚠️ [章节文本] 保存失败:', e)
  }

  try {
    const styleEl = doc.getElementById('neat-reader-foliate-style') as HTMLStyleElement | null
    const colors = themeColors[props.theme]
    
    if (!styleEl) {
      const style = doc.createElement('style')
      style.id = 'neat-reader-foliate-style'
      style.textContent = `
        html, body {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          font-size: ${props.fontSize}px !important;
          line-height: ${props.lineHeight} !important;
          background: ${colors.background} !important;
          color: ${colors.color} !important;
        }
        body {
          box-sizing: border-box !important;
        }
        * {
          max-width: none !important;
        }
        p, div, span, li, td, th, h1, h2, h3, h4, h5, h6, a {
          font-size: inherit !important;
          line-height: inherit !important;
          color: ${colors.color} !important;
        }
        img, svg, video, canvas, table, pre, code {
          max-width: 100% !important;
          height: auto !important;
        }
      `
      doc.head.appendChild(style)
      console.log('✅ [样式] 字号:', props.fontSize, '行高:', props.lineHeight, '主题:', props.theme)
    } else {
      // 更新已存在的样式（用于响应字号/行高/主题变化）
      styleEl.textContent = `
        html, body {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          font-size: ${props.fontSize}px !important;
          line-height: ${props.lineHeight} !important;
          background: ${colors.background} !important;
          color: ${colors.color} !important;
        }
        body {
          box-sizing: border-box !important;
        }
        * {
          max-width: none !important;
        }
        p, div, span, li, td, th, h1, h2, h3, h4, h5, h6, a {
          font-size: inherit !important;
          line-height: inherit !important;
          color: ${colors.color} !important;
        }
        img, svg, video, canvas, table, pre, code {
          max-width: 100% !important;
          height: auto !important;
        }
      `
    }
  } catch (e) {
    console.warn('⚠️ [样式] 注入失败:', e)
  }

  // 将 iframe 内点击转发到外层，用于切换控制栏显示/隐藏
  try {
    bindDocClickForwarding(doc)
  } catch (e) {
    console.warn('⚠️ [点击] 转发绑定失败:', e)
  }

  // 将 iframe 内滚轮事件转发到外层，用于滚轮翻页
  try {
    bindDocWheelForwarding(doc)
  } catch (e) {
    console.warn('⚠️ [滚轮] 转发绑定失败:', e)
  }

  // 绑定文本选择监听
  try {
    bindDocSelectionListener(doc)
  } catch (e) {
    console.warn('⚠️ [文本选择] 监听绑定失败:', e)
  }
  
  // 如果是当前章节，触发文本更新
  if (index === currentChapterIndex.value) {
    console.log('✅ [章节加载] 当前章节已加载，可以获取文本')
  }
}

// 位置变化
const handleRelocate = (location: any) => {
  // 提取可序列化的数据，避免 IndexedDB 克隆错误
  const { section, fraction, tocItem, cfi, range, index, total } = location
  
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
  
  // 更新页数信息（从 location 对象中提取）
  if (range) {
    // range 包含当前页和总页数信息
    currentPage.value = (range.current || 0) + 1 // Foliate 从 0 开始计数
    totalPages.value = range.total || 1
  } else if (index !== undefined && total !== undefined) {
    // 备用方案：使用 index 和 total
    currentPage.value = index + 1
    totalPages.value = total
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
  view.value.renderer.setAttribute('margin', '0')
  
  // 使用正确的 CSS 变量名（带下划线前缀）
  view.value.renderer.style.setProperty('--_gap', '0')
  view.value.renderer.style.setProperty('--_max-column-count', '1')
  view.value.renderer.style.setProperty('--_margin', '0')
  view.value.renderer.style.setProperty('--_max-column-width', '100%')
  view.value.renderer.style.setProperty('--_column-width', '100%')
  
  // 应用主题颜色
  view.value.renderer.style.setProperty('--bg', colors.background)
  view.value.renderer.style.setProperty('--fg', colors.color)
  
  // 应用字体大小和行高（使用 CSS 变量传递到 iframe 内）
  view.value.renderer.style.setProperty('--user-font-size', `${props.fontSize}px`)
  view.value.renderer.style.setProperty('--user-line-height', `${props.lineHeight}`)
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
        
        // 直接查找并隐藏 header 和 footer 元素
        setTimeout(() => {
          const header = shadowRoot.querySelector('#header')
          const footer = shadowRoot.querySelector('#footer')
          if (header) {
            header.style.display = 'none'
            header.style.visibility = 'hidden'
            header.style.height = '0'
          }
          if (footer) {
            footer.style.display = 'none'
            footer.style.visibility = 'hidden'
            footer.style.height = '0'
          }
        }, 200)
      }
    } catch (err) {
      console.warn('⚠️ 无法访问 Shadow DOM:', err)
    }
  }, 100)
}

// 添加点击监听器到 Foliate 内部
const addClickListener = () => {
  if (!viewerRef.value) return

  const handleContainerClick = (e: MouseEvent) => {
    // 获取事件路径（包括 Shadow DOM）
    const path = (e.composedPath ? e.composedPath() : []) as any[]

    // 检查是否点击了链接
    for (const node of path) {
      if (node && node.tagName === 'A') {
        return
      }
      if (node && typeof node.closest === 'function' && node.closest('a')) {
        return
      }
    }

    // 检查文本选择
    const targetNode = (path[0] || e.target) as any
    const ownerDoc = (targetNode && targetNode.ownerDocument) ? targetNode.ownerDocument : document
    const selection = ownerDoc.getSelection ? ownerDoc.getSelection() : window.getSelection()
    const selectedText = selection ? selection.toString() : ''
    
    if (selectedText && selectedText.length > 0) {
      return
    }

    emit('click')
  }

  viewerRef.value.addEventListener('click', handleContainerClick, true)
  ;(viewerRef.value as any)._clickHandler = handleContainerClick
}

// 翻页
const nextPage = async () => {
  if (!view.value) return
  await view.value.next()
}

const prevPage = async () => {
  if (!view.value) return
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

// 跳转到 CFI
const goToCfi = async (cfi: string) => {
  if (!view.value || !cfi) return

  try {
    console.log('📍 [Foliate] 跳转到 CFI:', cfi)
    await view.value.goTo(cfi)
  } catch (err) {
    console.error('❌ [Foliate] CFI 跳转失败:', err)
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
  // 更新所有已加载章节的主题颜色
  updateAllIframeStyles()
  console.log('✅ [主题] 已应用到所有 iframe')
})

// 监听字体大小变化
watch(() => props.fontSize, (newSize, oldSize) => {
  console.log('📏 [字号变化]', oldSize, '→', newSize)
  if (view.value?.renderer) {
    view.value.renderer.style.setProperty('--user-font-size', `${props.fontSize}px`)
    view.value.renderer.style.fontSize = `${props.fontSize}px`
    
    // 更新所有已加载章节的样式
    updateAllIframeStyles()
    console.log('✅ [字号] 已应用到所有 iframe')
  }
})

// 监听行高变化
watch(() => props.lineHeight, (newHeight, oldHeight) => {
  console.log('📐 [行高变化]', oldHeight, '→', newHeight)
  if (view.value?.renderer) {
    view.value.renderer.style.setProperty('--user-line-height', `${props.lineHeight}`)
    view.value.renderer.style.lineHeight = `${props.lineHeight}`
    
    // 更新所有已加载章节的样式
    updateAllIframeStyles()
    console.log('✅ [行高] 已应用到所有 iframe')
  }
})

// 更新所有 iframe 的样式
const updateAllIframeStyles = () => {
  console.log('🔄 [样式更新] 开始更新所有已加载的章节')
  
  // 直接使用缓存的文档对象
  if (loadedDocs.value.size === 0) {
    console.log('⚠️ [样式更新] 没有已加载的章节文档')
    return
  }
  
  const colors = themeColors[props.theme]
  let updatedCount = 0
  
  loadedDocs.value.forEach((doc, index) => {
    try {
      const styleEl = doc.getElementById('neat-reader-foliate-style') as HTMLStyleElement | null
      if (styleEl) {
        styleEl.textContent = `
          html, body {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: ${props.fontSize}px !important;
            line-height: ${props.lineHeight} !important;
            background: ${colors.background} !important;
            color: ${colors.color} !important;
          }
          body {
            box-sizing: border-box !important;
          }
          * {
            max-width: none !important;
          }
          p, div, span, li, td, th, h1, h2, h3, h4, h5, h6, a {
            font-size: inherit !important;
            line-height: inherit !important;
            color: ${colors.color} !important;
          }
          img, svg, video, canvas, table, pre, code {
            max-width: 100% !important;
            height: auto !important;
          }
        `
        updatedCount++
        console.log(`✅ [样式更新] 章节 ${index} 已更新 (字号:${props.fontSize}, 行高:${props.lineHeight}, 主题:${props.theme})`)
      } else {
        console.log(`⚠️ [样式更新] 章节 ${index} 没有找到样式元素`)
      }
    } catch (e) {
      console.warn(`⚠️ [样式更新] 无法更新章节 ${index}:`, e)
    }
  })
  
  console.log(`✅ [样式更新] 共更新 ${updatedCount} 个章节`)
}

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
    
    // 保存引用以便清理
    ;(viewerRef.value as any)._wheelHandler = handleWheel
  }
})

// 获取当前页面文本（用于 TTS）
const getCurrentPageText = (): string => {
  //console.log('🔍 [TTS] 开始获取页面文本')
  //console.log('  - 当前章节索引:', currentChapterIndex.value)
  //console.log('  - 已缓存章节数:', loadedDocs.value.size)
  
  // 优先使用缓存的章节文本
  const cachedText = currentChapterTexts.value.get(currentChapterIndex.value)
  if (cachedText) {
    //console.log('✅ [TTS] 使用缓存的章节文本，长度:', cachedText.length, '前50字:', cachedText.substring(0, 50))
    return cachedText
  }
  
  // 如果没有缓存，尝试从文档对象获取
  const doc = loadedDocs.value.get(currentChapterIndex.value)
  if (doc) {
    try {
      const bodyText = doc.body?.innerText || doc.body?.textContent || ''
      const trimmedText = bodyText.trim()
      if (trimmedText) {
        // 缓存文本
        currentChapterTexts.value.set(currentChapterIndex.value, trimmedText)
        //console.log('✅ [TTS] 从文档对象获取文本，长度:', trimmedText.length, '前50字:', trimmedText.substring(0, 50))
        return trimmedText
      }
    } catch (e) {
      console.warn('⚠️ [TTS] 从文档对象获取文本失败:', e)
    }
  }
  
  console.log('⚠️ [TTS] 无法获取当前页面文本')
  return ''
}

onBeforeUnmount(() => {
  cleanupView()
})

// 暴露方法
defineExpose({
  nextPage,
  prevPage,
  goToProgress,
  goToCfi,
  goToChapter,
  getCurrentLocation,
  getCurrentPageText
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
.foliate-viewer :deep(*) {
  max-width: none !important;
}

.foliate-viewer :deep(.paginated) {
  grid-template-columns: 1fr !important;
}

.foliate-viewer :deep(.column) {
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
