/**
 * Store 迁移工具
 * 从 IndexedDB 迁移到后端 API
 */
import localforage from 'localforage'
import * as booksApi from '@/api/books'
import { EbookMetadata, BookCategory, ReadingProgress } from '@/stores/ebook'

export interface MigrationProgress {
  total: number
  current: number
  status: 'idle' | 'running' | 'completed' | 'error'
  message: string
  errors: string[]
}

/**
 * 迁移书籍数据
 */
export async function migrateBooks(
  onProgress?: (progress: MigrationProgress) => void
): Promise<{ success: boolean; migrated: number; failed: number; errors: string[] }> {
  const progress: MigrationProgress = {
    total: 0,
    current: 0,
    status: 'running',
    message: '正在迁移书籍数据...',
    errors: []
  }

  try {
    // 1. 从 IndexedDB 读取书籍列表
    const booksData = await localforage.getItem<EbookMetadata[]>('books')
    
    if (!booksData || booksData.length === 0) {
      progress.status = 'completed'
      progress.message = '没有需要迁移的书籍'
      onProgress?.(progress)
      return { success: true, migrated: 0, failed: 0, errors: [] }
    }

    progress.total = booksData.length
    onProgress?.(progress)

    let migrated = 0
    let failed = 0

    // 2. 逐个迁移书籍
    for (const book of booksData) {
      try {
        progress.current++
        progress.message = `正在迁移: ${book.title} (${progress.current}/${progress.total})`
        onProgress?.(progress)

        // 获取书籍文件内容
        const content = await localforage.getItem<ArrayBuffer>(`ebook_content_${book.id}`)
        
        if (!content) {
          progress.errors.push(`书籍文件不存在: ${book.title}`)
          failed++
          continue
        }

        // 创建 File 对象
        const file = new File([content], `${book.title}.${book.format}`, {
          type: 'application/octet-stream'
        })

        // 上传到后端
        const result = await booksApi.uploadBook({
          file,
          title: book.title,
          author: book.author,
          category_id: book.categoryId
        })

        // 更新书籍信息（如果有额外数据）
        if (book.lastRead || book.readingProgress) {
          await booksApi.updateBook(result.book_id, {
            last_read: book.lastRead,
            reading_progress: book.readingProgress
          })
        }

        migrated++
        console.log(`✅ 书籍迁移成功: ${book.title}`)

      } catch (error: any) {
        failed++
        const errorMsg = `迁移失败 ${book.title}: ${error.message}`
        progress.errors.push(errorMsg)
        console.error(errorMsg, error)
      }
    }

    progress.status = 'completed'
    progress.message = `迁移完成: 成功 ${migrated}, 失败 ${failed}`
    onProgress?.(progress)

    return {
      success: true,
      migrated,
      failed,
      errors: progress.errors
    }

  } catch (error: any) {
    progress.status = 'error'
    progress.message = `迁移失败: ${error.message}`
    progress.errors.push(error.message)
    onProgress?.(progress)

    return {
      success: false,
      migrated: 0,
      failed: 0,
      errors: progress.errors
    }
  }
}

/**
 * 迁移分类数据
 */
export async function migrateCategories(): Promise<{ success: boolean; migrated: number; errors: string[] }> {
  try {
    const categoriesData = await localforage.getItem<BookCategory[]>('categories')
    
    if (!categoriesData || categoriesData.length === 0) {
      return { success: true, migrated: 0, errors: [] }
    }

    let migrated = 0
    const errors: string[] = []

    for (const category of categoriesData) {
      try {
        await booksApi.createCategory({
          name: category.name,
          color: category.color
        })
        migrated++
      } catch (error: any) {
        errors.push(`迁移分类失败 ${category.name}: ${error.message}`)
      }
    }

    return { success: true, migrated, errors }

  } catch (error: any) {
    return { success: false, migrated: 0, errors: [error.message] }
  }
}

/**
 * 迁移阅读进度
 */
export async function migrateProgress(): Promise<{ success: boolean; migrated: number; errors: string[] }> {
  try {
    const booksData = await localforage.getItem<EbookMetadata[]>('books')
    
    if (!booksData || booksData.length === 0) {
      return { success: true, migrated: 0, errors: [] }
    }

    let migrated = 0
    const errors: string[] = []

    for (const book of booksData) {
      try {
        const progress = await localforage.getItem<ReadingProgress>(`progress_${book.id}`)
        
        if (progress) {
          await booksApi.saveProgress({
            ebook_id: progress.ebookId,
            chapter_index: progress.chapterIndex,
            chapter_title: progress.chapterTitle,
            position: progress.position,
            cfi: progress.cfi,
            device_id: progress.deviceId,
            device_name: progress.deviceName,
            reading_time: progress.readingTime
          })
          migrated++
        }
      } catch (error: any) {
        errors.push(`迁移进度失败 ${book.title}: ${error.message}`)
      }
    }

    return { success: true, migrated, errors }

  } catch (error: any) {
    return { success: false, migrated: 0, errors: [error.message] }
  }
}

/**
 * 完整迁移流程
 */
export async function migrateAll(
  onProgress?: (progress: MigrationProgress) => void
): Promise<{ success: boolean; summary: string }> {
  try {
    // 1. 迁移分类
    onProgress?.({
      total: 3,
      current: 1,
      status: 'running',
      message: '正在迁移分类...',
      errors: []
    })
    
    const categoriesResult = await migrateCategories()
    console.log('分类迁移结果:', categoriesResult)

    // 2. 迁移书籍
    onProgress?.({
      total: 3,
      current: 2,
      status: 'running',
      message: '正在迁移书籍...',
      errors: []
    })
    
    const booksResult = await migrateBooks(onProgress)
    console.log('书籍迁移结果:', booksResult)

    // 3. 迁移阅读进度
    onProgress?.({
      total: 3,
      current: 3,
      status: 'running',
      message: '正在迁移阅读进度...',
      errors: []
    })
    
    const progressResult = await migrateProgress()
    console.log('进度迁移结果:', progressResult)

    // 汇总结果
    const summary = `
迁移完成！
- 分类: ${categoriesResult.migrated} 个
- 书籍: ${booksResult.migrated} 本
- 进度: ${progressResult.migrated} 条
- 失败: ${booksResult.failed} 本
    `.trim()

    onProgress?.({
      total: 3,
      current: 3,
      status: 'completed',
      message: summary,
      errors: [
        ...categoriesResult.errors,
        ...booksResult.errors,
        ...progressResult.errors
      ]
    })

    return { success: true, summary }

  } catch (error: any) {
    onProgress?.({
      total: 3,
      current: 0,
      status: 'error',
      message: `迁移失败: ${error.message}`,
      errors: [error.message]
    })

    return { success: false, summary: `迁移失败: ${error.message}` }
  }
}

/**
 * 清理 IndexedDB 数据（迁移完成后）
 */
export async function cleanupIndexedDB(): Promise<void> {
  try {
    // 清理书籍数据
    const booksData = await localforage.getItem<EbookMetadata[]>('books')
    if (booksData) {
      for (const book of booksData) {
        await localforage.removeItem(`ebook_content_${book.id}`)
        await localforage.removeItem(`progress_${book.id}`)
      }
    }

    // 清理主数据
    await localforage.removeItem('books')
    await localforage.removeItem('categories')

    console.log('✅ IndexedDB 数据已清理')
  } catch (error) {
    console.error('清理 IndexedDB 失败:', error)
  }
}
