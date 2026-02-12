// 注释功能 Composable
import { ref, computed } from 'vue'
import { useAnnotationStore } from '../../../stores/annotation'
import type { Annotation } from '../../../types/annotation'
import { DEFAULT_ANNOTATION_COLOR, ANNOTATION_COLORS } from '../../../types/annotation'

export function useAnnotations(bookId: string) {
  const annotationStore = useAnnotationStore()

  // 当前选中的文本信息
  const selectedText = ref('')
  const selectedRange = ref<Range | null>(null)
  const selectedCfi = ref('')
  const selectedChapterIndex = ref(0)
  const selectedChapterTitle = ref('')

  // 当前操作的注释
  const currentAnnotation = ref<Annotation | null>(null)

  // 注释菜单状态
  const showAnnotationMenu = ref(false)
  const annotationMenuPosition = ref({ x: 0, y: 0 })

  // 注释编辑对话框
  const showNoteDialog = ref(false)
  const noteDialogContent = ref('')

  // 获取当前书籍的所有注释
  const bookAnnotations = computed(() => 
    annotationStore.getBookAnnotations(bookId)
  )

  // 获取当前章节的注释
  const chapterAnnotations = computed(() => 
    annotationStore.getChapterAnnotations(bookId, selectedChapterIndex.value)
  )

  // 处理文本选择
  const handleTextSelection = (data: {
    text: string
    range?: Range
    cfi?: string
    chapterIndex: number
    chapterTitle?: string
    position: { x: number; y: number }
  }) => {
    // 🎯 核心修复: 永远不要直接保存 Range 对象到 ref，它包含循环引用且不可序列化
    // 只保存我们真正需要的纯文本和位置信息
    selectedText.value = data.text
    selectedRange.value = null // 显式置空，防止误用
    selectedCfi.value = data.cfi || ''
    selectedChapterIndex.value = data.chapterIndex
    selectedChapterTitle.value = data.chapterTitle || ''

    // 显示注释菜单
    showAnnotationMenu.value = true
    annotationMenuPosition.value = data.position
  }

  // 创建高亮
  const createHighlight = async (color = DEFAULT_ANNOTATION_COLOR.value) => {
    if (!selectedText.value || !selectedCfi.value) return null

    try {
      const annotation = await annotationStore.addAnnotation({
        bookId,
        cfi: selectedCfi.value,
        text: selectedText.value,
        color,
        type: 'highlight',
        chapterIndex: selectedChapterIndex.value,
        chapterTitle: selectedChapterTitle.value,
      })

      clearSelection()
      return annotation
    } catch (error) {
      console.error('创建高亮失败:', error)
      return null
    }
  }

  // 创建下划线
  const createUnderline = async (color = DEFAULT_ANNOTATION_COLOR.value) => {
    if (!selectedText.value || !selectedCfi.value) return null

    try {
      const annotation = await annotationStore.addAnnotation({
        bookId,
        cfi: selectedCfi.value,
        text: selectedText.value,
        color,
        type: 'underline',
        chapterIndex: selectedChapterIndex.value,
        chapterTitle: selectedChapterTitle.value,
      })

      clearSelection()
      return annotation
    } catch (error) {
      console.error('创建下划线失败:', error)
      return null
    }
  }

  // 创建笔记
  const createNote = async (note: string, color = DEFAULT_ANNOTATION_COLOR.value) => {
    if (!selectedText.value || !selectedCfi.value) return null

    try {
      const annotation = await annotationStore.addAnnotation({
        bookId,
        cfi: selectedCfi.value,
        text: selectedText.value,
        note,
        color,
        type: 'note',
        chapterIndex: selectedChapterIndex.value,
        chapterTitle: selectedChapterTitle.value,
      })

      clearSelection()
      return annotation
    } catch (error) {
      console.error('创建笔记失败:', error)
      return null
    }
  }

  // 显示笔记对话框
  const showNoteDialogForSelection = () => {
    noteDialogContent.value = ''
    showNoteDialog.value = true
  }

  // 保存笔记
  const saveNote = async (note: string, color = DEFAULT_ANNOTATION_COLOR.value) => {
    const content = (note || '').trim()
    if (!content) return

    await createNote(content, color)
    showNoteDialog.value = false
    noteDialogContent.value = ''
  }

  // 更新注释
  const updateAnnotation = async (annotationId: string, updates: Partial<Annotation>) => {
    return await annotationStore.updateAnnotation(bookId, annotationId, updates)
  }

  // 删除注释
  const deleteAnnotation = async (annotationId: string) => {
    return await annotationStore.deleteAnnotation(bookId, annotationId)
  }

  // 编辑注释笔记
  const editAnnotationNote = (annotation: Annotation) => {
    currentAnnotation.value = annotation
    noteDialogContent.value = annotation.note || ''
    showNoteDialog.value = true
  }

  // 更新笔记内容
  const updateNote = async (note: string) => {
    if (!currentAnnotation.value) return
    const content = (note || '').trim()
    if (!content) return

    await updateAnnotation(currentAnnotation.value.id, {
      note: content,
    })

    showNoteDialog.value = false
    noteDialogContent.value = ''
    currentAnnotation.value = null
  }

  // 清除选择
  const clearSelection = () => {
    selectedText.value = ''
    selectedRange.value = null
    selectedCfi.value = ''
    showAnnotationMenu.value = false
  }

  // 跳转到注释位置
  const navigateToAnnotation = (annotation: Annotation) => {
    // 这个方法需要在父组件中实现，通过 emit 或回调
    return annotation
  }

  // 导出注释
  const exportAnnotations = () => {
    return annotationStore.exportAnnotations(bookId)
  }

  // 导入注释
  const importAnnotations = async (jsonData: string) => {
    return await annotationStore.importAnnotations(bookId, jsonData)
  }

  // 获取统计信息
  const stats = computed(() => annotationStore.getStats(bookId))

  return {
    // 状态
    selectedText,
    selectedRange,
    selectedCfi,
    showAnnotationMenu,
    annotationMenuPosition,
    showNoteDialog,
    noteDialogContent,
    currentAnnotation,
    bookAnnotations,
    chapterAnnotations,
    stats,

    // 方法
    handleTextSelection,
    createHighlight,
    createUnderline,
    createNote,
    showNoteDialogForSelection,
    saveNote,
    updateNote,
    updateAnnotation,
    deleteAnnotation,
    editAnnotationNote,
    clearSelection,
    navigateToAnnotation,
    exportAnnotations,
    importAnnotations,

    // 常量
    ANNOTATION_COLORS,
  }
}
