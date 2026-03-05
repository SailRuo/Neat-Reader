// 注释管理 Store
import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import localforage from 'localforage'
import { v4 as uuidv4 } from 'uuid'
import type { Annotation } from '../types/annotation'
import * as booksApi from '@/api/books'

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

  // 初始化：从后端加载注释，IndexedDB 作为缓存
  const initialize = async () => {
    isLoading.value = true
    try {
      // 先尝试从后端加载（如果失败则从 IndexedDB 加载）
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

  // 从后端加载指定书籍的注释
  const loadBookAnnotations = async (bookId: string) => {
    try {
      const response = await booksApi.listAnnotations(bookId)
      if (response.success && response.annotations) {
        // 转换后端数据格式到前端格式
        const backendAnnotations = response.annotations.map(a => ({
          id: a.id,
          bookId: a.book_id,
          cfi: a.cfi,
          text: a.text || '',
          note: a.note,
          color: a.color || '#FBBF24',
          type: a.type as 'highlight' | 'underline' | 'note',  // 🎯 修复：直接使用后端返回的类型，不使用默认值
          chapterIndex: a.chapter_index || 0,
          chapterTitle: a.chapter_title,
          range: undefined,
          createdAt: a.created_at * 1000, // 转换为毫秒
          updatedAt: a.updated_at * 1000,
        }))
        
        annotations.value.set(bookId, backendAnnotations)
        
        // 同步到 IndexedDB 缓存
        await saveToStorage()
        
        console.log(`✅ 从后端加载了 ${backendAnnotations.length} 条注释`)
      }
    } catch (error) {
      console.error('从后端加载注释失败:', error)
      // 失败时从 IndexedDB 加载
      const stored = await localforage.getItem<Record<string, Annotation[]>>(ANNOTATIONS_KEY)
      if (stored && stored[bookId]) {
        const bookAnnotations = annotations.value.get(bookId) || []
        if (bookAnnotations.length === 0) {
          annotations.value.set(bookId, stored[bookId])
        }
      }
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

    // 先添加到本地状态
    const bookAnnotations = annotations.value.get(annotation.bookId) || []
    bookAnnotations.push(newAnnotation)
    annotations.value.set(annotation.bookId, bookAnnotations)

    // 保存到 IndexedDB 缓存
    await saveToStorage()
    
    // 🎯 同步到后端
    try {
      await booksApi.createAnnotation({
        book_id: newAnnotation.bookId,
        cfi: newAnnotation.cfi,
        text: newAnnotation.text,
        note: newAnnotation.note,
        color: newAnnotation.color,
        type: newAnnotation.type,
        chapter_index: newAnnotation.chapterIndex,
        chapter_title: newAnnotation.chapterTitle,
      })
      console.log('✅ 注释已同步到后端')
    } catch (error) {
      console.error('同步注释到后端失败:', error)
      // 失败不影响本地使用
    }
    
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
    
    // 🎯 同步到后端
    try {
      const annotation = bookAnnotations[index]
      await booksApi.updateAnnotation(annotationId, {
        book_id: annotation.bookId,
        cfi: annotation.cfi,
        text: annotation.text,
        note: annotation.note,
        color: annotation.color,
        type: annotation.type,
        chapter_index: annotation.chapterIndex,
        chapter_title: annotation.chapterTitle,
      })
      console.log('✅ 注释更新已同步到后端')
    } catch (error) {
      console.error('同步注释更新到后端失败:', error)
    }
    
    return true
  }

  // 删除注释
  const deleteAnnotation = async (bookId: string, annotationId: string) => {
    const bookAnnotations = annotations.value.get(bookId)
    if (!bookAnnotations) return false

    const filtered = bookAnnotations.filter(a => a.id !== annotationId)
    annotations.value.set(bookId, filtered)

    await saveToStorage()
    
    // 🎯 同步到后端
    try {
      await booksApi.deleteAnnotation(annotationId)
      console.log('✅ 注释删除已同步到后端')
    } catch (error) {
      console.error('同步注释删除到后端失败:', error)
    }
    
    return true
  }

  // 删除书籍的所有注释
  const deleteBookAnnotations = async (bookId: string) => {
    const bookAnnotations = annotations.value.get(bookId) || []
    
    // 🎯 先从后端删除所有注释
    try {
      for (const annotation of bookAnnotations) {
        await booksApi.deleteAnnotation(annotation.id)
      }
      console.log('✅ 书籍所有注释已从后端删除')
    } catch (error) {
      console.error('从后端删除书籍注释失败:', error)
    }
    
    // 从本地删除
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
    loadBookAnnotations,  // 🎯 新增：从后端加载书籍注释
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    deleteBookAnnotations,
    exportAnnotations,
    importAnnotations,
  }
})
