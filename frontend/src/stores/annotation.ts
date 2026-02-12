// 注释管理 Store
import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import localforage from 'localforage'
import { v4 as uuidv4 } from 'uuid'
import type { Annotation } from '../types/annotation'

const ANNOTATIONS_KEY = 'neat-reader-annotations'

export const useAnnotationStore = defineStore('annotation', () => {
  // 状态
  const annotations = ref<Map<string, Annotation[]>>(new Map())
  const isLoading = ref(false)

  // 计算属性：获取指定书籍的注释
  const getBookAnnotations = computed(() => {
    return (bookId: string) => {
      return annotations.value.get(bookId) || []
    }
  })

  // 计算属性：获取指定章节的注释
  const getChapterAnnotations = computed(() => {
    return (bookId: string, chapterIndex: number) => {
      const bookAnnotations = annotations.value.get(bookId) || []
      return bookAnnotations.filter(a => a.chapterIndex === chapterIndex)
    }
  })

  // 初始化：从 IndexedDB 加载所有注释
  const initialize = async () => {
    isLoading.value = true
    try {
      const stored = await localforage.getItem<Record<string, Annotation[]>>(ANNOTATIONS_KEY)
      if (stored) {
        annotations.value = new Map(Object.entries(stored))
      }
    } catch (error) {
      console.error('加载注释失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 保存到 IndexedDB
  const saveToStorage = async () => {
    try {
      // 🎯 修复 DataCloneError: 确保数据是可序列化的纯对象
      // 使用 toRaw 获取原始对象，并通过深拷贝彻底隔离 Vue Proxy
      const rawMap = toRaw(annotations.value)
      const obj: Record<string, any[]> = {}
      
      rawMap.forEach((value, key) => {
        try {
          // 彻底克隆数组中的内容，只保留可序列化的字段
          const plainArray = value.map(item => {
            const rawItem = toRaw(item)
            
            // 显式构造纯对象，只包含 Annotation 接口定义的字段
            const serializable: Annotation = {
              id: rawItem.id,
              bookId: rawItem.bookId,
              cfi: rawItem.cfi,
              text: rawItem.text,
              color: rawItem.color,
              type: rawItem.type,
              chapterIndex: rawItem.chapterIndex,
              createdAt: rawItem.createdAt,
              updatedAt: rawItem.updatedAt,
            }
            
            // 可选字段
            if (rawItem.range && typeof rawItem.range === 'string') {
              serializable.range = rawItem.range
            }
            if (rawItem.note && typeof rawItem.note === 'string') {
              serializable.note = rawItem.note
            }
            if (rawItem.chapterTitle && typeof rawItem.chapterTitle === 'string') {
              serializable.chapterTitle = rawItem.chapterTitle
            }
            
            return serializable
          })
          
          obj[key] = plainArray
        } catch (e) {
          console.error(`序列化书籍 ${key} 的注释失败:`, e)
        }
      })
      
      // 直接保存纯对象（不需要再用 toRaw）
      await localforage.setItem(ANNOTATIONS_KEY, obj)
    } catch (error) {
      console.error('保存注释失败:', error)
      throw error
    }
  }

  // 添加注释
  const addAnnotation = async (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => {
    // 🎯 确保输入数据是纯对象，移除任何非序列化字段
    const cleanAnnotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'> = {
      bookId: annotation.bookId,
      cfi: annotation.cfi,
      text: annotation.text,
      color: annotation.color,
      type: annotation.type,
      chapterIndex: annotation.chapterIndex,
    }
    
    // 可选字段
    if (annotation.range && typeof annotation.range === 'string') {
      cleanAnnotation.range = annotation.range
    }
    if (annotation.note && typeof annotation.note === 'string') {
      cleanAnnotation.note = annotation.note
    }
    if (annotation.chapterTitle && typeof annotation.chapterTitle === 'string') {
      cleanAnnotation.chapterTitle = annotation.chapterTitle
    }
    
    const newAnnotation: Annotation = {
      ...cleanAnnotation,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const bookAnnotations = annotations.value.get(annotation.bookId) || []
    bookAnnotations.push(newAnnotation)
    annotations.value.set(annotation.bookId, bookAnnotations)

    await saveToStorage()
    return newAnnotation
  }

  // 更新注释
  const updateAnnotation = async (bookId: string, annotationId: string, updates: Partial<Annotation>) => {
    const bookAnnotations = annotations.value.get(bookId)
    if (!bookAnnotations) return false

    const index = bookAnnotations.findIndex(a => a.id === annotationId)
    if (index === -1) return false

    bookAnnotations[index] = {
      ...bookAnnotations[index],
      ...updates,
      updatedAt: Date.now(),
    }

    annotations.value.set(bookId, bookAnnotations)
    await saveToStorage()
    return true
  }

  // 删除注释
  const deleteAnnotation = async (bookId: string, annotationId: string) => {
    const bookAnnotations = annotations.value.get(bookId)
    if (!bookAnnotations) return false

    const filtered = bookAnnotations.filter(a => a.id !== annotationId)
    annotations.value.set(bookId, filtered)

    await saveToStorage()
    return true
  }

  // 删除书籍的所有注释
  const deleteBookAnnotations = async (bookId: string) => {
    annotations.value.delete(bookId)
    await saveToStorage()
  }

  // 根据 ID 获取注释
  const getAnnotationById = (bookId: string, annotationId: string) => {
    const bookAnnotations = annotations.value.get(bookId)
    return bookAnnotations?.find(a => a.id === annotationId)
  }

  // 导出注释为 JSON
  const exportAnnotations = (bookId: string) => {
    const bookAnnotations = annotations.value.get(bookId) || []
    return JSON.stringify(bookAnnotations, null, 2)
  }

  // 导入注释
  const importAnnotations = async (bookId: string, jsonData: string) => {
    try {
      const imported = JSON.parse(jsonData) as Annotation[]
      if (!Array.isArray(imported)) {
        throw new Error('无效的注释数据格式')
      }

      // 合并注释（避免重复）
      const existing = annotations.value.get(bookId) || []
      const existingIds = new Set(existing.map(a => a.id))
      
      const newAnnotations = imported.filter(a => !existingIds.has(a.id))
      const merged = [...existing, ...newAnnotations]

      annotations.value.set(bookId, merged)
      await saveToStorage()

      return newAnnotations.length
    } catch (error) {
      console.error('导入注释失败:', error)
      throw error
    }
  }

  // 统计信息
  const getStats = computed(() => {
    return (bookId: string) => {
      const bookAnnotations = annotations.value.get(bookId) || []
      return {
        total: bookAnnotations.length,
        highlights: bookAnnotations.filter(a => a.type === 'highlight').length,
        underlines: bookAnnotations.filter(a => a.type === 'underline').length,
        notes: bookAnnotations.filter(a => a.type === 'note').length,
      }
    }
  })

  return {
    annotations,
    isLoading,
    getBookAnnotations,
    getChapterAnnotations,
    getAnnotationById,
    getStats,
    initialize,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    deleteBookAnnotations,
    exportAnnotations,
    importAnnotations,
  }
})
