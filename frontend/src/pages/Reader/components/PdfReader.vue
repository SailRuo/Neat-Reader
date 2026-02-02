<template>
  <div class="pdf-reader" @wheel="handleWheel">
    <canvas ref="canvasRef" class="pdf-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import localforage from 'localforage'

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

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
const scale = 1.5

// 初始化
const initialize = async () => {
  try {
    const content = await localforage.getItem<ArrayBuffer>(`ebook_content_${props.bookId}`)
    if (!content) {
      console.error('无法加载 PDF 内容')
      return
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: content })
    pdfDoc = await loadingTask.promise
    totalPages = pdfDoc.numPages
    
    // 恢复到保存的进度
    if (props.initialProgress && props.initialProgress > 0) {
      const pageNum = Math.ceil((props.initialProgress / 100) * totalPages)
      await renderPage(Math.max(1, Math.min(pageNum, totalPages)))
    } else {
      await renderPage(1)
    }
    
    emit('ready', {})
    updateProgress()
  } catch (error) {
    console.error('初始化 PDF 阅读器失败:', error)
  }
}

// 渲染页面
const renderPage = async (pageNum: number) => {
  if (!pdfDoc || !canvasRef.value) return
  
  try {
    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale })
    
    const canvas = canvasRef.value
    const context = canvas.getContext('2d')
    if (!context) return
    
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    // 设置背景色
    const bgColor = props.theme === 'dark' ? '#1a1a1a' : '#ffffff'
    context.fillStyle = bgColor
    context.fillRect(0, 0, canvas.width, canvas.height)
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise
    
    currentPage = pageNum
    updateProgress()
  } catch (error) {
    console.error('渲染 PDF 页面失败:', error)
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
  const pageNum = Math.ceil((progress / 100) * totalPages)
  renderPage(Math.max(1, Math.min(pageNum, totalPages)))
}

// 获取当前位置
const getCurrentLocation = () => {
  return {
    cfi: '',
    page: currentPage
  }
}

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
}

.pdf-canvas {
  max-width: 100%;
  max-height: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
</style>
