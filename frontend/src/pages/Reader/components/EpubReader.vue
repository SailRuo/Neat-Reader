<template>
  <div ref="containerRef" class="epub-reader" :class="`mode-${pageMode}`"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import ePub from 'epubjs'
import localforage from 'localforage'

const props = defineProps<{
  bookId: string
  theme: string
  fontSize: number
  lineHeight: number
  pageMode: 'page' | 'scroll'
  margin: string
  alignment: string
  initialProgress?: number
}>()

const emit = defineEmits<{
  ready: [data: any]
  'progress-change': [data: any]
  'chapter-change': [data: any]
  click: []
  'text-selected': [data: { text: string, cfi: string }]
  'highlight-clicked': [note: any]
}>()

const containerRef = ref<HTMLElement | null>(null)
let bookInstance: any = null
let rendition: any = null
let isReady = false
let resourceErrorHandler: ((event: PromiseRejectionEvent) => void) | null = null

// 环境检测：检查是否在 Wails 环境中运行
const isWailsEnvironment = (): boolean => {
  // Wails 会注入 window.go 对象
  return typeof (window as any).go !== 'undefined'
}

// 主题配置
const themeColors = {
  light: { bg: '#ffffff', text: '#2c3e50' },
  sepia: { bg: '#f4ecd8', text: '#5b4636' },
  green: { bg: '#e8f5e9', text: '#2d5a3d' },
  dark: { bg: '#1a1a1a', text: '#e8e8e8' }  // 更亮的文本颜色，提高对比度
}

// 边距映射
const marginMap: Record<string, string> = {
  '小': '20px',
  '中': '40px',
  '大': '60px'
}

// 对齐映射
const alignmentMap: Record<string, string> = {
  '左对齐': 'left',
  '两端对齐': 'justify'
}

// 初始化阅读器
const initialize = async () => {
  if (!containerRef.value) {
    console.error('容器元素不存在')
    return
  }
  
  // 记录运行环境
  const environment = isWailsEnvironment() ? 'Wails Desktop' : 'Browser'
  console.log('=== EPUB 阅读器初始化 ===')
  console.log('运行环境:', environment)
  console.log('容器元素:', containerRef.value)
  console.log('容器尺寸:', containerRef.value.clientWidth, 'x', containerRef.value.clientHeight)
  console.log('容器偏移:', containerRef.value.offsetWidth, 'x', containerRef.value.offsetHeight)
  
  // 检查容器尺寸
  if (containerRef.value.clientWidth === 0 || containerRef.value.clientHeight === 0) {
    console.error('容器尺寸为 0，无法初始化阅读器')
    console.error('容器样式:', window.getComputedStyle(containerRef.value))
    return
  }
  
  // 添加全局错误处理，捕获 epub.js 内部的资源加载错误
  resourceErrorHandler = (event: PromiseRejectionEvent) => {
    const error = event.reason
    if (error && error.message && error.message.includes('File not found in the epub')) {
      console.warn(`[${environment}] EPUB 资源未找到（已忽略）:`, error.message)
      event.preventDefault() // 阻止错误冒泡到控制台
    }
  }
  window.addEventListener('unhandledrejection', resourceErrorHandler)
  
  try {
    // 加载书籍内容
    const content = await localforage.getItem<ArrayBuffer>(`ebook_content_${props.bookId}`)
    if (!content) {
      console.error(`[${environment}] 无法加载书籍内容，书籍ID:`, props.bookId)
      return
    }
    
    console.log(`[${environment}] 书籍内容已加载，大小:`, content.byteLength, 'bytes')
    
    // 创建书籍实例
    bookInstance = ePub(content)
    console.log(`[${environment}] 书籍实例已创建`)
    
    // 添加错误处理，忽略非关键资源加载失败
    bookInstance.on('openFailed', (error: any) => {
      console.warn(`[${environment}] 资源加载失败（非关键）:`, error.message)
      // 不阻止渲染继续
    })
    
    // 拦截 Archive 的资源请求错误
    if (bookInstance.archive) {
      const originalCreateUrl = bookInstance.archive.createUrl.bind(bookInstance.archive)
      bookInstance.archive.createUrl = function(url: string, options: any) {
        try {
          return originalCreateUrl(url, options)
        } catch (error: any) {
          console.warn(`[${environment}] 资源 URL 创建失败（已忽略）: ${url}`, error.message)
          // 返回一个空的 data URL，避免阻塞渲染
          return Promise.resolve('data:text/css;base64,')
        }
      }
    }
    
    // 创建渲染器
    const width = containerRef.value.clientWidth
    const height = containerRef.value.clientHeight
    
    console.log(`[${environment}] 创建渲染器，尺寸:`, width, 'x', height, '，模式: 内联渲染')
    
    // 内联渲染模式的配置
    const renderConfig: any = {
      width,
      height,
      spread: 'none',
      allowScriptedContent: true,  // 允许脚本内容执行
      allowPopups: false,
      snap: false
    }
    
    // 根据页面模式选择合适的配置
    if (props.pageMode === 'page') {
      // 翻页模式：使用 paginated 流和 default 管理器
      renderConfig.flow = 'paginated'
      renderConfig.manager = 'default'
    } else {
      // 滚动模式：使用 scrolled 流实现章节自动衔接
      renderConfig.flow = 'scrolled'
      renderConfig.manager = 'continuous'
    }
    
    rendition = bookInstance.renderTo(containerRef.value, renderConfig)
    
    console.log(`[${environment}] 渲染器已创建，配置:`, renderConfig)
    console.log(`[${environment}] 渲染器对象:`, rendition)
    console.log(`[${environment}] 渲染器是否存在:`, !!rendition)
    
    // 应用样式
    console.log(`[${environment}] 开始应用样式...`)
    applyStyles()
    console.log(`[${environment}] 样式应用完成`)
    
    // 注册内容钩子
    console.log(`[${environment}] 注册内容钩子...`)
    rendition.hooks.content.register((contents: any) => {
      console.log(`[${environment}] 内容钩子被调用，contents:`, contents)
      
      // 在内容加载后重新应用样式
      console.log(`[${environment}] 在内容钩子中重新应用样式...`)
      const colors = themeColors[props.theme as keyof typeof themeColors]
      const marginValue = marginMap[props.margin] || '40px'
      const alignValue = alignmentMap[props.alignment] || 'justify'
      
      // 直接在 contents 的 document 上应用样式
      const doc = contents.document
      if (doc && doc.body) {
        console.log(`[${environment}] 直接设置 body 样式`)
        console.log(`[${environment}] 页边距值:`, marginValue)
        
        doc.body.style.backgroundColor = colors.bg
        doc.body.style.color = colors.text
        doc.body.style.fontSize = `${props.fontSize}px`
        doc.body.style.lineHeight = `${props.lineHeight}`
        // 分别设置上下左右的 padding，避免内容偏移
        doc.body.style.paddingTop = marginValue
        doc.body.style.paddingBottom = marginValue
        doc.body.style.paddingLeft = marginValue
        doc.body.style.paddingRight = marginValue
        doc.body.style.margin = '0'
        doc.body.style.textAlign = alignValue
        doc.body.style.boxSizing = 'border-box'
        
        console.log(`[${environment}] body 实际样式:`, {
          paddingTop: doc.body.style.paddingTop,
          paddingLeft: doc.body.style.paddingLeft,
          margin: doc.body.style.margin,
          backgroundColor: doc.body.style.backgroundColor,
          color: doc.body.style.color
        })
        
        // 设置所有文本元素的颜色
        const allElements = doc.body.querySelectorAll('*')
        console.log(`[${environment}] 设置 ${allElements.length} 个元素的颜色`)
        allElements.forEach((el: any) => {
          el.style.color = colors.text
        })
      }
      
      setupContentHooks(contents)
      
      // 拦截资源加载错误
      if (doc) {
        console.log(`[${environment}] 设置资源错误拦截`)
        // 拦截 CSS 加载错误
        doc.addEventListener('error', (e: Event) => {
          const target = e.target as HTMLElement
          if (target.tagName === 'LINK' && target.getAttribute('rel') === 'stylesheet') {
            console.warn(`[${environment}] CSS 加载失败（已忽略）:`, target.getAttribute('href'))
            e.stopPropagation()
            e.preventDefault()
          }
        }, true)
      }
    })
    console.log(`[${environment}] 内容钩子注册完成`)
    
    // 绑定事件（在显示之前）
    console.log(`[${environment}] 绑定事件...`)
    bindEvents()
    console.log(`[${environment}] 事件绑定完成`)
    
    // 先加载目录和生成位置索引（同步等待）
    try {
      const nav = await bookInstance.loaded.navigation
      const chapters = nav.toc.map((item: any) => ({
        title: item.label || item.title || '未知章节',
        href: item.href
      }))
      
      // 生成位置索引
      await bookInstance.ready
      await bookInstance.locations.generate(1000)
      
      isReady = true
      
      // 如果有保存的进度，直接跳转到该位置
      if (props.initialProgress && props.initialProgress > 0) {
        console.log('恢复进度:', props.initialProgress)
        const cfi = bookInstance.locations.cfiFromPercentage(props.initialProgress / 100)
        console.log('计算的 CFI:', cfi)
        if (cfi) {
          await rendition.display(cfi)
        } else {
          await rendition.display()
        }
      } else {
        console.log('没有进度，显示第一页')
        // 没有进度，显示第一页
        await rendition.display()
      }
      
      emit('ready', { chapters })
    } catch (err) {
      const environment = isWailsEnvironment() ? 'Wails Desktop' : 'Browser'
      console.warn(`[${environment}] 加载目录或生成位置索引失败:`, err)
      // 即使失败也显示书籍
      await rendition.display()
      isReady = true
      emit('ready', { chapters: [] })
    }
    
  } catch (error) {
    const environment = isWailsEnvironment() ? 'Wails Desktop' : 'Browser'
    console.error(`[${environment}] 初始化 EPUB 阅读器失败:`, error)
    console.error('错误堆栈:', (error as Error).stack)
    console.error('渲染配置:', {
      pageMode: props.pageMode,
      theme: props.theme,
      fontSize: props.fontSize,
      bookId: props.bookId
    })
    
    // 显示用户友好的错误信息
    if (containerRef.value) {
      containerRef.value.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 40px;
          text-align: center;
          color: #666;
        ">
          <div style="font-size: 48px; margin-bottom: 20px;">📚</div>
          <h3 style="margin: 0 0 10px 0; color: #333;">无法加载 EPUB 内容</h3>
          <p style="margin: 0 0 20px 0; color: #666;">
            ${environment === 'Wails Desktop' ? '桌面应用' : '浏览器'}环境下加载失败
          </p>
          <button 
            onclick="location.reload()" 
            style="
              padding: 10px 24px;
              background: #4a90e2;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            "
          >
            重新加载
          </button>
        </div>
      `
    }
    
    emit('ready', { 
      chapters: [], 
      error: `Failed to initialize EPUB reader in ${environment} environment` 
    })
  }
}

// 应用样式
const applyStyles = () => {
  if (!rendition) return
  
  try {
    const colors = themeColors[props.theme as keyof typeof themeColors]
    const marginValue = marginMap[props.margin] || '40px'
    const alignValue = alignmentMap[props.alignment] || 'justify'
    
    console.log('=== 应用样式 ===')
    console.log('当前主题:', props.theme)
    console.log('主题颜色:', colors)
    console.log('页边距:', props.margin, '→', marginValue)
    console.log('对齐方式:', props.alignment, '→', alignValue)
    console.log('字体大小:', props.fontSize)
    console.log('行高:', props.lineHeight)
    console.log('页面模式:', props.pageMode)
    
    // 使用更具体的选择器以确保内联模式下的样式隔离
    const styles = {
      '.epub-view': {
        'background': `${colors.bg} !important`,
        'color': `${colors.text} !important`,
        'overflow-x': 'hidden !important'
      },
      '.epub-view body': {
        'background': `${colors.bg} !important`,
        'color': `${colors.text} !important`,
        'font-size': `${props.fontSize}px !important`,
        'line-height': `${props.lineHeight} !important`,
        'margin': '0 !important',
        'padding': `${marginValue} !important`,
        'text-align': `${alignValue} !important`,
        'overflow-x': 'hidden !important',
        'max-width': '100% !important',
        'box-sizing': 'border-box !important'
      },
      '.epub-view p, .epub-view div, .epub-view span, .epub-view li, .epub-view td, .epub-view th': {
        'color': `${colors.text} !important`,
        'text-align': `${alignValue} !important`,
        'max-width': '100% !important',
        'overflow-wrap': 'break-word !important',
        'word-wrap': 'break-word !important'
      },
      '.epub-view h1, .epub-view h2, .epub-view h3, .epub-view h4, .epub-view h5, .epub-view h6': {
        'color': `${colors.text} !important`,
        'max-width': '100% !important'
      },
      '.epub-view a': {
        'color': `${colors.text} !important`,
        'opacity': '0.8'
      },
      '.epub-view img': {
        'max-width': '100% !important',
        'height': 'auto !important'
      },
      '.epub-view *': {
        'color': `${colors.text} !important`
      }
    }
    
    console.log('样式配置:', styles)
    
    rendition.themes.register('custom', styles)
    rendition.themes.select('custom')
    
    console.log('样式已注册并选择')
    console.log('当前主题列表:', rendition.themes)
  } catch (error) {
    const environment = isWailsEnvironment() ? 'Wails Desktop' : 'Browser'
    console.error(`[${environment}] 应用自定义主题失败:`, error)
    console.error('错误堆栈:', (error as Error).stack)
    // 继续渲染，使用默认样式
  }
}

// 设置内容钩子
const setupContentHooks = (contents: any) => {
  const doc = contents.document
  const win = contents.window
  
  // 阻止默认滚轮行为（翻页模式）
  if (props.pageMode === 'page') {
    doc.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault()
      if (e.deltaY > 0) {
        rendition.next()
      } else {
        rendition.prev()
      }
    }, { passive: false })
  }
  
  // 点击事件
  doc.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName !== 'A') {
      emit('click')
    }
  })
  
  // 鼠标释放时检查是否有选中文本
  let mouseDownTime = 0
  doc.addEventListener('mousedown', () => {
    mouseDownTime = Date.now()
  })
  
  doc.addEventListener('mouseup', () => {
    // 确保鼠标已经释放一段时间，避免拖动选择时触发
    const mouseUpTime = Date.now()
    const selectionDuration = mouseUpTime - mouseDownTime
    
    setTimeout(() => {
      const selection = win.getSelection()
      const text = selection?.toString().trim()
      
      // 只有在选择时间超过100ms且有文本时才触发（避免单击触发）
      if (text && text.length > 0 && selectionDuration > 100) {
        try {
          const range = selection?.getRangeAt(0)
          if (range) {
            // 尝试多种方式获取 CFI
            let cfi = ''
            
            // 方法1：使用 rendition.epubcfi
            if (rendition.epubcfi && contents.cfiBase) {
              try {
                cfi = rendition.epubcfi.generateCfiFromRange(range, contents.cfiBase)
              } catch (e) {
                console.warn('方法1获取CFI失败:', e)
              }
            }
            
            // 方法2：使用当前位置的 CFI
            if (!cfi && rendition.currentLocation) {
              try {
                const location = rendition.currentLocation()
                cfi = location?.start?.cfi || ''
              } catch (e) {
                console.warn('方法2获取CFI失败:', e)
              }
            }
            
            // 方法3：使用 bookInstance 的 CFI 生成器
            if (!cfi && bookInstance && bookInstance.getRange) {
              try {
                const cfiRange = bookInstance.getRange(range)
                cfi = cfiRange?.toString() || ''
              } catch (e) {
                console.warn('方法3获取CFI失败:', e)
              }
            }
            
            console.log('选中文本:', text)
            console.log('生成的CFI:', cfi)
            
            // 即使没有 CFI 也触发事件，使用时间戳作为备用 ID
            if (!cfi) {
              cfi = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              console.warn('无法生成CFI，使用临时ID:', cfi)
            }
            
            emit('text-selected', { text, cfi })
          }
        } catch (err) {
          console.error('文本选择处理失败:', err)
        }
      }
    }, 150)
  })
}

// 绑定事件
const bindEvents = () => {
  if (!rendition) return
  
  rendition.on('relocated', (location: any) => {
    if (!location || !location.start) return
    
    // 更新进度
    let progress = 0
    if (isReady && bookInstance.locations) {
      progress = Math.floor(bookInstance.locations.percentageFromCfi(location.start.cfi) * 100)
    }
    
    emit('progress-change', {
      progress,
      currentPage: location.start.displayed?.page || 1,
      totalPages: location.start.displayed?.total || 1
    })
    
    // 更新章节
    const href = location.start.href
    if (href && bookInstance.navigation) {
      // 方法1：直接在 toc 中查找匹配的章节
      let foundChapter = null
      let foundIndex = -1
      
      const findChapter = (items: any[], parentIndex = 0): boolean => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (item.href && (href.includes(item.href) || item.href.includes(href.split('#')[0]))) {
            foundChapter = item
            foundIndex = parentIndex + i
            return true
          }
          // 递归查找子章节
          if (item.subitems && item.subitems.length > 0) {
            if (findChapter(item.subitems, parentIndex + i)) {
              return true
            }
          }
        }
        return false
      }
      
      findChapter(bookInstance.navigation.toc)
      
      if (foundChapter) {
        emit('chapter-change', {
          index: foundIndex,
          title: foundChapter.label || foundChapter.title || '未知章节'
        })
      } else {
        // 方法2：使用 spine 索引作为备用
        const spineIndex = bookInstance.spine.items.findIndex((item: any) => 
          item.href === href || href.includes(item.href)
        )
        
        if (spineIndex !== -1 && bookInstance.navigation.toc[spineIndex]) {
          const chapter = bookInstance.navigation.toc[spineIndex]
          emit('chapter-change', {
            index: spineIndex,
            title: chapter.label || chapter.title || '未知章节'
          })
        }
      }
    }
  })
}

// 跳转到进度
const goToProgress = (progress: number) => {
  if (!rendition || !isReady || !bookInstance.locations) return
  
  const cfi = bookInstance.locations.cfiFromPercentage(progress / 100)
  if (cfi) {
    rendition.display(cfi)
  }
}

// 跳转到位置
const goToLocation = (location: any) => {
  if (!rendition) return
  
  if (location.cfi) {
    rendition.display(location.cfi)
  } else if (location.href) {
    rendition.display(location.href)
  }
}

// 跳转到章节
const goToChapter = (index: number) => {
  if (!rendition || !bookInstance.spine) return
  
  const item = bookInstance.spine.get(index)
  if (item) {
    rendition.display(item.href)
  }
}

// 获取当前位置
const getCurrentLocation = () => {
  if (!rendition) return null
  
  const location = rendition.currentLocation()
  return {
    cfi: location?.start?.cfi || '',
    href: location?.start?.href || ''
  }
}

// 重新初始化
const reinitialize = async () => {
  cleanup()
  await nextTick()
  await initialize()
}

// 清理
const cleanup = () => {
  // 移除全局错误处理
  if (resourceErrorHandler) {
    window.removeEventListener('unhandledrejection', resourceErrorHandler)
    resourceErrorHandler = null
  }
  
  if (rendition) {
    rendition.destroy()
    rendition = null
  }
  if (bookInstance) {
    bookInstance.destroy()
    bookInstance = null
  }
  isReady = false
}

// 监听属性变化
watch([() => props.theme, () => props.fontSize, () => props.lineHeight, () => props.margin, () => props.alignment], () => {
  console.log('=== 样式属性变化 ===')
  console.log('主题:', props.theme)
  console.log('字体:', props.fontSize)
  console.log('行高:', props.lineHeight)
  console.log('页边距:', props.margin)
  console.log('对齐:', props.alignment)
  
  // 重新应用样式到所有已加载的内容
  if (rendition && rendition.getContents) {
    const contents = rendition.getContents()
    console.log('当前内容数量:', contents.length)
    
    const colors = themeColors[props.theme as keyof typeof themeColors]
    const marginValue = marginMap[props.margin] || '40px'
    const alignValue = alignmentMap[props.alignment] || 'justify'
    
    contents.forEach((content: any) => {
      const doc = content.document
      if (doc && doc.body) {
        console.log('更新内容样式')
        doc.body.style.backgroundColor = colors.bg
        doc.body.style.color = colors.text
        doc.body.style.fontSize = `${props.fontSize}px`
        doc.body.style.lineHeight = `${props.lineHeight}`
        // 分别设置上下左右的 padding
        doc.body.style.paddingTop = marginValue
        doc.body.style.paddingBottom = marginValue
        doc.body.style.paddingLeft = marginValue
        doc.body.style.paddingRight = marginValue
        doc.body.style.margin = '0'
        doc.body.style.textAlign = alignValue
        doc.body.style.boxSizing = 'border-box'
        
        // 更新所有元素的颜色
        const allElements = doc.body.querySelectorAll('*')
        allElements.forEach((el: any) => {
          el.style.color = colors.text
        })
      }
    })
  }
  
  // 也调用原来的 applyStyles
  applyStyles()
})

watch(() => props.pageMode, () => {
  reinitialize()
})

// 高亮存储
const highlights = new Map<string, string>()
const highlightNotes = new Map<string, any>() // 存储 CFI 到笔记的映射

// 添加高亮到 DOM
const applyHighlightToContent = (content: any, cfi: string, color: string) => {
  try {
    const range = content.range(cfi)
    if (!range) {
      return false
    }
    
    console.log('找到 CFI 对应的范围:', cfi)
    
    // 检查是否已经有高亮
    const existingHighlight = content.document.querySelector(`[data-highlight-cfi="${cfi}"]`)
    if (existingHighlight) {
      console.log('高亮已存在，跳过')
      return true
    }
    
    // 创建高亮元素
    const mark = content.document.createElement('mark')
    mark.style.backgroundColor = color
    mark.style.opacity = '0.4'
    mark.style.mixBlendMode = 'multiply'
    mark.style.cursor = 'pointer'
    mark.style.border = 'none'
    mark.style.padding = '0'
    mark.setAttribute('data-highlight-cfi', cfi)
    mark.setAttribute('data-highlight-color', color)
    
    // 添加点击事件
    mark.addEventListener('click', (e: Event) => {
      e.stopPropagation()
      console.log('高亮被点击:', cfi)
      const noteData = highlightNotes.get(cfi)
      if (noteData) {
        emit('highlight-clicked', noteData)
      }
    })
    
    // 使用更安全的方法包裹内容
    try {
      // 先提取内容
      const fragment = range.extractContents()
      // 将内容放入 mark 元素
      mark.appendChild(fragment)
      // 插入 mark 元素
      range.insertNode(mark)
      console.log('高亮样式应用成功')
      return true
    } catch (e) {
      console.error('应用高亮失败:', e)
      return false
    }
  } catch (error) {
    console.warn('应用高亮到内容失败:', error)
    return false
  }
}

// 添加高亮
const addHighlight = (cfi: string, color: string, note?: any) => {
  if (!rendition) {
    console.warn('渲染器未就绪，无法添加高亮')
    return
  }
  
  try {
    console.log('=== 添加高亮 ===')
    console.log('CFI:', cfi)
    console.log('颜色:', color)
    
    // 存储高亮信息
    highlights.set(cfi, color)
    if (note) {
      highlightNotes.set(cfi, note)
    }
    
    // 直接操作 DOM 添加高亮
    const contents = rendition.getContents()
    let applied = false
    
    contents.forEach((content: any) => {
      if (applyHighlightToContent(content, cfi, color)) {
        applied = true
      }
    })
    
    if (applied) {
      console.log('高亮添加成功')
    } else {
      console.warn('高亮未能应用到任何内容，可能该 CFI 不在当前渲染的页面中')
    }
    
    console.log('当前所有高亮:', highlights)
  } catch (error) {
    console.error('添加高亮失败:', error)
    console.error('错误堆栈:', (error as Error).stack)
  }
}

// 移除高亮
const removeHighlight = (cfi: string) => {
  if (!rendition) return
  
  try {
    console.log('移除高亮:', cfi)
    highlights.delete(cfi)
    highlightNotes.delete(cfi)
    
    // 从 DOM 中移除高亮元素
    const contents = rendition.getContents()
    contents.forEach((content: any) => {
      const highlightElement = content.document.querySelector(`[data-highlight-cfi="${cfi}"]`)
      if (highlightElement) {
        // 将高亮元素的内容提取出来，替换高亮元素
        const parent = highlightElement.parentNode
        while (highlightElement.firstChild) {
          parent.insertBefore(highlightElement.firstChild, highlightElement)
        }
        parent.removeChild(highlightElement)
        console.log('高亮 DOM 元素已移除')
      }
    })
    
    console.log('高亮移除成功')
  } catch (error) {
    console.error('移除高亮失败:', error)
  }
}

// 恢复所有高亮
const restoreHighlights = (notes: any[]) => {
  if (!rendition || !notes || notes.length === 0) {
    console.log('没有需要恢复的高亮')
    return
  }
  
  console.log('=== 恢复高亮 ===')
  console.log('笔记数量:', notes.length)
  
  // 存储所有笔记信息
  notes.forEach(note => {
    if (note.cfi && note.color) {
      highlights.set(note.cfi, note.color)
      highlightNotes.set(note.cfi, note)
    }
  })
  
  // 延迟恢复高亮，确保内容已经完全渲染
  setTimeout(() => {
    console.log('开始延迟恢复高亮')
    const contents = rendition.getContents()
    console.log('当前渲染的内容数量:', contents.length)
    
    notes.forEach(note => {
      if (note.cfi && note.color) {
        console.log('恢复高亮:', note.cfi, note.color)
        let applied = false
        contents.forEach((content: any) => {
          if (applyHighlightToContent(content, note.cfi, note.color)) {
            applied = true
          }
        })
        if (!applied) {
          console.warn('高亮未应用到任何内容:', note.cfi)
        }
      }
    })
    
    console.log('高亮恢复完成，共', highlights.size, '个高亮')
  }, 500)
}

// 清除文本选区
const clearSelection = () => {
  if (!rendition) return
  
  try {
    // 内联模式下直接使用 window.getSelection()
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges()
    }
  } catch (error) {
    console.warn('清除选区失败:', error)
  }
}

// 暴露方法
defineExpose({
  goToProgress,
  goToLocation,
  goToChapter,
  getCurrentLocation,
  reinitialize,
  addHighlight,
  removeHighlight,
  restoreHighlights,
  clearSelection
})

// 生命周期
onMounted(() => {
  initialize()
  
  // 监听窗口大小改变
  window.addEventListener('resize', () => {
    if (rendition) {
      console.log('窗口大小改变，调整渲染器')
      const width = containerRef.value?.clientWidth || 0
      const height = containerRef.value?.clientHeight || 0
      console.log('新尺寸:', width, 'x', height)
      rendition.resize(width, height)
    }
  })
})

onBeforeUnmount(() => {
  cleanup()
  // 移除窗口大小监听
  window.removeEventListener('resize', () => {})
})
</script>

<style scoped>
.epub-reader {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

/* 内联模式下的内容容器样式 */
.epub-reader :deep(.epub-view) {
  width: 100%;
  height: 100%;
  overflow-x: hidden !important;
  overflow-y: auto;
}

/* 滚动模式下的额外样式 */
.epub-reader.mode-scroll :deep(.epub-view) {
  overflow-y: auto !important;
}

.epub-reader.mode-scroll :deep(.epub-container) {
  overflow-x: hidden !important;
  max-width: 100% !important;
}

/* 翻页模式下隐藏滚动条 */
.epub-reader.mode-page :deep(.epub-view) {
  overflow: hidden !important;
}
</style>
