<template>
  <div class="pdf-reader" @wheel="handleWheel" @click="$emit('click')">
    <canvas ref="canvasRef" class="pdf-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import localforage from 'localforage'

// 设置 PDF.js worker - 根据环境选择合适的 worker 路径
const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined

if (isElectron) {
  // Electron 环境：使用本地文件路径
  pdfjsLib.GlobalWorkerOptions.workerSrc = './node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
} else {
  // 浏览器环境：使用 import.meta.url
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()
}

console.log('PDF.js Worker 路径:', pdfjsLib.GlobalWorkerOptions.workerSrc)

const props = defineProps<{
  bookId: string
  theme: string
  initialProgress?: number
}>()

const emit = defineEmits<{
  ready: [data: any]
  'progress-change': [data: any]
  click: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let pdfDoc: any = null
let currentPage = 1
let totalPages = 0
let currentRenderTask: any = null // 添加当前渲染任务跟踪
const scale = 1.5

// 初始化
const initialize = async () => {
  try {
    console.log('🔄 开始初始化 PDF 阅读器...')
    
    const content = await localforage.getItem<ArrayBuffer>(`ebook_content_${props.bookId}`)
    if (!content) {
      console.error('无法加载 PDF 内容')
      showErrorMessage('无法加载 PDF 内容', '文件可能已损坏或丢失')
      return
    }
    
    console.log('✅ PDF 内容加载成功，大小:', content.byteLength, 'bytes')
    
    const loadingTask = pdfjsLib.getDocument({ data: content })
    pdfDoc = await loadingTask.promise
    totalPages = pdfDoc.numPages
    
    console.log('📄 PDF 文档加载成功，总页数:', totalPages)
    
    // 恢复到保存的进度
    if (props.initialProgress && props.initialProgress > 0) {
      // 修正计算，防止由于浮点数精度问题导致的页面偏移
      const pageNum = Math.max(1, Math.min(totalPages, Math.ceil((props.initialProgress / 100) * totalPages - 1e-10)))
      await renderPage(pageNum)
      console.log('📍 恢复到页面:', pageNum)
    } else {
      await renderPage(1)
      console.log('📍 显示第一页')
    }
    
    emit('ready', {})
    updateProgress()
    console.log('✅ PDF 阅读器初始化完成')
  } catch (error) {
    console.error('初始化 PDF 阅读器失败:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    showErrorMessage('PDF 加载失败', `初始化失败: ${errorMessage}`)
  }
}

// 显示错误信息
const showErrorMessage = (title: string, message: string) => {
  if (canvasRef.value && canvasRef.value.parentElement) {
    canvasRef.value.parentElement.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 40px;
        text-align: center;
        color: #666;
        background: var(--background-color, #ffffff);
      ">
        <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
        <h3 style="margin: 0 0 10px 0; color: #333;">${title}</h3>
        <p style="margin: 0 0 20px 0; color: #666; max-width: 400px;">${message}</p>
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
}

// 渲染页面
const renderPage = async (pageNum: number) => {
  if (!pdfDoc || !canvasRef.value) {
    console.warn('PDF 文档或画布未准备就绪')
    return
  }
  
  // 取消之前的渲染任务
  if (currentRenderTask) {
    console.log('🚫 取消之前的渲染任务')
    currentRenderTask.cancel()
    currentRenderTask = null
  }
  
  try {
    console.log('🎨 渲染 PDF 页面:', pageNum)
    
    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale })
    
    const canvas = canvasRef.value
    const context = canvas.getContext('2d')
    if (!context) {
      console.error('无法获取 Canvas 2D 上下文')
      return
    }
    
    // 设置画布尺寸
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    // 根据主题设置背景色
    let bgColor = '#ffffff'
    switch (props.theme) {
      case 'dark':
        bgColor = '#1a1a1a'
        break
      case 'sepia':
        bgColor = '#f4ecd8'
        break
      case 'green':
        bgColor = '#e8f5e9'
        break
      default:
        bgColor = '#ffffff'
    }
    
    context.fillStyle = bgColor
    context.fillRect(0, 0, canvas.width, canvas.height)
    
    console.log('📐 画布尺寸:', canvas.width, 'x', canvas.height)
    
    // 创建新的渲染任务
    currentRenderTask = page.render({
      canvasContext: context,
      viewport: viewport
    })
    
    // 等待渲染完成
    await currentRenderTask.promise
    currentRenderTask = null
    
    currentPage = pageNum
    updateProgress()
    
    console.log('✅ PDF 页面渲染完成:', pageNum)
  } catch (error: any) {
    if (error.name === 'RenderingCancelledException') {
      console.log('🚫 渲染被取消')
      return
    }
    
    console.error('渲染 PDF 页面失败:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    showErrorMessage('页面渲染失败', `无法渲染第 ${pageNum} 页: ${errorMessage}`)
  }
}

// 更新进度
const updateProgress = () => {
  const progress = Math.floor((currentPage / totalPages) * 100)
  emit('progress-change', {
    progress,
    currentPage,
    totalPages
  })
}

// 处理滚轮
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  
  if (e.deltaY > 0 && currentPage < totalPages) {
    renderPage(currentPage + 1)
  } else if (e.deltaY < 0 && currentPage > 1) {
    renderPage(currentPage - 1)
  }
}

// 跳转到进度
const goToProgress = (progress: number) => {
  // 修正计算，防止由于浮点数精度问题导致的页面偏移
  const pageNum = Math.max(1, Math.min(totalPages, Math.ceil((progress / 100) * totalPages - 1e-10)))
  renderPage(pageNum)
}

// 获取当前位置
const getCurrentLocation = () => {
  return {
    cfi: '',
    page: currentPage
  }
}

watch(() => props.theme, () => {
  if (!pdfDoc) return
  renderPage(currentPage)
})

// 暴露方法
defineExpose({
  goToProgress,
  getCurrentLocation
})

// 生命周期
onMounted(() => {
  initialize()
})

onBeforeUnmount(() => {
  // 取消当前渲染任务
  if (currentRenderTask) {
    console.log('🚫 组件销毁，取消渲染任务')
    currentRenderTask.cancel()
    currentRenderTask = null
  }
  
  if (pdfDoc) {
    pdfDoc.destroy()
    pdfDoc = null
  }
})
</script>

<style scoped>
.pdf-reader {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.pdf-canvas {
  max-width: 100%;
  max-height: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}
</style>
