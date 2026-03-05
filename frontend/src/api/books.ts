/**
 * 书籍管理 API
 * 使用后端 SQLite 存储
 */
import service from './request'

const API_BASE = '/api'

// ============================================
// 类型定义
// ============================================

export interface Book {
  id: string
  title: string
  author?: string
  cover?: string
  file_path: string
  format: string
  size: number
  file_hash?: string
  last_read?: number
  total_chapters: number
  reading_progress: number
  storage_type: 'local' | 'cloud' | 'both'
  baidupan_path?: string
  category_id?: string
  added_at: number
  is_downloaded: number
  downloading?: number
  uploading?: number
  upload_progress?: number
  created_at: number
  updated_at: number
}

export interface Category {
  id: string
  name: string
  color: string
  created_at: number
  updated_at: number
}

export interface ReadingProgress {
  ebook_id: string
  chapter_index: number
  chapter_title?: string
  position: number
  cfi: string
  timestamp: number
  device_id: string
  device_name: string
  reading_time: number
}

export interface Annotation {
  id: string
  book_id: string
  cfi: string
  text?: string
  note?: string
  color?: string
  type?: string
  chapter_index?: number
  chapter_title?: string
  created_at: number
  updated_at: number
}

// ============================================
// 书籍管理
// ============================================

/**
 * 上传书籍
 */
export async function uploadBook(params: {
  file: File
  title?: string
  author?: string
  category_id?: string
  cover?: string  // 🎯 添加封面参数（Base64）
}): Promise<{ success: boolean; book_id: string; message: string }> {
  const formData = new FormData()
  formData.append('file', params.file)
  
  if (params.title) formData.append('title', params.title)
  if (params.author) formData.append('author', params.author)
  if (params.category_id) formData.append('category_id', params.category_id)
  if (params.cover) formData.append('cover', params.cover)  // 🎯 传递封面
  
  const response = await service.post(`${API_BASE}/books/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  
  return response.data
}

/**
 * 列出书籍
 */
export async function listBooks(params?: {
  category_id?: string
  limit?: number
  offset?: number
}): Promise<{ success: boolean; books: Book[]; count: number }> {
  const response = await service.get(`${API_BASE}/books`, { params })
  return response.data
}

/**
 * 获取书籍详情
 */
export async function getBook(bookId: string): Promise<{ success: boolean; book: Book }> {
  const response = await service.get(`${API_BASE}/books/${bookId}`)
  return response.data
}

/**
 * 获取书籍文件内容
 */
export async function getBookContent(bookId: string): Promise<ArrayBuffer> {
  const response = await service.get(`${API_BASE}/books/${bookId}/content`, {
    responseType: 'arraybuffer'
  })
  return response.data
}

/**
 * 更新书籍信息
 */
export async function updateBook(
  bookId: string,
  updates: Partial<Pick<Book, 'title' | 'author' | 'cover' | 'category_id' | 'last_read' | 'reading_progress'>>
): Promise<{ success: boolean; message: string }> {
  const response = await service.put(`${API_BASE}/books/${bookId}`, updates)
  return response.data
}

/**
 * 删除书籍
 */
export async function deleteBook(bookId: string): Promise<{ success: boolean; message: string }> {
  const response = await service.delete(`${API_BASE}/books/${bookId}`)
  return response.data
}

// ============================================
// 分类管理
// ============================================

/**
 * 创建分类
 */
export async function createCategory(params: {
  name: string
  color: string
}): Promise<{ success: boolean; category_id: string; message: string }> {
  const response = await service.post(`${API_BASE}/categories`, params)
  return response.data
}

/**
 * 列出所有分类
 */
export async function listCategories(): Promise<{ success: boolean; categories: Category[] }> {
  const response = await service.get(`${API_BASE}/categories`)
  return response.data
}

/**
 * 更新分类
 */
export async function updateCategory(
  categoryId: string,
  updates: {
    name?: string
    color?: string
  }
): Promise<{ success: boolean; message: string }> {
  const response = await service.put(`${API_BASE}/categories/${categoryId}`, updates)
  return response.data
}

/**
 * 删除分类
 */
export async function deleteCategory(categoryId: string): Promise<{ success: boolean; message: string }> {
  const response = await service.delete(`${API_BASE}/categories/${categoryId}`)
  return response.data
}

// ============================================
// 阅读进度管理
// ============================================

/**
 * 保存阅读进度
 */
export async function saveProgress(progress: {
  ebook_id: string
  chapter_index: number
  chapter_title?: string
  position: number
  cfi: string
  device_id: string
  device_name: string
  reading_time?: number
}): Promise<{ success: boolean; message: string }> {
  const response = await service.post(`${API_BASE}/progress`, progress)
  return response.data
}

/**
 * 获取阅读进度
 */
export async function getProgress(ebookId: string): Promise<{ success: boolean; progress: ReadingProgress | null }> {
  const response = await service.get(`${API_BASE}/progress/${ebookId}`)
  return response.data
}

// ============================================
// 注释管理
// ============================================

/**
 * 创建注释
 */
export async function createAnnotation(params: {
  book_id: string
  cfi: string
  text?: string
  note?: string
  color?: string
  type?: string
  chapter_index?: number
  chapter_title?: string
}): Promise<{ success: boolean; annotation_id: string; message: string }> {
  const response = await service.post(`${API_BASE}/annotations`, params)
  return response.data
}

/**
 * 更新注释
 */
export async function updateAnnotation(
  annotationId: string,
  params: {
    book_id: string
    cfi: string
    text?: string
    note?: string
    color?: string
    type?: string
    chapter_index?: number
    chapter_title?: string
  }
): Promise<{ success: boolean; message: string }> {
  const response = await service.put(`${API_BASE}/annotations/${annotationId}`, params)
  return response.data
}

/**
 * 列出书籍的所有注释
 */
export async function listAnnotations(bookId: string): Promise<{ success: boolean; annotations: Annotation[] }> {
  const response = await service.get(`${API_BASE}/annotations/${bookId}`)
  return response.data
}

/**
 * 删除注释
 */
export async function deleteAnnotation(annotationId: string): Promise<{ success: boolean; message: string }> {
  const response = await service.delete(`${API_BASE}/annotations/${annotationId}`)
  return response.data
}
