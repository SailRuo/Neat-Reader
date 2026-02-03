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
  
  // 检查容器尺寸
  if (containerRef.value.clientWidth === 0 || containerRef.value.clientHeight === 0) {
    console.error('容器尺寸为 0，无法初始化阅读器')
    return
  }
  
  // 添加全局错误处理，捕获 epub.js 内部的资源加载错误
  resourceErrorHandler = (event: PromiseRejectionEvent) => {
    const error = event.reason
    if (error && error.message && error.message.includes('File not found in the epub')) {
      event.preventDefault()
    }
  }
  window.addEventListener('unhandledrejection', resourceErrorHandler)
  
  try {
    // 加载书籍内容
    const content = await localforage.getItem<ArrayBuffer>(`ebook_content_${props.bookId}`)
    if (!content) {
      console.error(`无法加载书籍内容，书籍ID:`, props.bookId)
      return
    }
    
    // 创建书籍实例
    bookInstance = ePub(content)
    
    // 拦截 Archive 的资源请求错误
    if (bookInstance.archive) {
      const originalCreateUrl = bookInstance.archive.createUrl.bind(bookInstance.archive)
      bookInstance.archive.createUrl = async function(url: string, options: any) {
        try {
          return await originalCreateUrl(url, options)
        } catch (error: any) {
          return 'data:text/css;base64,'
        }
      }
    }
    
    // 创建渲染器
    const width = containerRef.value.clientWidth
    const height = containerRef.value.clientHeight
    
    // 根据边距调整渲染区域尺寸
    const marginValue = marginMap[props.margin] || '40px'
    const marginPx = parseInt(marginValue)
    
    // 内联渲染模式的配置
    const renderConfig: any = {
      width: width,  // 使用完整宽度
      height: height, // 使用完整高度
      spread: 'none', // 强制单页显示
      minSpreadWidth: 0, // 禁用双页展开
      allowScriptedContent: true,
      allowPopups: false,
      snap: false
    }
    
    console.log('📐 [初始化] 渲染器配置:', {
      容器尺寸: `${width}x${height}`,
      边距: marginValue,
      渲染尺寸: `${renderConfig.width}x${renderConfig.height}`,
      spread: renderConfig.spread
    })
    
    // 根据页面模式选择合适的配置
    if (props.pageMode === 'page') {
      renderConfig.flow = 'paginated'
      renderConfig.manager = 'default'
    } else {
      renderConfig.flow = 'scrolled'
      renderConfig.manager = 'continuous'
    }
    
    rendition = bookInstance.renderTo(containerRef.value, renderConfig)
    
    // 应用样式（包含边距）
    applyStyles()
    
    // 应用样式
    applyStyles()
    
    // 注册内容钩子
    rendition.hooks.content.register((contents: any) => {
      const colors = themeColors[props.theme as keyof typeof themeColors]
      const alignValue = alignmentMap[props.alignment] || 'justify'
      
      const doc = contents.document
      if (doc && doc.body) {
        doc.body.style.backgroundColor = colors.bg
        doc.body.style.color = colors.text
        doc.body.style.fontSize = `${props.fontSize}px`
        doc.body.style.lineHeight = `${props.lineHeight}`
        doc.body.style.textAlign = alignValue
        doc.body.style.margin = '0'
        doc.body.style.padding = '0'
        
        if (doc.documentElement) {
          doc.documentElement.style.backgroundColor = colors.bg
          doc.documentElement.style.padding = '0'
          doc.documentElement.style.margin = '0'
        }
        
        const allElements = doc.body.querySelectorAll('*')
        allElements.forEach((el: any) => {
          el.style.color = colors.text
        })
      }
      
      setupContentHooks(contents)
      
      if (doc) {
        doc.addEventListener('error', (e: Event) => {
          const target = e.target as HTMLElement
          if (target.tagName === 'LINK' && target.getAttribute('rel') === 'stylesheet') {
            e.stopPropagation()
            e.preventDefault()
          }
        }, true)
      }
    })
    
    bindEvents()
    
    // 先加载目录
    try {
      const nav = await bookInstance.loaded.navigation
      const chapters = nav.toc.map((item: any) => ({
        title: item.label || item.title || '未知章节',
        href: item.href
      }))
      
      await bookInstance.ready
      
      // 尝试从缓存加载位置索引
      const cachedLocations = await localforage.getItem<string>(`locations_${props.bookId}`)
      
      if (cachedLocations) {
        // 使用缓存的位置索引
        console.log('使用缓存的位置索引')
        bookInstance.locations.load(cachedLocations)
      } else {
        // 第一次打开，异步生成位置索引（不阻塞显示）
        console.log('首次打开，异步生成位置索引...')
        bookInstance.locations.generate(1000).then((locations: any) => {
          // 保存位置索引到缓存
          const locationsString = bookInstance.locations.save()
          localforage.setItem(`locations_${props.bookId}`, locationsString)
          console.log('位置索引生成并缓存成功')
        }).catch((err: Error) => {
          console.warn('生成位置索引失败:', err)
        })
      }
      
      isReady = true
      
      // 如果有保存的进度，直接跳转到该位置
      if (props.initialProgress && props.initialProgress > 0) {
        const cfi = bookInstance.locations.cfiFromPercentage(props.initialProgress / 100)
        if (cfi) {
          await rendition.display(cfi)
        } else {
          await rendition.display()
        }
      } else {
        await rendition.display()
      }
      
      emit('ready', { chapters })
    } catch (err) {
      console.warn('加载目录失败:', err)
      await rendition.display()
      isReady = true
      emit('ready', { chapters: [] })
    }
    
  } catch (error) {
    console.error('初始化 EPUB 阅读器失败:', error)
    
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
    
    emit('ready', { chapters: [], error: 'Failed to initialize EPUB reader' })
  }
}

// 应用样式
const applyStyles = () => {
  if (!rendition) return
  
  try {
    const colors = themeColors[props.theme as keyof typeof themeColors]
    const marginValue = marginMap[props.margin] || '40px'
    const alignValue = alignmentMap[props.alignment] || 'justify'
    
    console.log('🎨 [applyStyles] 应用样式:', {
      theme: props.theme,
      margin: marginValue,
      fontSize: props.fontSize,
      lineHeight: props.lineHeight,
      pageMode: props.pageMode
    })
    
    // 清除所有现有样式
    rendition.themes.default({})
    
    // 使用 override 方法强制覆盖 epub.js 的默认样式
    const styles: any = {
      'body': {
        'background': `${colors.bg} !important`,
        'color': `${colors.text} !important`,
        'font-size': `${props.fontSize}px !important`,
        'line-height': `${props.lineHeight} !important`,
        'margin': '0 !important',
        'text-align': `${alignValue} !important`,
        'overflow-x': 'hidden !important',
        'box-sizing': 'border-box !important'
      },
      'p': {
        'color': `${colors.text} !important`,
        'text-align': `${alignValue} !important`,
        'overflow-wrap': 'break-word !important',
        'word-wrap': 'break-word !important'
      },
      'div, span, li, td, th': {
        'color': `${colors.text} !important`,
        'overflow-wrap': 'break-word !important',
        'word-wrap': 'break-word !important'
      },
      'h1, h2, h3, h4, h5, h6': {
        'color': `${colors.text} !important`
      },
      'a': {
        'color': `${colors.text} !important`,
        'opacity': '0.8'
      },
      'img': {
        'max-width': '100% !important',
        'height': 'auto !important'
      },
      '*': {
        'color': `${colors.text} !important`
      }
    }
    
    // 翻页模式和滚动模式都使用 body padding 实现边距
    styles['html'] = {
      'padding': '0 !important',
      'margin': '0 !important',
      'background': `${colors.bg} !important`
    }
    
    if (props.pageMode === 'page') {
      // 翻页模式：使用 body padding 实现边距
      styles['body']['padding'] = `${marginValue} !important`
    } else {
      // 滚动模式：给块级元素添加左右 margin
      styles['body']['padding-top'] = `${marginValue} !important`
      styles['body']['padding-bottom'] = `${marginValue} !important`
      styles['body']['padding-left'] = '0 !important'
      styles['body']['padding-right'] = '0 !important'
      
      styles['p, div, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre'] = {
        'margin-left': `${marginValue} !important`,
        'margin-right': `${marginValue} !important`,
        'box-sizing': 'border-box !important'
      }
    }
    
    // 使用 override 而不是 register，强制覆盖默认样式
    Object.keys(styles).forEach(selector => {
      rendition.themes.override(selector, styles[selector])
    })
    
    console.log('✅ 样式已应用到 rendition.themes')
  } catch (error) {
    console.error('应用自定义主题失败:', error)
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
  if (!rendition || !containerRef.value) return
  
  console.log('📐 [Watch] 样式属性变化，重新应用样式')
  
  // 重新应用样式
  applyStyles()
  
  // 使用 epub.js 的 themes.update 方法强制更新所有视图
  nextTick(() => {
    try {
      // 获取当前位置
      const currentLocation = rendition.currentLocation()
      
      // 清除所有现有主题
      rendition.themes.default({})
      
      // 重新应用样式
      applyStyles()
      
      // 强制重新渲染当前位置
      if (currentLocation && currentLocation.start) {
        setTimeout(() => {
          rendition.display(currentLocation.start.cfi).then(() => {
            console.log('✅ 样式已应用并重新渲染')
          })
        }, 100)
      }
    } catch (error) {
      console.error('重新应用样式失败:', error)
    }
  })
}, { deep: true })

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
    
    // 检查是否已经有高亮
    const existingHighlight = content.document.querySelector(`[data-highlight-cfi="${cfi}"]`)
    if (existingHighlight) {
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
      const noteData = highlightNotes.get(cfi)
      if (noteData) {
        emit('highlight-clicked', noteData)
      }
    })
    
    // 使用更安全的方法包裹内容
    try {
      const fragment = range.extractContents()
      mark.appendChild(fragment)
      range.insertNode(mark)
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
    highlights.set(cfi, color)
    if (note) {
      highlightNotes.set(cfi, note)
    }
    
    const contents = rendition.getContents()
    let applied = false
    
    contents.forEach((content: any) => {
      if (applyHighlightToContent(content, cfi, color)) {
        applied = true
      }
    })
    
    if (!applied) {
      console.warn('高亮未能应用到当前页面，CFI:', cfi)
    }
  } catch (error) {
    console.error('添加高亮失败:', error)
  }
}

// 移除高亮
const removeHighlight = (cfi: string) => {
  if (!rendition) return
  
  try {
    highlights.delete(cfi)
    highlightNotes.delete(cfi)
    
    const contents = rendition.getContents()
    contents.forEach((content: any) => {
      const highlightElement = content.document.querySelector(`[data-highlight-cfi="${cfi}"]`)
      if (highlightElement) {
        const parent = highlightElement.parentNode
        while (highlightElement.firstChild) {
          parent.insertBefore(highlightElement.firstChild, highlightElement)
        }
        parent.removeChild(highlightElement)
      }
    })
  } catch (error) {
    console.error('移除高亮失败:', error)
  }
}

// 恢复所有高亮
const restoreHighlights = (notes: any[]) => {
  if (!rendition || !notes || notes.length === 0) {
    return
  }
  
  notes.forEach(note => {
    if (note.cfi && note.color) {
      highlights.set(note.cfi, note.color)
      highlightNotes.set(note.cfi, note)
    }
  })
  
  setTimeout(() => {
    const contents = rendition.getContents()
    notes.forEach(note => {
      if (note.cfi && note.color) {
        contents.forEach((content: any) => {
          applyHighlightToContent(content, note.cfi, note.color)
        })
      }
    })
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
    if (rendition && containerRef.value) {
      const width = containerRef.value.clientWidth
      const height = containerRef.value.clientHeight
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
  box-sizing: border-box;
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
