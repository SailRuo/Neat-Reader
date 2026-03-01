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
import type { Annotation } from '../../../types/annotation'
import { createAnnotationOverlayer, type AnnotationOverlayer } from '../utils/annotationOverlayer'

// Props
const props = defineProps<{
  bookId: string
  theme: 'light' | 'sepia' | 'green' | 'dark'
  fontSize: number
  lineHeight: number
  initialProgress?: number
  initialCfi?: string // 添加 CFI 支持
  annotations?: Annotation[]
}>()

// Emits
const emit = defineEmits<{
  ready: [data: { chapters: any[] }]
  'progress-change': [data: { progress: number; currentPage: number; totalPages: number; cfi?: string }]
  'chapter-change': [data: { index: number; title: string }]
  click: []
  'text-selected': [data: { text: string; position: { x: number; y: number }; cfi?: string; chapterIndex?: number; chapterTitle?: string }]
  'annotation-click': [payload: { annotation: any; position?: { x: number; y: number } }]
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

let cfiFromRange: ((range: Range) => string) | null = null
let cfiToRange: ((doc: Document, cfi: string) => Range) | null = null
let epubCfiModule: {
  joinIndir?: (...cfis: string[]) => string
  fake?: { fromIndex: (index: number) => string }
} | null = null

const annotationOverlayers = ref<Map<number, AnnotationOverlayer>>(new Map())

const overlayRebuildTimers = new Map<number, number>()
const warnedAnnotationCfiErrors = new Set<string>()

const relocateListener = (e: any) => handleRelocate(e.detail)
const loadListener = (e: any) => handleLoad(e.detail.doc, e.detail.index)

const bindDocClickForwarding = (doc: Document) => {
  const docAny = doc as any
  if (docAny._neatReaderClickForwarder) return

  const handler = (e: MouseEvent) => {
    // 忽略链接点击
    const target = e.target as HTMLElement | null
    if (target?.closest?.('a')) return

    // 忽略注释点击（高亮/下划线/笔记）
    if (target?.closest?.('[data-annotation-id]')) return

    // 忽略文本选择
    const selection = doc.getSelection ? doc.getSelection() : window.getSelection()
    const selectedText = selection ? selection.toString() : ''
    if (selectedText && selectedText.length > 0) return

    emit('click')
  }

  doc.addEventListener('click', handler, true)
  docAny._neatReaderClickForwarder = handler
}

const rebuildAnnotationOverlay = (doc: Document, index: number) => {
  try {
    // 清理旧 overlay
    const old = annotationOverlayers.value.get(index)
    if (old) {
      if (old.element?.parentNode) {
        old.element.parentNode.removeChild(old.element)
      }
      if (typeof old.destroy === 'function') {
        old.destroy()
      }
    }
    annotationOverlayers.value.delete(index)

    const all = props.annotations || []
    const chapterAnnotations = all.filter(a => a.chapterIndex === index)

    console.log(`🎨 [Foliate] 正在为章节 ${index} 重建注释 overlay, 数量: ${chapterAnnotations.length}`)

    if (chapterAnnotations.length === 0) return

    const normalizeForSearch = (s: string) => s.replace(/\s+/g, ' ').trim()

    const findRangeByText = (targetText: string): Range | null => {
      const text = normalizeForSearch(targetText)
      if (!text) return null

      // 兜底策略：先用完整文本，找不到再用前 20 个字符
      const candidates = [text]
      if (text.length > 20) candidates.push(text.slice(0, 20))

      for (const needle of candidates) {
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
        let node: Node | null = walker.nextNode()
        while (node) {
          const raw = node.nodeValue || ''
          const hay = normalizeForSearch(raw)
          const idx = hay.indexOf(needle)
          if (idx >= 0) {
            // 注意：normalize 会改变索引，这里只做简单兜底：直接在原字符串里找 needle 的未归一化版本
            const rawIdx = raw.indexOf(needle)
            const start = rawIdx >= 0 ? rawIdx : 0
            const end = Math.min(start + needle.length, raw.length)
            const r = doc.createRange()
            try {
              r.setStart(node, start)
              r.setEnd(node, end)
              console.log('🧩 [注释] 已用文本匹配生成 Range 兜底')
              return r
            } catch (e) {
              // 继续尝试下一个节点
            }
          }
          node = walker.nextNode()
        }
      }

      return null
    }

    const overlayer = createAnnotationOverlayer(
      doc,
      chapterAnnotations,
      (annotation) => {
        const cfi = annotation.cfi || ''
        if (!cfiToRange) return findRangeByText(annotation.text || '')

        // 🎯 核心修复：验证 CFI 格式并转换
        let targetCfi = cfi
        if (cfi.includes('!')) {
          const parts = cfi.match(/!(\/.*)$/)
          if (parts && parts[1]) {
            targetCfi = `epubcfi(${parts[1]})`
            console.log(`🧪 [Foliate] 转换跨文档 CFI: ${cfi} -> ${targetCfi}`)
          }
        }

        if (!targetCfi.startsWith('epubcfi(')) {
          console.warn('⚠️ [注释] 无效的 CFI 格式:', targetCfi)
          return findRangeByText(annotation.text || '')
        }

        const buildAnnotationCfiCandidates = (wrappedCfi: string) => {
          const m = wrappedCfi.match(/^epubcfi\((.*)\)$/)
          if (!m) return [wrappedCfi]
          const inner = m[1]
          const parts = inner.split(',')
          if (parts.length < 2) return [wrappedCfi]

          const base = parts[0]
          const start = parts[1]
          const joinedInner = `${base}${start.startsWith('/') ? '' : '/'}${start}`
          const joinedPoint = `epubcfi(${joinedInner})`
          const baseStart = `epubcfi(${base},${start})`
          return Array.from(new Set([joinedPoint, baseStart, wrappedCfi]))
        }

        // 🎯 先尝试多种 CFI 形态，尽量避免直接走文本匹配
        const candidates = buildAnnotationCfiCandidates(targetCfi)
        let lastError: unknown = null
        for (const candidate of candidates) {
          try {
            // 🎯 核心修复：在调用 cfiToRange 前进行基础校验
            if (!doc || !candidate) continue

            const range = cfiToRange(doc, candidate)
            if (range && range.startContainer && range.endContainer) {
              return range
            }
          } catch (e) {
            lastError = e
          }
        }

        const warnKey = `${index}:${targetCfi}`
        if (!warnedAnnotationCfiErrors.has(warnKey)) {
          warnedAnnotationCfiErrors.add(warnKey)
          console.warn('⚠️ [注释] CFI 转换异常，将使用文本匹配兜底:', {
            cfi: targetCfi,
            error: lastError instanceof Error ? lastError.message : String(lastError)
          })
        }
        return findRangeByText(annotation.text || '')
      },
      handleAnnotationClick
    )

    doc.body?.appendChild(overlayer.element)
    annotationOverlayers.value.set(index, overlayer)
  } catch (e) {
    console.warn('⚠️ [注释] overlay 重建失败:', e)
  }
}

const rebuildAllAnnotationOverlays = () => {
  loadedDocs.value.forEach((doc, index) => {
    rebuildAnnotationOverlay(doc, index)
  })
}

const scheduleRebuildAnnotationOverlay = (index: number, delayMs = 250) => {
  const existing = overlayRebuildTimers.get(index)
  if (existing) window.clearTimeout(existing)

  const timer = window.setTimeout(() => {
    overlayRebuildTimers.delete(index)
    const doc = loadedDocs.value.get(index)
    if (doc) rebuildAnnotationOverlay(doc, index)
  }, delayMs)

  overlayRebuildTimers.set(index, timer)
}

// 绑定文本选择监听
const bindDocSelectionListener = (doc: Document, index: number) => {
  const docAny = doc as any
  if (docAny._neatReaderSelectionListener) return

  const handler = () => {
    const selection = doc.getSelection ? doc.getSelection() : window.getSelection()
    if (!selection) return

    const selectedText = selection.toString().trim()
    if (!selectedText || selectedText.length === 0) return

    // 获取选中文本的位置（iframe 内 rect 相对于 iframe 视口，需加上 iframe 偏移）
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const iframe = (doc as any).defaultView?.frameElement
    const offsetX = iframe ? iframe.getBoundingClientRect().left : 0
    const offsetY = iframe ? iframe.getBoundingClientRect().top : 0

    const position = {
      x: rect.left + offsetX + rect.width / 2,
      y: rect.bottom + offsetY
    }

    let cfi = ''
    try {
      if (cfiFromRange) {
        // 🎯 核心改进: 在当前章节文档上下文中生成 CFI
        cfi = cfiFromRange(range)
        
        // 🎯 关键修复: Foliate 生成的 CFI 可能包含章节外的路径 (如 epubcfi(/6/10...))
        // 但我们渲染时是在单章节 Document 中解析，需要提取章节内的相对路径
        if (cfi.includes('!')) {
          const parts = cfi.match(/!(\/.*)$/)
          if (parts && parts[1]) {
            cfi = `epubcfi(${parts[1]})`
            console.log(`🧪 [Foliate] 生成章节内相对 CFI: ${cfi}`)
          }
        } else {
          console.log(`🧪 [Foliate] 章节 ${index} 生成原始 CFI:`, cfi)
        }
      }
    } catch (e) {
      console.warn('⚠️ [文本选择] CFI 生成失败:', e)
    }

    // 🎯 传递章节索引和章节标题，用于笔记跳转
    emit('text-selected', { 
      text: selectedText, 
      position, 
      cfi,
      chapterIndex: index,
      chapterTitle: chapters.value[index]?.label || ''
    })
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

  // 清理注释 overlay
  annotationOverlayers.value.forEach(overlayer => {
    try {
      if (overlayer.element?.parentNode) {
        overlayer.element.parentNode.removeChild(overlayer.element)
      }
    } catch { }
  })
  annotationOverlayers.value.clear()

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
      await goToProgress(props.initialProgress ?? 0)
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

      // 🎯 核心修复: 解决 "Entity 'nbsp' not defined" 错误
      // 许多 EPUB 文件使用 &nbsp; 但未在 DTD 中定义，导致浏览器的 XML 解析器崩溃
      // 解决办法是预处理内容，将 &nbsp; 替换为实体的十六进制数值 &#160;
      let processedContent: ArrayBuffer = content
      try {
        const decoder = new TextDecoder('utf-8')
        const encoder = new TextEncoder()
        let text = decoder.decode(content)
        
        if (text.includes('&nbsp;')) {
          console.log('🧪 [Foliate] 检测到未定义的 &nbsp; 实体，进行预处理...')
          text = text.replace(/&nbsp;/g, '&#160;')
          processedContent = encoder.encode(text).buffer
        }
      } catch (e) {
        console.warn('⚠️ [Foliate] 内容预处理失败 (非 UTF-8 或二进制数据)，跳过替换:', e)
      }

      // 转换为 File 对象并缓存
      file = new File([processedContent], 'book.epub', { type: 'application/epub+zip' })
      cachedBookContent.value = processedContent
      cachedBookFile.value = file
      cachedBookId.value = props.bookId
      console.log('✅ [Foliate] 书籍内容已预处理并缓存')
    }

    // 动态导入 Foliate-js
    const [, cfiModule] = await Promise.all([
      import('@ray-d-song/foliate-js/view.js'),
      import('@ray-d-song/foliate-js/epubcfi.js').catch(() => null as any),
    ])

    if (cfiModule?.fromRange) {
      cfiFromRange = (range: Range) => cfiModule.fromRange(range)
    }
    if (cfiModule?.toRange) {
      cfiToRange = (doc: Document, cfi: string) => cfiModule.toRange(doc, cfi)
    }
    if (cfiModule?.joinIndir || cfiModule?.fake) {
      epubCfiModule = cfiModule
    }

    // 创建视图元素
    view.value = document.createElement('foliate-view')
    
    // 监听事件
    view.value.addEventListener('relocate', relocateListener)
    view.value.addEventListener('load', loadListener)

    // 添加到容器
    viewerRef.value.appendChild(view.value)

    // 打开书籍
    await view.value.open(file)

    // 初始化视图 - 🎯 修复：直接传递 CFI 字符串，而不是对象
    // Foliate 的 init 方法期望 lastLocation 是一个字符串（CFI）或 null
    let lastLocation = null
    if (props.initialCfi) {
      lastLocation = props.initialCfi
      console.log('📍 [Foliate] 使用 CFI 定位:', props.initialCfi)
    }
    
    // 初始化视图
    try {
      console.log('📍 [Foliate] 正在初始化视图，使用 CFI:', lastLocation)
      // 🎯 核心修复：增加全局超时保护，防止 init 内部死锁导致整个流程卡死
      const initPromise = view.value.init({ lastLocation })
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Foliate init timeout')), 5000)
      )
      await Promise.race([initPromise, timeoutPromise])
      console.log('✅ [Foliate] 视图初始化完成')
    } catch (initErr) {
      console.warn('⚠️ [Foliate] 视图初始化异常（可能是 CFI 无效或加载超时），执行回退策略:', initErr)
      try {
        // 尝试最简单的无参数启动
        await view.value.init()
      } catch (fallbackErr) {
        console.error('❌ [Foliate] 基础初始化也失败:', fallbackErr)
      }
    }

    // 确保目录加载，即使初始化报错也要尝试获取
    if (view.value?.book?.toc) {
      chapters.value = view.value.book.toc.map((item: any) => ({
        label: item.label,
        href: item.href
      }))
    }

    // 应用主题和样式
    applyTheme()
    addClickListener()

    isReady.value = true
    console.log('✅ [Foliate] 阅读器状态已就绪')
    
    // 📢 极其重要：无论初始化过程如何，必须触发 ready，否则外部 Loading 不会消失
    emit('ready', { chapters: chapters.value })
    
    // 🎯 核心修复：如果 init 没能成功恢复位置，但在 props 中有 initialCfi，则在就绪后再次尝试
    if (props.initialCfi && view.value.lastLocation?.cfi !== props.initialCfi) {
      console.log('📍 [Foliate] 初始化后再次同步初始位置:', props.initialCfi)
      await goToCfi(props.initialCfi)
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
        #neat-reader-annotation-overlay {
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
        }
        img, svg, video, canvas, table, pre, code {
          max-width: 100% !important;
          height: auto !important;
        }
      `
      doc.head.appendChild(style)
      console.log('✅ [样式] 字号:', props.fontSize, '行高:', props.lineHeight, '主题:', props.theme)
      
      // 强制触发重绘 - 修复初始加载时内容不显示的问题
      setTimeout(() => {
        if (doc.body) {
          // 方法1: 触发 reflow
          doc.body.style.display = 'none'
          void doc.body.offsetHeight // 强制 reflow
          doc.body.style.display = ''
          
          console.log('✅ [渲染] 已触发章节', index, '的重绘')
        }
      }, 50)
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
        #neat-reader-annotation-overlay {
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
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
    bindDocSelectionListener(doc, index)
  } catch (e) {
    console.warn('⚠️ [文本选择] 监听绑定失败:', e)
  }

  // 注入/重建注释 overlay（延迟一点，避免分页重排期间 toRange 更容易失败）
  scheduleRebuildAnnotationOverlay(index)
  
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

  // 🎯 核心修复: 只有在 relocation 稳定后才自动保存进度
  // 这样可以确保保存的是准确的 CFI，而不是初始化时的临时值
  if (isReady.value) {
    // 延迟一小会儿保存，确保状态已同步
    setTimeout(() => {
      saveProgressStable()
    }, 100)
  }
}

// 专门用于 Relocate 事件的稳定保存
const saveProgressStable = () => {
  if (!isReady.value) return
  
  const location = getCurrentLocation()
  if (!location || !location.cfi) return

  // 检查是否是合法的 CFI（过滤掉临时/错误的 CFI）
  if (location.cfi.includes('undefined') || location.cfi === 'epubcfi(/0)') return

  // 触发父组件保存进度
  emit('progress-change', {
    progress: progress.value,
    currentPage: currentPage.value,
    totalPages: totalPages.value,
    cfi: location.cfi
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
const goToCfi = async (cfi: string, chapterIndex?: number) => {
  console.log('🚀 [Foliate] goToCfi 被调用, CFI:', cfi, '章节索引:', chapterIndex)
  
  if (!view.value) return

  if (!isReady.value) {
    console.warn('⚠️ [Foliate] 阅读器尚未就绪')
    return
  }
  
  const buildCfiCandidates = (raw: string, forChapterIndex?: number) => {
    const wrapped = raw.startsWith('epubcfi(') ? raw : (raw.startsWith('/') ? `epubcfi(${raw})` : raw)
    if (/^\d+$/.test(raw)) return [raw]

    const m = wrapped.match(/^epubcfi\((.*)\)$/)
    if (!m) return [wrapped]

    const inner = m[1]
    const parts = inner.split(',')

    // 🎯 生成多种 CFI 候选格式（按优先级排序）
    const candidates: string[] = []

    // 🎯 优先级 0：若有 chapterIndex，先尝试带 spine 前缀的完整 CFI（epub.js 需要）
    if (forChapterIndex !== undefined && epubCfiModule?.joinIndir && epubCfiModule?.fake?.fromIndex) {
      const spineBase = epubCfiModule.fake.fromIndex(forChapterIndex)
      const withSpine = epubCfiModule.joinIndir(spineBase, wrapped)
      candidates.push(withSpine)
    }

    // 如果不是 Range CFI，直接返回（已含 spine 候选则用上面的）
    if (parts.length < 2) {
      if (candidates.length > 0) {
        console.log('🔍 [CFI] 生成候选列表:', candidates)
        return Array.from(new Set(candidates))
      }
      return [wrapped]
    }

    const base = parts[0]
    const start = parts[1]
    const end = parts[2]

    // 🎯 优先级 1：base + start 拼接（最可靠的 Point CFI）
    const joinedInner = `${base}${start.startsWith('/') ? '' : '/'}${start}`
    candidates.push(`epubcfi(${joinedInner})`)

    // 🎯 若有 chapterIndex，也生成带 spine 的 Point CFI
    if (forChapterIndex !== undefined && epubCfiModule?.joinIndir && epubCfiModule?.fake?.fromIndex) {
      const spineBase = epubCfiModule.fake.fromIndex(forChapterIndex)
      candidates.push(epubCfiModule.joinIndir(spineBase, `epubcfi(${joinedInner})`))
    }

    // 🎯 优先级 2：处理 base 末尾斜杠的情况
    if (base.endsWith('/')) {
      const cleanBase = base.slice(0, -1)
      candidates.push(`epubcfi(${cleanBase}${start.startsWith('/') ? '' : '/'}${start})`)
    }

    // 🎯 优先级 3：如果 start 包含文本偏移（如 /3:78），尝试去掉偏移
    const startWithoutOffset = start.replace(/:\d+$/, '')
    if (startWithoutOffset !== start) {
      candidates.push(`epubcfi(${base}${startWithoutOffset.startsWith('/') ? '' : '/'}${startWithoutOffset})`)
    }

    // 🎯 优先级 4：只使用 base（跳转到段落开头）
    candidates.push(`epubcfi(${base})`)

    // 🎯 优先级 5：尝试使用 end 部分（如果存在）
    if (end) {
      const endJoined = `${base}${end.startsWith('/') ? '' : '/'}${end}`
      candidates.push(`epubcfi(${endJoined})`)
    }

    // 🎯 最后尝试：原始 Range CFI（通常不工作，但作为兜底）
    candidates.push(wrapped)

    console.log('🔍 [CFI] 生成候选列表:', candidates)

    // 去重并返回
    return Array.from(new Set(candidates))
  }

  const candidates = buildCfiCandidates(cfi, chapterIndex)
  if (candidates.length === 1 && /^\d+$/.test(candidates[0])) {
    return goToChapter(parseInt(candidates[0], 10))
  }

  // 默认使用第一个候选作为日志展示
  let targetCfi = candidates[0]

  // 🎯 核心修复：防止注释层干扰跳转
  const clearOverlays = () => {
    annotationOverlayers.value.forEach(overlayer => {
      if (overlayer.element?.parentNode) {
        overlayer.element.parentNode.removeChild(overlayer.element)
      }
    })
  }

  console.log('📍 [Foliate] 开始精准跳转流程:', { targetCfi, candidates })

  try {
    // 1. 暂时清理干扰元素
    clearOverlays()

    // 2. 检查是否需要跨章节预热
    const needsContextSwitch = chapterIndex !== undefined && chapterIndex !== currentChapterIndex.value
    if (needsContextSwitch) {
      console.log('📍 [Foliate] 步骤1: 切换章节上下文:', chapterIndex)
      await view.value.goTo(chapterIndex)
      // 等待章节加载完成
      await new Promise(resolve => {
        const checkLoad = () => {
          if (loadedDocs.value.has(chapterIndex)) resolve(true)
          else setTimeout(checkLoad, 50)
        }
        checkLoad()
      })
    } else if (chapterIndex !== undefined) {
      console.log('📍 [Foliate] 已在目标章节:', chapterIndex, '当前章节:', currentChapterIndex.value)
    }

    // 3. 执行精准跳转
    console.log('📍 [Foliate] 步骤2: 执行候选定位尝试')
    
    let resolved = false
    let lastError: unknown = null
    const initialCfi = view.value.lastLocation?.cfi
    
    for (const c of candidates) {
      try {
        console.log('🧪 [Foliate] 尝试候选 CFI:', c)
        // 🎯 再次确保清理干扰，防止 Foliate 寻址到 overlay 节点
        clearOverlays()
        
        // 🎯 异步等待微任务，确保 DOM 稳定
        await new Promise(resolve => setTimeout(resolve, 0))
        
        // 🎯 同一章节内跳转时，也给一点缓冲时间确保 DOM 稳定
        if (!needsContextSwitch && chapterIndex !== undefined) {
          await new Promise(resolve => setTimeout(resolve, 30))
        }
        
        // 如果是跨章节后的跳转，给解析器一点缓冲时间
        if (needsContextSwitch) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }

        await view.value.goTo(c)
        
        // 🎯 验证跳转是否真的成功（位置是否改变 + 章节一致）
        await new Promise(resolve => setTimeout(resolve, 50))
        const newLoc = view.value.lastLocation
        const newCfi = newLoc?.cfi
        const positionChanged = newCfi && newCfi !== initialCfi
        const sectionMatch = chapterIndex === undefined || newLoc?.section === chapterIndex ||
          (typeof newLoc?.section === 'object' && (newLoc as any).section?.current === chapterIndex)
        
        if (positionChanged && sectionMatch) {
          resolved = true
          targetCfi = c
          console.log('✅ [Foliate] 候选跳转成功并验证:', c, '新位置:', newCfi)
          break
        } else if (positionChanged && !sectionMatch) {
          console.warn(`⚠️ [Foliate] 候选 CFI 跳转到了错误章节 (目标:${chapterIndex}, 实际:${newLoc?.section})，继续尝试`)
        } else {
          console.warn(`⚠️ [Foliate] 候选 CFI 调用成功但位置未改变 (${c})`)
          // 继续尝试下一个候选
        }
      } catch (e) {
        lastError = e
        const msg = e instanceof Error ? e.message : '解析异常'
        console.warn(`⚠️ [Foliate] 候选 CFI 跳转失败 (${c}):`, msg)
        // 继续尝试下一个候选，不中断流程
      }
    }

    if (!resolved) {
      // 🎯 兜底：使用 cfiToRange + scrollToAnchor（章节内 CFI 在 epub.js 解析失败时仍可定位）
      const fallbackChapterIndex = chapterIndex ?? currentChapterIndex.value
      const doc = loadedDocs.value.get(fallbackChapterIndex)
      if (cfiToRange && doc && view.value.renderer?.scrollToAnchor) {
        // 仅尝试章节内相对 CFI（不含 !），cfiToRange 需要针对当前 doc 的路径
        const docRelativeCandidates = candidates.filter(c => !c.includes('!'))
        for (const c of docRelativeCandidates) {
          try {
            const range = cfiToRange(doc, c)
            if (range?.startContainer) {
              await view.value.renderer.scrollToAnchor(range, true)
              resolved = true
              targetCfi = c
              console.log('✅ [Foliate] 通过 cfiToRange + scrollToAnchor 兜底成功:', c)
              break
            }
          } catch {
            // 继续尝试下一个候选
          }
        }
      }
      if (!resolved) {
        console.error('❌ [Foliate] 无法解析任何 CFI 候选，尝试进度百分比补救')
        try {
          if (props.initialProgress && props.initialProgress > 0) {
            await view.value.goToFraction(props.initialProgress / 100)
          }
        } catch (fallbackErr) {
          console.error('❌ [Foliate] 进度补救也失败了:', fallbackErr)
        }
      }
    }
    
    // 4. 跳转后校准与恢复（用 RAF 等待布局完成，替代固定 400ms）
    const runAfterLayout = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
          const currentLoc = view.value?.lastLocation
          if (!currentLoc) return
          console.log('🔄 [Foliate] 跳转校验，最终位置:', currentLoc?.cfi)

          const hasOverlayInterference = currentLoc?.cfi?.includes('neat-reader-annotation-overlay')
          if (hasOverlayInterference) {
            console.warn('⚠️ [Foliate] 检测到位置被干扰，执行二次强跳校准')
            clearOverlays()
            await view.value?.goTo(targetCfi).catch(() => {})
          }

          const loc = view.value?.lastLocation
          if (loc) {
            handleRelocate(loc)
            const rebuildIndex = chapterIndex ?? currentChapterIndex.value
            scheduleRebuildAnnotationOverlay(rebuildIndex, 0)
            view.value?.renderer?.render?.()
          }
        })
      })
    }
    runAfterLayout()
  } catch (err) {
    console.error('❌ [Foliate] 精准跳转流程崩溃:', err)
    rebuildAllAnnotationOverlays() 
    if (chapterIndex !== undefined) await goToChapter(chapterIndex)
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

// 全文搜索
async function search(query: string) {
  if (!view.value?.book?.search) {
    console.warn('⚠️ [Foliate] 当前书籍不支持搜索')
    return []
  }
  
  console.log('🔍 [Foliate] 开始全文搜索:', query)
  try {
    const results = []
    // Foliate 的 search 是一个异步生成器
    for await (const result of view.value.book.search(query)) {
      // 映射结果格式以适配 UI
      results.push({
        cfi: result.cfi,
        excerpt: result.excerpt,
        chapter: result.subchapter || result.sectionTitle || '未知章节'
      })
      // 限制结果数量，防止 UI 卡死
      if (results.length >= 100) break
    }
    console.log(`✅ [Foliate] 搜索完成，找到 ${results.length} 个结果`)
    return results
  } catch (err) {
    console.error('❌ [Foliate] 搜索出错:', err)
    return []
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
  rebuildAllAnnotationOverlays()
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
    rebuildAllAnnotationOverlays()
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
    rebuildAllAnnotationOverlays()
    console.log('✅ [行高] 已应用到所有 iframe')
  }
})

// 处理文字点击（例如：点击已有的高亮/下划线）
const handleAnnotationClick = (annotation: Annotation, event?: MouseEvent) => {
  let position: { x: number; y: number } | undefined

  if (event) {
    let offsetX = 0
    let offsetY = 0

    const target = event.target as HTMLElement | SVGElement | null
    const doc = target?.ownerDocument as Document | null

    const iframe = (doc as any)?.defaultView?.frameElement as HTMLElement | null
    if (iframe) {
      const iframeRect = iframe.getBoundingClientRect()
      offsetX = iframeRect.left
      offsetY = iframeRect.top
    }

    position = {
      x: event.clientX + offsetX,
      y: event.clientY + offsetY,
    }
  }

  emit('annotation-click', { annotation, position })
}

// 修改 watch annotations，确保实时更新
watch(
  () => props.annotations,
  (newAnnos) => {
    console.log(`🔄 [Reader] 注释列表更新, 总数: ${newAnnos?.length || 0}`)
    rebuildAllAnnotationOverlays()
  },
  { deep: true, immediate: true }
)

// 重新注入/更新所有 iframe 的样式
const updateAllIframeStyles = () => {
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
      }

      // 🎯 核心修复: 确保 SVG 容器始终在 body 的最后，且 z-index 正确
      const svg = doc.getElementById('neat-reader-annotation-overlay')
      if (svg) {
        svg.style.zIndex = '2147483647'
        svg.style.pointerEvents = 'none'
        if (doc.body && doc.body.lastChild !== svg) {
          doc.body.appendChild(svg)
        }
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
  getCurrentPageText,
  search: (query: string) => search(query)
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
