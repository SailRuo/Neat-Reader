<template>
  <div ref="containerRef" class="epub-reader" :class="`mode-${pageMode}`" @click="emit('click')">
    <!-- 如果初始化失败，显示错误信息 -->
    <div v-if="initError" class="error-display">
      <div class="error-icon">📚</div>
      <h3>{{ initError.title }}</h3>
      <p>{{ initError.message }}</p>
      <button @click="retryInitialize" class="retry-btn">重试</button>
    </div>
  </div>
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
 let currentThemeKey = 'user'

// 错误状态
const initError = ref<{title: string, message: string} | null>(null)

// 笔记相关状态 - 从父组件接收
const notes = ref<any[]>([])

// 接收笔记数据的方法
const setNotes = (notesList: any[]) => {
  notes.value = notesList
}

// 高亮相关功能
const addHighlight = (cfi: string, color: string, note: any) => {
  if (!rendition) return
  
  try {
    console.log('🎨 添加高亮:', { cfi, color, noteId: note.id })
    
    // 使用 epub.js 的 annotations 功能
    rendition.annotations.add('highlight', cfi, {
      fill: color,
      'fill-opacity': '0.3',
      'mix-blend-mode': 'multiply'
    }, null, 'hl', {
      'data-note-id': note.id,
      'class': 'epub-highlight'
    })
    
    console.log('✅ 高亮添加成功')
  } catch (error) {
    console.warn('添加高亮失败:', error)
  }
}

// 恢复高亮
const restoreHighlights = (contents: any) => {
  if (!notes.value || notes.value.length === 0) return
  
  console.log('🎨 恢复高亮，笔记数量:', notes.value.length)
  
  notes.value.forEach(note => {
    if (note.cfi) {
      try {
        // 检查当前内容是否包含这个 CFI
        const doc = contents.document
        if (doc) {
          addHighlight(note.cfi, note.color, note)
        }
      } catch (error) {
        console.warn('恢复高亮失败:', error)
      }
    }
  })
}

// 移除高亮
const removeHighlight = (cfi: string) => {
  if (!rendition) return
  
  try {
    rendition.annotations.remove(cfi, 'highlight')
    console.log('🗑️ 高亮已移除:', cfi)
  } catch (error) {
    console.warn('移除高亮失败:', error)
  }
}

// 重试初始化
const retryInitialize = () => {
  initError.value = null
  initialize()
}

// 环境检测：检查是否在 Electron 环境中运行
const isElectronEnvironment = (): boolean => {
  return typeof (window as any).electron !== 'undefined'
}

// 主题配置
const themeColors = {
  light: { bg: '#ffffff', text: '#2c3e50' },
  sepia: { bg: '#f4ecd8', text: '#5b4636' },
  green: { bg: '#e8f5e9', text: '#2d5a3d' },
  dark: { bg: '#1a1a1a', text: '#e8e8e8' }  // 更亮的文本颜色，提高对比度
}

// 对齐映射
const alignmentMap: Record<string, string> = {
  '左对齐': 'left',
  '两端对齐': 'justify'
}

 const getRenderConfig = () => {
   const width = containerRef.value?.clientWidth || 800
   const height = containerRef.value?.clientHeight || 600
 
   if (props.pageMode === 'scroll') {
     return {
       width,
       height,
       flow: 'scrolled-doc',
       manager: 'continuous',
       spread: 'none'
     }
   }
 
   return {
     width,
     height,
     flow: 'paginated',
     manager: 'default',
     spread: 'none',
     minSpreadWidth: 999999
   }
 }

const waitForContainerSize = async () => {
  for (let i = 0; i < 30; i++) {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 16))
    const el = containerRef.value
    if (!el) continue
    if (el.clientWidth > 0 && el.clientHeight > 0) return
  }
}

// 初始化阅读器
const initialize = async () => {
  console.log('🚀 [EpubReader] 开始初始化...')
  
  if (!containerRef.value) {
    console.error('❌ 容器元素不存在')
    initError.value = { title: '初始化失败', message: '容器元素不存在' }
    return
  }
  
  // 清除之前的错误状态
  initError.value = null
  
  // 确保容器有基本样式
  containerRef.value.style.width = '100%'
  containerRef.value.style.height = '100%'
  containerRef.value.style.position = 'relative'
  containerRef.value.style.overflow = props.pageMode === 'scroll' ? 'auto' : 'hidden'
  
  // 等待容器准备就绪
  await waitForContainerSize()
  
  console.log('📐 容器尺寸:', containerRef.value.clientWidth, 'x', containerRef.value.clientHeight)
  
  try {
    // 加载书籍内容
    console.log('📖 开始加载书籍内容...')
    const content = await localforage.getItem<ArrayBuffer>(`ebook_content_${props.bookId}`)
    if (!content) {
      console.error(`❌ 无法加载书籍内容，书籍ID:`, props.bookId)
      initError.value = { title: '内容加载失败', message: '书籍文件可能已损坏或丢失，请重新导入' }
      return
    }
    
    console.log('✅ 书籍内容加载成功，大小:', content.byteLength, 'bytes')
    
    // 创建书籍实例
    console.log('📚 创建 EPUB 实例...')
    bookInstance = ePub(content)
    
    // 等待书籍准备就绪
    console.log('⏳ 等待书籍准备就绪...')
    await bookInstance.ready
    console.log('✅ 书籍准备就绪')
    
    // 创建渲染器 - 使用最简单的配置
    console.log('🎨 创建渲染器...')
    const renderConfig = getRenderConfig()
    
    console.log('📐 渲染器配置:', renderConfig)
    
    rendition = bookInstance.renderTo(containerRef.value, renderConfig)
    console.log('✅ 渲染器创建成功')

    try {
      rendition.spread('none')
    } catch (e) {
    }
    
    // 应用完整的样式
    applyStyles()
    
    // 绑定事件
    bindEvents()
    
    // 显示第一页
    console.log('📖 显示内容...')
    await rendition.display()
    console.log('✅ 内容显示完成')
    
    // 生成位置索引（用于进度计算）
    console.log('📍 生成位置索引...')
    try {
      await bookInstance.locations.generate(1024)
      console.log('✅ 位置索引生成完成，总位置数:', bookInstance.locations.length())
    } catch (error) {
      console.warn('⚠️ 位置索引生成失败，将使用章节索引作为备用:', error)
    }
    
    isReady = true

    if (props.initialProgress !== undefined && props.initialProgress > 0) {
      try {
        goToProgress(props.initialProgress)
      } catch (e) {
      }
    }
    
    // 发送章节信息
    const chapters = bookInstance.navigation?.toc || []
    emit('ready', { chapters })
    
    console.log('🎉 EPUB 阅读器初始化完成')
    
  } catch (error) {
    console.error('❌ 初始化 EPUB 阅读器失败:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    initError.value = { title: '初始化失败', message: errorMessage }
    emit('ready', { chapters: [], error: 'Failed to initialize EPUB reader' })
  }
}

// 应用样式
const applyStyles = () => {
  if (!rendition) return
  
  try {
    const colors = themeColors[props.theme as keyof typeof themeColors]
    const alignValue = alignmentMap[props.alignment] || 'justify'
    
    console.log('🎨 应用样式:', {
      theme: props.theme,
      fontSize: props.fontSize,
      lineHeight: props.lineHeight,
      pageMode: props.pageMode
    })
    
    const styles: any = {
      'html': {
        'padding': '0 !important',
        'margin': '0 !important',
        'background': `${colors.bg} !important`,
        'width': '100% !important'
      },
      'body': {
        'background': `${colors.bg} !important`,
        'color': `${colors.text} !important`,
        'font-size': `${props.fontSize}px !important`,
        'line-height': `${props.lineHeight} !important`,
        'text-align': `${alignValue} !important`,
        'margin': '0 !important',
        'padding': '20px 40px !important',
        'overflow-x': 'hidden !important',
        'box-sizing': 'border-box !important',
        'column-gap': '0 !important',
        'font-family': 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif !important'
      },
      'p': {
        'color': `${colors.text} !important`,
        'text-align': `${alignValue} !important`,
        'line-height': `${props.lineHeight} !important`,
        'margin': '0.5em 0 !important',
        'overflow-wrap': 'break-word !important',
        'word-wrap': 'break-word !important'
      },
      'div': {
        'color': `${colors.text} !important`,
        'line-height': `${props.lineHeight} !important`,
        'overflow-wrap': 'break-word !important',
        'word-wrap': 'break-word !important'
      },
      'span, li, td, th': {
        'color': `${colors.text} !important`,
        'line-height': `${props.lineHeight} !important`
      },
      'h1, h2, h3, h4, h5, h6': {
        'color': `${colors.text} !important`,
        'line-height': '1.4 !important',
        'margin': '1em 0 0.5em 0 !important'
      },
      'a': {
        'color': `${colors.text} !important`,
        'opacity': '0.8',
        'text-decoration': 'underline'
      },
      'img': {
        'max-width': '100% !important',
        'height': 'auto !important',
        'display': 'block !important',
        'margin': '1em auto !important'
      },
      'blockquote': {
        'color': `${colors.text} !important`,
        'border-left': `3px solid ${colors.text}33 !important`,
        'padding-left': '1em !important',
        'margin': '1em 0 !important',
        'font-style': 'italic'
      },
      'code': {
        'background': `${colors.text}11 !important`,
        'color': `${colors.text} !important`,
        'padding': '0.2em 0.4em !important',
        'border-radius': '3px !important',
        'font-family': 'Monaco, Consolas, monospace !important'
      },
      'pre': {
        'background': `${colors.text}11 !important`,
        'color': `${colors.text} !important`,
        'padding': '1em !important',
        'border-radius': '6px !important',
        'overflow-x': 'auto !important',
        'font-family': 'Monaco, Consolas, monospace !important'
      }
    }

    currentThemeKey = `user_${props.theme}_${props.fontSize}_${props.lineHeight}_${alignValue}`
    rendition.themes.register(currentThemeKey, styles)
    rendition.themes.select(currentThemeKey)

    console.log('✅ 样式已应用到 rendition.themes')
  } catch (error) {
    console.error('应用自定义主题失败:', error)
  }
}

// 设置内容钩子 - 完整版本
const setupContentHooks = (contents: any) => {
  const doc = contents.document
  const win = contents.window

  try {
    const root = doc?.documentElement
    if (root && root.getAttribute('data-neat-reader-hooks') === '1') return
    root?.setAttribute('data-neat-reader-hooks', '1')
  } catch (e) {
  }
  
  console.log('🔗 设置内容钩子...')
  
  // 点击事件处理
  doc.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement
    
    // 检查是否点击了高亮
    if (target.classList.contains('epub-highlight')) {
      const noteId = target.getAttribute('data-note-id')
      if (noteId) {
        const note = notes.value.find(n => n.id === noteId)
        if (note) {
          emit('highlight-clicked', note)
          return
        }
      }
    }
    
    const anchor = target.closest('a')
    if (anchor) return

    emit('click')
  })
  
  // 滚轮事件处理（翻页）
  doc.addEventListener('wheel', (e: WheelEvent) => {
    if (props.pageMode !== 'page') return
    if (!rendition || !isReady) return

    e.preventDefault()
    
    if (e.deltaY > 0) {
      // 向下滚动 - 下一页
      rendition.next()
    } else if (e.deltaY < 0) {
      // 向上滚动 - 上一页
      rendition.prev()
    }
  }, { passive: false })
  
  // 键盘事件处理
  doc.addEventListener('keydown', (e: KeyboardEvent) => {
    if (props.pageMode === 'page') {
      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          rendition.prev()
          break
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          rendition.next()
          break
      }
    }
  })
  
  // 文本选择事件
  let selectionTimeout: ReturnType<typeof setTimeout> | null = null
  
  const handleSelection = () => {
    if (selectionTimeout) {
      clearTimeout(selectionTimeout)
    }
    
    selectionTimeout = setTimeout(() => {
      const selection = win.getSelection()
      if (selection && selection.toString().trim().length > 0) {
        try {
          const range = selection.getRangeAt(0)
          const cfi = rendition.getRange(range).toString()
          const text = selection.toString().trim()
          
          if (text.length > 0 && cfi) {
            console.log('📝 文本被选中:', { text, cfi })
            emit('text-selected', { text, cfi })
          }
        } catch (error) {
          console.warn('获取选中文本的 CFI 失败:', error)
        }
      }
    }, 300)
  }
  
  doc.addEventListener('mouseup', handleSelection)
  doc.addEventListener('touchend', handleSelection)
  
  // 防止默认的上下文菜单
  doc.addEventListener('contextmenu', (e: MouseEvent) => {
    const selection = win.getSelection()
    if (!selection || selection.toString().trim().length === 0) {
      e.preventDefault()
    }
  })
  
  console.log('✅ 内容钩子设置完成')
}

// 绑定事件
const bindEvents = () => {
  if (!rendition) return
  
  console.log('🔗 绑定阅读器事件...')
  
  // 内容渲染完成事件
  rendition.on('rendered', (section: any) => {
    console.log('📄 章节渲染完成:', section.href)

    if (props.pageMode === 'page') {
      try {
        rendition.spread('none')
      } catch (e) {
      }
    }

    try {
      if (currentThemeKey) {
        rendition.themes.select(currentThemeKey)
      }
    } catch (e) {
    }
    
    // 为新渲染的内容设置钩子
    const contents = rendition.getContents()
    contents.forEach((content: any) => {
      setupContentHooks(content)
      
      // 恢复高亮
      restoreHighlights(content)
    })
  })
  
  // 位置变化事件
  rendition.on('relocated', (location: any) => {
    if (!location || !location.start) return
    
    console.log('📍 位置变化:', location)
    
    // 更新进度
    let progress = 0
    if (isReady && bookInstance.locations && bookInstance.locations.length() > 0) {
      try {
        progress = Math.floor(bookInstance.locations.percentageFromCfi(location.start.cfi) * 100)
      } catch (error) {
        console.warn('计算进度失败:', error)
        // 使用章节索引作为备用进度计算
        const spineIndex = bookInstance.spine.items.findIndex((item: any) => 
          item.href === location.start.href || location.start.href.includes(item.href)
        )
        if (spineIndex !== -1) {
          progress = Math.floor((spineIndex / bookInstance.spine.length) * 100)
        }
      }
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
  
  // 选择变化事件
  rendition.on('selected', (cfiRange: string, contents: any) => {
    console.log('📝 文本选择事件:', cfiRange)
    
    const selection = contents.window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim()
      emit('text-selected', { text, cfi: cfiRange })
    }
  })
  
  // 键盘事件
  rendition.on('keyup', (e: KeyboardEvent) => {
    if (props.pageMode === 'page') {
      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          rendition.prev()
          break
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          rendition.next()
          break
      }
    }
  })
  
  console.log('✅ 事件绑定完成')
}

// 跳转到进度
const goToProgress = (progress: number) => {
  if (!rendition || !isReady) {
    console.warn('渲染器未就绪')
    return
  }
  
  if (!bookInstance.locations || bookInstance.locations.length() === 0) {
    console.warn('位置索引未生成，无法跳转')
    return
  }
  
  const cfi = bookInstance.locations.cfiFromPercentage(progress / 100)
  if (cfi) {
    console.log('📍 跳转到进度:', progress, '%', 'CFI:', cfi)
    rendition.display(cfi)
  } else {
    console.warn('无法生成 CFI，进度:', progress)
  }
}

// 跳转到位置
const goToLocation = (location: any) => {
  if (!rendition) {
    console.warn('渲染器未就绪')
    return
  }
  
  console.log('📍 跳转到位置:', location)
  
  if (location.cfi) {
    rendition.display(location.cfi)
  } else if (location.href) {
    rendition.display(location.href)
  } else {
    console.warn('无效的位置信息:', location)
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
watch([() => props.theme, () => props.fontSize, () => props.lineHeight, () => props.alignment], async () => {
  if (!rendition || !containerRef.value) return
  
  console.log('📐 [Watch] 样式属性变化:', {
    fontSize: props.fontSize,
    lineHeight: props.lineHeight,
    theme: props.theme,
    alignment: props.alignment
  })
  
  try {
    const colors = themeColors[props.theme as keyof typeof themeColors]
    const alignValue = alignmentMap[props.alignment] || 'justify'
    
    // 应用新样式到 themes
    applyStyles()
    
    // 直接更新当前所有已渲染的内容
    const contents = rendition.getContents()
    contents.forEach((content: any) => {
      const doc = content.document
      if (doc && doc.body) {
        // 更新 body 样式
        doc.body.style.backgroundColor = colors.bg
        doc.body.style.color = colors.text
        doc.body.style.fontSize = `${props.fontSize}px`
        doc.body.style.lineHeight = props.lineHeight.toString()
        doc.body.style.textAlign = alignValue
        
        // 更新段落样式
        doc.querySelectorAll('p').forEach((p: any) => {
          p.style.color = colors.text
          p.style.lineHeight = props.lineHeight.toString()
          p.style.textAlign = alignValue
        })
        
        // 更新其他文本元素
        doc.querySelectorAll('div, span, li, td, th, h1, h2, h3, h4, h5, h6').forEach((el: any) => {
          el.style.color = colors.text
          el.style.lineHeight = props.lineHeight.toString()
        })
        
        // 更新链接样式
        doc.querySelectorAll('a').forEach((a: any) => {
          a.style.color = colors.text
          a.style.opacity = '0.8'
        })
      }
    })
    
    console.log('✅ 样式已更新（无需重新渲染）')
  } catch (error) {
    console.error('更新样式失败:', error)
  }
})

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
const resize = () => {
  if (!rendition || !containerRef.value) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  rendition.resize(width, height)
}

defineExpose({
  goToProgress,
  goToLocation,
  goToChapter,
  getCurrentLocation,
  reinitialize,
  resize,
  clearSelection,
  addHighlight,
  removeHighlight,
  setNotes
})

// 生命周期
onMounted(() => {
  initialize()
  
  // 监听窗口大小改变
  const handleResize = () => {
    if (rendition && containerRef.value) {
      const width = containerRef.value.clientWidth
      const height = containerRef.value.clientHeight
      rendition.resize(width, height)
    }
  }
  
  window.addEventListener('resize', handleResize)
  
  // 监听键盘事件（全局）
  const handleKeydown = (e: KeyboardEvent) => {
    if (!rendition || !isReady) return
    
    if (props.pageMode === 'page') {
      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          rendition.prev()
          break
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          rendition.next()
          break
        case 'Home':
          e.preventDefault()
          if (bookInstance.spine) {
            rendition.display(bookInstance.spine.first().href)
          }
          break
        case 'End':
          e.preventDefault()
          if (bookInstance.spine) {
            rendition.display(bookInstance.spine.last().href)
          }
          break
      }
    }
  }
  
  document.addEventListener('keydown', handleKeydown)
  
  // 清理函数存储
  const cleanupResize = () => window.removeEventListener('resize', handleResize)
  const cleanupKeydown = () => document.removeEventListener('keydown', handleKeydown)
  
  // 在组件卸载时清理
  onBeforeUnmount(() => {
    cleanupResize()
    cleanupKeydown()
    cleanup()
  })
})

onBeforeUnmount(() => {
  cleanup()
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
  background: var(--background-color, #ffffff);
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
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

.epub-reader.mode-scroll :deep(iframe) {
  width: 100% !important;
  margin: 0 !important;
}

/* 翻页模式下隐藏滚动条 */
.epub-reader.mode-page :deep(.epub-view) {
  overflow: hidden !important;
}

.epub-reader.mode-page :deep(.epub-container) {
  overflow: hidden !important;
}

.epub-reader.mode-page :deep(iframe) {
  width: 100% !important;
  height: 100% !important;
}
</style>
